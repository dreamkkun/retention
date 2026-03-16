import React, { useState, useMemo } from 'react';
import policiesData from '../data/policies.json';

// 인터넷 요금대 판정
const getInternetSegment = (price) => {
  const p = parseInt(price);
  if (isNaN(p) || p <= 0) return null;
  if (p >= 20000) return { id: 'over_20k', name: '20천원 이상' };
  if (p >= 18000) return { id: 'over_18k', name: '18천원 이상' };
  if (p >= 15000) return { id: 'over_15k', name: '15천원 이상' };
  if (p >= 12000) return { id: 'over_12k', name: '12천원 이상' };
  if (p >= 10000) return { id: 'over_10k', name: '10천원 이상' };
  return { id: 'under_10k', name: '10천원 미만' };
};

// D단독 TV 요금대 판정
const getDStandaloneSegment = (price) => {
  const p = parseInt(price);
  if (isNaN(p) || p <= 0) return null;
  if (p >= 14000) return { id: 'over_14k', name: '14천원 이상' };
  if (p >= 12000) return { id: 'over_12k', name: '12천원 이상' };
  if (p >= 8000) return { id: 'over_8k', name: '8천원 이상' };
  return { id: 'under_8k', name: '8천원 미만' };
};

const BenefitCalculator = () => {
  const [customerType, setCustomerType] = useState('bundle'); // bundle, bundle2, d_standalone, i_standalone
  const [internetFee, setInternetFee] = useState('');
  const [digitalFee, setDigitalFee] = useState('');
  const [planAction, setPlanAction] = useState('');
  const [subOption, setSubOption] = useState('');
  const [isPriceIncreaseCare, setIsPriceIncreaseCare] = useState(false);
  const [valueType, setValueType] = useState(''); // 후번들, UHD전환, 업셀링

  // customerType 변경 시 planAction, subOption 초기화
  const handleCustomerTypeChange = (v) => {
    setCustomerType(v);
    setPlanAction('');
    setSubOption('');
    setValueType('');
  };

  // 번들/I단독용 세부 옵션 목록
  const bundleSubOptions = useMemo(() => {
    const matrix = policiesData.bundle_retention_matrix;
    const col = matrix.columns.find(c => c.id === planAction);
    return col ? col.sub_columns : [];
  }, [planAction]);

  // 번들/I단독 혜택 계산
  const calcBundleBenefit = useMemo(() => {
    if (customerType !== 'bundle' && customerType !== 'i_standalone') return null;
    if (!planAction || !subOption) return null;
    const segment = getInternetSegment(internetFee);
    if (!segment) return null;
    const matrix = policiesData.bundle_retention_matrix;
    const row = matrix.rows.find(r => r.id === segment.id);
    if (!row) return null;
    const cell = row.data[planAction]?.[subOption];
    if (!cell) return null;
    return { giftCard: cell.gift_card || 0, iptv: cell.iptv || 0, segment: segment.name };
  }, [customerType, internetFee, planAction, subOption]);

  // 번들(특화)/동등결합 혜택 계산
  const calcBundle2Benefit = useMemo(() => {
    if (customerType !== 'bundle2') return null;
    if (!planAction) return null;
    const equalBundle = policiesData.equal_bundle;
    const cat = equalBundle.categories.find(c => c.id === planAction);
    if (!cat) return null;
    return { giftCard: cat.gift_card || 0, discount: cat.discount || 0, name: cat.name };
  }, [customerType, planAction]);

  // D단독 혜택 계산
  const calcDStandaloneBenefit = useMemo(() => {
    if (customerType !== 'd_standalone') return null;
    if (!planAction) return null;
    const segment = getDStandaloneSegment(digitalFee);
    if (!segment) return null;
    const tier = policiesData.d_standalone.price_tiers.find(t => t.id === segment.id);
    if (!tier) return null;
    let policy = null;
    if (planAction === 'maintain') policy = tier.policies.maintain;
    else if (planAction === 'change') policy = tier.policies.change;
    else if (planAction === 'discount_apply') policy = tier.policies.discount_apply;
    else if (planAction === 'contract_change') policy = tier.policies.contract_change;
    if (!policy) return null;
    return { giftCard: policy.gift_card || 0, discount: policy.discount || 0, segment: segment.name };
  }, [customerType, digitalFee, planAction]);

  // 가치제고 추가 혜택 계산
  const calcValueBenefit = useMemo(() => {
    if (!valueType) return null;
    const ns = policiesData.new_service;
    if (valueType === '후번들') {
      return {
        type: '후번들',
        note: '회선 추가: 1회선+5만원 / 2회선+10만원 / 3회선+15만원',
        giftCard: 5, // 최소 (1회선)
      };
    } else if (valueType === 'UHD전환') {
      const uhd = policiesData.digital_renewal.main_products.find(p => p.id === 'uhd');
      return {
        type: 'UHD전환',
        note: `UHD 업그레이드: 상품권 ${uhd?.benefits.upgrade.gift_card ?? 25}만원 + 월 할인 ${uhd?.benefits.upgrade.discount ?? 7}만원`,
        giftCard: uhd?.benefits.upgrade.gift_card ?? 25,
        discount: uhd?.benefits.upgrade.discount ?? 7,
      };
    } else if (valueType === '업셀링') {
      const up = ns.upselling.price_tier_upgrade.any_upgrade;
      return {
        type: '업셀링',
        note: `요금제 상향: 상품권 ${up.gift_card}만원 + IPTV할인 ${up.iptv_discount}만원`,
        giftCard: up.gift_card,
      };
    }
    return null;
  }, [valueType]);

  // 최종 결과 집계
  const result = useMemo(() => {
    const careBonus = isPriceIncreaseCare ? (policiesData.price_increase_care?.benefits?.gift_card_bonus || 2) : 0;

    if (customerType === 'bundle' || customerType === 'i_standalone') {
      if (!calcBundleBenefit) return null;
      const base = calcBundleBenefit.giftCard;
      const valuePart = calcValueBenefit;
      const totalGiftCard = base + careBonus + (valuePart?.giftCard || 0);
      const totalDiscount = valuePart?.discount || 0;
      return { base, careBonus, valuePart, totalGiftCard, totalDiscount, segment: calcBundleBenefit.segment, iptv: calcBundleBenefit.iptv };
    }
    if (customerType === 'bundle2') {
      if (!calcBundle2Benefit) return null;
      const base = calcBundle2Benefit.giftCard;
      const totalGiftCard = base + careBonus;
      return { base, careBonus, totalGiftCard, totalDiscount: calcBundle2Benefit.discount || 0, segment: calcBundle2Benefit.name };
    }
    if (customerType === 'd_standalone') {
      if (!calcDStandaloneBenefit) return null;
      const base = calcDStandaloneBenefit.giftCard;
      const totalGiftCard = base + careBonus;
      return { base, careBonus, totalGiftCard, totalDiscount: calcDStandaloneBenefit.discount || 0, segment: calcDStandaloneBenefit.segment };
    }
    return null;
  }, [customerType, calcBundleBenefit, calcBundle2Benefit, calcDStandaloneBenefit, calcValueBenefit, isPriceIncreaseCare]);

  const totalFee = (parseInt(internetFee) || 0) + (parseInt(digitalFee) || 0);

  return (
    <div className="max-w-4xl">
      <div className="bg-gray-100 border border-gray-300 p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">맞춤형 혜택 계산기</h2>

        {/* 고객 유형 */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">고객 유형</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { id: 'bundle',      label: '번들 고객', desc: '인터넷+TV' },
              { id: 'bundle2',     label: '번들(특화)', desc: '동등결합' },
              { id: 'i_standalone', label: 'I단독 고객', desc: '인터넷만' },
              { id: 'd_standalone', label: 'D단독 고객', desc: 'TV만' },
            ].map(ct => (
              <button
                key={ct.id}
                onClick={() => handleCustomerTypeChange(ct.id)}
                className={`px-3 py-2 border rounded text-sm transition-colors ${
                  customerType === ct.id
                    ? 'bg-gray-700 text-white border-gray-700'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="font-semibold">{ct.label}</div>
                <div className="text-xs opacity-70">{ct.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 요금 입력 */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              인터넷 현재 요금 (원)
            </label>
            <input
              type="number"
              value={internetFee}
              onChange={e => setInternetFee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 focus:border-gray-500 focus:outline-none"
              placeholder="예: 21000"
              disabled={customerType === 'd_standalone'}
            />
            {internetFee && getInternetSegment(internetFee) && customerType !== 'd_standalone' && (
              <div className="mt-1 text-sm bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1">
                판정: <span className="font-bold">{getInternetSegment(internetFee).name}</span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              디지털(TV) 현재 요금 (원)
            </label>
            <input
              type="number"
              value={digitalFee}
              onChange={e => setDigitalFee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 focus:border-gray-500 focus:outline-none"
              placeholder="예: 14300"
              disabled={customerType === 'i_standalone'}
            />
            {digitalFee && getDStandaloneSegment(digitalFee) && customerType === 'd_standalone' && (
              <div className="mt-1 text-sm bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1">
                판정: <span className="font-bold">{getDStandaloneSegment(digitalFee).name}</span>
              </div>
            )}
          </div>
        </div>

        {(internetFee || digitalFee) && (
          <div className="bg-white border border-gray-400 p-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">합산 금액</span>
              <span className="text-xl font-bold text-gray-800">{totalFee.toLocaleString()}원</span>
            </div>
          </div>
        )}

        {/* 요금인상Care 체크 */}
        <div className="mb-4 bg-red-50 border border-red-200 px-4 py-3 rounded">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isPriceIncreaseCare}
              onChange={e => setIsPriceIncreaseCare(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm font-semibold text-red-800">
              요금인상Care 고객 (+{policiesData.price_increase_care?.benefits?.gift_card_bonus || 2}만원 추가)
            </span>
          </label>
          <p className="text-xs text-red-600 ml-5 mt-1">2026년 요금인상 대상 고객 또는 불만/해지 의사 표현 고객</p>
        </div>

        {/* 요금제 변경 여부 */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">요금제 변경 여부</label>
          {(customerType === 'bundle' || customerType === 'i_standalone') && (
            <select
              value={planAction}
              onChange={e => { setPlanAction(e.target.value); setSubOption(''); }}
              className="w-full px-3 py-2 border border-gray-300 bg-white focus:border-gray-500 focus:outline-none"
            >
              <option value="">선택하세요</option>
              <option value="maintain">요금제 유지</option>
              <option value="upgrade">요금제 상향</option>
              <option value="middle">중간요금제</option>
              <option value="lowest">최저요금제</option>
              <option value="standalone">단독전환</option>
            </select>
          )}
          {customerType === 'bundle2' && (
            <select
              value={planAction}
              onChange={e => setPlanAction(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 bg-white focus:border-gray-500 focus:outline-none"
            >
              <option value="">선택하세요</option>
              <option value="maintain">요금제 유지</option>
              <option value="change">요금제 변경</option>
              <option value="discount">할인 적용</option>
              <option value="contract_change">약정 변경</option>
            </select>
          )}
          {customerType === 'd_standalone' && (
            <select
              value={planAction}
              onChange={e => setPlanAction(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 bg-white focus:border-gray-500 focus:outline-none"
            >
              <option value="">선택하세요</option>
              <option value="maintain">유지</option>
              <option value="change">변경</option>
              <option value="discount_apply">할인적용</option>
              <option value="contract_change">약정변경</option>
            </select>
          )}
        </div>

        {/* 세부 옵션 (번들/I단독) */}
        {(customerType === 'bundle' || customerType === 'i_standalone') && bundleSubOptions.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">세부 옵션</label>
            <select
              value={subOption}
              onChange={e => setSubOption(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 bg-white focus:border-gray-500 focus:outline-none"
            >
              <option value="">선택하세요</option>
              {bundleSubOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.name} - {opt.description}</option>
              ))}
            </select>
          </div>
        )}

        {/* 가치제고 추가 혜택 */}
        <div className="mb-4 bg-purple-50 border border-purple-200 px-4 py-3 rounded">
          <label className="block text-sm font-semibold text-purple-800 mb-2">가치제고 추가 혜택 (선택)</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { id: '', label: '해당없음' },
              { id: '후번들', label: '후번들' },
              { id: 'UHD전환', label: 'UHD전환' },
              { id: '업셀링', label: '업셀링' },
            ].map(vt => (
              <button
                key={vt.id}
                onClick={() => setValueType(vt.id)}
                className={`px-3 py-1.5 border rounded text-sm transition-colors ${
                  valueType === vt.id
                    ? 'bg-purple-700 text-white border-purple-700'
                    : 'bg-white text-purple-700 border-purple-300 hover:bg-purple-50'
                }`}
              >
                {vt.label}
              </button>
            ))}
          </div>
          {calcValueBenefit && (
            <p className="text-xs text-purple-700 mt-2">{calcValueBenefit.note}</p>
          )}
        </div>
      </div>

      {/* 계산 결과 */}
      {result && (
        <>
          <div className="bg-white border-2 border-gray-400 p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">계산 결과</h3>

            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between items-center border border-gray-200 px-3 py-2 rounded bg-gray-50">
                <span className="text-gray-600">요금대 / 구분</span>
                <span className="font-semibold">{result.segment}</span>
              </div>
              <div className="flex justify-between items-center border border-gray-200 px-3 py-2 rounded bg-gray-50">
                <span className="text-gray-600">기본 상품권</span>
                <span className="font-semibold">{result.base}만원</span>
              </div>
              {result.careBonus > 0 && (
                <div className="flex justify-between items-center border border-red-200 px-3 py-2 rounded bg-red-50">
                  <span className="text-red-700">요금인상Care 추가</span>
                  <span className="font-semibold text-red-700">+{result.careBonus}만원</span>
                </div>
              )}
              {result.valuePart && (
                <div className="flex justify-between items-center border border-purple-200 px-3 py-2 rounded bg-purple-50">
                  <span className="text-purple-700">가치제고 ({result.valuePart.type})</span>
                  <span className="font-semibold text-purple-700">+{result.valuePart.giftCard}만원</span>
                </div>
              )}
              {result.iptv > 0 && (
                <div className="flex justify-between items-center border border-blue-200 px-3 py-2 rounded bg-blue-50">
                  <span className="text-blue-700">IPTV 혜택</span>
                  <span className="font-semibold text-blue-700">{result.iptv}만원</span>
                </div>
              )}
            </div>

            <div className="border-t-2 border-gray-400 pt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border-2 border-blue-500 p-4 bg-blue-50">
                  <div className="text-sm text-blue-700 mb-1">총 상품권</div>
                  <div className="text-3xl font-bold text-blue-800">{result.totalGiftCard}만원</div>
                </div>
                {result.totalDiscount > 0 && (
                  <div className="border-2 border-green-500 p-4 bg-green-50">
                    <div className="text-sm text-green-700 mb-1">총 월 할인</div>
                    <div className="text-3xl font-bold text-green-800">{result.totalDiscount}만원</div>
                  </div>
                )}
                {result.valuePart?.discount > 0 && (
                  <div className="border-2 border-purple-500 p-4 bg-purple-50">
                    <div className="text-sm text-purple-700 mb-1">가치제고 월 할인</div>
                    <div className="text-3xl font-bold text-purple-800">{result.valuePart.discount}만원</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 방어 멘트 */}
          <div className="bg-gray-100 border border-gray-300 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3">방어 멘트</h3>
            <div className="bg-white border border-gray-300 p-4 mb-3">
              <div className="text-sm text-gray-600 mb-1">가치제안형</div>
              <p className="text-gray-800">
                고객님, 현재 {totalFee > 0 ? `${totalFee.toLocaleString()}원을 납부하고 계신데, ` : ''}
                재약정 시 <strong>{result.totalGiftCard}만원</strong>의 상품권 혜택을 바로 받으실 수 있습니다!
              </p>
            </div>
            {result.totalDiscount > 0 && (
              <div className="bg-white border border-gray-300 p-4">
                <div className="text-sm text-gray-600 mb-1">요금절감형</div>
                <p className="text-gray-800">
                  추가로 매월 <strong>{result.totalDiscount}만원</strong>씩 할인 혜택도 드립니다.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BenefitCalculator;
