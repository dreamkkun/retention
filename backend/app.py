from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
import os
import io
import base64
import tempfile
import json
import subprocess
from datetime import datetime
from functools import wraps
from werkzeug.utils import secure_filename

# Anthropic Vision API (이미지→정책 데이터 추출용)
try:
    import anthropic as _anthropic_lib
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')

# openpyxl (Excel 내보내기용)
try:
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    OPENPYXL_AVAILABLE = True
except ImportError:
    OPENPYXL_AVAILABLE = False

# 이미지 업로드 후 자동 git push 여부 (기본: 활성화)
AUTO_GIT_PUSH = os.getenv('AUTO_GIT_PUSH', 'true').lower() == 'true'


def git_push_image(safe_name):
    """이미지와 policies.json을 git commit & push하여 Vercel 자동 배포 트리거"""
    try:
        git_email = os.environ.get('GIT_USER_EMAIL', 'retention-admin@localhost')
        git_name = os.environ.get('GIT_USER_NAME', 'Retention Admin')
        cmds = [
            ['git', 'config', 'user.email', git_email],
            ['git', 'config', 'user.name', git_name],
            ['git', 'add',
             os.path.join('public', 'assets', safe_name),
             os.path.join('src', 'data', 'policies.json')],
            ['git', 'commit', '-m', f'chore: 정책 이미지 업로드 - {safe_name}'],
            ['git', 'push', 'origin', 'main'],
        ]
        for cmd in cmds:
            result = subprocess.run(
                cmd, cwd=PROJECT_ROOT,
                capture_output=True, text=True, timeout=30
            )
            if result.returncode != 0:
                # 변경사항 없을 때 commit 실패는 무시
                if 'nothing to commit' in result.stdout + result.stderr:
                    continue
                print(f"⚠️  git 명령 실패: {' '.join(cmd)}\n{result.stderr}")
                return False, result.stderr
        print(f"✅ git push 완료: {safe_name}")
        return True, None
    except Exception as e:
        print(f"⚠️  git push 오류: {e}")
        return False, str(e)

# xlwings는 DRM 엑셀 처리 전용 (Windows + Excel 설치 환경 필요)
# 없어도 서버 실행 가능 - 이미지 업로드는 항상 동작
try:
    import xlwings as xw
    # Excel 앱 실제 사용 가능 여부 확인
    try:
        _test = xw.apps
        XLWINGS_AVAILABLE = True
        print("✅ xlwings 로드 성공 - DRM 엑셀 기능 사용 가능")
    except Exception:
        XLWINGS_AVAILABLE = False
        xw = None
        print("⚠️  xlwings 로드됨 but Microsoft Excel 미설치 - DRM 엑셀 기능 비활성화")
except BaseException:
    XLWINGS_AVAILABLE = False
    xw = None
    print("⚠️  xlwings 로드 실패 - DRM 엑셀 기능 비활성화 (이미지 업로드는 정상 사용 가능)")

# ========================================
# Claude Vision: 이미지 → 정책 데이터 추출
# ========================================

EXTRACTION_PROMPT = """이 리텐션 정책 문서 이미지에서 모든 정책 혜택 데이터를 추출해서 아래 컬럼 형태의 행 배열로 반환해주세요.

컬럼 정의:
- svc_type: 서비스 유형 (예: 인터넷+TV, 인터넷, TV)
- 단독_번들여부: 단독 또는 번들 구분 (예: 번들, 단독, 번들(특화))
- 상품군: 인터넷 상품명 또는 미디어 유형 (예: 1G, 500M, 광랜, WiFi+, WiFi상향(통일), UHD (주상품), HD (주상품), 기본형, D단독TV, 동등결합)
- 약정구분: 약정 기간 (예: 3년, 2년, 1년, 무약정)
- price_grp: 현재 납부 요금대 (예: 20천원 이상, 18천원 이상, 15천원 이상, 12천원 이상, 10천원 이상, 10천원 미만, 14천원 이상, 8천원 이상, 8천원 미만)
- 정책_대분류: 번들, 번들(특화), 단독, 요금인상Care, 가치제고 중 하나
- 정책_중분류: 재약정, 후번들, 업셀링, UHD전환, 추가혜택 등
- 정책_소분류: 요금제유지, 요금제상향, 중간요금제, 최저요금제, 단독전환, 유지, 변경, 할인적용, 약정변경, 요금제 유지, 요금제 변경, 할인 적용, 약정 변경 등
- 정책판가: 정책 판매가 (숫자, 없으면 null)
- 사은품혜택: 사은품/상품권 혜택 금액 (만원 단위 숫자, 없으면 0)
- 요금할인액: 월 요금 할인액 (만원 단위 숫자, 없으면 0)
- 무료개월: 무료 제공 개월 수 (숫자, 없으면 0)
- 기타특이사항: 기타 특이사항 (문자열)

번들 재약정 테이블 (인터넷+TV 번들 고객):
- 요금대별 × 요금제 변경 유형별로 각 행 생성
- 요금대: 20천원 이상, 18천원 이상, 15천원 이상, 12천원 이상, 10천원 이상, 10천원 미만
- 요금제 유형: 유지(WiFi상향/통일요금), 유지(WiFi+), 상향(1G), 상향(500M), 상향(광랜), 중간요금제(반값요금), 최저요금제(특화요금), 단독전환

번들(특화)/동등결합 테이블:
- 요금제 유지, 요금제 변경, 할인 적용, 약정 변경

D단독 TV 테이블:
- TV 요금대: 14천원 이상, 12천원 이상, 8천원 이상, 8천원 미만
- 유지, 변경, 할인적용, 약정변경

가치제고 섹션 (후번들, 업셀링, UHD전환 등)

다음 JSON 형식으로만 반환하세요 (JSON 외 텍스트 없이):
{
  "title": "문서 제목",
  "version": "버전 (예: 2603 V1)",
  "policy_rows": [
    {
      "svc_type": "인터넷+TV",
      "단독_번들여부": "번들",
      "상품군": "1G",
      "약정구분": "3년",
      "price_grp": "20천원 이상",
      "정책_대분류": "번들",
      "정책_중분류": "재약정",
      "정책_소분류": "요금제상향",
      "정책판가": null,
      "사은품혜택": 30,
      "요금할인액": 0,
      "무료개월": 0,
      "기타특이사항": "1기가"
    }
  ]
}

숫자는 만원 단위입니다. 빈 셀/해당없음은 null(정책판가) 또는 0(사은품혜택/요금할인액/무료개월)으로 표시하세요. 이미지에 있는 모든 행을 빠짐없이 추출하세요."""


def extract_policy_from_image(image_path, category='bundle'):
    """Claude Vision API로 정책 이미지에서 데이터 추출"""
    if not ANTHROPIC_AVAILABLE:
        return None, "anthropic 라이브러리 미설치 (pip install anthropic)"
    if not ANTHROPIC_API_KEY:
        return None, "ANTHROPIC_API_KEY 환경변수 미설정"

    try:
        with open(image_path, 'rb') as f:
            image_data = base64.b64encode(f.read()).decode('utf-8')

        ext = os.path.splitext(image_path)[1].lower().lstrip('.')
        media_type = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png'}.get(ext, 'image/jpeg')

        client = _anthropic_lib.Anthropic(api_key=ANTHROPIC_API_KEY)
        response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=8000,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": image_data}},
                    {"type": "text", "text": EXTRACTION_PROMPT}
                ]
            }]
        )

        text = response.content[0].text.strip()
        # 마크다운 코드블록 제거
        if '```' in text:
            parts = text.split('```')
            for part in parts:
                part = part.strip()
                if part.startswith('json'):
                    part = part[4:]
                try:
                    return json.loads(part.strip()), None
                except Exception:
                    continue
        return json.loads(text), None

    except json.JSONDecodeError as e:
        return None, f"JSON 파싱 오류: {e}"
    except Exception as e:
        return None, f"추출 오류: {e}"


