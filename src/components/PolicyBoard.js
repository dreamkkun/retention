import React, { useState } from 'react';
import policiesData from '../data/policies.json';

const PolicyBoard = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const filters = [
    { id: 'all', label: '전체 보기', icon: '📊' },
    { id: 'bundle', label: '번들 재약정', icon: '📦' },
    { id: 'equal_bundle', label: '동등결합', icon: '🔗' },
    { id: 'digital', label: '디지털(TV)', icon: '📺' },
    { id: 'd_standalone', label: 'D단독', icon: '🎬' },
    { id: 'single', label: '단독 TV', icon: '📡' },
    { id: 'new', label: '신규/업셀링', icon: '🆕' },
    { id: 'care', label: '요금인상 Care', icon: '🔥' },
  ];

  const openImageViewer = (image) => {
    setSelectedImage(image);
    setShowImageViewer(true);
  };

  const closeImageViewer = () => {
    setShowImageViewer(false);
    setSelectedImage(null);
  };

  const renderVersionInfo = () => (
    <div className="card mb-6 bg-gradient-to-r from-primary-600 to-primary-800 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">
            [{policiesData.metadata.update_week}] 인터넷/TV 리텐션 정책
          </h2>
          <p className="text-primary-100 text-lg">
            최종 업데이트: <span className="font-bold">{policiesData.metadata.last_updated}</span> | 
            버전: <span className="font-bold text-yellow-300 text-xl">{policiesData.metadata.version}</span>
          </p>
        </div>
        <div className="text-right">
          <div className="bg-white text-primary-700 px-6 py-3 rounded-lg font-bold text-2xl shadow-lg">
            {policiesData.metadata.version}
          </div>
          <p className="text-sm text-primary-200 mt-2">현재 적용 버전</p>
        </div>
      </div>
    </div>
  );

  const renderNotices = () => {
    if (!policiesData.notices || policiesData.notices.length === 0) return null;

    return (
      <div className="mb-6 space-y-3">
        {policiesData.notices.map((notice) => (
          <div
            key={notice.id}
            className={`p-4 rounded-lg border-l-4 ${
              notice.type === 'urgent'
                ? 'bg-red-50 border-red-500'
                : 'bg-blue-50 border-blue-500'
            }`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {notice.type === 'urgent' ? (
                  <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className={`font-bold text-lg ${
                    notice.type === 'urgent' ? 'text-red-900' : 'text-blue-900'
                  }`}>
                    🔔 {notice.title}
                  </h3>
                  <span className={`text-sm ${
                    notice.type === 'urgent' ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {notice.date}
                  </span>
                </div>
                <p className={`mt-1 ${
                  notice.type === 'urgent' ? 'text-red-800' : 'text-blue-800'
                }`}>
                  {notice.content}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderColorGuide = () => (
    <div className="card mb-6 bg-gradient-to-br from-gray-50 to-white">
      <h3 className="text-lg font-bold text-gray-800 mb-3">🎨 가치제안 구분 (컬러 가이드)</h3>
      <div className="flex flex-wrap gap-3">
        {policiesData.color_guide.map((guide) => (
          <div
            key={guide.category}
            className={`${guide.bg} ${guide.border} border-2 px-4 py-2 rounded-lg flex items-center`}
          >
            <div className={`w-4 h-4 rounded-full ${guide.bg} ${guide.border} border-2 mr-2`}></div>
            <span className={`font-semibold ${guide.text}`}>{guide.name}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderImageGallery = () => (
    <div className="card mb-6 bg-gradient-to-br from-indigo-50 to-purple-50">
      <h3 className="text-xl font-bold text-indigo-900 mb-4 flex items-center">
        🖼️ 원본 정책서 이미지 보기
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {policiesData.policy_images.map((image) => (
          <button
            key={image.id}
            onClick={() => openImageViewer(image)}
            className="group relative bg-white p-3 rounded-lg border-2 border-indigo-200 hover:border-indigo-500 hover:shadow-lg transition-all"
          >
            <div className="aspect-video bg-gradient-to-br from-indigo-100 to-purple-100 rounded flex items-center justify-center mb-2">
              <svg className="w-12 h-12 text-indigo-400 group-hover:text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-gray-700 text-center line-clamp-2">
              {image.title}
            </p>
          </button>
        ))}
      </div>
    </div>
  );

  const renderBundleRetentionMatrix = () => {
    const matrix = policiesData.bundle_retention_matrix;
    const columns = matrix.columns;
    const rows = matrix.rows;

    const getColorClasses = (colorName) => {
      const guide = policiesData.color_guide.find(g => g.color === colorName);
      return guide || { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-900' };
    };

    return (
      <div className="card mb-8">
        <h2 className="text-2xl font-bold text-primary-700 mb-4 flex items-center">
          📦 번들 재약정 정책 (Matrix 구조)
        </h2>
        <p className="text-gray-600 mb-6">{matrix.description}</p>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border-2 border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th rowSpan="2" className="px-4 py-3 text-center text-sm font-bold border-2 border-gray-300 bg-gray-200">
                  인터넷<br/>현재 판가
                </th>
                {columns.map((column) => {
                  const colorClasses = getColorClasses(column.color);
                  return (
                    <th
                      key={column.id}
                      colSpan={column.sub_columns.length}
                      className={`px-4 py-3 text-center text-sm font-bold border-2 ${colorClasses.border} ${colorClasses.bg} ${colorClasses.text} relative`}
                    >
                      {column.name}
                      {column.recommended && (
                        <span className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                          추천
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
              <tr className="bg-gray-50">
                {columns.map((column) => {
                  const colorClasses = getColorClasses(column.color);
                  return column.sub_columns.map((subCol) => (
                    <th
                      key={`${column.id}_${subCol.id}`}
                      className={`px-3 py-2 text-center text-xs font-semibold border-2 ${colorClasses.border} ${colorClasses.bg}`}
                    >
                      {subCol.name}
                      <div className="text-xs font-normal text-gray-600 mt-1">
                        {subCol.description}
                      </div>
                    </th>
                  ));
                })}
              </tr>
            </thead>
            <tbody className="bg-white">
              {rows.map((row, rowIndex) => (
                <tr
                  key={row.id}
                  className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="px-4 py-4 text-center font-bold text-base border-2 border-gray-300 bg-gray-100">
                    <div>{row.name}</div>
                    <div className="text-xs font-normal text-gray-600 mt-1">
                      {row.description}
                    </div>
                  </td>
                  {columns.map((column) => {
                    const colorClasses = getColorClasses(column.color);
                    return column.sub_columns.map((subCol) => {
                      const cellData = row.data[column.id]?.[subCol.id];
                      const isRecommended = column.recommended && row.id === 'over_20k';
                      
                      return (
                        <td
                          key={`${row.id}_${column.id}_${subCol.id}`}
                          className={`px-3 py-3 text-center border-2 ${colorClasses.border} ${
                            isRecommended
                              ? 'bg-blue-50 border-blue-500 border-4 relative'
                              : ''
                          }`}
                        >
                          {isRecommended && (
                            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                              추천구간
                            </div>
                          )}
                          <div className="font-bold text-lg text-primary-700">
                            {cellData?.gift_card || 0}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            만원
                          </div>
                          {cellData?.notes && (
                            <div className="text-xs text-gray-500 mt-1">
                              {cellData.notes}
                            </div>
                          )}
                        </td>
                      );
                    });
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
          <h3 className="font-bold text-blue-900 mb-2">💡 정책 해석 가이드</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>요금제 유지</strong>: 현재 요금을 그대로 유지하면서 상품권 혜택</li>
            <li>• <strong>요금제 상향</strong>: 더 빠른 속도로 업그레이드 + 최대 혜택 (추천)</li>
            <li>• <strong>중간요금제</strong>: 반값 요금 등 중간 단계 혜택</li>
            <li>• <strong>최저요금제</strong>: 최소 혜택 제공</li>
            <li>• <strong>단독전환</strong>: 번들 해지 시 혜택 없음</li>
          </ul>
        </div>
      </div>
    );
  };

  const renderDigitalRenewal = () => {
    const digital = policiesData.digital_renewal;

    return (
      <div className="card mb-8 border-2 border-purple-300">
        <h2 className="text-2xl font-bold text-purple-700 mb-4 flex items-center">
          📺 디지털(TV) 재약정 정책
        </h2>
        <p className="text-gray-600 mb-6">{digital.description}</p>

        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">주상품 (UHD/HD)</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {digital.main_products.map((product) => (
              <div key={product.id} className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border-2 border-purple-300">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-lg font-bold text-purple-900">{product.name}</h4>
                  <span className="text-sm bg-purple-200 px-3 py-1 rounded-full font-semibold">
                    월 {product.monthly_fee}만원
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="bg-white p-3 rounded shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">유지 시</span>
                      <div className="text-right">
                        <span className="font-bold text-green-700 text-lg">{product.benefits.maintain.gift_card}만원</span>
                        <span className="text-xs text-gray-500 ml-2">상품권</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      + 월 {product.benefits.maintain.discount}만원 할인
                    </div>
                  </div>
                  
                  <div className="bg-white p-3 rounded shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">상향 시</span>
                      <div className="text-right">
                        <span className="font-bold text-blue-700 text-lg">{product.benefits.upgrade.gift_card}만원</span>
                        <span className="text-xs text-gray-500 ml-2">상품권</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      + 월 {product.benefits.upgrade.discount}만원 할인
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-3">부가상품</h3>
          <div className="grid md:grid-cols-4 gap-3">
            {digital.sub_products.map((product) => (
              <div key={product.id} className="bg-white p-3 rounded-lg border border-gray-300">
                <h5 className="font-semibold text-gray-800 mb-2">{product.name}</h5>
                <div className="text-sm text-gray-600">월 {product.monthly_fee}만원</div>
                <div className="text-lg font-bold text-purple-700 mt-2">{product.gift_card}만원</div>
                <div className="text-xs text-gray-500">상품권</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderSingleTV = () => {
    const beforeIncrease = policiesData.single_tv.tv_only_customers.before_price_increase.retention_offers;
    const afterIncrease = policiesData.single_tv.tv_only_customers.after_price_increase.retention_offers;

    return (
      <div className="card mb-8">
        <h2 className="text-2xl font-bold text-primary-700 mb-4 flex items-center">
          🎬 단독 TV 고객 정책
        </h2>
        <p className="text-gray-600 mb-6">{policiesData.single_tv.description}</p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="border-2 border-gray-300 rounded-lg p-4">
            <h3 className="text-lg font-bold text-gray-700 mb-4 bg-gray-100 p-2 rounded">
              요금인상 전 고객
            </h3>
            <table className="w-full text-sm">
              <thead className="bg-primary-50">
                <tr>
                  <th className="px-3 py-2 border text-center">액션</th>
                  <th className="px-3 py-2 border text-center">3년</th>
                  <th className="px-3 py-2 border text-center">4년</th>
                  <th className="px-3 py-2 border text-center">5년</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-green-50">
                  <td className="px-3 py-2 border text-center font-semibold">유지</td>
                  <td className="px-3 py-2 border text-center">{beforeIncrease.maintain.gift_card['3_year']}</td>
                  <td className="px-3 py-2 border text-center">{beforeIncrease.maintain.gift_card['4_year']}</td>
                  <td className="px-3 py-2 border text-center font-bold">{beforeIncrease.maintain.gift_card['5_year']}</td>
                </tr>
                <tr className="bg-blue-50">
                  <td className="px-3 py-2 border text-center font-semibold">상향</td>
                  <td className="px-3 py-2 border text-center">{beforeIncrease.upgrade.gift_card['3_year']}</td>
                  <td className="px-3 py-2 border text-center">{beforeIncrease.upgrade.gift_card['4_year']}</td>
                  <td className="px-3 py-2 border text-center font-bold">{beforeIncrease.upgrade.gift_card['5_year']}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border-2 border-primary-300 rounded-lg p-4">
            <h3 className="text-lg font-bold text-primary-700 mb-4 bg-primary-100 p-2 rounded">
              요금인상 후 고객
            </h3>
            <table className="w-full text-sm">
              <thead className="bg-primary-50">
                <tr>
                  <th className="px-3 py-2 border text-center">액션</th>
                  <th className="px-3 py-2 border text-center">3년</th>
                  <th className="px-3 py-2 border text-center">4년</th>
                  <th className="px-3 py-2 border text-center">5년</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-green-50">
                  <td className="px-3 py-2 border text-center font-semibold">유지</td>
                  <td className="px-3 py-2 border text-center">{afterIncrease.maintain.gift_card['3_year']}</td>
                  <td className="px-3 py-2 border text-center">{afterIncrease.maintain.gift_card['4_year']}</td>
                  <td className="px-3 py-2 border text-center font-bold">{afterIncrease.maintain.gift_card['5_year']}</td>
                </tr>
                <tr className="bg-blue-50">
                  <td className="px-3 py-2 border text-center font-semibold">상향</td>
                  <td className="px-3 py-2 border text-center">{afterIncrease.upgrade.gift_card['3_year']}</td>
                  <td className="px-3 py-2 border text-center">{afterIncrease.upgrade.gift_card['4_year']}</td>
                  <td className="px-3 py-2 border text-center font-bold">{afterIncrease.upgrade.gift_card['5_year']}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 p-4 bg-green-50 border-l-4 border-green-500 rounded">
          <h3 className="font-bold text-green-900 mb-2">🎁 번들 전환 혜택</h3>
          <p className="text-gray-700">
            인터넷 추가 시: <span className="font-bold text-green-700">{policiesData.single_tv.bundling_incentives.internet_addition.gift_card}만원</span> + 
            IPTV 할인 (1년: {policiesData.single_tv.bundling_incentives.internet_addition.iptv_discount['1_year']}만원, 
            2년: {policiesData.single_tv.bundling_incentives.internet_addition.iptv_discount['2_years']}만원)
          </p>
        </div>
      </div>
    );
  };

  const renderNewService = () => {
    const postBundle = policiesData.new_service.post_bundle;
    const upselling = policiesData.new_service.upselling;

    return (
      <div className="card mb-8">
        <h2 className="text-2xl font-bold text-primary-700 mb-4 flex items-center">
          🆕 신규 서비스 & 업셀링 정책
        </h2>
        <p className="text-gray-600 mb-6">{policiesData.new_service.description}</p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border-2 border-purple-300">
            <h3 className="text-lg font-bold text-purple-900 mb-4">📱 후번들 혜택</h3>
            <div className="space-y-3">
              <div className="bg-white p-3 rounded shadow-sm">
                <p className="text-sm text-gray-600">1회선 추가</p>
                <p className="text-xl font-bold text-purple-700">
                  {postBundle.additional_line_benefits.gift_card['1_line_addition']}만원
                </p>
              </div>
              <div className="bg-white p-3 rounded shadow-sm">
                <p className="text-sm text-gray-600">2회선 추가</p>
                <p className="text-xl font-bold text-purple-700">
                  {postBundle.additional_line_benefits.gift_card['2_line_addition']}만원
                </p>
              </div>
              <div className="bg-white p-3 rounded shadow-sm">
                <p className="text-sm text-gray-600">3회선 추가</p>
                <p className="text-xl font-bold text-purple-700">
                  {postBundle.additional_line_benefits.gift_card['3_line_addition']}만원
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border-2 border-blue-300">
            <h3 className="text-lg font-bold text-blue-900 mb-4">⬆️ 업셀링 혜택</h3>
            <div className="bg-white p-4 rounded shadow-sm">
              <p className="text-sm text-gray-600 mb-3">요금제 상향 시 (모든 단계)</p>
              <div className="flex justify-around">
                <div className="text-center">
                  <p className="text-xs text-gray-500">상품권</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {upselling.price_tier_upgrade.any_upgrade.gift_card}만원
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">IPTV 할인</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {upselling.price_tier_upgrade.any_upgrade.iptv_discount}만원
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPriceIncreaseCare = () => {
    if (!policiesData.price_increase_care) return null;

    return (
      <div className="card mb-8 border-2 border-red-400">
        <h2 className="text-2xl font-bold text-red-700 mb-4 flex items-center">
          🔥 요금인상 Care 정책
        </h2>
        <p className="text-gray-600 mb-6">{policiesData.price_increase_care.description}</p>

        <div className="bg-red-50 p-6 rounded-lg">
          <h3 className="font-bold text-red-900 mb-3">대상 고객</h3>
          <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4">
            {policiesData.price_increase_care.targets.map((target, idx) => (
              <li key={idx}>{target}</li>
            ))}
          </ul>

          <div className="bg-white p-4 rounded shadow-sm">
            <h4 className="font-semibold text-gray-800 mb-2">추가 혜택</h4>
            <p className="text-gray-700">
              <span className="font-bold text-red-700 text-2xl">+{policiesData.price_increase_care.benefits.gift_card_bonus}만원</span>
              <span className="text-sm ml-2">({policiesData.price_increase_care.benefits.description})</span>
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderEqualBundle = () => {
    if (!policiesData.equal_bundle) return null;

    return (
      <div className="card mb-8 border-2 border-teal-400">
        <h2 className="text-2xl font-bold text-teal-700 mb-4 flex items-center">
          🔗 동등결합 상품 이용 고객 정책
        </h2>
        <p className="text-gray-600 mb-2">{policiesData.equal_bundle.description}</p>
        <p className="text-sm text-teal-700 mb-6 bg-teal-50 p-3 rounded">
          📌 {policiesData.equal_bundle.note}
        </p>

        <div className="grid md:grid-cols-4 gap-4">
          {policiesData.equal_bundle.categories.map((category) => (
            <div
              key={category.id}
              className="bg-gradient-to-br from-teal-50 to-teal-100 p-5 rounded-lg border-2 border-teal-300 hover:shadow-lg transition-all"
            >
              <h3 className="text-lg font-bold text-teal-900 mb-2">{category.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{category.description}</p>
              
              <div className="bg-white p-4 rounded shadow-sm text-center">
                <div className="text-3xl font-bold text-teal-700 mb-1">
                  {category.gift_card}
                </div>
                <div className="text-xs text-gray-600">만원 상품권</div>
                
                {category.discount && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-sm text-gray-600">추가 할인</div>
                    <div className="text-xl font-bold text-orange-600">
                      {category.discount}만원
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDStandalone = () => {
    if (!policiesData.d_standalone) return null;

    return (
      <div className="card mb-8 border-2 border-indigo-400">
        <h2 className="text-2xl font-bold text-indigo-700 mb-4 flex items-center">
          📺 D단독 (디지털 단독) 고객 정책
        </h2>
        <p className="text-gray-600 mb-2">{policiesData.d_standalone.description}</p>
        <p className="text-sm text-indigo-700 mb-6 bg-indigo-50 p-3 rounded">
          📌 {policiesData.d_standalone.note}
        </p>

        {policiesData.d_standalone.price_tiers.map((tier) => (
          <div key={tier.id} className="mb-6 pb-6 border-b last:border-b-0">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {tier.name} - {tier.description}
            </h3>
            
            <div className="grid md:grid-cols-4 gap-4">
              {Object.entries(tier.policies).map(([policyId, policy]) => (
                <div
                  key={policyId}
                  className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg border-2 border-indigo-300"
                >
                  <h4 className="font-bold text-indigo-900 mb-2">{policy.description}</h4>
                  
                  <div className="bg-white p-3 rounded shadow-sm text-center">
                    <div className="text-2xl font-bold text-indigo-700 mb-1">
                      {policy.gift_card}
                    </div>
                    <div className="text-xs text-gray-600">만원 상품권</div>
                    
                    {policy.discount > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <div className="text-sm text-gray-600">월 할인</div>
                        <div className="text-lg font-bold text-orange-600">
                          {policy.discount}만원
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      {renderVersionInfo()}
      {renderNotices()}
      {renderColorGuide()}
      {renderImageGallery()}

      <div className="mb-6">
        <div className="flex flex-wrap gap-3">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeFilter === filter.id
                  ? 'bg-primary-600 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-100 shadow'
              }`}
            >
              {filter.icon} {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        {(activeFilter === 'all' || activeFilter === 'bundle') && renderBundleRetentionMatrix()}
        {(activeFilter === 'all' || activeFilter === 'equal_bundle') && renderEqualBundle()}
        {(activeFilter === 'all' || activeFilter === 'digital') && renderDigitalRenewal()}
        {(activeFilter === 'all' || activeFilter === 'd_standalone') && renderDStandalone()}
        {(activeFilter === 'all' || activeFilter === 'single') && renderSingleTV()}
        {(activeFilter === 'all' || activeFilter === 'new') && renderNewService()}
        {(activeFilter === 'all' || activeFilter === 'care') && renderPriceIncreaseCare()}
      </div>

      {showImageViewer && selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={closeImageViewer}
        >
          <div className="relative max-w-6xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeImageViewer}
              className="absolute -top-12 right-0 text-white hover:text-red-400 transition-colors"
            >
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="bg-white rounded-lg p-6 max-h-screen overflow-auto">
              <h3 className="text-xl font-bold text-gray-800 mb-4">{selectedImage.title}</h3>
              <img
                src={`/assets/${selectedImage.filename.split('/').pop()}`}
                alt={selectedImage.title}
                className="w-full h-auto rounded shadow-lg"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3E이미지를 불러올 수 없습니다%3C/text%3E%3C/svg%3E';
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PolicyBoard;
