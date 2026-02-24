import React, { useState } from 'react';
import PolicyBoard from './components/PolicyBoard';
import BenefitCalculator from './components/BenefitCalculator';
import ExcelUploader from './components/ExcelUploader';

function App() {
  const [activeTab, setActiveTab] = useState('board');

  const handlePolicyUpdate = (newPolicyData) => {
    console.log('Policy updated:', newPolicyData);
    alert('정책이 업데이트되었습니다! 페이지를 새로고침하여 변경사항을 확인하세요.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-primary-700">
            📊 리텐션 정책 지원 시스템
          </h1>
          <p className="text-gray-600 mt-2">고객 상담을 위한 정책 조회 및 혜택 계산</p>
        </div>
      </header>

      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('board')}
              className={`py-4 px-6 font-semibold border-b-2 transition-colors ${
                activeTab === 'board'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📋 전체 정책 보드
            </button>
            <button
              onClick={() => setActiveTab('calculator')}
              className={`py-4 px-6 font-semibold border-b-2 transition-colors ${
                activeTab === 'calculator'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              🧮 맞춤형 혜택 계산기
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'board' ? <PolicyBoard /> : <BenefitCalculator />}
      </main>

      <footer className="bg-red-50 border-t-4 border-red-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center text-red-700">
            <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-bold text-lg">
              ⚠️ 실제 위약금은 반드시 전산 조회가 필요합니다
            </span>
          </div>
        </div>
      </footer>

      <ExcelUploader onPolicyUpdate={handlePolicyUpdate} />
    </div>
  );
}

export default App;
