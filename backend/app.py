from flask import Flask, request, jsonify
from flask_cors import CORS
import xlwings as xw
import os
import tempfile
import json
from datetime import datetime
from functools import wraps

app = Flask(__name__)
CORS(app)

# 파일 경로
ACCESS_LOG_FILE = 'access_logs.json'
USERS_FILE = 'users.json'

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
    """엑셀 파싱 (기존 로직)"""
    policy_data = {
        'bundle_retention': [],
        'digital_renewal': [],
        'equal_bundle': [],
        'd_standalone': []
    }
    
    # 시트별 파싱 로직 (기존 코드)
    return policy_data


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
