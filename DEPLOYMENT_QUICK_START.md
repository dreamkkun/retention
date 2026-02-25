# 🚀 클라우드 배포 빠른 시작 가이드

모든 준비가 완료되었습니다! 이제 아래 단계를 따라 배포하세요.

---

## 📋 체크리스트

✅ GitHub 저장소에 코드 푸시 완료
✅ API URL 환경변수 설정 완료
✅ 배포 설정 파일 생성 완료 (Procfile, runtime.txt)
✅ requirements.txt에 gunicorn 추가 완료

---

## 🔥 1단계: 백엔드 배포 (Render) - 10분

### 1. Render 가입
1. https://render.com 접속
2. **"Get Started"** 클릭
3. **"Sign up with GitHub"** 선택
4. GitHub 계정 연동

### 2. 새 Web Service 생성
1. Dashboard에서 **"New +"** 클릭
2. **"Web Service"** 선택
3. GitHub 저장소 **"dreamkkun/retention"** 선택
   - 저장소가 안 보이면 "Configure account" 클릭하여 권한 부여
4. **"Connect"** 클릭

### 3. 서비스 설정 입력

```
Name: retention-backend (또는 원하는 이름)
Region: Singapore (한국에서 가장 가까움)
Branch: main
Root Directory: backend
Runtime: Python 3
Build Command: pip install -r requirements.txt
Start Command: gunicorn app:app --bind 0.0.0.0:$PORT
Instance Type: Free
```

### 4. 환경변수 추가

**Environment Variables** 섹션에서 **"Add Environment Variable"** 클릭:

| Key | Value |
|-----|-------|
| `ENABLE_IP_WHITELIST` | `false` |
| `FLASK_ENV` | `production` |
| `PORT` | `10000` |

### 5. 배포 시작
1. **"Create Web Service"** 클릭
2. 배포 로그 확인 (2-3분 소요)
3. "Deploy succeeded" 메시지 확인
4. **중요: 제공된 URL 복사** (예: `https://retention-backend.onrender.com`)

---

## 🌐 2단계: 프론트엔드 배포 (Vercel) - 5분

### 1. Vercel 가입
1. https://vercel.com 접속
2. **"Start Deploying"** 클릭
3. **"Continue with GitHub"** 선택
4. GitHub 계정 연동

### 2. 프로젝트 Import
1. Dashboard에서 **"Add New..."** → **"Project"** 클릭
2. **"Import Git Repository"** 섹션에서 `dreamkkun/retention` 선택
   - 저장소가 안 보이면 "Adjust GitHub App Permissions" 클릭
3. **"Import"** 클릭

### 3. 프로젝트 설정

```
Project Name: retention (또는 원하는 이름)
Framework Preset: Create React App
Root Directory: ./ (그대로 두기)
Build Command: npm run build
Output Directory: build
Install Command: npm install
```

### 4. 환경변수 추가

**Environment Variables** 섹션에서:

| Name | Value |
|------|-------|
| `REACT_APP_API_URL` | `https://retention-backend.onrender.com` |

**중요:** 1단계에서 복사한 Render URL을 정확히 입력하세요!

### 5. 배포 시작
1. **"Deploy"** 버튼 클릭
2. 빌드 진행 상황 확인 (2-3분)
3. "🎉 Congratulations!" 메시지 확인
4. **"Visit"** 버튼 클릭하여 사이트 확인

---

## ✅ 3단계: 배포 확인

### 백엔드 Health Check
브라우저에서 접속:
```
https://retention-backend.onrender.com/api/health
```

응답 예시:
```json
{"status":"ok","message":"Flask server is running"}
```

### 프론트엔드 접속
Vercel이 제공한 URL로 접속 (예: `https://retention.vercel.app`)

### 기능 테스트
1. ✅ 로그인 화면 표시 확인
2. ✅ 신규 사용자 등록 (이름, 부서, 사번 입력)
3. ✅ 관리자 로그인 (사번: 000000)
4. ✅ 사용자 승인
5. ✅ 승인된 사용자로 로그인
6. ✅ 전체 정책 보드 확인
7. ✅ 맞춤형 혜택 계산기 테스트

---

## 🔧 문제 해결

### 문제 1: 백엔드 연결 오류
**증상:** "ERR_CONNECTION_REFUSED" 또는 네트워크 오류

**해결방법:**
1. Render 대시보드에서 "Logs" 확인
2. 빌드 성공 여부 확인
3. 환경변수가 올바르게 설정되었는지 확인
4. Vercel 환경변수의 `REACT_APP_API_URL`이 정확한지 확인

### 문제 2: 백엔드 응답 느림
**증상:** 첫 요청 시 30초 이상 소요

**원인:** Render 무료 플랜은 15분 비활성 시 sleep 모드 진입

**해결방법:**
- 정상 동작입니다. 첫 요청 후에는 빠르게 응답합니다.
- 완성 후 유료 플랜($7/월)으로 업그레이드하면 sleep 모드 없음

### 문제 3: xlwings 오류
**증상:** "xlwings requires Windows Excel" 오류

**원인:** Render는 Linux 환경이라 xlwings가 작동하지 않음

**해결방법:**
- 엑셀 업로드 기능은 로컬에서만 사용
- 또는 openpyxl만 사용하도록 코드 수정 필요

### 문제 4: CORS 오류
**증상:** "Access-Control-Allow-Origin" 오류

**해결방법:**
`backend/app.py` 수정 후 Render에 자동 재배포:
```python
from flask_cors import CORS

CORS(app, origins=[
    'https://retention.vercel.app',  # Vercel URL
    'http://localhost:3000'          # 로컬 개발
])
```

---

## 📝 배포 완료 후

### URL 공유
다른 사용자에게 Vercel URL 공유:
```
https://retention.vercel.app
```

### 초기 관리자 계정
```
사번: 000000
역할: 시스템 관리자
```

### 사용자 등록 안내
1. 사이트 접속
2. 이름, 부서, 사번 입력
3. 관리자 승인 대기
4. 승인 후 사번으로 로그인

---

## 💰 비용 안내

### 현재 설정 (무료)
- **Render Free:** $0/월 (15분 비활성 시 sleep)
- **Vercel Free:** $0/월 (무제한 배포)
- **총 비용:** $0/월 ✨

### 업그레이드 옵션 (완성 후)
- **Render Starter:** $7/월 (sleep 없음, 빠른 응답)
- **Vercel Pro:** $20/월 (팀 기능, 우선 지원)

---

## 🔐 보안 강화 (완성 후)

### IP 화이트리스트 활성화

1. **회사 IP 확인:** https://whatismyip.com
2. **backend/app.py 수정:**
```python
ALLOWED_IPS = [
    '127.0.0.1',
    'YOUR_COMPANY_IP',  # 실제 IP로 변경
]
```
3. **Render 환경변수 변경:**
```
ENABLE_IP_WHITELIST=true
```
4. Git에 커밋 & 푸시하면 자동 재배포

---

## 📞 지원

배포 중 문제가 발생하면:
1. Render/Vercel 로그 확인
2. 브라우저 개발자 도구 (F12) → Console 탭 확인
3. GitHub Issues에 문의

**배포 완료를 축하합니다! 🎉**
