import React, { useState, useEffect } from 'react';
import PolicyBoard from './components/PolicyBoard';
import BenefitCalculator from './components/BenefitCalculator';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import SecurityWatermark from './components/SecurityWatermark';
import SessionTimeout from './components/SessionTimeout';
import API_URL from './config';

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
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);

  const checkUserStatus = async (employeeId) => {
    try {
      const response = await fetch(`${API_URL}/api/users/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('사용자 확인 실패:', error);
      return { exists: false };
    }
  };

  const registerUser = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, department, employeeId })
      });
      const data = await response.json();

      if (data.success) {
        alert('✅ 등록 신청이 완료되었습니다!\n\n관리자 승인 후 이용 가능합니다.\n승인 완료 시 사번으로 다시 로그인해주세요.');
        setName('');
        setDepartment('');
        setEmployeeId('');
        setRegistering(false);
      } else {
        setError(data.error || '등록 실패');
      }
    } catch (error) {
      setError('등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name || !department || !employeeId) {
      setError('모든 필드를 입력해주세요.');
      return;
    }

    // 사번 형식 확인 (6자리 숫자)
    if (!/^\d{6}$/.test(employeeId)) {
      setError('올바른 사번 형식이 아닙니다. (6자리 숫자)');
      return;
    }

    setLoading(true);
    setError('');

    // 사용자 상태 확인
    const userStatus = await checkUserStatus(employeeId);

    if (userStatus.exists) {
      if (userStatus.status === 'approved') {
        // 승인된 사용자 - 로그인 허용
        onAuth({ 
          name: userStatus.user.name, 
          department: userStatus.user.department, 
          employeeId: userStatus.user.employeeId,
          role: userStatus.user.role
        });
      } else if (userStatus.status === 'pending') {
        // 승인 대기 중
        setError('승인 대기 중입니다. 관리자 승인을 기다려주세요.');
        setLoading(false);
      }
    } else {
      // 미등록 사용자 - 등록 화면으로 전환
      setRegistering(true);
      setLoading(false);
    }
  };

  if (registering) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded border border-gray-300 shadow-lg w-full max-w-md">
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">📝</div>
            <h1 className="text-2xl font-bold text-gray-800">
              신규 사용자 등록
            </h1>
            <p className="text-gray-600 mt-2 text-sm">
              등록 후 관리자 승인이 필요합니다
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-300 p-3 rounded mb-4">
            <p className="text-xs text-blue-800">
              ℹ️ 입력하신 정보로 등록 신청합니다.<br/>
              관리자 승인 후 시스템을 이용하실 수 있습니다.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-300 p-3 rounded">
              <div className="text-sm text-gray-600 mb-1">이름</div>
              <div className="font-semibold text-gray-800">{name}</div>
            </div>

            <div className="bg-gray-50 border border-gray-300 p-3 rounded">
              <div className="text-sm text-gray-600 mb-1">부서</div>
              <div className="font-semibold text-gray-800">{department}</div>
            </div>

            <div className="bg-gray-50 border border-gray-300 p-3 rounded">
              <div className="text-sm text-gray-600 mb-1">사번</div>
              <div className="font-semibold text-gray-800 font-mono">{employeeId}</div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <button
              onClick={registerUser}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded transition-colors"
            >
              {loading ? '등록 중...' : '등록 신청하기'}
            </button>

            <button
              onClick={() => setRegistering(false)}
              disabled={loading}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 rounded transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            disabled={loading}
            className="w-full bg-gray-700 hover:bg-gray-800 disabled:bg-gray-400 text-white font-semibold py-3 rounded transition-colors"
          >
            {loading ? '확인 중...' : '접속하기'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-600">
          <p>등록되지 않은 사용자는 자동으로 등록 화면으로 이동합니다.</p>
          <p className="mt-1">관리자 승인 후 시스템을 이용할 수 있습니다.</p>
        </div>

        <div className="mt-4 bg-gray-50 border border-gray-300 p-3 rounded">
          <p className="text-xs text-gray-600 text-center">
            <strong>관리자 초기 계정</strong><br/>
            사번: 000000 (6개의 0)
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
