# Flask 백엔드 서버

DRM이 걸린 엑셀 파일을 처리하기 위한 Python Flask API 서버

## 설치

```bash
cd backend
pip install -r requirements.txt
```

## 실행

```bash
python app.py
```

서버는 `http://localhost:5000` 에서 실행됩니다.

## API 엔드포인트

### POST /api/upload-excel
DRM이 걸린 엑셀 파일을 업로드하여 JSON으로 변환

**요청:**
- Content-Type: multipart/form-data
- file: 엑셀 파일

**응답:**
```json
{
  "success": true,
  "data": {
    "bundle_retention": [...],
    "digital_renewal": [...],
    "equal_bundle": [...],
    "d_standalone": [...]
  },
  "message": "엑셀 파일이 성공적으로 처리되었습니다."
}
```

### GET /api/health
서버 상태 확인

## 주의사항

- xlwings는 Windows에서 Excel이 설치되어 있어야 합니다.
- macOS에서는 Excel for Mac이 필요합니다.
- Linux에서는 LibreOffice를 사용할 수 있습니다.
