import React, { useState, useEffect } from 'react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'approved'

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/users/list');
      const data = await response.json();
      setUsers(data.users || []);
      setLoading(false);
    } catch (error) {
      console.error('사용자 목록 조회 실패:', error);
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    if (!window.confirm('이 사용자를 승인하시겠습니까?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/users/approve/${userId}`, {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        alert('사용자가 승인되었습니다.');
        fetchUsers();
      } else {
        alert(data.error || '승인 실패');
      }
    } catch (error) {
      alert('승인 중 오류가 발생했습니다.');
    }
  };

  const handleReject = async (userId) => {
    if (!window.confirm('이 신청을 거부하시겠습니까?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/users/reject/${userId}`, {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        alert('신청이 거부되었습니다.');
        fetchUsers();
      } else {
        alert(data.error || '거부 실패');
      }
    } catch (error) {
      alert('거부 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('정말 이 사용자를 삭제하시겠습니까?\n삭제 후에는 복구할 수 없습니다.')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/users/delete/${userId}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (data.success) {
        alert('사용자가 삭제되었습니다.');
        fetchUsers();
      } else {
        alert(data.error || '삭제 실패');
      }
    } catch (error) {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleChangeRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const roleText = newRole === 'admin' ? '관리자' : '일반 사용자';
    
    if (!window.confirm(`이 사용자를 ${roleText}로 변경하시겠습니까?`)) return;

    try {
      const response = await fetch(`http://localhost:5000/api/users/change-role/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      const data = await response.json();

      if (data.success) {
        alert(data.message);
        fetchUsers();
      } else {
        alert(data.error || '역할 변경 실패');
      }
    } catch (error) {
      alert('역할 변경 중 오류가 발생했습니다.');
    }
  };

  const filteredUsers = users.filter(user => {
    if (filter === 'pending') return user.status === 'pending';
    if (filter === 'approved') return user.status === 'approved';
    return true;
  });

  const pendingCount = users.filter(u => u.status === 'pending').length;

  if (loading) {
    return <div className="text-center py-8">로딩 중...</div>;
  }

  return (
    <div>
      <div className="bg-gray-100 border border-gray-300 p-4 mb-6">
        <h2 className="text-xl font-bold text-gray-800">👥 사용자 관리</h2>
        <p className="text-sm text-gray-600 mt-1">
          등록된 사용자 관리 및 신규 신청 승인
        </p>
      </div>

      {/* 필터 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`py-2 px-4 rounded border transition-colors ${
            filter === 'all'
              ? 'bg-gray-700 text-white border-gray-700'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          전체 ({users.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`py-2 px-4 rounded border transition-colors ${
            filter === 'pending'
              ? 'bg-orange-600 text-white border-orange-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          승인 대기 {pendingCount > 0 && <span className="ml-1 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">{pendingCount}</span>}
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`py-2 px-4 rounded border transition-colors ${
            filter === 'approved'
              ? 'bg-green-600 text-white border-green-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          승인 완료 ({users.filter(u => u.status === 'approved').length})
        </button>
      </div>

      {/* 사용자 목록 */}
      <div className="bg-white border border-gray-300">
        <table className="w-full">
          <thead className="bg-gray-100 border-b border-gray-300">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">이름</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">부서</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">사번</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">역할</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">상태</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">신청일</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">관리</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                  {filter === 'pending' ? '승인 대기 중인 사용자가 없습니다.' : '사용자가 없습니다.'}
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-800">{user.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{user.department}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{user.employeeId}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role === 'admin' ? '관리자' : '일반'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      user.status === 'approved' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {user.status === 'approved' ? '✓ 승인됨' : '⏳ 대기중'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(user.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {user.status === 'pending' ? (
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleApprove(user.id)}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded transition-colors"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => handleReject(user.id)}
                          className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded transition-colors"
                        >
                          거부
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-center">
                        {user.employeeId !== '000000' && (
                          <>
                            <button
                              onClick={() => handleChangeRole(user.id, user.role)}
                              className={`text-xs px-3 py-1 rounded transition-colors ${
                                user.role === 'admin'
                                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                                  : 'bg-purple-600 hover:bg-purple-700 text-white'
                              }`}
                              title={user.role === 'admin' ? '일반 사용자로 변경' : '관리자로 승격'}
                            >
                              {user.role === 'admin' ? '↓ 일반' : '↑ 관리자'}
                            </button>
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="bg-gray-600 hover:bg-gray-700 text-white text-xs px-3 py-1 rounded transition-colors"
                            >
                              삭제
                            </button>
                          </>
                        )}
                        {user.employeeId === '000000' && (
                          <span className="text-xs text-gray-400 font-semibold">시스템 관리자</span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 안내 */}
      <div className="mt-6 bg-blue-50 border border-blue-300 p-4 rounded">
        <h3 className="font-semibold text-blue-900 mb-2">📌 사용자 관리 안내</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 신규 사용자가 신청하면 "승인 대기" 상태로 등록됩니다.</li>
          <li>• 관리자가 승인해야 시스템 접속이 가능합니다.</li>
          <li>• 승인된 사용자는 언제든지 역할을 변경하거나 삭제할 수 있습니다.</li>
          <li>• 관리자로 승격하면 정책 업데이트 및 사용자 관리 권한이 부여됩니다.</li>
          <li>• 초기 시스템 관리자(000000)는 역할 변경 및 삭제가 불가능합니다.</li>
        </ul>
      </div>
    </div>
  );
};

export default UserManagement;
