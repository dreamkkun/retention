import React, { useState, useMemo } from 'react';
import policiesData from '../data/policies.json';

const policyRows = policiesData.policy_rows || [];

// 인터넷 요금대 판정 → price_grp 문자열
const getInternetPriceGrp = (price) => {
  const p = parseInt(price);
  if (isNaN(p) || p <= 0) return null;
  if (p >= 20000) return '20천원 이상';
  if (p >= 18000) return '18천원 이상';
  if (p >= 15000) return '15천원 이상';
  if (p >= 12000) return '12천원 이상';
  if (p >= 10000) return '10천원 이상';
  return '10천원 미만';
};

// D단독 TV 요금대 판정 → price_grp 문자열
const getDStandalonePriceGrp = (price) => {
  const p = parseInt(price);
  if (isNaN(p) || p <= 0) return null;
  if (p >= 14000) return '14천원 이상';
  if (p >= 12000) return '12천원 이상';
  if (p >= 8000) return '8천원 이상';
  return '8천원 미만';
};

// planAction ID → 정책_소분류 문자열 (번들/I단독)
const BUNDLE_ACTION_MAP = {
  maintain:  '요금제유지',
  upgrade:   '요금제상향',
  middle:    '중간요금제',
  lowest:    '최저요금제',
  standalone: '단독전환',
};

// planAction ID → 정책_소분류 문자열 (번들(특화))
const BUNDLE2_ACTION_MAP = {
  maintain:        '요금제 유지',
  change:          '요금제 변경',
  discount:        '할인 적용',
  contract_change: '약정 변경',
};

// planAction ID → 정책_소분류 문자열 (D단독)
const DSTANDALONE_ACTION_MAP = {
  maintain:        '유지',
  change:          '변경',
  discount_apply:  '할인적용',
  contract_change: '약정변경',
};