# 요금대 이름 → ID 변환
FEE_TIER_MAP = {
    '20천원이상': ('over_20k', 20000),
    '18천원이상': ('over_18k', 18000),
    '15천원이상': ('over_15k', 15000),
    '12천원이상': ('over_12k', 12000),
    '10천원이상': ('over_10k', 10000),
    '10천원미만': ('under_10k', 0),
}


def update_policies_from_extracted(policies, category, extracted):
    """추출된 flat policy_rows 데이터로 policies.json 업데이트"""
    rows = extracted.get('policy_rows', [])
    if rows:
        policies['policy_rows'] = rows

    # metadata 버전 업데이트
    if extracted.get('version') and 'metadata' in policies:
        policies['metadata']['version'] = extracted['version']

    return policies


def build_excel_from_policies(policies_data):
    """policies.json → flat Excel (policy_rows 기반, openpyxl)"""
    if not OPENPYXL_AVAILABLE:
        return None, "openpyxl 미설치"

    from openpyxl.styles import Font, PatternFill, Alignment
    wb = openpyxl.Workbook()

    FLAT_COLS = ['svc_type', '단독_번들여부', '상품군', '약정구분', 'price_grp',
                 '정책_대분류', '정책_중분류', '정책_소분류', '정책판가',
                 '사은품혜택', '요금할인액', '무료개월', '기타특이사항']

    # ── 시트1: 정책목록 (flat policy_rows) ──────────────────────────────────────
    ws1 = wb.active
    ws1.title = '정책목록'
    ws1.append(FLAT_COLS)
    for cell in ws1[1]:
        cell.font = Font(bold=True)
        cell.fill = PatternFill("solid", fgColor="D0D0D0")
        cell.alignment = Alignment(horizontal='center')

    for row in policies_data.get('policy_rows', []):
        ws1.append([row.get(col, '') for col in FLAT_COLS])

    # ── 시트2: 사용설명서 ──────────────────────────────────────
    ws2 = wb.create_sheet('사용설명서')
    ws2.append(['컬럼명', '설명', '예시값'])
    for cell in ws2[1]:
        cell.font = Font(bold=True)
        cell.fill = PatternFill("solid", fgColor="D0D0D0")
    col_desc = [
        ('svc_type', '서비스 유형', '인터넷+TV, 인터넷, TV'),
        ('단독_번들여부', '단독/번들 구분', '번들, 단독, 번들(특화)'),
        ('상품군', '인터넷 상품명 또는 미디어 유형', '1G, 500M, 광랜, WiFi+, D단독TV, 동등결합'),
        ('약정구분', '약정 기간', '3년, 2년, 1년, 무약정'),
        ('price_grp', '현재 납부 요금대', '20천원 이상, 18천원 이상, 15천원 이상, 12천원 이상, 10천원 이상, 10천원 미만'),
        ('정책_대분류', '정책 대분류', '번들, 번들(특화), 단독, 요금인상Care, 가치제고'),
        ('정책_중분류', '정책 중분류', '재약정, 후번들, 업셀링, UHD전환, 추가혜택'),
        ('정책_소분류', '정책 소분류', '요금제유지, 요금제상향, 중간요금제, 최저요금제, 단독전환, 유지, 변경, 할인적용, 약정변경'),
        ('정책판가', '정책 판매가 (만원)', 'null 또는 숫자'),
        ('사은품혜택', '사은품/상품권 혜택 금액 (만원)', '30, 25, 20, 15, 10, 0'),
        ('요금할인액', '월 요금 할인액 (만원)', '0, 2, 3, 5, 7'),
        ('무료개월', '무료 제공 개월 수', '0, 1, 2, 3'),
        ('기타특이사항', '기타 특이사항', '1기가, WiFi+, 반값요금 등'),
    ]
    for row in col_desc:
        ws2.append(list(row))

    # 열 너비 자동 조정
    for ws in [ws1, ws2]:
        for col in ws.columns:
            max_len = max((len(str(cell.value or '')) for cell in col), default=0)
            ws.column_dimensions[col[0].column_letter].width = min(max_len + 4, 40)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf, None


app = Flask(__name__)
CORS(app)

# 파일 경로
ACCESS_LOG_FILE = 'access_logs.json'
USERS_FILE = 'users.json'
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
POLICIES_JSON_PATH = os.path.join(PROJECT_ROOT, 'src', 'data', 'policies.json')
PUBLIC_ASSETS_PATH = os.path.join(PROJECT_ROOT, 'public', 'assets')

# IP 화이트리스트 설정
ENABLE_IP_WHITELIST = os.getenv('ENABLE_IP_WHITELIST', 'false').lower() == 'true'
ALLOWED_IPS = ['127.0.0.1', 'localhost']


def init_users_file():
    """사용자 파일 초기화"""
    if not os.path.exists(USERS_FILE):
        initial_data = {
            'users': [
                {
                    'id': 'admin001',
                    'name': '시스템관리자',
                    'department': 'IT팀',
                    'employeeId': '000000',
                    'status': 'approved',
                    'role': 'admin',
                    'created_at': datetime.now().isoformat(),
                    'approved_at': datetime.now().isoformat()
                }
            ]
        }
        with open(USERS_FILE, 'w', encoding='utf-8') as f:
            json.dump(initial_data, f, ensure_ascii=False, indent=2)


