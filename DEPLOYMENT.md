# 배포 가이드

이 문서는 리텐션 정책 지원 시스템을 클라우드에 배포하는 방법을 설명합니다.

## 📋 목차
1. [사전 준비](#사전-준비)
2. [백엔드 배포 (Flask)](#백엔드-배포-flask)
3. [프론트엔드 배포 (React)](#프론트엔드-배포-react)
4. [보안 설정](#보안-설정)
5. [배포 후 확인](#배포-후-확인)

---

## 사전 준비

### 필요한 계정
1. **Render** 계정 (https://render.com) - 백엔드용
2. **Vercel** 계정 (https://vercel.com) - 프론트엔드용
3. **GitHub** 계정 (이미 있음)

### 배포 전 체크리스트
- [ ] GitHub 저장소에 모든 코드 푸시 완료
- [ ] 로컬에서 정상 작동 확인
- [ ] 백엔드 requirements.txt 확인
- [ ] 프론트엔드 package.json 확인

---

## 백엔드 배포 (Flask)

### 1단계: Render 프로젝트 생성

1. **Render 가입 및 로그인**
   - https://render.com 접속
   - GitHub 계정으로 가입/로그인

2. **New Web Service 생성**
   - Dashboard → "New +" → "Web Service"
   - GitHub 저장소 연결: `dreamkkun/retention`
   - 저장소 권한 승인

3. **서비스 설정**
   ```
   Name: retention-backend
   Region: Singapore (가장 가까운 지역)
   Branch: main
   Root Directory: backend
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: gunicorn app:app
   Instance Type: Free
   ```

### 2단계: 환경변수 설정

Render Dashboard에서 Environment Variables 추가:

```
ENABLE_IP_WHITELIST=false (테스트 중에는 false, 완성 후 true)
FLASK_ENV=production
```

### 3단계: requirements.txt 업데이트

`backend/requirements.txt`에 gunicorn 추가 필요:
```
Flask==3.0.0
flask-cors==4.0.0
xlwings==0.30.13
openpyxl==3.1.2
gunicorn==21.2.0
```

### 4단계: 배포 확인

- Render가 자동으로 빌드 시작
- 로그에서 "Deploy succeeded" 확인
- 제공된 URL 복사 (예: https://retention-backend.onrender.com)

---

## 프론트엔드 배포 (React)

### 1단계: 환경변수 파일 생성

프로젝트 루트에 `.env.production` 파일 생성:

```env
REACT_APP_API_URL=https://retention-backend.onrender.com
```

### 2단계: API URL 업데이트

`src/components/` 내 모든 컴포넌트에서:
- `http://localhost:5000` → `process.env.REACT_APP_API_URL`

### 3단계: Vercel 배포

1. **Vercel 가입 및 로그인**
   - https://vercel.com 접속
   - GitHub 계정으로 가입/로그인

2. **프로젝트 임포트**
   - "Add New..." → "Project"
   - GitHub 저장소 선택: `dreamkkun/retention`
   - Import 클릭

3. **프로젝트 설정**
   ```
   Framework Preset: Create React App
   Root Directory: ./ (루트)
   Build Command: npm run build
   Output Directory: build
   ```

4. **환경변수 추가**
   - Environment Variables 섹션
   - `REACT_APP_API_URL` = `https://retention-backend.onrender.com`

5. **배포 시작**
   - "Deploy" 버튼 클릭
   - 빌드 완료 대기 (약 2-3분)
   - 제공된 URL 복사 (예: https://retention.vercel.app)

---

## 보안 설정

### IP 화이트리스트 설정 (완성 후)

1. **회사 공인 IP 확인**
   - https://www.whatismyip.com 접속
   - IP 주소 복사

2. **backend/app.py 수정**
   ```python
   ALLOWED_IPS = [
       '127.0.0.1',
       'localhost',
       'YOUR_COMPANY_IP',  # 회사 IP 추가
       'YOUR_HOME_IP'      # 필요시 추가
   ]
   ```

3. **Render 환경변수 업데이트**
   ```
   ENABLE_IP_WHITELIST=true
   ```

### CORS 설정 확인

`backend/app.py`에서 프론트엔드 URL 확인:
```python
CORS(app, origins=[
    'https://retention.vercel.app',  # Vercel URL
    'http://localhost:3000'           # 로컬 개발용
])
```

---

## 배포 후 확인

### 체크리스트

- [ ] 백엔드 Health Check: `https://retention-backend.onrender.com/api/health`
- [ ] 프론트엔드 접속: `https://retention.vercel.app`
- [ ] 사용자 등록 테스트
- [ ] 관리자 로그인 (000000)
- [ ] 사용자 승인 테스트
- [ ] 정책 보드 확인
- [ ] 혜택 계산기 테스트
- [ ] 보안 기능 확인 (워터마크, 복사 방지 등)

### 문제 해결

**백엔드 연결 오류**
- Render 로그 확인
- CORS 설정 확인
- API URL 환경변수 확인

**프론트엔드 빌드 오류**
- Vercel 빌드 로그 확인
- package.json 의존성 확인
- 환경변수 설정 확인

**느린 응답 속도**
- Render 무료 플랜은 15분 비활성 시 sleep 모드
- 첫 요청 시 cold start로 30초 정도 소요
- 유료 플랜으로 업그레이드 고려

---

## 로컬 네트워크 배포 (완성 후)

완성 후 회사 내부망에서만 사용하려면:

### 방법 1: 현재 PC를 서버로 사용

1. **백엔드 실행**
   ```bash
   cd backend
   .\venv\Scripts\Activate.ps1
   $env:ENABLE_IP_WHITELIST="false"
   python app.py
   ```
   - Flask가 `0.0.0.0:5000`에서 실행됨

2. **프론트엔드 빌드 및 서빙**
   ```bash
   npm run build
   npx serve -s build -l 3000
   ```

3. **내 PC의 IP 확인**
   ```bash
   ipconfig
   ```
   - IPv4 주소 확인 (예: 192.168.0.10)

4. **다른 PC에서 접속**
   - `http://192.168.0.10:3000` (프론트엔드)
   - `http://192.168.0.10:5000` (백엔드 API)

### 방법 2: 회사 서버에 배포

회사 내부 서버가 있다면:
- Docker 컨테이너로 배포
- Nginx로 리버스 프록시 설정
- 별도 안내 필요 시 문의

---

## 비용 안내

### 무료 플랜 제한

**Render (백엔드)**
- 무료 플랜: 750시간/월
- 15분 비활성 시 sleep
- Cold start 시 느린 응답

**Vercel (프론트엔드)**
- 무료 플랜: 무제한
- 대역폭: 100GB/월
- 제한 거의 없음

### 유료 플랜 (필요시)

**Render**
- Starter: $7/월 (sleep 없음, 빠른 응답)
- Professional: $25/월 (고성능)

**Vercel**
- Pro: $20/월 (팀 기능, 더 많은 대역폭)

---

## 지원

배포 중 문제 발생 시:
1. GitHub Issues에 문의
2. 로그 파일 첨부
3. 오류 메시지 스크린샷 포함
