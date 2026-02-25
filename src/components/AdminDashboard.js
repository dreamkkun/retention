import React, { useState } from 'react';
import * as XLSX from 'xlsx';

const AdminDashboard = ({ onLogout }) => {
  const [uploadStatus, setUploadStatus] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadType, setUploadType] = useState('excel'); // 'excel' or 'image'

  const handleExcelUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // 엑셀 데이터를 JSON으로 변환
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        console.log('Excel data:', jsonData);
        
        // JSON 파일 다운로드
        const dataStr = JSON.stringify(jsonData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `policy_update_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        setUploadStatus({
          type: 'success',
          message: `엑셀 파일이 성공적으로 업로드되었습니다. JSON 파일이 다운로드되었습니다.`
        });
      } catch (error) {
        setUploadStatus({
          type: 'error',
          message: `오류 발생: ${error.message}`
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImageUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // 이미지를 assets 폴더로 복사하도록 안내
        setUploadStatus({
          type: 'success',
          message: `이미지가 선택되었습니다: ${file.name}\n\n이미지를 public/assets/ 폴더에 복사하고, policies.json의 policy_images 섹션을 업데이트하세요.`
        });
      } catch (error) {
        setUploadStatus({
          type: 'error',
          message: `오류 발생: ${error.message}`
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setUploadStatus(null);
  };

  const handleUpload = () => {
    if (!selectedFile) {
      setUploadStatus({
        type: 'error',
        message: '파일을 선택해주세요.'
      });
      return;
    }

    if (uploadType === 'excel') {
      handleExcelUpload(selectedFile);
    } else {
      handleImageUpload(selectedFile);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      { '구분': '번들', '판가': '20k', '유지': 30, '상향': 30, '중간': 20, '최저': 15 },
      { '구분': '번들', '판가': '18k', '유지': 27, '상향': 27, '중간': 18, '최저': 13 },
      { '구분': '동등결합', '유지': 18, '변경': 20, '할인': 15, '약정변경': 22 },
      { '구분': 'D단독', '판가': '14k+', '유지': 20, '변경': 22, '할인': 18, '약정변경': 25 },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '정책데이터');
    XLSX.writeFile(wb, 'policy_template.xlsx');

    setUploadStatus({
      type: 'info',
      message: '템플릿 파일이 다운로드되었습니다.'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">
            ⚙️ 관리자 대시보드
          </h1>
          <button
            onClick={onLogout}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-6">
          {/* 정책 업로드 */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              📤 정책 업로드
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  업로드 유형
                </label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:border-gray-500 focus:outline-none"
                >
                  <option value="excel">📊 엑셀 파일 (.xlsx)</option>
                  <option value="image">🖼️ 이미지 파일 (.png, .jpg)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  파일 선택
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept={uploadType === 'excel' ? '.xlsx,.xls' : 'image/*'}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:border-gray-500 focus:outline-none"
                />
              </div>

              {selectedFile && (
                <div className="bg-gray-50 border border-gray-300 p-3 rounded">
                  <p className="text-sm text-gray-700">
                    선택된 파일: <span className="font-semibold">{selectedFile.name}</span>
                  </p>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!selectedFile}
                className="w-full bg-gray-700 hover:bg-gray-800 disabled:bg-gray-400 text-white font-semibold py-3 rounded transition-colors"
              >
                업로드
              </button>

              {uploadStatus && (
                <div
                  className={`p-4 rounded border ${
                    uploadStatus.type === 'success'
                      ? 'bg-green-50 border-green-300 text-green-800'
                      : uploadStatus.type === 'error'
                      ? 'bg-red-50 border-red-300 text-red-800'
                      : 'bg-blue-50 border-blue-300 text-blue-800'
                  }`}
                >
                  <p className="font-semibold whitespace-pre-line">{uploadStatus.message}</p>
                </div>
              )}
            </div>
          </div>

          {/* 템플릿 다운로드 */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              📥 템플릿 다운로드
            </h2>

            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-300 p-4 rounded">
                <h3 className="font-semibold text-gray-800 mb-2">엑셀 템플릿</h3>
                <p className="text-sm text-gray-600 mb-4">
                  정책 데이터를 입력할 수 있는 엑셀 템플릿입니다.
                </p>
                <button
                  onClick={downloadTemplate}
                  className="w-full bg-gray-700 hover:bg-gray-800 text-white font-semibold py-2 rounded transition-colors"
                >
                  템플릿 다운로드
                </button>
              </div>

              <div className="bg-gray-50 border border-gray-300 p-4 rounded">
                <h3 className="font-semibold text-gray-800 mb-2">사용 방법</h3>
                <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                  <li>템플릿 다운로드</li>
                  <li>엑셀에서 데이터 수정</li>
                  <li>수정된 파일 업로드</li>
                  <li>생성된 JSON 파일을 src/data/policies.json에 복사</li>
                  <li>페이지 새로고침</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* 빠른 작업 */}
        <div className="card mt-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            ⚡ 빠른 작업
          </h2>

          <div className="grid md:grid-cols-3 gap-4">
            <button className="p-4 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-left">
              <div className="text-2xl mb-2">📊</div>
              <h3 className="font-semibold text-gray-800 mb-1">정책 조회</h3>
              <p className="text-sm text-gray-600">현재 적용된 정책 확인</p>
            </button>

            <button className="p-4 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-left">
              <div className="text-2xl mb-2">📝</div>
              <h3 className="font-semibold text-gray-800 mb-1">변경 이력</h3>
              <p className="text-sm text-gray-600">정책 업데이트 내역</p>
            </button>

            <button className="p-4 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-left">
              <div className="text-2xl mb-2">👥</div>
              <h3 className="font-semibold text-gray-800 mb-1">사용자 관리</h3>
              <p className="text-sm text-gray-600">권한 설정 및 관리</p>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
