from flask import Flask, request, jsonify
from flask_cors import CORS
import xlwings as xw
import os
import tempfile
import json
from datetime import datetime
from functools import wraps

app = Flask(__name__)
CORS(app)  # React 앱에서 접근 허용

# 접속 로그 파일
ACCESS_LOG_FILE = 'access_logs.json'

# IP 화이트리스트 (배포 시 설정)
# 환경 변수 ENABLE_IP_WHITELIST=true 설정 시 활성화
ENABLE_IP_WHITELIST = os.getenv('ENABLE_IP_WHITELIST', 'false').lower() == 'true'

ALLOWED_IPS = [
    '127.0.0.1',
    'localhost',
    # 배포 시 사내 IP 대역 추가
    # '192.168.1.',
    # '10.0.0.',
    # '172.16.',
]

def check_ip_whitelist(f):
    """IP 화이트리스트 확인 데코레이터"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # IP 체크가 비활성화되어 있으면 통과
        if not ENABLE_IP_WHITELIST:
            return f(*args, **kwargs)
        
        client_ip = request.remote_addr
        
        # IP 화이트리스트 확인
        allowed = any(client_ip.startswith(ip) for ip in ALLOWED_IPS)
        
        if not allowed:
            log_access({
                'ip': client_ip,
                'action': 'BLOCKED',
                'reason': 'IP not in whitelist',
                'timestamp': datetime.now().isoformat()
            })
            return jsonify({'error': '접근이 차단되었습니다. 사내망에서 접속해주세요.'}), 403
        
        return f(*args, **kwargs)
    return decorated_function


def log_access(log_data):
    """접속 로그 기록"""
    try:
        if os.path.exists(ACCESS_LOG_FILE):
            with open(ACCESS_LOG_FILE, 'r', encoding='utf-8') as f:
                logs = json.load(f)
        else:
            logs = []
        
        logs.append(log_data)
        
        # 최근 1000개만 보관
        logs = logs[-1000:]
        
        with open(ACCESS_LOG_FILE, 'w', encoding='utf-8') as f:
            json.dump(logs, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Log write error: {e}")


@app.route('/api/upload-excel', methods=['POST'])
@check_ip_whitelist
def upload_excel():
    """DRM이 걸린 엑셀 파일을 xlwings로 읽어서 JSON으로 변환"""
    
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
    
    try:
        # 임시 파일로 저장
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp_file:
            file.save(tmp_file.name)
            temp_path = tmp_file.name
        
        # xlwings로 엑셀 파일 열기 (DRM 처리 가능)
        app_excel = xw.App(visible=False)
        wb = app_excel.books.open(temp_path)
        
        # 정책 데이터 파싱
        policy_data = parse_policy_excel(wb)
        
        # 엑셀 닫기
        wb.close()
        app_excel.quit()
        
        # 임시 파일 삭제
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
        log_access({
            'ip': client_ip,
            'action': 'ERROR',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        })
        return jsonify({
            'error': f'파일 처리 중 오류 발생: {str(e)}'
        }), 500


def parse_policy_excel(wb):
    """엑셀 워크북에서 정책 데이터 추출"""
    
    policy_data = {
        'bundle_retention': [],
        'digital_renewal': [],
        'equal_bundle': [],
        'd_standalone': [],
        'metadata': {
            'updated_at': '',
            'version': ''
        }
    }
    
    try:
        # 1. 번들 재약정 시트
        if '1.번들재약정' in [sheet.name for sheet in wb.sheets]:
            sheet = wb.sheets['1.번들재약정']
            bundle_data = sheet.range('A1').expand().value
            
            # 헤더 제외하고 데이터 파싱
            headers = bundle_data[0]
            for row in bundle_data[1:]:
                if row[0]:  # 데이터가 있는 행만
                    policy_data['bundle_retention'].append({
                        '판가구간': row[0] if len(row) > 0 else '',
                        '방어정책': row[1] if len(row) > 1 else '',
                        '세부상품': row[2] if len(row) > 2 else '',
                        '상품권': row[3] if len(row) > 3 else 0,
                        'IPTV': row[4] if len(row) > 4 else 0,
                        '비고': row[5] if len(row) > 5 else ''
                    })
        
        # 2. 디지털 재약정 시트
        if '2.디지털재약정' in [sheet.name for sheet in wb.sheets]:
            sheet = wb.sheets['2.디지털재약정']
            digital_data = sheet.range('A1').expand().value
            
            for row in digital_data[1:]:
                if row[0]:
                    policy_data['digital_renewal'].append({
                        '상품명': row[0] if len(row) > 0 else '',
                        '월요금': row[1] if len(row) > 1 else 0,
                        '유지_상품권': row[2] if len(row) > 2 else 0,
                        '유지_할인': row[3] if len(row) > 3 else 0,
                        '상향_상품권': row[4] if len(row) > 4 else 0,
                        '상향_할인': row[5] if len(row) > 5 else 0,
                        '비고': row[6] if len(row) > 6 else ''
                    })
        
        # 3. 동등결합 시트
        if '3.동등결합' in [sheet.name for sheet in wb.sheets]:
            sheet = wb.sheets['3.동등결합']
            equal_data = sheet.range('A1').expand().value
            
            for row in equal_data[1:]:
                if row[0]:
                    policy_data['equal_bundle'].append({
                        '방어정책': row[0] if len(row) > 0 else '',
                        '상품권': row[1] if len(row) > 1 else 0,
                        '월할인': row[2] if len(row) > 2 else 0,
                        '설명': row[3] if len(row) > 3 else ''
                    })
        
        # 4. D단독 시트
        if '4.D단독' in [sheet.name for sheet in wb.sheets]:
            sheet = wb.sheets['4.D단독']
            d_standalone_data = sheet.range('A1').expand().value
            
            for row in d_standalone_data[1:]:
                if row[0]:
                    policy_data['d_standalone'].append({
                        '판가구간': row[0] if len(row) > 0 else '',
                        '유지_상품권': row[1] if len(row) > 1 else 0,
                        '유지_할인': row[2] if len(row) > 2 else 0,
                        '변경_상품권': row[3] if len(row) > 3 else 0,
                        '변경_할인': row[4] if len(row) > 4 else 0,
                        '할인적용_상품권': row[5] if len(row) > 5 else 0,
                        '할인적용_할인': row[6] if len(row) > 6 else 0,
                        '약정변경_상품권': row[7] if len(row) > 7 else 0,
                        '약정변경_할인': row[8] if len(row) > 8 else 0
                    })
        
    except Exception as e:
        print(f"Error parsing sheet: {str(e)}")
    
    return policy_data


@app.route('/api/health', methods=['GET'])
def health_check():
    """서버 상태 확인"""
    client_ip = request.remote_addr
    log_access({
        'ip': client_ip,
        'action': 'HEALTH_CHECK',
        'timestamp': datetime.now().isoformat()
    })
    return jsonify({'status': 'ok', 'message': 'Flask server is running'})


@app.route('/api/access-logs', methods=['GET'])
@check_ip_whitelist
def get_access_logs():
    """접속 로그 조회 (관리자용)"""
    try:
        if os.path.exists(ACCESS_LOG_FILE):
            with open(ACCESS_LOG_FILE, 'r', encoding='utf-8') as f:
                logs = json.load(f)
            return jsonify({'logs': logs[-100:]})  # 최근 100개
        return jsonify({'logs': []})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    # 개발/테스트 환경 설정
    # 배포 시에는 ENABLE_IP_WHITELIST=true 환경 변수 설정
    print("=" * 50)
    print("Flask 백엔드 서버 시작")
    print("=" * 50)
    print(f"IP 화이트리스트: {'활성화 ✓' if ENABLE_IP_WHITELIST else '비활성화 (개발 모드)'}")
    print(f"서버 URL: http://localhost:5000")
    print("=" * 50)
    
    app.run(debug=True, port=5000, host='0.0.0.0')
