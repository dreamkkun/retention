import React, { useState, useEffect } from 'react';
import PolicyBoard from './components/PolicyBoard';
import BenefitCalculator from './components/BenefitCalculator';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import SecurityWatermark from './components/SecurityWatermark';
import SessionTimeout from './components/SessionTimeout';

function App() {
  const [activeTab, setActiveTab] = useState('board');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const adminStatus = localStorage.getItem('isAdmin');
    const authStatus = localStorage.getItem('isAuthenticated');
    const savedUserInfo = localStorage.getItem('userInfo');
    
    if (adminStatus === 'true') {
      setIsAdmin(true);
    }
    if (authStatus === 'true' && savedUserInfo) {
      setIsAuthenticated(true);
      setUserInfo(JSON.parse(savedUserInfo));
    }
  }, []);

  const handleLogin = (status) => {
    setIsAdmin(status);
    if (status) {
      setActiveTab('admin');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('isAdmin');
    setActiveTab('board');
  };

  const handleAuth = (userInfo) => {
    setIsAuthenticated(true);
    setUserInfo(userInfo);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
    
    // 접속 로그 기록
    logAccess(userInfo);
  };

  const handleSessionTimeout = () => {
    setIsAuthenticated(false);
    setUserInfo(null);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userInfo');
    alert('보안을 위해 세션이 만료되었습니다. 다시 로그인해주세요.');
  };

  const logAccess = (userInfo) => {
    const accessLog = {
      user: userInfo,
      timestamp: new Date().toISOString(),
      ip: 'client', // 실제로는 백엔드에서 처리
      action: 'login'
    };
    
    // 로컬 스토리지에 접속 기록 저장
    const logs = JSON.parse(localStorage.getItem('accessLogs') || '[]');
    logs.push(accessLog);
    localStorage.setItem('accessLogs', JSON.stringify(logs.slice(-100))); // 최근 100개만 보관
  };

  // 인증되지 않은 경우 로그인 화면
  if (!isAuthenticated) {
    return <LoginScreen onAuth={handleAuth} />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 보안 워터마크 */}
      <SecurityWatermark userInfo={userInfo} />
      
      {/* 세션 타임아웃 (30분) */}
      <SessionTimeout onTimeout={handleSessionTimeout} timeout={30 * 60 * 1000} />

      <header className="bg-white border-b border-gray-300">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              📊 리텐션 정책 지원 시스템 <span className="text-red-600 text-sm">[대외비]</span>
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              고객 상담을 위한 정책 조회 및 혜택 계산
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-green-700 bg-green-50 px-3 py-1 rounded border border-green-300">
                ✓ 관리자 로그인됨
              </span>
            </div>
          )}
        </div>
      </header>

      <nav className="bg-gray-50 border-b border-gray-300">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('board')}
              className={`py-3 px-6 font-semibold transition-colors ${
                activeTab === 'board'
                  ? 'bg-white text-gray-800 border-b-2 border-gray-700'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              📋 전체 정책 보드
            </button>
            <button
              onClick={() => setActiveTab('calculator')}
              className={`py-3 px-6 font-semibold transition-colors ${
                activeTab === 'calculator'
                  ? 'bg-white text-gray-800 border-b-2 border-gray-700'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              🧮 맞춤형 혜택 계산기
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`py-3 px-6 font-semibold transition-colors ${
                activeTab === 'admin'
                  ? 'bg-white text-gray-800 border-b-2 border-gray-700'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              ⚙️ 관리자
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'board' && <PolicyBoard />}
        {activeTab === 'calculator' && <BenefitCalculator />}
        {activeTab === 'admin' && (
          isAdmin ? (
            <AdminDashboard onLogout={handleLogout} isAdmin={isAdmin} />
          ) : (
            <AdminLogin onLogin={handleLogin} />
          )
        )}
      </main>

      <footer className="bg-red-50 border-t-2 border-red-400 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-red-700">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold">
                ⚠️ 실제 위약금은 반드시 전산 조회가 필요합니다
              </span>
            </div>
            <div className="text-xs text-gray-600">
              로그인: {userInfo?.name} ({userInfo?.department})
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// 로그인 화면 컴포넌트
const LoginScreen = ({ onAuth }) => {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!name || !department || !employeeId) {
      setError('모든 필드를 입력해주세요.');
      return;
    }

    // 사번 형식 확인 (예: 6자리 숫자)
    if (!/^\d{6}$/.test(employeeId)) {
      setError('올바른 사번 형식이 아닙니다. (6자리 숫자)');
      return;
    }

    onAuth({ name, department, employeeId });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded border border-gray-300 shadow-lg w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-800">
            리텐션 정책 지원 시스템
          </h1>
          <p className="text-red-600 font-semibold mt-2">[대외비 - 사내 전용]</p>
        </div>

        <div className="bg-yellow-50 border border-yellow-300 p-3 rounded mb-4">
          <p className="text-xs text-yellow-800">
            ⚠️ 이 시스템은 대외비 정보를 포함하고 있습니다.<br/>
            무단 유출 시 법적 책임이 따를 수 있습니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:border-gray-500 focus:outline-none"
              placeholder="홍길동"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              부서
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:border-gray-500 focus:outline-none"
              placeholder="고객지원팀"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              사번
            </label>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:border-gray-500 focus:outline-none"
              placeholder="123456"
              maxLength="6"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gray-700 hover:bg-gray-800 text-white font-semibold py-3 rounded transition-colors"
          >
            접속하기
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-600">
          <p>본 시스템의 모든 정보는 대외비로 관리됩니다.</p>
          <p className="mt-1">접속 기록이 저장되며 관리자가 모니터링합니다.</p>
        </div>
      </div>
    </div>
  );
};

export default App;
