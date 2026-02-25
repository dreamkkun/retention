import React from 'react';

const SecurityWatermark = ({ userInfo }) => {
  if (!userInfo) return null;

  return (
    <>
      {/* 화면 전체 워터마크 */}
      <div 
        className="fixed inset-0 pointer-events-none z-50"
        style={{
          background: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 200px,
            rgba(255, 0, 0, 0.03) 200px,
            rgba(255, 0, 0, 0.03) 400px
          )`
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className="text-red-200 font-bold text-6xl opacity-10 transform rotate-[-45deg] select-none"
            style={{ 
              fontSize: '8rem',
              letterSpacing: '2rem',
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            대외비
          </div>
        </div>
      </div>

      {/* 사용자 정보 워터마크 (우측 하단) */}
      <div className="fixed bottom-20 right-4 pointer-events-none z-50 select-none">
        <div className="bg-red-50 border border-red-300 px-3 py-2 rounded shadow-sm opacity-70">
          <div className="text-xs text-red-800 font-semibold">
            <div>{userInfo.name} ({userInfo.department})</div>
            <div className="text-[10px] text-red-600 mt-1">사번: {userInfo.employeeId}</div>
            <div className="text-[10px] text-red-600">
              {new Date().toLocaleString('ko-KR')}
            </div>
          </div>
        </div>
      </div>

      {/* 상단 보안 안내 배너 */}
      <div className="fixed top-0 left-0 right-0 bg-red-600 text-white py-1 text-center text-xs font-semibold z-40">
        🔒 대외비 문서 - 무단 유출 및 복사 금지 | 접속자: {userInfo.name} ({userInfo.department})
      </div>
      <div style={{ height: '24px' }}></div>
    </>
  );
};

export default SecurityWatermark;
