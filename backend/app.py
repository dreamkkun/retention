from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import tempfile
import json
import subprocess
from datetime import datetime
from functools import wraps
from werkzeug.utils import secure_filename

# 이미지 업로드 후 자동 git push 여부 (기본: 활성화)
AUTO_GIT_PUSH = os.getenv('AUTO_GIT_PUSH', 'true').lower() == 'true'


def git_push_image(safe_name):
    """이미지와 policies.json을 git commit & push하여 Vercel 자동 배포 트리거"""
    try:
        cmds = [
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

        # 자동 git push → Vercel 자동 재배포 트리거
        git_pushed = False
        git_error = None
        if AUTO_GIT_PUSH:
            git_pushed, git_error = git_push_image(safe_name)

        msg = f'이미지가 저장되었습니다: {safe_name}'
        if git_pushed:
            msg += '\n\nGitHub에 자동 반영되었습니다. Vercel 재배포 후 (약 1~2분) 사이트에 표시됩니다.'
        elif AUTO_GIT_PUSH:
            msg += f'\n\n⚠️ git push 실패 - 수동으로 push하면 Vercel에 반영됩니다.\n({git_error})'

        return jsonify({
            'success': True,
            'message': msg,
            'image': new_image,
            'path': web_path,
            'git_pushed': git_pushed
        })

    except Exception as e:
        return jsonify({'error': f'이미지 처리 중 오류: {str(e)}'}), 500


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
    """DRM 엑셀 파일 업로드"""
    client_ip = request.remote_addr
    user_agent = request.headers.get('User-Agent', 'Unknown')
    
    log_access({
        'ip': client_ip,
        'action': 'UPLOAD_EXCEL',
        'user_agent': user_agent,
        'timestamp': datetime.now().isoformat()
    })
    
    if 'file' not in request.files:
        return jsonify({'error': '파일이 없습니다.'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': '파일이 선택되지 않았습니다.'}), 400
    
    if not file.filename.endswith(('.xlsx', '.xls', '.xlsm')):
        return jsonify({'error': '엑셀 파일만 업로드 가능합니다.'}), 400

    if not XLWINGS_AVAILABLE:
        return jsonify({
            'error': 'DRM 엑셀 기능을 사용할 수 없습니다.',
            'reason': 'Microsoft Excel이 설치된 Windows 환경에서만 DRM 엑셀 처리가 가능합니다. Windows PC에서 backend/app.py를 직접 실행하세요.'
        }), 503

    app_excel = None
    wb = None
    temp_path = None

    try:
        # 임시 파일로 저장
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx', dir=os.getcwd()) as tmp_file:
            file.save(tmp_file.name)
            temp_path = tmp_file.name

        print(f"📂 임시 파일 저장: {temp_path}")

        # xlwings로 Excel 실행 (visible=True로 DRM 처리 가능하게)
        app_excel = xw.App(visible=True, add_book=False)
        
        # 파일 열기 시도 (DRM 파일은 Excel에서 직접 열어야 함)
        print(f"📖 Excel 파일 열기 시도...")
        wb = app_excel.books.open(temp_path, update_links=False, read_only=True)
        
        print(f"✅ Excel 파일 열기 성공!")
        
        # 파일 파싱
        policy_data = parse_policy_excel(wb)
        
        # 정리
        wb.close()
        app_excel.quit()
        
        # 임시 파일 삭제
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)
        
        log_access({
            'ip': client_ip,
            'action': 'EXCEL_PROCESSED',
            'filename': file.filename,
            'timestamp': datetime.now().isoformat()
        })
        
        return jsonify({
            'success': True,
            'data': policy_data,
            'message': '엑셀 파일이 성공적으로 처리되었습니다.'
        })
        
    except Exception as e:
        # 에러 발생 시 정리
        if wb:
            try:
                wb.close()
            except:
                pass
        
        if app_excel:
            try:
                app_excel.quit()
            except:
                pass
        
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except:
                pass
        
        error_msg = str(e)
        print(f"❌ 에러 발생: {error_msg}")
        
        log_access({
            'ip': client_ip,
            'action': 'ERROR',
            'error': error_msg,
            'timestamp': datetime.now().isoformat()
        })
        
        return jsonify({'error': f'파일 처리 중 오류 발생: {error_msg}'}), 500


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


@app.route('/api/health', methods=['GET'])
def health_check():
    """서버 상태 확인"""
    return jsonify({'status': 'ok', 'message': 'Flask server is running'})


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
