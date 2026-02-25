import React, { useState } from 'react';

const AdminLogin = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // 간단한 인증 (실제 환경에서는 백엔드 API 사용)
    if (username === 'admin' && password === 'retention2026') {
      onLogin(true);
      localStorage.setItem('isAdmin', 'true');
    } else {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="bg-white border border-gray-300 p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          🔐 관리자 로그인
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              아이디
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:border-gray-500 focus:outline-none"
              placeholder="admin"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:border-gray-500 focus:outline-none"
              placeholder="••••••••"
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
            로그인
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600 bg-gray-50 p-4 rounded border border-gray-300">
          <p className="font-semibold mb-2">테스트 계정</p>
          <p className="font-mono">
            ID: <span className="font-bold">admin</span> / PW: <span className="font-bold">retention2026</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
