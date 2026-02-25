@echo off
echo ====================================
echo Flask 백엔드 서버 시작
echo ====================================
echo.

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
echo Flask 서버를 시작합니다...
echo URL: http://localhost:5000
echo ====================================
echo.

python app.py
