import React, { useState } from 'react';
import * as XLSX from 'xlsx';

const ExcelUploader = ({ onPolicyUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const updatedPolicies = parseExcelToPolicy(workbook);
        
        if (updatedPolicies) {
          onPolicyUpdate(updatedPolicies);
          setUploadStatus({ type: 'success', message: '정책 데이터가 성공적으로 업데이트되었습니다!' });
          
          const dataStr = JSON.stringify(updatedPolicies, null, 2);
          const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
          const exportFileDefaultName = `policies_${new Date().toISOString().split('T')[0]}.json`;
          
          const linkElement = document.createElement('a');
          linkElement.setAttribute('href', dataUri);
          linkElement.setAttribute('download', exportFileDefaultName);
          linkElement.click();
        } else {
          setUploadStatus({ type: 'error', message: '엑셀 파일 형식이 올바르지 않습니다.' });
        }
      } catch (error) {
        setUploadStatus({ type: 'error', message: `오류 발생: ${error.message}` });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const parseExcelToPolicy = (workbook) => {
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    const policies = {
      metadata: {
        version: jsonData.find(row => row['항목'] === '버전')?.['값'] || 'v3.1',
        last_updated: new Date().toISOString().split('T')[0],
        update_week: jsonData.find(row => row['항목'] === '주차')?.['값'] || '2월 4주차',
        currency: 'KRW',
        unit: '만원 (10,000 KRW)',
        source: '리텐션 고객정책 문서'
      },
      notices: [],
      bundle_retention: {
        description: '번들 고객 재약정 정책',
        categories: [
          { name: '요금유지(최고구간)', color: 'green', description: '현재 요금제 유지 시 최대 혜택' },
          { name: '요금상향', color: 'blue', description: '요금제 상향 시 추가 인센티브' },
          { name: '중간구간', color: 'yellow', description: '조건부 혜택 제공' },
          { name: '최저구간', color: 'orange', description: '최소 혜택' },
          { name: '단독전환', color: 'red', description: '번들 해지 시 혜택 없음' }
        ],
        internet_price_tiers: {},
        additional_benefits: {
          description: '추가 혜택',
          iptv: {
            '1_year_discount': {},
            '2_year_discount': {},
            description: 'IPTV 추가 할인 (만원)'
          }
        }
      },
      single_tv: {
        description: '단독 TV 고객 정책',
        tv_only_customers: {
          before_price_increase: { description: '단독TV 요금인상 전 고객', retention_offers: {} },
          after_price_increase: { description: '단독TV 요금인상 후 고객', retention_offers: {} }
        },
        bundling_incentives: {}
      }
    };

    const bundleData = jsonData.filter(row => row['카테고리'] === '번들');
    bundleData.forEach(row => {
      const price = row['판가'];
      const action = row['액션'];
      const year3 = parseInt(row['3년']) || 0;
      const year4 = parseInt(row['4년']) || 0;
      const year5 = parseInt(row['5년']) || 0;

      if (!policies.bundle_retention.internet_price_tiers[price]) {
        policies.bundle_retention.internet_price_tiers[price] = {
          maintain: { gift_card: {}, iptv_discount: 0 },
          upgrade: { gift_card: {}, iptv_discount: 0 },
          downgrade: { gift_card: {}, iptv_discount: 0 }
        };
      }

      policies.bundle_retention.internet_price_tiers[price][action].gift_card = {
        '3_year': year3,
        '4_year': year4,
        '5_year': year5
      };
    });

    return policies;
  };

  const downloadTemplate = () => {
    const templateData = [
      { '항목': '버전', '값': 'v3.1' },
      { '항목': '주차', '값': '2월 4주차' },
      { '카테고리': '번들', '판가': '20k', '액션': 'maintain', '3년': 10, '4년': 11, '5년': 13 },
      { '카테고리': '번들', '판가': '20k', '액션': 'upgrade', '3년': 12, '4년': 14, '5년': 18 },
      { '카테고리': '번들', '판가': '20k', '액션': 'downgrade', '3년': 0, '4년': 0, '5년': 0 },
      { '카테고리': '번들', '판가': '18k', '액션': 'maintain', '3년': 9, '4년': 10, '5년': 12 },
      { '카테고리': '번들', '판가': '18k', '액션': 'upgrade', '3년': 11, '4년': 13, '5년': 17 },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '정책데이터');
    XLSX.writeFile(wb, 'policy_template.xlsx');

    setUploadStatus({ type: 'info', message: '템플릿 파일이 다운로드되었습니다.' });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-lg transition-all z-40"
        title="엑셀 업로드"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">📊 정책 데이터 업로드</h3>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setUploadStatus(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                <p className="text-sm text-blue-800">
                  💡 <strong>사용 방법:</strong> 엑셀 템플릿을 다운로드하여 수정한 후 업로드하세요.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={downloadTemplate}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  엑셀 템플릿 다운로드
                </button>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="excel-upload"
                  />
                  <label
                    htmlFor="excel-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-gray-600 font-semibold">클릭하여 엑셀 파일 선택</span>
                    <span className="text-sm text-gray-500 mt-1">.xlsx 또는 .xls 파일만 가능</span>
                  </label>
                </div>
              </div>

              {uploadStatus && (
                <div className={`p-4 rounded-lg ${
                  uploadStatus.type === 'success' ? 'bg-green-50 text-green-800' :
                  uploadStatus.type === 'error' ? 'bg-red-50 text-red-800' :
                  'bg-blue-50 text-blue-800'
                }`}>
                  <p className="font-semibold">{uploadStatus.message}</p>
                  {uploadStatus.type === 'success' && (
                    <p className="text-sm mt-2">
                      policies.json 파일이 자동으로 다운로드되었습니다. 
                      <br />이 파일을 src/data/ 폴더에 복사하여 적용하세요.
                    </p>
                  )}
                </div>
              )}

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>주의:</strong> 업로드 후 자동으로 다운로드되는 JSON 파일을 src/data/policies.json으로 교체해야 합니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExcelUploader;
