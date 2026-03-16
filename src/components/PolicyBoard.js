import React, { useState, useEffect } from 'react';
import policiesData from '../data/policies.json';
import API_URL from '../config';

// 카테고리 정의
const CATEGORIES = [
  { id: 'all',        label: '전체 보기' },
  { id: 'bundle',     label: '번들' },
  { id: 'bundle2',    label: '번들(특화)' },
  { id: 'standalone', label: '단독' },
  { id: 'care',       label: '요금인상Care' },
  { id: 'value',      label: '가치제고' },
];

const CATEGORY_LABELS = Object.fromEntries(
  CATEGORIES.filter(c => c.id !== 'all').map(c => [c.id, c.label])
);

const VALUE_SUB_ORDER = ['후번들', 'UHD전환', '업셀링'];

// 번들 정책 테이블
const BundleTable = () => {
  const matrix = policiesData.bundle_retention_matrix;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse border border-gray-400">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-400 px-2 py-2 text-left" rowSpan={2}>요금대</th>
            <th className="border border-gray-400 px-2 py-2 text-center bg-green-100" colSpan={2}>요금제 유지</th>
            <th className="border border-gray-400 px-2 py-2 text-center bg-blue-100" colSpan={3}>요금제 상향</th>
            <th className="border border-gray-400 px-2 py-2 text-center bg-orange-100">중간요금제</th>
            <th className="border border-gray-400 px-2 py-2 text-center bg-gray-100">최저요금제</th>
            <th className="border border-gray-400 px-2 py-2 text-center bg-pink-100">단독전환</th>
          </tr>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 px-2 py-1 text-center bg-green-50 text-xs">통일요금</th>
            <th className="border border-gray-400 px-2 py-1 text-center bg-green-50 text-xs">WiFi+</th>
            <th className="border border-gray-400 px-2 py-1 text-center bg-blue-50 text-xs">1G</th>
            <th className="border border-gray-400 px-2 py-1 text-center bg-blue-50 text-xs">500M</th>
            <th className="border border-gray-400 px-2 py-1 text-center bg-blue-50 text-xs">광랜</th>
            <th className="border border-gray-400 px-2 py-1 text-center bg-orange-50 text-xs">반값요금</th>
            <th className="border border-gray-400 px-2 py-1 text-center bg-gray-50 text-xs">특화요금</th>
            <th className="border border-gray-400 px-2 py-1 text-center bg-pink-50 text-xs">인터넷단독</th>
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map(row => (
            <tr key={row.id} className="hover:bg-gray-50">
              <td className="border border-gray-400 px-2 py-2 font-semibold text-gray-800 whitespace-nowrap">{row.name}</td>
              <td className="border border-gray-400 px-2 py-2 text-center bg-green-50">{row.data.maintain?.unified?.gift_card ?? '-'}만원</td>
              <td className="border border-gray-400 px-2 py-2 text-center bg-green-50">{row.data.maintain?.wifi_plus?.gift_card ?? '-'}만원</td>
              <td className="border border-gray-400 px-2 py-2 text-center bg-blue-50 font-semibold">{row.data.upgrade?.['1g']?.gift_card ?? '-'}만원</td>
              <td className="border border-gray-400 px-2 py-2 text-center bg-blue-50">{row.data.upgrade?.['500m']?.gift_card ?? '-'}만원</td>
              <td className="border border-gray-400 px-2 py-2 text-center bg-blue-50">{row.data.upgrade?.gwanglan?.gift_card ?? '-'}만원</td>
              <td className="border border-gray-400 px-2 py-2 text-center bg-orange-50">{row.data.middle?.half_price?.gift_card ?? '-'}만원</td>
              <td className="border border-gray-400 px-2 py-2 text-center bg-gray-50">{row.data.lowest?.special?.gift_card ?? '-'}만원</td>
              <td className="border border-gray-400 px-2 py-2 text-center bg-pink-50 text-gray-500">혜택없음</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-500 mt-2">* 상품권 금액 기준 (단위: 만원)</p>
    </div>
  );
};

// 번들(특화) 정책 테이블 - 동등결합 고객
const Bundle2Table = () => {
  const data = policiesData.equal_bundle;
  return (
    <div>
      <p className="text-sm text-gray-600 mb-3 bg-blue-50 border border-blue-200 px-3 py-2 rounded">
        동등결합(인터넷+디지털 결합) 고객 대상 정책입니다.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse border border-gray-400">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-400 px-3 py-2 text-left">구분</th>
              <th className="border border-gray-400 px-3 py-2 text-center">상품권 (만원)</th>
              <th className="border border-gray-400 px-3 py-2 text-center">월 할인 (만원)</th>
              <th className="border border-gray-400 px-3 py-2 text-left">설명</th>
            </tr>
          </thead>
          <tbody>
            {data.categories.map(cat => (
              <tr key={cat.id} className="hover:bg-gray-50">
                <td className="border border-gray-400 px-3 py-2 font-semibold">{cat.name}</td>
                <td className="border border-gray-400 px-3 py-2 text-center font-bold text-blue-700">{cat.gift_card}만원</td>
                <td className="border border-gray-400 px-3 py-2 text-center">{cat.discount ? `${cat.discount}만원` : '-'}</td>
                <td className="border border-gray-400 px-3 py-2 text-gray-600">{cat.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 단독 정책 테이블
const StandaloneTable = () => {
  const data = policiesData.d_standalone;
  return (
    <div>
      <p className="text-sm text-gray-600 mb-3 bg-orange-50 border border-orange-200 px-3 py-2 rounded">
        디지털(TV) 단독 고객 대상 정책입니다.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse border border-gray-400">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-400 px-3 py-2 text-left">요금대</th>
              <th className="border border-gray-400 px-3 py-2 text-center bg-green-100">유지</th>
              <th className="border border-gray-400 px-3 py-2 text-center bg-blue-100">변경</th>
              <th className="border border-gray-400 px-3 py-2 text-center bg-orange-100">할인적용</th>
              <th className="border border-gray-400 px-3 py-2 text-center bg-purple-100">약정변경</th>
            </tr>
          </thead>
          <tbody>
            {data.price_tiers.map(tier => (
              <tr key={tier.id} className="hover:bg-gray-50">
                <td className="border border-gray-400 px-3 py-2 font-semibold">{tier.name}</td>
                <td className="border border-gray-400 px-3 py-2 text-center bg-green-50">
                  {tier.policies.maintain.gift_card}만원
                </td>
                <td className="border border-gray-400 px-3 py-2 text-center bg-blue-50">
                  {tier.policies.change.gift_card}만원
                </td>
                <td className="border border-gray-400 px-3 py-2 text-center bg-orange-50">
                  {tier.policies.discount_apply.gift_card}만원
                  {tier.policies.discount_apply.discount > 0 && (
                    <span className="text-xs text-green-700 ml-1">+{tier.policies.discount_apply.discount}만원할인</span>
                  )}
                </td>
                <td className="border border-gray-400 px-3 py-2 text-center bg-purple-50">
                  {tier.policies.contract_change?.gift_card ?? '-'}만원
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500 mt-2">* 상품권 금액 기준 (단위: 만원)</p>
    </div>
  );
};

// 요금인상Care 정책
const CareTable = () => {
  const care = policiesData.price_increase_care;
  const matrix = policiesData.bundle_retention_matrix;
  return (
    <div>
      <div className="bg-red-50 border border-red-300 px-4 py-3 rounded mb-4">
        <h4 className="font-bold text-red-800 mb-1">요금인상Care 정책</h4>
        <p className="text-sm text-red-700">{care.description}</p>
        <div className="mt-2 bg-red-100 border border-red-300 px-3 py-2 rounded">
          <span className="font-bold text-red-800 text-lg">기본 혜택 대비 +{care.benefits.gift_card_bonus}만원 추가 지급</span>
        </div>
      </div>
      <div className="bg-gray-50 border border-gray-300 px-4 py-3 rounded mb-4">
        <h5 className="font-semibold text-gray-700 mb-2">대상 고객</h5>
        <ul className="text-sm text-gray-600 list-disc ml-4">
          {care.targets.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      </div>
      <p className="text-sm text-gray-600 mb-3">기본 번들 정책 상품권에 <strong>+{care.benefits.gift_card_bonus}만원</strong>이 추가 지급됩니다:</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse border border-gray-400">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-400 px-2 py-2 text-left">요금대</th>
              <th className="border border-gray-400 px-2 py-2 text-center bg-green-100">유지(통일)</th>
              <th className="border border-gray-400 px-2 py-2 text-center bg-blue-100">상향(1G)</th>
              <th className="border border-gray-400 px-2 py-2 text-center bg-blue-100">상향(500M)</th>
              <th className="border border-gray-400 px-2 py-2 text-center bg-orange-100">중간(반값)</th>
              <th className="border border-gray-400 px-2 py-2 text-center bg-gray-100">최저(특화)</th>
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map(row => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="border border-gray-400 px-2 py-2 font-semibold text-gray-800">{row.name}</td>
                <td className="border border-gray-400 px-2 py-2 text-center bg-green-50 font-semibold text-red-700">
                  {(row.data.maintain?.unified?.gift_card ?? 0) + care.benefits.gift_card_bonus}만원
                </td>
                <td className="border border-gray-400 px-2 py-2 text-center bg-blue-50 font-semibold text-red-700">
                  {(row.data.upgrade?.['1g']?.gift_card ?? 0) + care.benefits.gift_card_bonus}만원
                </td>
                <td className="border border-gray-400 px-2 py-2 text-center bg-blue-50 font-semibold text-red-700">
                  {(row.data.upgrade?.['500m']?.gift_card ?? 0) + care.benefits.gift_card_bonus}만원
                </td>
                <td className="border border-gray-400 px-2 py-2 text-center bg-orange-50 font-semibold text-red-700">
                  {(row.data.middle?.half_price?.gift_card ?? 0) + care.benefits.gift_card_bonus}만원
                </td>
                <td className="border border-gray-400 px-2 py-2 text-center bg-gray-50 font-semibold text-red-700">
                  {(row.data.lowest?.special?.gift_card ?? 0) + care.benefits.gift_card_bonus}만원
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-red-600 mt-2">* 빨간 수치 = 기본 혜택 + {care.benefits.gift_card_bonus}만원 Care 추가분 합산</p>
    </div>
  );
};

// 가치제고 정책 테이블
const ValueTable = () => {
  const data = policiesData.new_service;
  return (
    <div className="space-y-6">
      {/* 후번들 */}
      <div>
        <h4 className="text-base font-semibold text-gray-700 mb-3 border-l-4 border-blue-500 pl-3">후번들</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border border-gray-300 rounded p-4">
            <h5 className="font-semibold text-gray-700 mb-2 text-sm">회선 추가 혜택</h5>
            <table className="w-full text-sm border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-1 text-left">추가 회선</th>
                  <th className="border border-gray-300 px-2 py-1 text-center">상품권</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.post_bundle.additional_line_benefits.gift_card).map(([k, v]) => (
                  <tr key={k}>
                    <td className="border border-gray-300 px-2 py-1">{k.replace('_line_addition', '회선').replace('_', ' ')}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center font-semibold">{v}만원</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border border-gray-300 rounded p-4">
            <h5 className="font-semibold text-gray-700 mb-2 text-sm">IPTV 추가 혜택</h5>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">IPTV 추가 상품권</span>
                <span className="font-semibold">{data.post_bundle.additional_line_benefits.iptv_benefits.gift_card}만원</span>
              </div>
              {Object.entries(data.post_bundle.additional_line_benefits.iptv_benefits.discount).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-gray-600">{k.replace('_year', '년').replace('_years', '년')} 할인</span>
                  <span className="font-semibold text-green-700">{v}만원/월</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* UHD전환 */}
      <div>
        <h4 className="text-base font-semibold text-gray-700 mb-3 border-l-4 border-purple-500 pl-3">UHD전환</h4>
        <div className="border border-gray-300 rounded p-4">
          <div className="text-sm space-y-2">
            <div className="bg-purple-50 border border-purple-200 px-3 py-2 rounded">
              <p className="text-purple-800 font-semibold">HD → UHD 전환 시 혜택</p>
            </div>
            {policiesData.digital_renewal.main_products.map(prod => (
              <div key={prod.id} className="flex justify-between items-center border border-gray-200 px-3 py-2 rounded">
                <span className="text-gray-700">{prod.name} 업그레이드</span>
                <div className="text-right">
                  <span className="font-semibold text-purple-700 mr-2">{prod.benefits.upgrade.gift_card}만원</span>
                  <span className="text-green-700 text-xs">+월{prod.benefits.upgrade.discount}만원할인</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 업셀링 */}
      <div>
        <h4 className="text-base font-semibold text-gray-700 mb-3 border-l-4 border-green-500 pl-3">업셀링</h4>
        <div className="border border-gray-300 rounded p-4">
          <div className="text-sm space-y-2">
            <div className="bg-green-50 border border-green-200 px-3 py-2 rounded">
              <p className="text-green-800 font-semibold">요금제 상향 시 추가 혜택</p>
            </div>
            <div className="flex justify-between items-center border border-gray-200 px-3 py-2 rounded">
              <span className="text-gray-700">요금제 상향 (모든 구간)</span>
              <div className="text-right">
                <span className="font-semibold text-green-700 mr-2">{data.upselling.price_tier_upgrade.any_upgrade.gift_card}만원</span>
                <span className="text-green-600 text-xs">+IPTV할인 {data.upselling.price_tier_upgrade.any_upgrade.iptv_discount}만원</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PolicyBoard = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [policyImages, setPolicyImages] = useState([]);
  const [expandedImage, setExpandedImage] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/policy-images`)
      .then(res => res.json())
      .then(data => {
        if (data.images && data.images.length > 0) {
          setPolicyImages(data.images);
        } else if (policiesData.policy_images && policiesData.policy_images.length > 0) {
          setPolicyImages(policiesData.policy_images);
        }
      })
      .catch(() => {
        if (policiesData.policy_images && policiesData.policy_images.length > 0) {
          setPolicyImages(policiesData.policy_images);
        }
      });
  }, []);

  const getImageSrc = (img) => {
    const filename = img.filename || '';
    if (filename.startsWith('/assets/')) return filename;
    if (img.url && !img.url.startsWith('/api/')) return img.url;
    const name = filename.replace('/assets/', '') || filename;
    return `${API_URL}/api/images/${encodeURIComponent(name)}`;
  };

  const filteredImages = activeFilter === 'all'
    ? policyImages
    : policyImages.filter(img => img.category === activeFilter);

  const renderImageCards = (images) => {
    if (images.length === 0) return null;
    return (
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {images.map(img => (
          <div key={img.id} className="border border-gray-300 rounded overflow-hidden shadow-sm">
            <div className="bg-gray-100 px-3 py-2 flex justify-between items-center">
              <span className="font-semibold text-sm text-gray-800">{img.title}</span>
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                {CATEGORY_LABELS[img.category] || img.category}
              </span>
            </div>
            <img
              src={getImageSrc(img)}
              alt={img.title}
              className="w-full cursor-zoom-in hover:opacity-95 transition-opacity"
              onClick={() => setExpandedImage(img)}
              onError={e => { e.target.style.display = 'none'; }}
            />
          </div>
        ))}
      </div>
    );
  };

  const renderPolicyTable = () => {
    switch (activeFilter) {
      case 'bundle':
        return (
          <div>
            <h3 className="text-base font-bold text-gray-800 mb-3 border-b border-gray-300 pb-2">번들 재약정 혜택 정책표</h3>
            <BundleTable />
          </div>
        );
      case 'bundle2':
        return (
          <div>
            <h3 className="text-base font-bold text-gray-800 mb-3 border-b border-gray-300 pb-2">번들(특화) / 동등결합 정책표</h3>
            <Bundle2Table />
          </div>
        );
      case 'standalone':
        return (
          <div>
            <h3 className="text-base font-bold text-gray-800 mb-3 border-b border-gray-300 pb-2">단독 고객 정책표</h3>
            <StandaloneTable />
          </div>
        );
      case 'care':
        return (
          <div>
            <h3 className="text-base font-bold text-gray-800 mb-3 border-b border-gray-300 pb-2">요금인상Care 정책표</h3>
            <CareTable />
          </div>
        );
      case 'value':
        return (
          <div>
            <h3 className="text-base font-bold text-gray-800 mb-3 border-b border-gray-300 pb-2">가치제고 정책표</h3>
            <ValueTable />
          </div>
        );
      case 'all':
      default:
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-base font-bold text-gray-800 mb-3 border-b border-gray-300 pb-2 flex items-center">
                <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded mr-2">번들</span>
                번들 재약정 혜택 정책표
              </h3>
              <BundleTable />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800 mb-3 border-b border-gray-300 pb-2 flex items-center">
                <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded mr-2">번들(특화)</span>
                동등결합 정책표
              </h3>
              <Bundle2Table />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800 mb-3 border-b border-gray-300 pb-2 flex items-center">
                <span className="bg-orange-600 text-white text-xs px-2 py-0.5 rounded mr-2">단독</span>
                단독 고객 정책표
              </h3>
              <StandaloneTable />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800 mb-3 border-b border-gray-300 pb-2 flex items-center">
                <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded mr-2">요금인상Care</span>
                요금인상Care 정책표
              </h3>
              <CareTable />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800 mb-3 border-b border-gray-300 pb-2 flex items-center">
                <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded mr-2">가치제고</span>
                가치제고 정책표
              </h3>
              <ValueTable />
            </div>
          </div>
        );
    }
  };

  return (
    <div>
      {/* 버전 정보 */}
      <div className="bg-gray-100 border border-gray-300 p-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              [{policiesData.metadata.update_week}] 인터넷/TV 리텐션 정책
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              최종 업데이트: {policiesData.metadata.last_updated}
            </p>
          </div>
          <div className="text-right">
            <div className="bg-white border-2 border-gray-400 px-4 py-2 font-bold text-gray-800">
              {policiesData.metadata.version}
            </div>
          </div>
        </div>
      </div>

      {/* 카테고리 필터 */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveFilter(cat.id)}
            className={`py-2 px-4 rounded border transition-colors ${
              activeFilter === cat.id
                ? 'bg-gray-700 text-white border-gray-700'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 정책 내용 */}
      <div className="bg-white">
        {/* 이미지 카드 (업로드된 경우) */}
        {renderImageCards(filteredImages)}

        {/* 정책 데이터 테이블 */}
        {renderPolicyTable()}
      </div>

      {/* 이미지 확대 모달 */}
      {expandedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={() => setExpandedImage(null)}
        >
          <div className="max-w-6xl w-full max-h-full overflow-auto bg-white rounded">
            <div className="bg-gray-100 px-4 py-2 flex justify-between items-center sticky top-0">
              <span className="font-semibold text-gray-800">{expandedImage.title}</span>
              <button
                onClick={() => setExpandedImage(null)}
                className="text-gray-600 hover:text-gray-900 text-xl font-bold ml-4"
              >
                X
              </button>
            </div>
            <img
              src={getImageSrc(expandedImage)}
              alt={expandedImage.title}
              className="w-full"
              onClick={e => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PolicyBoard;
