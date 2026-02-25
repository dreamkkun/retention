# 리텐션 정책 지원 시스템

## 🚀 빠른 시작

### 1. 백엔드 서버 시작 (DRM 엑셀 처리용)

```bash
# Windows
start-backend.bat

# 또는 수동으로
cd backend
pip install -r requirements.txt
python app.py
```

백엔드는 `http://localhost:5000` 에서 실행됩니다.

### 2. 프론트엔드 시작

```bash
npm install
npm start
```

프론트엔드는 `http://localhost:3000` 에서 실행됩니다.

## 📦 시스템 구성

```
retention/
├── backend/              # Python Flask API (DRM 엑셀 처리)
│   ├── app.py           # Flask 서버
│   ├── requirements.txt # Python 의존성
│   └── README.md
├── src/                 # React 프론트엔드
│   ├── components/
│   └── data/
├── start-backend.bat    # 백엔드 시작 스크립트 (Windows)
└── package.json
```

## 🔐 DRM 엑셀 파일 처리

### 왜 백엔드가 필요한가?

- DRM이 걸린 엑셀 파일은 브라우저에서 직접 읽을 수 없습니다
- Python의 `xlwings` 라이브러리는 실제 Excel 프로그램을 사용하여 파일을 엽니다
- 이를 통해 DRM 보호된 파일도 정상적으로 읽을 수 있습니다

### 작동 방식

1. 관리자가 DRM 엑셀 파일 업로드
2. React → Flask API로 파일 전송
3. Flask가 `xlwings`로 Excel 실행하여 파일 읽기
4. 데이터를 JSON으로 변환하여 반환
5. React에서 JSON 파일 다운로드

## 📋 관리자 기능

### 정책 업데이트 절차

1. **백엔드 서버 시작**
   ```bash
   start-backend.bat
   ```

2. **프론트엔드 접속**
   - http://localhost:3000
   - 관리자 탭 클릭
   - 로그인: `admin` / `retention2026`

3. **템플릿 다운로드**
   - "📥 템플릿 다운로드" 버튼 클릭
   - 5개 시트 엑셀 파일 받기

4. **엑셀 편집**
   - 각 시트에 정책 데이터 입력
   - DRM 설정 (선택사항)

5. **파일 업로드**
   - "📤 정책 업로드" 섹션에서 파일 선택
   - "업로드" 버튼 클릭
   - JSON 파일 자동 다운로드

6. **정책 적용**
   - 다운로드된 JSON 파일을 `src/data/policies.json`에 복사
   - 페이지 새로고침

## 🛠️ 개발 환경

### 필수 요구사항

- Node.js 16+
- Python 3.8+
- Excel (Windows/Mac에 설치 필요)

### 백엔드 의존성

```
Flask - 웹 프레임워크
flask-cors - CORS 처리
xlwings - Excel 파일 읽기 (DRM 지원)
openpyxl - 엑셀 처리 보조
```

### 프론트엔드 의존성

```
React 18 - UI 프레임워크
Tailwind CSS - 스타일링
xlsx - 일반 엑셀 처리 (템플릿 생성용)
```

## 🌐 배포

### 프론트엔드 배포 (Vercel)

```bash
npm run build
# Vercel에 배포
```

### 백엔드 배포 (사내 서버 권장)

DRM 엑셀 처리를 위해 Excel이 설치된 Windows 서버가 필요합니다.

```bash
# 서버에서
cd backend
pip install -r requirements.txt
python app.py
```

**주의**: 
- Vercel/Netlify 같은 클라우드 플랫폼에서는 xlwings가 작동하지 않습니다
- Excel이 설치된 사내 서버에 백엔드를 배포해야 합니다

## 📞 지원

문제가 발생하면:
1. 백엔드 서버가 실행 중인지 확인
2. Excel이 설치되어 있는지 확인
3. 콘솔 에러 메시지 확인

## 📝 라이센스

사내 전용 시스템
