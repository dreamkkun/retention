from flask import Flask, request, jsonify
from flask_cors import CORS
import xlwings as xw
import os
import tempfile
import json

app = Flask(__name__)
CORS(app)  # React 앱에서 접근 허용

@app.route('/api/upload-excel', methods=['POST'])
def upload_excel():
    """DRM이 걸린 엑셀 파일을 xlwings로 읽어서 JSON으로 변환"""
    
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
        
        return jsonify({
            'success': True,
            'data': policy_data,
            'message': '엑셀 파일이 성공적으로 처리되었습니다.'
        })
        
    except Exception as e:
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
    return jsonify({'status': 'ok', 'message': 'Flask server is running'})


if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')
