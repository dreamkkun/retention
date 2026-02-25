import React, { useState, useEffect } from 'react';
import PolicyBoard from './components/PolicyBoard';
import BenefitCalculator from './components/BenefitCalculator';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';

function App() {
  const [activeTab, setActiveTab] = useState('board');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const adminStatus = localStorage.getItem('isAdmin');
    if (adminStatus === 'true') {
      setIsAdmin(true);
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

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-300">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              📊 리텐션 정책 지원 시스템
            </h1>
            <p className="text-gray-600 text-sm mt-1">고객 상담을 위한 정책 조회 및 혜택 계산</p>
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
          <div className="flex items-center justify-center text-red-700">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold">
              ⚠️ 실제 위약금은 반드시 전산 조회가 필요합니다
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