def load_users():
    """사용자 데이터 로드"""
    init_users_file()
    with open(USERS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_users(data):
    """사용자 데이터 저장"""
    with open(USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def log_access(log_data):
    """접속 로그 기록"""
    try:
        if os.path.exists(ACCESS_LOG_FILE):
            with open(ACCESS_LOG_FILE, 'r', encoding='utf-8') as f:
                logs = json.load(f)
        else:
            logs = []
        
        logs.append(log_data)
        logs = logs[-1000:]
        
        with open(ACCESS_LOG_FILE, 'w', encoding='utf-8') as f:
            json.dump(logs, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Log write error: {e}")


def check_ip_whitelist(f):
    """IP 화이트리스트 확인"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not ENABLE_IP_WHITELIST:
            return f(*args, **kwargs)
        
        client_ip = request.remote_addr
        allowed = any(client_ip.startswith(ip) for ip in ALLOWED_IPS)
        
        if not allowed:
            log_access({
                'ip': client_ip,
                'action': 'BLOCKED',
                'reason': 'IP not in whitelist',
                'timestamp': datetime.now().isoformat()
            })
            return jsonify({'error': '접근이 차단되었습니다.'}), 403
        
        return f(*args, **kwargs)
    return decorated_function


# ========================================
# 사용자 관리 API
# ========================================

@app.route('/api/users/register', methods=['POST'])
def register_user():
    """사용자 등록 신청"""
    try:
        data = request.json
        name = data.get('name')
        department = data.get('department')
        employee_id = data.get('employeeId')
        
        if not all([name, department, employee_id]):
            return jsonify({'error': '모든 필드를 입력해주세요.'}), 400
        
        users_data = load_users()
        
        # 중복 체크
        for user in users_data['users']:
            if user['employeeId'] == employee_id:
                if user['status'] == 'approved':
                    return jsonify({'error': '이미 승인된 사용자입니다.'}), 400
                elif user['status'] == 'pending':
                    return jsonify({'error': '승인 대기 중입니다.'}), 400
        
        # 새 사용자 추가
        new_user = {
            'id': f'user_{datetime.now().strftime("%Y%m%d%H%M%S")}',
            'name': name,
            'department': department,
            'employeeId': employee_id,
            'status': 'pending',
            'role': 'user',
            'created_at': datetime.now().isoformat(),
            'approved_at': None
        }
        
        users_data['users'].append(new_user)
        save_users(users_data)
        
        log_access({
            'action': 'USER_REGISTER',
            'user': name,
            'employee_id': employee_id,
            'timestamp': datetime.now().isoformat()
        })
        
        return jsonify({
            'success': True,
            'message': '등록 신청이 완료되었습니다. 관리자 승인을 기다려주세요.',
            'user': new_user
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/users/check', methods=['POST'])
def check_user_status():
    """사용자 상태 확인"""
    try:
        data = request.json
        employee_id = data.get('employeeId')
        
        users_data = load_users()
        
        for user in users_data['users']:
            if user['employeeId'] == employee_id:
                return jsonify({
                    'exists': True,
                    'status': user['status'],
                    'user': user
                })
        
        return jsonify({'exists': False})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/users/list', methods=['GET'])
def get_users():
    """사용자 목록 조회 (관리자용)"""
    try:
        users_data = load_users()
        return jsonify({'users': users_data['users']})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/users/approve/<user_id>', methods=['POST'])
def approve_user(user_id):
    """사용자 승인 (관리자용)"""
    try:
        users_data = load_users()
        
        for user in users_data['users']:
            if user['id'] == user_id:
                user['status'] = 'approved'
                user['approved_at'] = datetime.now().isoformat()
                save_users(users_data)
                
                log_access({
                    'action': 'USER_APPROVED',
                    'user_id': user_id,
                    'user_name': user['name'],
                    'timestamp': datetime.now().isoformat()
                })
                
                return jsonify({
                    'success': True,
                    'message': '사용자가 승인되었습니다.',
                    'user': user
                })
        
        return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/users/reject/<user_id>', methods=['POST'])
def reject_user(user_id):
    """사용자 거부 (관리자용)"""
    try:
        users_data = load_users()
        
        users_data['users'] = [u for u in users_data['users'] if u['id'] != user_id]
        save_users(users_data)
        
        log_access({
            'action': 'USER_REJECTED',
            'user_id': user_id,
            'timestamp': datetime.now().isoformat()
        })
        
        return jsonify({
            'success': True,
            'message': '사용자 신청이 거부되었습니다.'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/users/delete/<user_id>', methods=['DELETE'])
def delete_user(user_id):
    """사용자 삭제 (관리자용)"""
    try:
        users_data = load_users()
        
        # 관리자는 삭제 불가
        for user in users_data['users']:
            if user['id'] == user_id and user['role'] == 'admin':
                return jsonify({'error': '관리자는 삭제할 수 없습니다.'}), 400
        
        deleted = False
        for user in users_data['users']:
            if user['id'] == user_id:
                deleted = True
                user_name = user['name']
                break
        
        if deleted:
            users_data['users'] = [u for u in users_data['users'] if u['id'] != user_id]
            save_users(users_data)
            
            log_access({
                'action': 'USER_DELETED',
                'user_id': user_id,
                'user_name': user_name,
                'timestamp': datetime.now().isoformat()
            })
            
            return jsonify({
                'success': True,
                'message': '사용자가 삭제되었습니다.'
            })
        
        return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/users/change-role/<user_id>', methods=['POST'])
def change_user_role(user_id):
    """사용자 역할 변경 (관리자용)"""
    try:
        data = request.json
        new_role = data.get('role')
        
        if new_role not in ['admin', 'user']:
            return jsonify({'error': '유효하지 않은 역할입니다.'}), 400
        
        users_data = load_users()
        
        # 사용자 찾기
        user_found = False
        for user in users_data['users']:
            if user['id'] == user_id:
                user_found = True
                old_role = user['role']
                
                # 초기 관리자 계정(000000)은 역할 변경 불가
                if user.get('employeeId') == '000000':
                    return jsonify({'error': '초기 관리자는 역할을 변경할 수 없습니다.'}), 400
                
                # 역할 변경
                user['role'] = new_role
                user['role_changed_at'] = datetime.now().isoformat()
                
                save_users(users_data)
                
                log_access({
                    'action': 'USER_ROLE_CHANGED',
                    'user_id': user_id,
                    'user_name': user['name'],
                    'old_role': old_role,
                    'new_role': new_role,
                    'timestamp': datetime.now().isoformat()
                })
                
                return jsonify({
                    'success': True,
                    'message': f'사용자 역할이 {new_role}로 변경되었습니다.',
                    'user': user
                })
        
        if not user_found:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ========================================
# 이미지 업로드 API
# ========================================

@app.route('/api/upload-image', methods=['POST'])
@check_ip_whitelist
def upload_image():
    """정책 이미지 업로드 - public/assets에 저장 후 policies.json 업데이트"""
    if 'file' not in request.files:
        return jsonify({'error': '파일이 없습니다.'}), 400
    
    file = request.files['file']
    title = request.form.get('title', '정책 이미지')
    category = request.form.get('category', 'bundle')
    
    if file.filename == '':
        return jsonify({'error': '파일을 선택해주세요.'}), 400
    
    allowed_ext = ('.png', '.jpg', '.jpeg')
    if not file.filename.lower().endswith(allowed_ext):
        return jsonify({'error': 'PNG, JPG 이미지 파일만 업로드 가능합니다.'}), 400
    
    try:
        # public/assets 폴더 생성
        os.makedirs(PUBLIC_ASSETS_PATH, exist_ok=True)

        # 파일명 정리: 경로 제거 후 basename만 추출, 공백 → 언더스코어
        original_name = os.path.basename(file.filename).replace(' ', '_')
        # secure_filename으로 안전한 파일명 생성 (한글은 유지)
        safe_name = original_name if original_name else 'image.png'
        if not safe_name.lower().endswith(allowed_ext):
            safe_name += '.png'
        
        save_path = os.path.join(PUBLIC_ASSETS_PATH, safe_name)
        file.save(save_path)
        
        # policies.json 로드 및 업데이트
        if os.path.exists(POLICIES_JSON_PATH):
            with open(POLICIES_JSON_PATH, 'r', encoding='utf-8') as f:
                policies = json.load(f)
        else:
            return jsonify({'error': 'policies.json을 찾을 수 없습니다.'}), 500
        
        if 'policy_images' not in policies:
            policies['policy_images'] = []
        
        # 새 이미지 항목 추가
        existing_ids = [img['id'] for img in policies['policy_images']]
        new_id = 1
        while f'image_{new_id}' in existing_ids:
            new_id += 1
        
        # 웹에서 사용할 경로: /assets/파일명
        web_path = f'/assets/{safe_name}'
        
        new_image = {
            'id': f'image_{new_id}',
            'filename': web_path,
            'title': title,
            'category': category
        }
        policies['policy_images'].append(new_image)
        
        # metadata 업데이트
        if 'metadata' in policies:
            policies['metadata']['last_updated'] = datetime.now().strftime('%Y-%m-%d')
        
        # 저장
        with open(POLICIES_JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(policies, f, ensure_ascii=False, indent=2)
        
        log_access({
            'action': 'IMAGE_UPLOADED',
            'filename': safe_name,
            'title': title,
            'timestamp': datetime.now().isoformat()
        })

        # 갤러리 이미지는 정책 데이터 자동 추출하지 않음
        # (정책 데이터 변환은 /api/convert-image-to-excel 엔드포인트 사용)

        return jsonify({
            'success': True,
            'message': f'이미지가 저장되었습니다: {safe_name}',
            'image': new_image,
            'path': web_path
        })

    except Exception as e:
        return jsonify({'error': f'이미지 처리 중 오류: {str(e)}'}), 500


# ========================================
# 이미지 → 정책 데이터 변환 API (검증용, policies.json 미반영)
# ========================================

@app.route('/api/convert-image-to-excel', methods=['POST'])
@check_ip_whitelist
def convert_image_to_excel():
    """정책 이미지 → policy_rows JSON 변환 (검증용, policies.json 미반영)
    프론트엔드가 XLSX로 재생성하여 다운로드 → 검증 → 재업로드 흐름에 사용"""
    if not ANTHROPIC_AVAILABLE or not ANTHROPIC_API_KEY:
        return jsonify({
            'error': 'AI 변환을 사용하려면 ANTHROPIC_API_KEY 환경변수를 설정하세요.',
            'reason': '백엔드 서버에서: set ANTHROPIC_API_KEY=sk-ant-...'
        }), 503

    if 'file' not in request.files:
        return jsonify({'error': '파일이 없습니다.'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '파일을 선택해주세요.'}), 400

    allowed_ext = ('.png', '.jpg', '.jpeg')
    if not file.filename.lower().endswith(allowed_ext):
        return jsonify({'error': 'PNG/JPG 이미지 파일만 지원합니다.'}), 400

    try:
        ext = os.path.splitext(file.filename)[1].lower()
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name

        extracted, err = extract_policy_from_image(tmp_path)
        try:
            os.unlink(tmp_path)
        except Exception:
            pass

        if err or not extracted:
            return jsonify({'error': f'데이터 추출 실패: {err or "추출된 데이터 없음"}'}), 500

        rows = extracted.get('policy_rows', [])
        if not rows:
            return jsonify({'error': '이미지에서 정책 데이터를 추출할 수 없습니다. 이미지를 확인해주세요.'}), 400

        log_access({
            'action': 'CONVERT_IMAGE_TO_EXCEL',
            'filename': file.filename,
            'row_count': len(rows),
            'timestamp': datetime.now().isoformat()
        })

        return jsonify({
            'success': True,
            'policy_rows': rows,
            'row_count': len(rows),
            'title': extracted.get('title', ''),
            'version': extracted.get('version', '')
        })

    except Exception as e:
        return jsonify({'error': f'변환 중 오류: {str(e)}'}), 500


# ========================================
# 이미지 서빙 및 조회 API
# ========================================

@app.route('/api/images/<path:filename>', methods=['GET'])
def serve_image(filename):
    """업로드된 이미지 파일 서빙"""
    try:
        return send_from_directory(PUBLIC_ASSETS_PATH, filename)
    except Exception as e:
        return jsonify({'error': f'이미지를 찾을 수 없습니다: {filename}'}), 404


@app.route('/api/policy-images', methods=['GET'])
def get_policy_images():
    """policies.json에서 policy_images 목록 반환"""
    try:
        if os.path.exists(POLICIES_JSON_PATH):
            with open(POLICIES_JSON_PATH, 'r', encoding='utf-8') as f:
                policies = json.load(f)
            images = policies.get('policy_images', [])
            # 각 이미지의 filename을 백엔드 API URL로 변환
            for img in images:
                fname = img.get('filename', '')
                if fname.startswith('/assets/'):
                    img['url'] = fname  # 그대로 유지 (상대 경로)
                elif not fname.startswith('http'):
                    # 파일명만 추출하여 API 경로로 변환
                    basename = os.path.basename(fname)
                    img['url'] = f'/api/images/{basename}'
            return jsonify({'images': images})
        return jsonify({'images': []})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/policy-images/delete/<image_id>', methods=['DELETE'])
@check_ip_whitelist
def delete_policy_image(image_id):
    """policy_images에서 이미지 항목 삭제"""
    try:
        if not os.path.exists(POLICIES_JSON_PATH):
            return jsonify({'error': 'policies.json을 찾을 수 없습니다.'}), 500

        with open(POLICIES_JSON_PATH, 'r', encoding='utf-8') as f:
            policies = json.load(f)

        images = policies.get('policy_images', [])
        target = next((img for img in images if img['id'] == image_id), None)
        if not target:
            return jsonify({'error': '이미지를 찾을 수 없습니다.'}), 404

        # 파일 삭제
        fname = os.path.basename(target.get('filename', ''))
        file_path = os.path.join(PUBLIC_ASSETS_PATH, fname)
        if os.path.exists(file_path):
            os.remove(file_path)

        policies['policy_images'] = [img for img in images if img['id'] != image_id]
        with open(POLICIES_JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(policies, f, ensure_ascii=False, indent=2)

        # 삭제 후 git push
        if AUTO_GIT_PUSH:
            try:
                subprocess.run(['git', 'add', '-A'], cwd=PROJECT_ROOT, capture_output=True, timeout=10)
                subprocess.run(['git', 'commit', '-m', f'chore: 정책 이미지 삭제 - {fname}'],
                               cwd=PROJECT_ROOT, capture_output=True, timeout=10)
                subprocess.run(['git', 'push', 'origin', 'main'],
                               cwd=PROJECT_ROOT, capture_output=True, timeout=30)
            except Exception:
                pass

        return jsonify({'success': True, 'message': '이미지가 삭제되었습니다.'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ========================================
# 기존 API (엑셀 업로드 등)
# ========================================

@app.route('/api/upload-excel', methods=['POST'])
@check_ip_whitelist
def upload_excel():
    """엑셀 파일 업로드 → policies.json 자동 업데이트
    1순위: openpyxl (일반 xlsx)
    2순위: xlwings (DRM 보호 파일, Windows+Excel 필요)
    """
    log_access({'action': 'UPLOAD_EXCEL', 'ip': request.remote_addr,
                'timestamp': datetime.now().isoformat()})

    if 'file' not in request.files:
        return jsonify({'error': '파일이 없습니다.'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '파일이 선택되지 않았습니다.'}), 400
    if not file.filename.endswith(('.xlsx', '.xls', '.xlsm')):
        return jsonify({'error': '엑셀 파일만 업로드 가능합니다.'}), 400

    file_bytes = file.read()

    # ── 1순위: openpyxl (DRM 없는 일반 xlsx) ──────────────────────────────
    policy_data = None
    parse_error = None
    try:
        wb_op = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
        policy_data = parse_policy_openpyxl(wb_op)
        print("✅ openpyxl 파싱 성공")
    except Exception as e:
        parse_error = str(e)
        print(f"⚠️ openpyxl 실패 ({e}), xlwings fallback 시도...")

    # ── 2순위: xlwings fallback (DRM 파일) ──────────────────────────────
    if policy_data is None:
        if not XLWINGS_AVAILABLE:
            return jsonify({
                'error': f'파일을 열 수 없습니다: {parse_error}',
                'reason': 'DRM 파일이면 Microsoft Excel이 설치된 Windows에서 백엔드를 실행하세요.'
            }), 503

        app_excel = None
        temp_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx', dir=os.getcwd()) as tmp:
                tmp.write(file_bytes)
                temp_path = tmp.name
            app_excel = xw.App(visible=True, add_book=False)
            wb_xw = app_excel.books.open(temp_path, update_links=False, read_only=True)
            policy_data = parse_policy_xlwings(wb_xw)
            wb_xw.close()
            print("✅ xlwings 파싱 성공")
        except Exception as e2:
            return jsonify({'error': f'파일 처리 중 오류 발생: {e2}', 'reason': str(parse_error)}), 500
        finally:
            if app_excel:
                try: app_excel.quit()
                except: pass
            if temp_path and os.path.exists(temp_path):
                try: os.unlink(temp_path)
                except: pass

    # ── policies.json 병합 업데이트 ──────────────────────────────────────
    try:
        with open(POLICIES_JSON_PATH, 'r', encoding='utf-8') as f:
            policies = json.load(f)

        # 신규 flat 형식
        if policy_data.get('policy_rows'):
            policies['policy_rows'] = policy_data['policy_rows']
        # 기존 중첩 형식 (하위 호환)
        if policy_data.get('bundle_retention_matrix', {}).get('rows'):
            policies['bundle_retention_matrix']['rows'] = policy_data['bundle_retention_matrix']['rows']
        if policy_data.get('digital_renewal', {}).get('main_products'):
            policies['digital_renewal']['main_products'] = policy_data['digital_renewal']['main_products']
        if policy_data.get('digital_renewal', {}).get('sub_products'):
            policies['digital_renewal']['sub_products'] = policy_data['digital_renewal']['sub_products']
        if policy_data.get('equal_bundle', {}).get('categories'):
            policies['equal_bundle']['categories'] = policy_data['equal_bundle']['categories']
        if policy_data.get('d_standalone', {}).get('price_tiers'):
            policies['d_standalone']['price_tiers'] = policy_data['d_standalone']['price_tiers']

        policies['metadata']['last_updated'] = datetime.now().strftime('%Y-%m-%d')

        with open(POLICIES_JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(policies, f, ensure_ascii=False, indent=2)

        # git push → Vercel 자동 재배포
        git_pushed = False
        if AUTO_GIT_PUSH:
            try:
                git_email = os.environ.get('GIT_USER_EMAIL', 'retention-admin@localhost')
                git_name = os.environ.get('GIT_USER_NAME', 'Retention Admin')
                subprocess.run(['git', 'config', 'user.email', git_email], cwd=PROJECT_ROOT, capture_output=True, timeout=10)
                subprocess.run(['git', 'config', 'user.name', git_name], cwd=PROJECT_ROOT, capture_output=True, timeout=10)
                subprocess.run(['git', 'add', POLICIES_JSON_PATH], cwd=PROJECT_ROOT, capture_output=True, timeout=10)
                r = subprocess.run(['git', 'commit', '-m', f'chore: 정책 엑셀 업데이트 - {file.filename}'],
                                   cwd=PROJECT_ROOT, capture_output=True, text=True, timeout=15)
                if 'nothing to commit' not in (r.stdout + r.stderr):
                    rp = subprocess.run(['git', 'push', 'origin', 'main'], cwd=PROJECT_ROOT, capture_output=True, text=True, timeout=30)
                    git_pushed = rp.returncode == 0
            except Exception as ge:
                print(f"git push 오류: {ge}")

        msg = f'엑셀 파일이 성공적으로 처리되었습니다.\npolicies.json에 자동 반영되었습니다.'
        if git_pushed:
            msg += '\n\nGitHub에 반영되었습니다. Vercel 재배포 후 사이트에 표시됩니다.'

        return jsonify({'success': True, 'data': policies, 'message': msg, 'git_pushed': git_pushed})

    except Exception as e:
        # policies.json 업데이트 실패 시 데이터만 반환 (이전 방식)
        return jsonify({'success': True, 'data': policy_data,
                        'message': f'파싱 완료. policies.json 자동 업데이트 실패: {e}\n아래 JSON을 수동으로 적용하세요.'})


def _cell_val(ws, row, col):
    """openpyxl 셀 값 반환 (None 안전)"""
    v = ws.cell(row=row, column=col).value
    return v


def _int_val(ws, row, col, default=0):
    v = _cell_val(ws, row, col)
    try: return int(float(v)) if v is not None else default
    except: return default


def parse_policy_openpyxl(wb):
    """openpyxl workbook → policies.json 형식 dict
    신규 플랫 형식(13컬럼) 또는 기존 다시트 형식 모두 지원"""
    # ── 신규 flat 컬럼 형식 감지 ─────────────────────────────────────
    FLAT_COLS = ['svc_type', '단독_번들여부', '상품군', '약정구분', 'price_grp',
                 '정책_대분류', '정책_중분류', '정책_소분류', '정책판가',
                 '사은품혜택', '요금할인액', '무료개월', '기타특이사항']
    NUM_COLS = {'사은품혜택', '요금할인액', '무료개월'}

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        if ws.max_row < 2:
            continue
        headers = [str(ws.cell(row=1, column=i).value or '').strip() for i in range(1, ws.max_column + 1)]
        # 첫 행에 FLAT_COLS 중 3개 이상 매칭되면 flat 형식으로 판단
        matched = sum(1 for h in headers if h in FLAT_COLS)
        if matched >= 3:
            col_idx = {h: (i + 1) for i, h in enumerate(headers) if h in FLAT_COLS}
            policy_rows = []
            for row in range(2, ws.max_row + 1):
                first_val = _cell_val(ws, row, col_idx.get('svc_type', 1))
                if first_val is None:
                    # svc_type 없어도 다른 컬럼 값이 있으면 포함
                    any_val = any(_cell_val(ws, row, ci) for ci in col_idx.values())
                    if not any_val:
                        continue
                pr = {}
                for col_name, ci in col_idx.items():
                    v = _cell_val(ws, row, ci)
                    if col_name in NUM_COLS:
                        try:
                            v = int(float(v)) if v is not None else 0
                        except Exception:
                            v = 0
                    pr[col_name] = v
                policy_rows.append(pr)
            if policy_rows:
                print(f"  flat 형식 감지: {sheet_name} → {len(policy_rows)}행")
                return {'policy_rows': policy_rows}

    # ── 기존 다시트 형식 ─────────────────────────────────────────────
    POLICY_TYPE_MAP = {
        '유지': 'maintain', '요금제 유지': 'maintain', '요금제유지': 'maintain',
        '상향': 'upgrade', '요금제 상향': 'upgrade', '요금제상향': 'upgrade',
        '중간': 'middle', '중간요금제': 'middle',
        '최저': 'lowest', '최저요금제': 'lowest',
        '단독': 'standalone', '단독전환': 'standalone',
    }
    SUB_PRODUCT_MAP = {
        '통일요금': 'unified', '통일요금/wifi상향': 'unified', '동일상품wifi상향': 'unified',
        'wifi+': 'wifi_plus', 'wifi상향': 'unified',
        '1g': '1g', '1g(기가)': '1g', '기가': '1g',
        '500m': '500m',
        '광랜': 'gwanglan',
        '반값요금': 'half_price', '반값': 'half_price',
        '특화요금': 'special', '특화': 'special',
        '인터넷단독': 'internet_only',
    }
    FEE_TIER_IDS = {
        '20천원이상': 'over_20k', '18천원이상': 'over_18k', '15천원이상': 'over_15k',
        '12천원이상': 'over_12k', '10천원이상': 'over_10k', '10천원미만': 'under_10k',
    }
    DSTANDALONE_TIER_IDS = {
        '14천원이상': 'over_14k', '12천원이상': 'over_12k', '8천원이상': 'over_8k', '8천원미만': 'under_8k',
    }

    result = {
        'bundle_retention_matrix': {'rows': []},
        'digital_renewal': {'main_products': [], 'sub_products': []},
        'equal_bundle': {'categories': []},
        'd_standalone': {'price_tiers': []},
    }

    sheet_names = wb.sheetnames

    # ── 번들재약정 시트 ──────────────────────────────────────────────────
    bundle_sheet = next((s for s in sheet_names if '번들재약정' in s or '번들' in s.lower()), None)
    if bundle_sheet:
        ws = wb[bundle_sheet]
        tiers_data = {}  # tier_name -> {action_id -> {sub_id -> {gift_card, iptv}}}
        tiers_order = []
        for row in range(2, ws.max_row + 1):
            tier = str(_cell_val(ws, row, 2) or '').strip()
            if not tier:
                continue
            policy_raw = str(_cell_val(ws, row, 3) or '').strip()
            sub_raw = str(_cell_val(ws, row, 4) or '').strip()
            gift_card = _int_val(ws, row, 5)
            iptv = _int_val(ws, row, 6)
            notes = str(_cell_val(ws, row, 7) or '')

            action_id = POLICY_TYPE_MAP.get(policy_raw, POLICY_TYPE_MAP.get(policy_raw.lower(), policy_raw.lower()))
            sub_id = SUB_PRODUCT_MAP.get(sub_raw, SUB_PRODUCT_MAP.get(sub_raw.lower(), sub_raw.lower().replace(' ', '_')))

            tier_norm = tier.replace(' ', '')
            if tier_norm not in tiers_data:
                tiers_data[tier_norm] = {}
                tiers_order.append((tier_norm, tier))
            if action_id not in tiers_data[tier_norm]:
                tiers_data[tier_norm][action_id] = {}
            tiers_data[tier_norm][action_id][sub_id] = {'gift_card': gift_card, 'iptv': iptv, 'notes': notes}

        for tier_norm, tier_original in tiers_order:
            tier_id = FEE_TIER_IDS.get(tier_norm, tier_norm.lower())
            result['bundle_retention_matrix']['rows'].append({
                'id': tier_id, 'name': tier_original, 'data': tiers_data[tier_norm]
            })
        print(f"  번들재약정: {len(result['bundle_retention_matrix']['rows'])}개 요금대")

    # ── 디지털재약정 시트 ──────────────────────────────────────────────────
    digital_sheet = next((s for s in sheet_names if '디지털' in s), None)
    if digital_sheet:
        ws = wb[digital_sheet]
        for row in range(2, ws.max_row + 1):
            name = str(_cell_val(ws, row, 1) or '').strip()
            if not name:
                continue
            monthly_fee = _cell_val(ws, row, 2)
            try: monthly_fee = float(str(monthly_fee).replace('만원', '')) if monthly_fee else 0
            except: monthly_fee = 0
            prod = {
                'id': name.lower().replace(' ', '_').replace('(', '').replace(')', ''),
                'name': name,
                'monthly_fee': monthly_fee,
                'benefits': {
                    'maintain': {'gift_card': _int_val(ws, row, 3), 'discount': _int_val(ws, row, 4)},
                    'upgrade':  {'gift_card': _int_val(ws, row, 5), 'discount': _int_val(ws, row, 6)},
                }
            }
            notes = str(_cell_val(ws, row, 7) or '')
            if '주상품' in notes:
                result['digital_renewal']['main_products'].append(prod)
            else:
                result['digital_renewal']['sub_products'].append(prod)

    # ── 동등결합 시트 ──────────────────────────────────────────────────
    eq_sheet = next((s for s in sheet_names if '동등결합' in s or '결합' in s), None)
    if eq_sheet:
        ws = wb[eq_sheet]
        for row in range(2, ws.max_row + 1):
            name = str(_cell_val(ws, row, 1) or '').strip()
            if not name:
                continue
            cat_id = POLICY_TYPE_MAP.get(name, name.lower().replace(' ', '_'))
            result['equal_bundle']['categories'].append({
                'id': cat_id, 'name': name,
                'gift_card': _int_val(ws, row, 2),
                'discount': _int_val(ws, row, 3),
                'description': str(_cell_val(ws, row, 4) or ''),
            })

    # ── D단독 시트 ──────────────────────────────────────────────────
    ds_sheet = next((s for s in sheet_names if 'D단독' in s or 'd단독' in s.lower()), None)
    if ds_sheet:
        ws = wb[ds_sheet]
        for row in range(2, ws.max_row + 1):
            tier = str(_cell_val(ws, row, 1) or '').strip()
            if not tier:
                continue
            tier_norm = tier.replace(' ', '')
            tier_id = DSTANDALONE_TIER_IDS.get(tier_norm, tier_norm.lower())
            result['d_standalone']['price_tiers'].append({
                'id': tier_id, 'name': tier,
                'policies': {
                    'maintain':         {'gift_card': _int_val(ws, row, 2), 'discount': _int_val(ws, row, 3)},
                    'change':           {'gift_card': _int_val(ws, row, 4), 'discount': _int_val(ws, row, 5)},
                    'discount_apply':   {'gift_card': _int_val(ws, row, 6), 'discount': _int_val(ws, row, 7)},
                    'contract_change':  {'gift_card': _int_val(ws, row, 8), 'discount': _int_val(ws, row, 9)},
                }
            })

    return result


def parse_policy_xlwings(wb):
    """xlwings workbook → policies.json 형식 dict (DRM 파일용)
    내부적으로 openpyxl 없이 xlwings API 사용"""
    def sv(sheet, row, col):
        try: return sheet.range(f'{chr(64+col)}{row}').value
        except: return None
    def iv(sheet, row, col):
        v = sv(sheet, row, col)
        try: return int(float(v)) if v is not None else 0
        except: return 0

    POLICY_TYPE_MAP = {
        '유지': 'maintain', '상향': 'upgrade', '중간': 'middle', '중간요금제': 'middle',
        '최저': 'lowest', '최저요금제': 'lowest', '단독': 'standalone', '단독전환': 'standalone',
    }
    SUB_PRODUCT_MAP = {
        '통일요금': 'unified', 'wifi+': 'wifi_plus', '1g': '1g', '1g(기가)': '1g',
        '500m': '500m', '광랜': 'gwanglan', '반값요금': 'half_price',
        '특화요금': 'special', '인터넷단독': 'internet_only',
    }
    FEE_TIER_IDS = {
        '20천원이상': 'over_20k', '18천원이상': 'over_18k', '15천원이상': 'over_15k',
        '12천원이상': 'over_12k', '10천원이상': 'over_10k', '10천원미만': 'under_10k',
    }

    result = {
        'bundle_retention_matrix': {'rows': []},
        'digital_renewal': {'main_products': [], 'sub_products': []},
        'equal_bundle': {'categories': []},
        'd_standalone': {'price_tiers': []},
    }
    sheet_names = [s.name for s in wb.sheets]

    bundle_sheet = next((s for s in sheet_names if '번들재약정' in s), None)
    if bundle_sheet:
        ws = wb.sheets[bundle_sheet]
        row, tiers_data, tiers_order = 2, {}, []
        while True:
            tier = sv(ws, row, 2)
            if tier is None and row > 5: break
            if tier:
                tier_raw = str(tier).strip()
                policy_raw = str(sv(ws, row, 3) or '').strip()
                sub_raw = str(sv(ws, row, 4) or '').strip()
                gift_card = iv(ws, row, 5)
                iptv = iv(ws, row, 6)
                action_id = POLICY_TYPE_MAP.get(policy_raw, policy_raw.lower())
                sub_id = SUB_PRODUCT_MAP.get(sub_raw, SUB_PRODUCT_MAP.get(sub_raw.lower(), sub_raw.lower().replace(' ', '_')))
                tier_norm = tier_raw.replace(' ', '')
                if tier_norm not in tiers_data:
                    tiers_data[tier_norm] = {}
                    tiers_order.append((tier_norm, tier_raw))
                if action_id not in tiers_data[tier_norm]:
                    tiers_data[tier_norm][action_id] = {}
                tiers_data[tier_norm][action_id][sub_id] = {'gift_card': gift_card, 'iptv': iptv}
            row += 1
            if row > 200: break
        for tier_norm, tier_orig in tiers_order:
            result['bundle_retention_matrix']['rows'].append({
                'id': FEE_TIER_IDS.get(tier_norm, tier_norm.lower()),
                'name': tier_orig, 'data': tiers_data[tier_norm]
            })

    return result


def parse_policy_excel(wb):
    """엑셀 파싱 - 각 시트의 데이터를 읽어 JSON 구조로 변환"""
    policy_data = {
        'bundle_retention_matrix': {
            'rows': [],
            'columns': []
        },
        'digital_renewal': {
            'description': '디지털(TV) 재약정 정책',
            'main_products': [],
            'sub_products': []
        },
        'equal_bundle': {
            'description': '동등결합 고객 정책',
            'policies': []
        },
        'd_standalone': {
            'description': 'D단독 고객 정책',
            'tiers': []
        }
    }
    
    try:
        # 1. 번들 재약정 시트 파싱
        if '1.번들재약정' in [sheet.name for sheet in wb.sheets]:
            sheet = wb.sheets['1.번들재약정']
            parse_bundle_retention(sheet, policy_data)
            print("✅ 번들재약정 시트 파싱 완료")
        
        # 2. 디지털 재약정 시트 파싱
        if '2.디지털재약정' in [sheet.name for sheet in wb.sheets]:
            sheet = wb.sheets['2.디지털재약정']
            parse_digital_renewal(sheet, policy_data)
            print("✅ 디지털재약정 시트 파싱 완료")
        
        # 3. 동등결합 시트 파싱
        if '3.동등결합' in [sheet.name for sheet in wb.sheets]:
            sheet = wb.sheets['3.동등결합']
            parse_equal_bundle(sheet, policy_data)
            print("✅ 동등결합 시트 파싱 완료")
        
        # 4. D단독 시트 파싱
        if '4.D단독' in [sheet.name for sheet in wb.sheets]:
            sheet = wb.sheets['4.D단독']
            parse_d_standalone(sheet, policy_data)
            print("✅ D단독 시트 파싱 완료")
        
    except Exception as e:
        print(f"⚠️ 파싱 중 오류: {str(e)}")
        raise
    
    return policy_data


def parse_bundle_retention(sheet, policy_data):
    """번들 재약정 시트 파싱"""
    # 데이터는 2행부터 시작 (1행은 헤더)
    row = 2
    current_segment = None
    
    while True:
        try:
            # A열: 판가구간
            segment = sheet.range(f'A{row}').value
            if segment is None:
                break
            
            # B열: 방어정책
            policy = sheet.range(f'B{row}').value
            # C열: 세부상품
            product = sheet.range(f'C{row}').value
            # D열: 상품권
            gift_card = sheet.range(f'D{row}').value or 0
            # E열: IPTV
            iptv = sheet.range(f'E{row}').value or 0
            
            # 구간별로 그룹화
            if segment and segment != current_segment:
                current_segment = segment
                # 새 구간 추가
                segment_id = segment.replace('천원 이상', 'k').replace('천원 미만', 'k_below')
                policy_data['bundle_retention_matrix']['rows'].append({
                    'id': segment_id,
                    'name': segment,
                    'data': {}
                })
            
            # 정책 및 상품 데이터 추가
            # TODO: 실제 구조에 맞게 조정 필요
            
            row += 1
            
        except Exception as e:
            print(f"행 {row} 파싱 오류: {e}")
            row += 1
            if row > 100:  # 안전장치
                break


def parse_digital_renewal(sheet, policy_data):
    """디지털 재약정 시트 파싱"""
    row = 2
    
    while True:
        try:
            # A열: 상품명
            product_name = sheet.range(f'A{row}').value
            if product_name is None:
                break
            
            # B열: 월요금
            monthly_fee = sheet.range(f'B{row}').value or 0
            # C열: 유지_상품권
            maintain_gift = sheet.range(f'C{row}').value or 0
            # D열: 유지_할인
            maintain_discount = sheet.range(f'D{row}').value or 0
            # E열: 상향_상품권
            upgrade_gift = sheet.range(f'E{row}').value or 0
            # F열: 상향_할인
            upgrade_discount = sheet.range(f'F{row}').value or 0
            
            product_data = {
                'id': product_name.lower().replace(' ', '_'),
                'name': product_name,
                'monthly_fee': float(monthly_fee) if monthly_fee else 0,
                'benefits': {
                    'maintain': {
                        'gift_card': int(maintain_gift) if maintain_gift else 0,
                        'discount': int(maintain_discount) if maintain_discount else 0
                    },
                    'upgrade': {
                        'gift_card': int(upgrade_gift) if upgrade_gift else 0,
                        'discount': int(upgrade_discount) if upgrade_discount else 0
                    }
                }
            }
            
            # 주상품/복수상품 구분 (비고 컬럼 확인)
            notes = sheet.range(f'G{row}').value or ''
            if '주상품' in str(notes):
                policy_data['digital_renewal']['main_products'].append(product_data)
            else:
                policy_data['digital_renewal']['sub_products'].append(product_data)
            
            row += 1
            
        except Exception as e:
            print(f"행 {row} 파싱 오류: {e}")
            row += 1
            if row > 100:
                break


def parse_equal_bundle(sheet, policy_data):
    """동등결합 시트 파싱"""
    row = 2
    
    while True:
        try:
            # A열: 방어정책
            policy_type = sheet.range(f'A{row}').value
            if policy_type is None:
                break
            
            # B열: 상품권
            gift_card = sheet.range(f'B{row}').value or 0
            # C열: 월할인
            discount = sheet.range(f'C{row}').value or 0
            # D열: 설명
            description = sheet.range(f'D{row}').value or ''
            
            policy_data['equal_bundle']['policies'].append({
                'id': policy_type.lower().replace(' ', '_'),
                'name': policy_type,
                'gift_card': int(gift_card) if gift_card else 0,
                'monthly_discount': int(discount) if discount else 0,
                'description': description
            })
            
            row += 1
            
        except Exception as e:
            print(f"행 {row} 파싱 오류: {e}")
            row += 1
            if row > 100:
                break


def parse_d_standalone(sheet, policy_data):
    """D단독 시트 파싱"""
    row = 2
    
    while True:
        try:
            # A열: 판가구간
            tier = sheet.range(f'A{row}').value
            if tier is None:
                break
            
            tier_data = {
                'id': tier.replace('천원 이상', 'k').replace('천원 미만', 'k_below'),
                'name': tier,
                'policies': {
                    'maintain': {
                        'gift_card': int(sheet.range(f'B{row}').value or 0),
                        'discount': int(sheet.range(f'C{row}').value or 0)
                    },
                    'change': {
                        'gift_card': int(sheet.range(f'D{row}').value or 0),
                        'discount': int(sheet.range(f'E{row}').value or 0)
                    },
                    'discount_apply': {
                        'gift_card': int(sheet.range(f'F{row}').value or 0),
                        'discount': int(sheet.range(f'G{row}').value or 0)
                    },
                    'contract_change': {
                        'gift_card': int(sheet.range(f'H{row}').value or 0),
                        'discount': int(sheet.range(f'I{row}').value or 0)
                    }
                }
            }
            
            policy_data['d_standalone']['tiers'].append(tier_data)
            
            row += 1
            
        except Exception as e:
            print(f"행 {row} 파싱 오류: {e}")
            row += 1
            if row > 100:
                break


# ========================================
# 정책 이미지 → 데이터 추출 API
# ========================================

@app.route('/api/extract-policy', methods=['POST'])
@check_ip_whitelist
def extract_policy():
    """업로드된 이미지에서 Claude Vision으로 정책 데이터 추출 후 policies.json 업데이트"""
    data = request.json or {}
    filename = data.get('filename', '')
    category = data.get('category', 'bundle')

    if not filename:
        return jsonify({'error': '파일명이 필요합니다.'}), 400

    # 파일 경로 결정
    basename = os.path.basename(filename.replace('/assets/', ''))
    image_path = os.path.join(PUBLIC_ASSETS_PATH, basename)

    if not os.path.exists(image_path):
        return jsonify({'error': f'이미지 파일을 찾을 수 없습니다: {basename}'}), 404

    if not ANTHROPIC_AVAILABLE or not ANTHROPIC_API_KEY:
        return jsonify({
            'error': 'Claude Vision API를 사용할 수 없습니다.',
            'reason': 'ANTHROPIC_API_KEY 환경변수를 설정하거나 pip install anthropic 을 실행하세요.'
        }), 503

    extracted, err = extract_policy_from_image(image_path, category)
    if err:
        return jsonify({'error': f'데이터 추출 실패: {err}'}), 500

    # policies.json 업데이트
    try:
        with open(POLICIES_JSON_PATH, 'r', encoding='utf-8') as f:
            policies = json.load(f)

        policies = update_policies_from_extracted(policies, category, extracted)
        policies['metadata']['last_updated'] = datetime.now().strftime('%Y-%m-%d')

        with open(POLICIES_JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(policies, f, ensure_ascii=False, indent=2)

        # git push
        if AUTO_GIT_PUSH:
            try:
                git_email = os.environ.get('GIT_USER_EMAIL', 'retention-admin@localhost')
                git_name = os.environ.get('GIT_USER_NAME', 'Retention Admin')
                subprocess.run(['git', 'config', 'user.email', git_email], cwd=PROJECT_ROOT, capture_output=True, timeout=10)
                subprocess.run(['git', 'config', 'user.name', git_name], cwd=PROJECT_ROOT, capture_output=True, timeout=10)
                subprocess.run(['git', 'add', POLICIES_JSON_PATH], cwd=PROJECT_ROOT, capture_output=True, timeout=10)
                subprocess.run(['git', 'commit', '-m', f'chore: 정책 데이터 자동 추출 업데이트 - {basename}'],
                               cwd=PROJECT_ROOT, capture_output=True, timeout=10)
                subprocess.run(['git', 'push', 'origin', 'main'], cwd=PROJECT_ROOT, capture_output=True, timeout=30)
            except Exception:
                pass

        log_access({'action': 'POLICY_EXTRACTED', 'filename': basename, 'category': category,
                    'timestamp': datetime.now().isoformat()})

        return jsonify({'success': True, 'extracted': extracted,
                        'message': '정책 데이터가 추출되어 policies.json에 반영되었습니다.'})

    except Exception as e:
        return jsonify({'error': f'policies.json 업데이트 실패: {str(e)}'}), 500


@app.route('/api/export-excel', methods=['GET'])
def export_excel():
    """현재 policies.json 데이터를 Excel 파일로 내보내기"""
    try:
        with open(POLICIES_JSON_PATH, 'r', encoding='utf-8') as f:
            policies = json.load(f)

        buf, err = build_excel_from_policies(policies)
        if err:
            return jsonify({'error': err}), 500

        version = policies.get('metadata', {}).get('version', 'v1')
        date_str = datetime.now().strftime('%Y%m%d')
        filename = f'리텐션정책_{version}_{date_str}.xlsx'

        return send_file(
            buf,
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """서버 상태 확인"""
    return jsonify({
        'status': 'ok',
        'message': 'Flask server is running',
        'xlwings': XLWINGS_AVAILABLE,
        'vision_api': ANTHROPIC_AVAILABLE and bool(ANTHROPIC_API_KEY),
        'excel_export': OPENPYXL_AVAILABLE
    })


@app.route('/api/access-logs', methods=['GET'])
def get_access_logs():
    """접속 로그 조회"""
    try:
        if os.path.exists(ACCESS_LOG_FILE):
            with open(ACCESS_LOG_FILE, 'r', encoding='utf-8') as f:
                logs = json.load(f)
            return jsonify({'logs': logs[-100:]})
        return jsonify({'logs': []})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    init_users_file()
    
    print("=" * 50)
    print("Flask 백엔드 서버 시작")
    print("=" * 50)
    print(f"IP 화이트리스트: {'활성화 ✓' if ENABLE_IP_WHITELIST else '비활성화 (개발 모드)'}")
    print(f"서버 URL: http://localhost:5000")
    print(f"초기 관리자: 000000 (사번)")
    print("=" * 50)
    
    app.run(debug=True, port=5000, host='0.0.0.0')
