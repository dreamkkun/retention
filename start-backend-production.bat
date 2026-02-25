@echo off
echo ====================================
echo Flask 백엔드 서버 시작 (프로덕션 모드)
echo ====================================
echo.
echo [경고] IP 화이트리스트가 활성화됩니다!
echo 허용된 IP만 접속 가능합니다.
echo.
pause

cd backend

echo Python 가상환경 확인 중...
if not exist venv (
    echo 가상환경이 없습니다. 생성 중...
    python -m venv venv
)

echo 가상환경 활성화...
call venv\Scripts\activate

echo 의존성 설치 확인...
pip install -r requirements.txt

echo.
echo ====================================
echo 프로덕션 모드로 서버 시작
echo IP 화이트리스트: 활성화
echo app.py의 ALLOWED_IPS 설정 확인!
echo URL: http://localhost:5000
echo ====================================
echo.

REM 프로덕션 모드: IP 제한 활성화
set ENABLE_IP_WHITELIST=true

python app.py
