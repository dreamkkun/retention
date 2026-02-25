import React, { useState } from 'react';
import * as XLSX from 'xlsx';

const AdminDashboard = ({ onLogout, isAdmin = true }) => {
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
    // 1. 번들 재약정 시트
    const bundleData = [
      { '시트': '번들재약정', '판가구간': '20천원 이상', '방어정책': '유지', '세부상품': '통일요금', '상품권': 30, 'IPTV': 0, '비고': 'WiFi+' },
      { '시트': '번들재약정', '판가구간': '20천원 이상', '방어정책': '유지', '세부상품': 'WiFi+', '상품권': 30, 'IPTV': 0, '비고': '통일요금' },
      { '시트': '번들재약정', '판가구간': '20천원 이상', '방어정책': '상향', '세부상품': '1G', '상품권': 30, 'IPTV': 0, '비고': '기가급' },
      { '시트': '번들재약정', '판가구간': '20천원 이상', '방어정책': '상향', '세부상품': '500M', '상품권': 27, 'IPTV': 0, '비고': '프리미엄' },
      { '시트': '번들재약정', '판가구간': '20천원 이상', '방어정책': '상향', '세부상품': '광랜', '상품권': 25, 'IPTV': 0, '비고': '일반광랜' },
      { '시트': '번들재약정', '판가구간': '20천원 이상', '방어정책': '중간', '세부상품': '반값요금', '상품권': 20, 'IPTV': 0, '비고': '중간요금제' },
      { '시트': '번들재약정', '판가구간': '20천원 이상', '방어정책': '최저', '세부상품': '특화요금', '상품권': 15, 'IPTV': 0, '비고': '최저요금제' },
      { '시트': '번들재약정', '판가구간': '20천원 이상', '방어정책': '단독', '세부상품': '인터넷단독', '상품권': 0, 'IPTV': 0, '비고': '단독전환' },
      { '시트': '번들재약정', '판가구간': '18천원 이상', '방어정책': '유지', '세부상품': '통일요금', '상품권': 27, 'IPTV': 0, '비고': 'WiFi+' },
      { '시트': '번들재약정', '판가구간': '18천원 이상', '방어정책': '상향', '세부상품': '1G', '상품권': 27, 'IPTV': 0, '비고': '기가급' },
    ];

    // 2. 디지털 재약정 시트
    const digitalData = [
      { '시트': '디지털재약정', '상품명': 'UHD (주상품)', '월요금': 14.3, '유지_상품권': 20, '유지_할인': 5, '상향_상품권': 25, '상향_할인': 7, '비고': 'UHD급' },
      { '시트': '디지털재약정', '상품명': 'HD (주상품)', '월요금': 12.1, '유지_상품권': 15, '유지_할인': 3, '상향_상품권': 20, '상향_할인': 5, '비고': 'HD급' },
      { '시트': '디지털재약정', '상품명': '기본형', '월요금': 8.8, '유지_상품권': 10, '유지_할인': 0, '상향_상품권': 10, '상향_할인': 0, '비고': '기본형' },
      { '시트': '디지털재약정', '상품명': '라이트', '월요금': 6.6, '유지_상품권': 7, '유지_할인': 0, '상향_상품권': 7, '상향_할인': 0, '비고': '라이트' },
    ];

    // 3. 동등결합 시트
    const equalBundleData = [
      { '시트': '동등결합', '방어정책': '유지', '상품권': 18, '월할인': 0, '설명': '요금제 유지' },
      { '시트': '동등결합', '방어정책': '변경', '상품권': 20, '월할인': 0, '설명': '요금제 변경' },
      { '시트': '동등결합', '방어정책': '할인', '상품권': 15, '월할인': 3, '설명': '할인 적용' },
      { '시트': '동등결합', '방어정책': '약정변경', '상품권': 22, '월할인': 0, '설명': '약정기간 변경' },
    ];

    // 4. D단독 시트
    const dStandaloneData = [
      { '시트': 'D단독', '판가구간': '14천원 이상', '유지_상품권': 20, '유지_할인': 0, '변경_상품권': 22, '변경_할인': 0, '할인적용_상품권': 18, '할인적용_할인': 2, '약정변경_상품권': 25, '약정변경_할인': 0 },
      { '시트': 'D단독', '판가구간': '12천원 이상', '유지_상품권': 18, '유지_할인': 0, '변경_상품권': 20, '변경_할인': 0, '할인적용_상품권': 16, '할인적용_할인': 2, '약정변경_상품권': 22, '약정변경_할인': 0 },
      { '시트': 'D단독', '판가구간': '8천원 이상', '유지_상품권': 15, '유지_할인': 0, '변경_상품권': 17, '변경_할인': 0, '할인적용_상품권': 13, '할인적용_할인': 1, '약정변경_상품권': 18, '약정변경_할인': 0 },
      { '시트': 'D단독', '판가구간': '8천원 미만', '유지_상품권': 10, '유지_할인': 0, '변경_상품권': 12, '변경_할인': 0, '할인적용_상품권': 8, '할인적용_할인': 1, '약정변경_상품권': 13, '약정변경_할인': 0 },
    ];

    // 5. 설명 시트
    const instructionsData = [
      { '항목': '판가구간', '설명': '고객이 현재 납부하는 요금 구간 (예: 20천원 이상, 18천원 이상 등)', '예시': '20천원 이상, 18천원 이상, 15천원 이상, 12천원 이상, 10천원 이상, 10천원 미만' },
      { '항목': '방어정책', '설명': '고객 유지를 위한 요금제 변경 방향', '예시': '유지, 상향, 중간, 최저, 단독' },
      { '항목': '세부상품', '설명': '방어정책별 구체적인 상품명', '예시': '통일요금, WiFi+, 1G, 500M, 광랜, 반값요금, 특화요금' },
      { '항목': '상품권', '설명': '즉시 제공되는 상품권 혜택 (단위: 만원)', '예시': '30, 27, 25, 20, 15' },
      { '항목': 'IPTV', '설명': 'IPTV 관련 추가 혜택 (단위: 만원)', '예시': '0, 5, 10' },
      { '항목': '월할인', '설명': '매월 제공되는 할인 혜택 (단위: 만원)', '예시': '0, 2, 3, 5' },
      { '항목': '월요금', '설명': '디지털 상품의 월 이용료 (단위: 만원)', '예시': '14.3, 12.1, 8.8, 6.6' },
    ];

    // 워크북 생성
    const wb = XLSX.utils.book_new();

    // 각 시트 추가
    const ws1 = XLSX.utils.json_to_sheet(bundleData);
    const ws2 = XLSX.utils.json_to_sheet(digitalData);
    const ws3 = XLSX.utils.json_to_sheet(equalBundleData);
    const ws4 = XLSX.utils.json_to_sheet(dStandaloneData);
    const ws5 = XLSX.utils.json_to_sheet(instructionsData);

    XLSX.utils.book_append_sheet(wb, ws1, '1.번들재약정');
    XLSX.utils.book_append_sheet(wb, ws2, '2.디지털재약정');
    XLSX.utils.book_append_sheet(wb, ws3, '3.동등결합');
    XLSX.utils.book_append_sheet(wb, ws4, '4.D단독');
    XLSX.utils.book_append_sheet(wb, ws5, '5.사용설명서');

    XLSX.writeFile(wb, `정책_업데이트_템플릿_${new Date().toISOString().split('T')[0]}.xlsx`);

    setUploadStatus({
      type: 'info',
      message: '템플릿 파일이 다운로드되었습니다. 각 시트에 데이터를 입력하고 업로드하세요.'
    });
  };

  return (
    <div>
      <div className="bg-gray-100 border border-gray-300 p-4 mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">⚙️ 관리자 대시보드</h2>
          {isAdmin && (
            <button
              onClick={onLogout}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded transition-colors"
            >
              로그아웃
            </button>
          )}
        </div>
      </div>

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
                <h3 className="font-semibold text-gray-800 mb-2">📊 엑셀 템플릿</h3>
                <p className="text-sm text-gray-600 mb-4">
                  정책 데이터를 입력할 수 있는 5개 시트로 구성된 엑셀 템플릿입니다.
                </p>
                <ul className="text-xs text-gray-600 mb-4 space-y-1">
                  <li>• 1.번들재약정 (판가구간별 방어정책)</li>
                  <li>• 2.디지털재약정 (TV 상품별 혜택)</li>
                  <li>• 3.동등결합 (동등결합 고객 정책)</li>
                  <li>• 4.D단독 (D단독 고객 정책)</li>
                  <li>• 5.사용설명서 (컬럼 설명 및 예시)</li>
                </ul>
                <button
                  onClick={downloadTemplate}
                  className="w-full bg-gray-700 hover:bg-gray-800 text-white font-semibold py-2 rounded transition-colors"
                >
                  📥 템플릿 다운로드
                </button>
              </div>

              <div className="bg-gray-50 border border-gray-300 p-4 rounded">
                <h3 className="font-semibold text-gray-800 mb-2">📋 사용 방법</h3>
                <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                  <li>템플릿 다운로드 후 엑셀에서 열기</li>
                  <li>각 시트별로 데이터 수정
                    <ul className="ml-6 mt-1 text-xs space-y-1">
                      <li>- 판가구간: 20천원 이상, 18천원 이상 등</li>
                      <li>- 방어정책: 유지, 상향, 중간, 최저, 단독</li>
                      <li>- 상품권/할인: 숫자만 입력 (만원 단위)</li>
                    </ul>
                  </li>
                  <li>수정된 엑셀 파일을 업로드</li>
                  <li>생성된 JSON 파일을 다운로드</li>
                  <li>src/data/policies.json 파일을 교체</li>
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

      {/* 업데이트 가이드 */}
      <div className="card mt-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          📝 정책 업데이트 가이드
        </h2>

        <div className="bg-blue-50 border border-blue-300 p-4 rounded mb-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 엑셀 템플릿 구조</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <p className="font-semibold mb-2">📊 판가 기반 정책</p>
              <ul className="space-y-1 ml-4">
                <li>• 판가구간: 고객 현재 요금</li>
                <li>• 방어정책: 유지/상향/중간/최저/단독</li>
                <li>• 세부상품: 1G, 500M, 광랜 등</li>
                <li>• 상품권: 즉시 지급 혜택</li>
                <li>• IPTV/할인: 추가 혜택</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-2">🎯 고객 유형별 정책</p>
              <ul className="space-y-1 ml-4">
                <li>• 번들: 인터넷+디지털 결합</li>
                <li>• 동등결합: 특수 결합 상품</li>
                <li>• D단독: 디지털 단독</li>
                <li>• I단독: 인터넷 단독</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="border border-gray-300 p-4 rounded">
            <div className="text-2xl mb-2">1️⃣</div>
            <h3 className="font-semibold text-gray-800 mb-1">템플릿 다운로드</h3>
            <p className="text-sm text-gray-600">5개 시트로 구성된 엑셀 파일을 다운로드합니다.</p>
          </div>

          <div className="border border-gray-300 p-4 rounded">
            <div className="text-2xl mb-2">2️⃣</div>
            <h3 className="font-semibold text-gray-800 mb-1">데이터 입력</h3>
            <p className="text-sm text-gray-600">각 시트의 가이드를 참고하여 정책 데이터를 입력합니다.</p>
          </div>

          <div className="border border-gray-300 p-4 rounded">
            <div className="text-2xl mb-2">3️⃣</div>
            <h3 className="font-semibold text-gray-800 mb-1">파일 업로드</h3>
            <p className="text-sm text-gray-600">수정된 엑셀을 업로드하여 JSON으로 변환합니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
