import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import UserManagement from './UserManagement';
import API_URL from '../config';

const AdminDashboard = ({ onLogout, isAdmin = true }) => {
  const [uploadStatus, setUploadStatus] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadType, setUploadType] = useState('excel'); // 'excel' or 'image'
  const [imageTitle, setImageTitle] = useState('');
  const [imageCategory, setImageCategory] = useState('bundle');
  const [imageSubTitle, setImageSubTitle] = useState('');
  const [backendStatus, setBackendStatus] = useState('checking'); // 'checking', 'online', 'offline'
  const [backendCaps, setBackendCaps] = useState({}); // vision_api, excel_export
  const [activeSection, setActiveSection] = useState('upload'); // 'upload', 'users'
  const [lastUploadedImage, setLastUploadedImage] = useState(null);
  const [extractionStatus, setExtractionStatus] = useState(null);

  // 백엔드 서버 상태 확인
  React.useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then(response => response.json())
      .then(data => {
        setBackendStatus('online');
        setBackendCaps({ visionApi: data.vision_api, excelExport: data.excel_export });
      })
      .catch(() => setBackendStatus('offline'));
  }, []);

  const handleExcelUpload = (file) => {
    const formData = new FormData();
    formData.append('file', file);

    setUploadStatus({ type: 'info', message: '엑셀 파일 처리 중...' });

    fetch(`${API_URL}/api/upload-excel`, { method: 'POST', body: formData })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setUploadStatus({
            type: 'success',
            message: `✅ ${data.message}`
          });
          setSelectedFile(null);
        } else {
          const errorMsg = data.reason
            ? `오류: ${data.error}\n\n${data.reason}`
            : `오류: ${data.error || '알 수 없는 오류'}`;
          setUploadStatus({ type: 'error', message: errorMsg });
        }
      })
      .catch(error => {
        setUploadStatus({
          type: 'error',
          message: `서버 연결 실패: ${error.message}\n\n백엔드 서버가 실행 중인지 확인하세요.`
        });
      });
  };

  const handleImageUpload = (file) => {
    const formData = new FormData();
    formData.append('file', file);
    // 가치제고는 세부 구분(후번들/UHD전환/업셀링)을 제목에 포함
    const baseTitle = imageTitle || file.name.replace(/\.[^/.]+$/, '');
    const finalTitle = (imageCategory === 'value' && imageSubTitle)
      ? `${imageSubTitle}`
      : baseTitle;
    formData.append('title', finalTitle);
    formData.append('category', imageCategory);

    setUploadStatus({
      type: 'info',
      message: '이미지 업로드 중...'
    });

    fetch(`${API_URL}/api/upload-image`, {
      method: 'POST',
      body: formData
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setUploadStatus({
            type: 'success',
            message: `✅ ${data.message}`
          });
          setLastUploadedImage({ filename: data.image?.filename, category: imageCategory });
          if (data.extraction) {
            setExtractionStatus({ success: true, data: data.extraction });
          } else if (data.extraction_error) {
            setExtractionStatus({ success: false, error: data.extraction_error });
          }
          setSelectedFile(null);
        } else {
          setUploadStatus({
            type: 'error',
            message: data.error || '업로드 실패'
          });
        }
      })
      .catch(error => {
        setUploadStatus({
          type: 'error',
          message: `서버 연결 실패: ${error.message}\n\n로컬 백엔드가 실행 중인지 확인하세요. (localhost:3000에서 사용)`
        });
      });
  };

  const handleExtractPolicy = (imageInfo) => {
    setExtractionStatus({ loading: true });
    fetch(`${API_URL}/api/extract-policy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: imageInfo.filename, category: imageInfo.category })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setExtractionStatus({ success: true, data: data.extracted });
        } else {
          setExtractionStatus({ success: false, error: data.reason || data.error });
        }
      })
      .catch(e => setExtractionStatus({ success: false, error: e.message }));
  };

  const handleExcelExport = () => {
    window.open(`${API_URL}/api/export-excel`, '_blank');
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
    // 정책목록 시트 (flat 13컬럼 형식)
    const policyData = [
      { svc_type: '인터넷+TV', 단독_번들여부: '번들', 상품군: 'WiFi상향(통일)', 약정구분: '3년', price_grp: '20천원 이상', 정책_대분류: '번들', 정책_중분류: '재약정', 정책_소분류: '요금제유지', 정책판가: null, 사은품혜택: 30, 요금할인액: 0, 무료개월: 0, 기타특이사항: 'WiFi+ 통일요금' },
      { svc_type: '인터넷+TV', 단독_번들여부: '번들', 상품군: 'WiFi+', 약정구분: '3년', price_grp: '20천원 이상', 정책_대분류: '번들', 정책_중분류: '재약정', 정책_소분류: '요금제유지', 정책판가: null, 사은품혜택: 30, 요금할인액: 0, 무료개월: 0, 기타특이사항: 'WiFi+' },
      { svc_type: '인터넷+TV', 단독_번들여부: '번들', 상품군: '1G', 약정구분: '3년', price_grp: '20천원 이상', 정책_대분류: '번들', 정책_중분류: '재약정', 정책_소분류: '요금제상향', 정책판가: null, 사은품혜택: 30, 요금할인액: 0, 무료개월: 0, 기타특이사항: '1기가' },
      { svc_type: '인터넷+TV', 단독_번들여부: '번들', 상품군: '500M', 약정구분: '3년', price_grp: '20천원 이상', 정책_대분류: '번들', 정책_중분류: '재약정', 정책_소분류: '요금제상향', 정책판가: null, 사은품혜택: 27, 요금할인액: 0, 무료개월: 0, 기타특이사항: '500M' },
      { svc_type: '인터넷+TV', 단독_번들여부: '번들', 상품군: '광랜', 약정구분: '3년', price_grp: '20천원 이상', 정책_대분류: '번들', 정책_중분류: '재약정', 정책_소분류: '요금제상향', 정책판가: null, 사은품혜택: 25, 요금할인액: 0, 무료개월: 0, 기타특이사항: '광랜' },
      { svc_type: '인터넷+TV', 단독_번들여부: '번들', 상품군: '반값요금', 약정구분: '3년', price_grp: '20천원 이상', 정책_대분류: '번들', 정책_중분류: '재약정', 정책_소분류: '중간요금제', 정책판가: null, 사은품혜택: 20, 요금할인액: 0, 무료개월: 0, 기타특이사항: '반값요금' },
      { svc_type: '인터넷+TV', 단독_번들여부: '번들', 상품군: '특화요금', 약정구분: '3년', price_grp: '20천원 이상', 정책_대분류: '번들', 정책_중분류: '재약정', 정책_소분류: '최저요금제', 정책판가: null, 사은품혜택: 15, 요금할인액: 0, 무료개월: 0, 기타특이사항: '특화요금' },
      { svc_type: '인터넷+TV', 단독_번들여부: '단독', 상품군: '인터넷단독', 약정구분: '3년', price_grp: '20천원 이상', 정책_대분류: '번들', 정책_중분류: '재약정', 정책_소분류: '단독전환', 정책판가: null, 사은품혜택: 0, 요금할인액: 0, 무료개월: 0, 기타특이사항: '혜택없음' },
      { svc_type: '인터넷+TV', 단독_번들여부: '번들', 상품군: '동등결합', 약정구분: '3년', price_grp: null, 정책_대분류: '번들(특화)', 정책_중분류: '재약정', 정책_소분류: '요금제 유지', 정책판가: null, 사은품혜택: 18, 요금할인액: 0, 무료개월: 0, 기타특이사항: '현재 요금제 유지' },
      { svc_type: '인터넷+TV', 단독_번들여부: '번들', 상품군: '동등결합', 약정구분: '3년', price_grp: null, 정책_대분류: '번들(특화)', 정책_중분류: '재약정', 정책_소분류: '요금제 변경', 정책판가: null, 사은품혜택: 20, 요금할인액: 0, 무료개월: 0, 기타특이사항: '요금제 변경 시' },
      { svc_type: '인터넷+TV', 단독_번들여부: '번들', 상품군: '동등결합', 약정구분: '3년', price_grp: null, 정책_대분류: '번들(특화)', 정책_중분류: '재약정', 정책_소분류: '할인 적용', 정책판가: null, 사은품혜택: 15, 요금할인액: 5, 무료개월: 0, 기타특이사항: '추가 할인 제공' },
      { svc_type: '인터넷+TV', 단독_번들여부: '번들', 상품군: '동등결합', 약정구분: '3년', price_grp: null, 정책_대분류: '번들(특화)', 정책_중분류: '재약정', 정책_소분류: '약정 변경', 정책판가: null, 사은품혜택: 22, 요금할인액: 0, 무료개월: 0, 기타특이사항: '약정 기간 변경' },
      { svc_type: 'TV', 단독_번들여부: '단독', 상품군: 'D단독TV', 약정구분: '3년', price_grp: '14천원 이상', 정책_대분류: '단독', 정책_중분류: '재약정', 정책_소분류: '유지', 정책판가: null, 사은품혜택: 20, 요금할인액: 0, 무료개월: 0, 기타특이사항: '요금제 유지' },
      { svc_type: 'TV', 단독_번들여부: '단독', 상품군: 'D단독TV', 약정구분: '3년', price_grp: '14천원 이상', 정책_대분류: '단독', 정책_중분류: '재약정', 정책_소분류: '변경', 정책판가: null, 사은품혜택: 22, 요금할인액: 0, 무료개월: 0, 기타특이사항: '요금제 변경' },
      { svc_type: 'TV', 단독_번들여부: '단독', 상품군: 'D단독TV', 약정구분: '3년', price_grp: '14천원 이상', 정책_대분류: '단독', 정책_중분류: '재약정', 정책_소분류: '할인적용', 정책판가: null, 사은품혜택: 18, 요금할인액: 3, 무료개월: 0, 기타특이사항: '할인 적용' },
      { svc_type: 'TV', 단독_번들여부: '단독', 상품군: 'D단독TV', 약정구분: '3년', price_grp: '14천원 이상', 정책_대분류: '단독', 정책_중분류: '재약정', 정책_소분류: '약정변경', 정책판가: null, 사은품혜택: 25, 요금할인액: 0, 무료개월: 0, 기타특이사항: '약정 변경' },
      { svc_type: null, 단독_번들여부: null, 상품군: '공통', 약정구분: null, price_grp: null, 정책_대분류: '요금인상Care', 정책_중분류: '추가혜택', 정책_소분류: '기본혜택추가', 정책판가: null, 사은품혜택: 2, 요금할인액: 0, 무료개월: 0, 기타특이사항: '요금인상 Care 정책' },
      { svc_type: '인터넷+TV', 단독_번들여부: '번들', 상품군: '인터넷', 약정구분: null, price_grp: null, 정책_대분류: '가치제고', 정책_중분류: '후번들', 정책_소분류: '1회선추가', 정책판가: null, 사은품혜택: 5, 요금할인액: 0, 무료개월: 0, 기타특이사항: '' },
      { svc_type: 'TV', 단독_번들여부: '번들', 상품군: 'UHD (주상품)', 약정구분: '3년', price_grp: null, 정책_대분류: '가치제고', 정책_중분류: 'UHD전환', 정책_소분류: '업그레이드', 정책판가: null, 사은품혜택: 25, 요금할인액: 7, 무료개월: 0, 기타특이사항: '' },
      { svc_type: '인터넷+TV', 단독_번들여부: '번들', 상품군: '인터넷', 약정구분: null, price_grp: null, 정책_대분류: '가치제고', 정책_중분류: '업셀링', 정책_소분류: '요금제상향', 정책판가: null, 사은품혜택: 2, 요금할인액: 2, 무료개월: 0, 기타특이사항: '' },
    ];

    // 사용설명서 시트
    const instructionsData = [
      { 컬럼명: 'svc_type', 설명: '서비스 유형', 예시값: '인터넷+TV, 인터넷, TV' },
      { 컬럼명: '단독_번들여부', 설명: '단독/번들 구분', 예시값: '번들, 단독, 번들(특화)' },
      { 컬럼명: '상품군', 설명: '인터넷 상품명 또는 미디어 유형', 예시값: '1G, 500M, 광랜, WiFi+, D단독TV, 동등결합' },
      { 컬럼명: '약정구분', 설명: '약정 기간', 예시값: '3년, 2년, 1년, 무약정' },
      { 컬럼명: 'price_grp', 설명: '현재 납부 요금대', 예시값: '20천원 이상, 18천원 이상, 15천원 이상, 12천원 이상, 10천원 이상, 10천원 미만' },
      { 컬럼명: '정책_대분류', 설명: '정책 대분류', 예시값: '번들, 번들(특화), 단독, 요금인상Care, 가치제고' },
      { 컬럼명: '정책_중분류', 설명: '정책 중분류', 예시값: '재약정, 후번들, 업셀링, UHD전환, 추가혜택' },
      { 컬럼명: '정책_소분류', 설명: '정책 소분류', 예시값: '요금제유지, 요금제상향, 중간요금제, 최저요금제, 단독전환, 유지, 변경, 할인적용, 약정변경' },
      { 컬럼명: '정책판가', 설명: '정책 판매가 (만원, 없으면 비워두기)', 예시값: '' },
      { 컬럼명: '사은품혜택', 설명: '사은품/상품권 혜택 금액 (만원)', 예시값: '30, 25, 20, 15, 10, 0' },
      { 컬럼명: '요금할인액', 설명: '월 요금 할인액 (만원)', 예시값: '0, 2, 3, 5, 7' },
      { 컬럼명: '무료개월', 설명: '무료 제공 개월 수', 예시값: '0, 1, 2, 3' },
      { 컬럼명: '기타특이사항', 설명: '기타 특이사항', 예시값: '1기가, WiFi+, 반값요금 등' },
    ];

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(policyData);
    const ws2 = XLSX.utils.json_to_sheet(instructionsData);

    XLSX.utils.book_append_sheet(wb, ws1, '정책목록');
    XLSX.utils.book_append_sheet(wb, ws2, '사용설명서');

    XLSX.writeFile(wb, `정책_업데이트_템플릿_${new Date().toISOString().split('T')[0]}.xlsx`);

    setUploadStatus({
      type: 'info',
      message: '템플릿 파일이 다운로드되었습니다. 정책목록 시트에 데이터를 입력하고 업로드하세요.'
    });
  };

  return (
    <div>
      <div className="bg-gray-100 border border-gray-300 p-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">⚙️ 관리자 대시보드</h2>
            {backendStatus === 'online' && (
              <div className="mt-1 flex flex-wrap gap-2">
                <span className="text-xs text-green-600">✓ 백엔드 연결됨</span>
                {backendCaps.visionApi
                  ? <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">✓ AI 데이터추출 활성</span>
                  : <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">△ AI추출 비활성 (ANTHROPIC_API_KEY 필요)</span>
                }
                {backendCaps.excelExport && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">✓ Excel내보내기 가능</span>}
              </div>
            )}
            {backendStatus === 'offline' && (
              <p className="text-xs text-red-600 mt-1">
                ⚠️ 백엔드 서버 오프라인
              </p>
            )}
          </div>
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

      {/* 섹션 선택 탭 */}
      <div className="flex gap-2 mb-6 border-b border-gray-300">
        <button
          onClick={() => setActiveSection('upload')}
          className={`py-3 px-6 font-semibold transition-colors ${
            activeSection === 'upload'
              ? 'bg-white text-gray-800 border-b-2 border-gray-700'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          📤 정책 업로드
        </button>
        <button
          onClick={() => setActiveSection('users')}
          className={`py-3 px-6 font-semibold transition-colors ${
            activeSection === 'users'
              ? 'bg-white text-gray-800 border-b-2 border-gray-700'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          👥 사용자 관리
        </button>
      </div>

      {/* 섹션 내용 */}
      {activeSection === 'upload' ? (
        <div>
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

              {uploadType === 'image' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">제목 (선택)</label>
                    <input
                      type="text"
                      value={imageTitle}
                      onChange={(e) => setImageTitle(e.target.value)}
                      placeholder="예: 번들 재약정 정책"
                      className="w-full px-4 py-2 border border-gray-300 rounded focus:border-gray-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">카테고리</label>
                    <select
                      value={imageCategory}
                      onChange={(e) => { setImageCategory(e.target.value); setImageSubTitle(''); }}
                      className="w-full px-4 py-2 border border-gray-300 rounded focus:border-gray-500 focus:outline-none"
                    >
                      <option value="bundle">번들</option>
                      <option value="bundle2">번들(특화)</option>
                      <option value="standalone">단독</option>
                      <option value="care">요금인상Care</option>
                      <option value="value">가치제고 (후번들/UHD전환/업셀링)</option>
                    </select>
                  </div>
                  {imageCategory === 'value' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">가치제고 세부 구분</label>
                      <select
                        value={imageSubTitle}
                        onChange={(e) => setImageSubTitle(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:border-gray-500 focus:outline-none"
                      >
                        <option value="">선택하세요</option>
                        <option value="후번들">후번들</option>
                        <option value="UHD전환">UHD전환</option>
                        <option value="업셀링">업셀링</option>
                      </select>
                    </div>
                  )}
                </>
              )}

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

              {/* 정책 데이터 추출 패널 */}
              {lastUploadedImage && uploadType === 'image' && (
                <div className="border border-blue-300 rounded bg-blue-50 p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">정책 데이터 추출</h4>
                  {!backendCaps.visionApi ? (
                    <div className="text-sm text-gray-600">
                      <p className="mb-1">AI 자동 추출을 사용하려면 백엔드 서버에 환경변수를 설정하세요:</p>
                      <code className="bg-gray-200 px-2 py-1 rounded text-xs block">set ANTHROPIC_API_KEY=sk-ant-...</code>
                      <p className="mt-1 text-xs text-gray-500">설정 후 서버 재시작 필요</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-blue-700 mb-3">업로드된 이미지에서 AI가 정책 표를 자동으로 읽어 데이터를 추출합니다.</p>
                      <button
                        onClick={() => handleExtractPolicy(lastUploadedImage)}
                        disabled={extractionStatus?.loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2 rounded transition-colors"
                      >
                        {extractionStatus?.loading ? '추출 중...' : '정책 데이터 자동 추출 (AI)'}
                      </button>
                    </>
                  )}

                  {extractionStatus && !extractionStatus.loading && (
                    <div className={`mt-3 p-3 rounded border text-sm ${
                      extractionStatus.success
                        ? 'bg-green-50 border-green-300 text-green-800'
                        : 'bg-red-50 border-red-300 text-red-800'
                    }`}>
                      {extractionStatus.success ? (
                        <>
                          <p className="font-semibold mb-1">✅ 데이터 추출 완료</p>
                          <p>문서: {extractionStatus.data?.title || '번들 정책'}</p>
                          <p>버전: {extractionStatus.data?.version || '-'}</p>
                          <p>추출된 요금대: {extractionStatus.data?.internet?.rows?.length || 0}개</p>
                          <p className="mt-1 text-xs">policies.json에 반영되었습니다. 시뮬레이션에서 즉시 사용 가능합니다.</p>
                        </>
                      ) : (
                        <p>추출 실패: {extractionStatus.error}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 현재 정책 Excel 내보내기 */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              📊 정책 Excel 내보내기
            </h2>
            <div className="bg-gray-50 border border-gray-300 p-4 rounded mb-4">
              <p className="text-sm text-gray-600 mb-3">
                현재 적용된 정책 데이터를 Excel 파일로 다운로드합니다.<br />
                번들재약정 / 디지털재약정 / 동등결합 / D단독 / 요금인상Care 시트 포함
              </p>
              <button
                onClick={handleExcelExport}
                disabled={backendStatus !== 'online'}
                className="w-full bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white font-semibold py-2 rounded transition-colors"
              >
                {backendStatus === 'online' ? '📥 현재 정책 Excel 다운로드' : '(백엔드 서버 필요)'}
              </button>
            </div>
          </div>

          {/* 템플릿 다운로드 */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              📥 데이터 입력 템플릿
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
      ) : (
        <UserManagement />
      )}
    </div>
  );
};

export default AdminDashboard;