const BenefitCalculator = () => {
  const [customerType, setCustomerType] = useState('bundle'); // bundle, bundle2, d_standalone, i_standalone
  const [internetFee, setInternetFee] = useState('');
  const [digitalFee, setDigitalFee] = useState('');
  const [planAction, setPlanAction] = useState('');
  const [subOption, setSubOption] = useState(''); // 상품군 값
  const [isPriceIncreaseCare, setIsPriceIncreaseCare] = useState(false);
  const [valueType, setValueType] = useState(''); // 후번들, UHD전환, 업셀링

  const handleCustomerTypeChange = (v) => {
    setCustomerType(v);
    setPlanAction('');
    setSubOption('');
    setValueType('');
  };

  // 번들/I단독: planAction에 따른 사용 가능한 상품군 목록
  const bundleSubOptions = useMemo(() => {
    if (customerType !== 'bundle' && customerType !== 'i_standalone') return [];
    if (!planAction) return [];
    const 소분류 = BUNDLE_ACTION_MAP[planAction];
    if (!소분류) return [];
    const rows = policyRows.filter(r =>
      r['단독_번들여부'] === '번들' &&
      r['정책_대분류'] === '번들' &&
      r['정책_소분류'] === 소분류
    );
    const seen = new Set();
    const result = [];
    for (const r of rows) {
      const sg = r['상품군'];
      if (sg && !seen.has(sg)) {
        seen.add(sg);
        result.push({ id: sg, name: sg });
      }
    }
    return result;
  }, [customerType, planAction]);

  // 번들/I단독 혜택 계산
  const calcBundleBenefit = useMemo(() => {
    if (customerType !== 'bundle' && customerType !== 'i_standalone') return null;
    if (!planAction) return null;
    const priceGrp = getInternetPriceGrp(internetFee);
    if (!priceGrp) return null;
    const 소분류 = BUNDLE_ACTION_MAP[planAction];
    if (!소분류) return null;
    // 상품군 지정 없으면 해당 소분류의 첫 번째 row 사용
    const rows = policyRows.filter(r =>
      r['단독_번들여부'] === '번들' &&
      r['정책_대분류'] === '번들' &&
      r['price_grp'] === priceGrp &&
      r['정책_소분류'] === 소분류 &&
      (!subOption || r['상품군'] === subOption)
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      giftCard: row['사은품혜택'] || 0,
      discount: row['요금할인액'] || 0,
      segment: priceGrp,
      상품군: row['상품군'],
    };
  }, [customerType, internetFee, planAction, subOption]);

  // 번들(특화) 혜택 계산
  const calcBundle2Benefit = useMemo(() => {
    if (customerType !== 'bundle2') return null;
    if (!planAction) return null;
    const 소분류 = BUNDLE2_ACTION_MAP[planAction];
    if (!소분류) return null;
    const rows = policyRows.filter(r =>
      r['정책_대분류'] === '번들(특화)' &&
      r['정책_소분류'] === 소분류
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      giftCard: row['사은품혜택'] || 0,
      discount: row['요금할인액'] || 0,
      name: 소분류,
    };
  }, [customerType, planAction]);

  // D단독 혜택 계산
  const calcDStandaloneBenefit = useMemo(() => {
    if (customerType !== 'd_standalone') return null;
    if (!planAction) return null;
    const priceGrp = getDStandalonePriceGrp(digitalFee);
    if (!priceGrp) return null;
    const 소분류 = DSTANDALONE_ACTION_MAP[planAction];
    if (!소분류) return null;
    const rows = policyRows.filter(r =>
      r['svc_type'] === 'TV' &&
      r['단독_번들여부'] === '단독' &&
      r['price_grp'] === priceGrp &&
      r['정책_소분류'] === 소분류
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      giftCard: row['사은품혜택'] || 0,
      discount: row['요금할인액'] || 0,
      segment: priceGrp,
    };
  }, [customerType, digitalFee, planAction]);

  // 요금인상Care 추가 혜택
  const careBonus = useMemo(() => {
    if (!isPriceIncreaseCare) return 0;
    const row = policyRows.find(r => r['정책_대분류'] === '요금인상Care');
    if (row) return row['사은품혜택'] || 0;
    return policiesData.price_increase_care?.benefits?.gift_card_bonus || 2;
  }, [isPriceIncreaseCare]);

  // 가치제고 추가 혜택
  const calcValueBenefit = useMemo(() => {
    if (!valueType) return null;
    if (valueType === '후번들') {
      const rows = policyRows.filter(r =>
        r['정책_대분류'] === '가치제고' &&
        r['정책_중분류'] === '후번들'
      ).sort((a, b) => (a['사은품혜택'] || 0) - (b['사은품혜택'] || 0));
      const min = rows[0]?.['사은품혜택'] || 5;
      return {
        type: '후번들',
        note: `회선 추가: 1회선+${rows[0]?.['사은품혜택'] || 5}만원 / 2회선+${rows[1]?.['사은품혜택'] || 10}만원 / 3회선+${rows[2]?.['사은품혜택'] || 15}만원`,
        giftCard: min,
      };
    }
    if (valueType === 'UHD전환') {
      const row = policyRows.find(r =>
        r['정책_대분류'] === '가치제고' &&
        r['정책_중분류'] === 'UHD전환'
      );
      const gift = row?.['사은품혜택'] ?? 25;
      const disc = row?.['요금할인액'] ?? 7;
      return {
        type: 'UHD전환',
        note: `UHD 업그레이드: 상품권 ${gift}만원 + 월 할인 ${disc}만원`,
        giftCard: gift,
        discount: disc,
      };
    }
    if (valueType === '업셀링') {
      const row = policyRows.find(r =>
        r['정책_대분류'] === '가치제고' &&
        r['정책_중분류'] === '업셀링'
      );
      const gift = row?.['사은품혜택'] ?? 2;
      const disc = row?.['요금할인액'] ?? 2;
      return {
        type: '업셀링',
        note: `요금제 상향: 상품권 ${gift}만원 + 월 할인 ${disc}만원`,
        giftCard: gift,
        discount: disc,
      };
    }
    return null;
  }, [valueType]);

  // 최종 결과 집계
  const result = useMemo(() => {
    if (customerType === 'bundle' || customerType === 'i_standalone') {
      if (!calcBundleBenefit) return null;
      const base = calcBundleBenefit.giftCard;
      const totalGiftCard = base + careBonus + (calcValueBenefit?.giftCard || 0);
      const totalDiscount = (calcBundleBenefit.discount || 0) + (calcValueBenefit?.discount || 0);
      return { base, careBonus, valuePart: calcValueBenefit, totalGiftCard, totalDiscount,
               segment: calcBundleBenefit.segment };
    }
    if (customerType === 'bundle2') {
      if (!calcBundle2Benefit) return null;
      const base = calcBundle2Benefit.giftCard;
      const totalGiftCard = base + careBonus;
      return { base, careBonus, totalGiftCard, totalDiscount: calcBundle2Benefit.discount || 0,
               segment: calcBundle2Benefit.name };
    }
    if (customerType === 'd_standalone') {
      if (!calcDStandaloneBenefit) return null;
      const base = calcDStandaloneBenefit.giftCard;
      const totalGiftCard = base + careBonus;
      return { base, careBonus, totalGiftCard, totalDiscount: calcDStandaloneBenefit.discount || 0,
               segment: calcDStandaloneBenefit.segment };
    }
    return null;
  }, [customerType, calcBundleBenefit, calcBundle2Benefit, calcDStandaloneBenefit,
      calcValueBenefit, careBonus]);

  const totalFee = (parseInt(internetFee) || 0) + (parseInt(digitalFee) || 0);
  const internetPriceGrp = getInternetPriceGrp(internetFee);
  const dstandalonePriceGrp = getDStandalonePriceGrp(digitalFee);

  return (
    <div className="max-w-4xl">
      <div className="bg-gray-100 border border-gray-300 p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">맞춤형 혜택 계산기</h2>

        {/* 고객 유형 */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">고객 유형</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { id: 'bundle',       label: '번들 고객',    desc: '인터넷+TV' },
              { id: 'bundle2',      label: '번들(특화)',   desc: '동등결합' },
              { id: 'i_standalone', label: 'I단독 고객',  desc: '인터넷만' },
              { id: 'd_standalone', label: 'D단독 고객',  desc: 'TV만' },
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
            {internetFee && internetPriceGrp && customerType !== 'd_standalone' && (
              <div className="mt-1 text-sm bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1">
                판정: <span className="font-bold">{internetPriceGrp}</span>
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
            {digitalFee && dstandalonePriceGrp && customerType === 'd_standalone' && (
              <div className="mt-1 text-sm bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1">
                판정: <span className="font-bold">{dstandalonePriceGrp}</span>
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
              요금인상Care 고객 (+{careBonus || (policiesData.price_increase_care?.benefits?.gift_card_bonus || 2)}만원 추가)
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
            <label className="block text-sm font-semibold text-gray-700 mb-2">세부 옵션 (상품군)</label>
            <select
              value={subOption}
              onChange={e => setSubOption(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 bg-white focus:border-gray-500 focus:outline-none"
            >
              <option value="">선택하세요</option>
              {bundleSubOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
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
