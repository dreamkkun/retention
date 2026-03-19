import React, { useState, useMemo } from 'react';
import policiesData from '../data/policies.json';
import { CONST_POLICY_DATA } from '../data/policyData';

const policyRows = (policiesData.policy_rows && policiesData.policy_rows.length > 0)
  ? policiesData.policy_rows
  : CONST_POLICY_DATA;

// 인터넷 요금 → price_grp
const getInternetPriceGrp = (fee) => {
  const p = parseInt(fee);
  if (!p || p <= 0) return null;
  if (p >= 20000) return '20천원이상';
  if (p >= 18000) return '18천원이상';
  if (p >= 15000) return '15천원이상';
  if (p >= 12000) return '12천원이상';
  if (p >= 10000) return '10천원이상';
  return '10천원미만';
};

// TV 요금 → price_grp (주상품 UHD/HD)
const getDigitalMainPriceGrp = (fee) => {
  const p = parseInt(fee);
  if (!p || p <= 0) return null;
  if (p >= 13000) return '13천원이상';
  if (p >= 10000) return '10천원이상';
  if (p >= 7000)  return '7천원이상';
  return '7천원미만';
};

// TV 요금 → price_grp (복수형 UHD/HD)
const getDigitalMultiPriceGrp = (fee) => {
  const p = parseInt(fee);
  if (!p || p <= 0) return null;
  if (p >= 8000) return '8천원이상';
  if (p >= 5000) return '5천원이상';
  return '5천원미만';
};

const POLICY_TYPES = [
  { id: '인터넷번들_재약정', label: '인터넷 번들 재약정', desc: '인터넷+TV 번들 고객' },
  { id: '인터넷단독_재약정', label: '인터넷 단독 재약정', desc: '인터넷만 이용 고객'  },
  { id: '디지털단독_재약정', label: '디지털단독 재약정',  desc: 'TV 단독/번들 고객'  },
];

const fmt = (n) => n != null ? `${Number(n).toLocaleString()}원` : '-';

// 색상 맵
const JB_COLOR = {
  '동일요금':       'bg-emerald-100 text-emerald-800 border-emerald-300',
  '신규요금':       'bg-blue-100 text-blue-800 border-blue-300',
  '반값요금':       'bg-orange-100 text-orange-800 border-orange-300',
  '특화요금':       'bg-purple-100 text-purple-800 border-purple-300',
  '절충형':         'bg-yellow-100 text-yellow-800 border-yellow-300',
  '채널하향':       'bg-gray-200 text-gray-700 border-gray-300',
  'IPTV전환(상향)': 'bg-indigo-100 text-indigo-800 border-indigo-300',
};
const jbColor = (j) => JB_COLOR[j] || 'bg-gray-100 text-gray-700 border-gray-300';

const BenefitCalculator = () => {
  const [policyType,    setPolicyType]    = useState('');
  const [bundleSubType, setBundleSubType] = useState(''); // 'internet' | 'digital' (번들 전용)
  const [svcType,       setSvcType]       = useState(''); // 디지털_주상품 | 디지털_복수형
  const [internetFee,   setInternetFee]   = useState('');
  const [tvFee,         setTvFee]         = useState('');
  const [product,       setProduct]       = useState(''); // 상품군
  const [jungbong,      setJungbong]      = useState(''); // 정책_중분류
  const [sobong,        setSobong]        = useState(''); // 정책_소분류

  const resetBelow = (level) => {
    if (level <= 0) { setSvcType(''); }
    if (level <= 1) { setProduct(''); }
    if (level <= 2) { setJungbong(''); }
    if (level <= 3) { setSobong(''); }
  };

  const handlePolicyType    = (v) => { setPolicyType(v);    setBundleSubType(''); resetBelow(0); };
  const handleBundleSubType = (v) => { setBundleSubType(v); resetBelow(0); };
  const handleSvcType       = (v) => { setSvcType(v);       resetBelow(1); };
  const handleProduct       = (v) => { setProduct(v);       resetBelow(2); };
  const handleJungbong      = (v) => { setJungbong(v);      resetBelow(3); };

  // 실제 조회에 쓰일 정책 대분류
  // 번들+디지털 서브타입이면 디지털단독_재약정 행을 조회
  const effectivePolicyType = useMemo(() => {
    if (policyType === '인터넷번들_재약정' && bundleSubType === 'digital') return '디지털단독_재약정';
    return policyType;
  }, [policyType, bundleSubType]);

  // price_grp 계산
  const priceGrp = useMemo(() => {
    if (effectivePolicyType === '인터넷번들_재약정') return getInternetPriceGrp(internetFee);
    if (effectivePolicyType === '디지털단독_재약정' && product && product !== 'IPTV') {
      if (svcType === '디지털_주상품') return getDigitalMainPriceGrp(tvFee);
      if (svcType === '디지털_복수형') return getDigitalMultiPriceGrp(tvFee);
    }
    return null;
  }, [effectivePolicyType, svcType, product, internetFee, tvFee]);

  // 행 필터링
  const filteredRows = useMemo(() => {
    if (!effectivePolicyType) return [];
    let rows = policyRows.filter(r => r['정책_대분류'] === effectivePolicyType);
    if (effectivePolicyType === '인터넷번들_재약정') {
      if (priceGrp) rows = rows.filter(r => r['price_grp'] === priceGrp);
    } else if (effectivePolicyType === '인터넷단독_재약정') {
      if (product) rows = rows.filter(r => r['상품군'] === product);
    } else if (effectivePolicyType === '디지털단독_재약정') {
      if (svcType)  rows = rows.filter(r => r['svc_type'] === svcType);
      if (product)  rows = rows.filter(r => r['상품군'] === product);
      if (priceGrp) rows = rows.filter(r => r['price_grp'] === priceGrp);
    }
    return rows;
  }, [effectivePolicyType, svcType, product, priceGrp]);

  // 선택 가능한 상품군
  const availableProducts = useMemo(() => {
    if (!effectivePolicyType) return [];
    let rows = policyRows.filter(r => r['정책_대분류'] === effectivePolicyType);
    if (effectivePolicyType === '디지털단독_재약정' && svcType) {
      rows = rows.filter(r => r['svc_type'] === svcType);
    }
    return [...new Set(rows.map(r => r['상품군']).filter(Boolean))];
  }, [effectivePolicyType, svcType]);

  // 선택 가능한 중분류
  const availableJungbong = useMemo(() =>
    [...new Set(filteredRows.map(r => r['정책_중분류']).filter(Boolean))],
  [filteredRows]);

  // 선택 가능한 소분류
  const availableSobong = useMemo(() => {
    if (!jungbong) return [];
    return [...new Set(
      filteredRows
        .filter(r => r['정책_중분류'] === jungbong)
        .map(r => r['정책_소분류'])
        .filter(Boolean)
    )];
  }, [filteredRows, jungbong]);

  // 최종 매칭 행
  const matchedRow = useMemo(() => {
    if (!jungbong || !sobong) return null;
    return filteredRows.find(r =>
      r['정책_중분류'] === jungbong && r['정책_소분류'] === sobong
    ) || null;
  }, [filteredRows, jungbong, sobong]);

  // UI 조건
  const isBundle        = policyType === '인터넷번들_재약정';
  const isBundleInternet = isBundle && bundleSubType === 'internet';
  const isBundleDigital  = isBundle && bundleSubType === 'digital';
  const needInternetFee  = effectivePolicyType === '인터넷번들_재약정';
  const needSvcType      = effectivePolicyType === '디지털단독_재약정';
  const needProduct      = effectivePolicyType === '인터넷단독_재약정' || effectivePolicyType === '디지털단독_재약정';
  const needTvFee        = effectivePolicyType === '디지털단독_재약정' && svcType && product && product !== 'IPTV';

  // 다음 단계까지 진행 가능 여부 (번들의 경우 서브타입 미선택 시 하위 UI 숨김)
  const readyToProceed = !isBundle || bundleSubType !== '';

  return (
    <div className="max-w-4xl">
      <div className="bg-gray-100 border border-gray-300 p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">맞춤형 혜택 계산기</h2>

        {/* ① 정책 유형 */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">① 정책 유형</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {POLICY_TYPES.map(pt => (
              <button
                key={pt.id}
                onClick={() => handlePolicyType(pt.id)}
                className={`px-3 py-2 border rounded text-sm text-left transition-colors ${
                  policyType === pt.id
                    ? 'bg-gray-700 text-white border-gray-700'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="font-semibold">{pt.label}</div>
                <div className="text-xs opacity-70">{pt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ② 번들 전용: 인터넷 / TV 서브 타입 선택 */}
        {isBundle && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">② 조회 대상</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'internet', label: '인터넷 재약정', desc: '인터넷 요금 기준 혜택', color: 'bg-emerald-600' },
                { id: 'digital',  label: 'TV 재약정',    desc: 'TV 요금 기준 혜택',   color: 'bg-indigo-600' },
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => handleBundleSubType(st.id)}
                  className={`px-4 py-2.5 border rounded text-sm text-left transition-colors ${
                    bundleSubType === st.id
                      ? `${st.color} text-white border-transparent`
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-semibold">{st.label}</div>
                  <div className="text-xs opacity-75">{st.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {readyToProceed && (
          <>
            {/* 인터넷 요금 입력 (번들-인터넷 or 인터넷번들_재약정 직접) */}
            {needInternetFee && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {isBundle ? '③' : '②'} 인터넷 현재 요금 (원)
                </label>
                <input
                  type="number"
                  value={internetFee}
                  onChange={e => { setInternetFee(e.target.value); resetBelow(2); }}
                  className="w-full px-3 py-2 border border-gray-300 focus:border-gray-500 focus:outline-none"
                  placeholder="예: 21000"
                />
                {priceGrp && (
                  <div className="mt-1 text-sm bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1">
                    요금대 판정: <span className="font-bold">{priceGrp}</span>
                  </div>
                )}
              </div>
            )}

            {/* 디지털 가입 유형 (번들-TV or 디지털단독 직접) */}
            {needSvcType && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {isBundleDigital ? '③' : '②'} 가입 유형
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: '디지털_주상품', label: '주상품', desc: 'TV 1대' },
                    { id: '디지털_복수형', label: '복수형', desc: 'TV 2대 이상' },
                  ].map(st => (
                    <button
                      key={st.id}
                      onClick={() => handleSvcType(st.id)}
                      className={`px-3 py-2 border rounded text-sm transition-colors ${
                        svcType === st.id
                          ? 'bg-gray-700 text-white border-gray-700'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-semibold">{st.label}</div>
                      <div className="text-xs opacity-70">{st.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 상품군 선택 */}
            {needProduct && availableProducts.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {isBundleDigital ? '④' : '③'} 상품군
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableProducts.map(p => (
                    <button
                      key={p}
                      onClick={() => handleProduct(p)}
                      className={`px-4 py-1.5 border rounded text-sm transition-colors ${
                        product === p
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >{p}</button>
                  ))}
                </div>
              </div>
            )}

            {/* TV 요금 입력 (UHD/HD) */}
            {needTvFee && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {isBundleDigital ? '⑤' : '④'} TV 현재 요금 (원)
                </label>
                <input
                  type="number"
                  value={tvFee}
                  onChange={e => { setTvFee(e.target.value); resetBelow(2); }}
                  className="w-full px-3 py-2 border border-gray-300 focus:border-gray-500 focus:outline-none"
                  placeholder="예: 13000"
                />
                {priceGrp && (
                  <div className="mt-1 text-sm bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1">
                    요금대 판정: <span className="font-bold">{priceGrp}</span>
                  </div>
                )}
              </div>
            )}

            {/* 정책 중분류 */}
            {availableJungbong.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">정책 중분류</label>
                <div className="flex flex-wrap gap-2">
                  {availableJungbong.map(j => (
                    <button
                      key={j}
                      onClick={() => handleJungbong(j)}
                      className={`px-4 py-1.5 border rounded text-sm font-medium transition-colors ${
                        jungbong === j
                          ? jbColor(j) + ' border'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >{j}</button>
                  ))}
                </div>
              </div>
            )}

            {/* 정책 소분류 */}
            {availableSobong.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">정책 소분류</label>
                <div className="flex flex-wrap gap-2">
                  {availableSobong.map(s => (
                    <button
                      key={s}
                      onClick={() => setSobong(s)}
                      className={`px-4 py-1.5 border rounded text-sm transition-colors ${
                        sobong === s
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >{s}</button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 결과 패널 */}
      {matchedRow && (
        <div className="bg-white border-2 border-gray-400 p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">계산 결과</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center border border-gray-200 px-3 py-2 rounded bg-gray-50">
              <span className="text-gray-500">정책 유형</span>
              <span className="font-semibold">{matchedRow['정책_대분류']}</span>
            </div>
            {matchedRow['svc_type'] && (
              <div className="flex justify-between items-center border border-gray-200 px-3 py-2 rounded bg-gray-50">
                <span className="text-gray-500">가입 유형</span>
                <span className="font-semibold">{matchedRow['svc_type']}</span>
              </div>
            )}
            {matchedRow['상품군'] && (
              <div className="flex justify-between items-center border border-gray-200 px-3 py-2 rounded bg-gray-50">
                <span className="text-gray-500">상품군</span>
                <span className="font-semibold">{matchedRow['상품군']}</span>
              </div>
            )}
            {matchedRow['price_grp'] && (
              <div className="flex justify-between items-center border border-gray-200 px-3 py-2 rounded bg-gray-50">
                <span className="text-gray-500">요금대</span>
                <span className="font-semibold">{matchedRow['price_grp']}</span>
              </div>
            )}
            <div className="flex justify-between items-center border border-gray-200 px-3 py-2 rounded bg-gray-50">
              <span className="text-gray-500">중분류 / 소분류</span>
              <span className="font-semibold">
                <span className={`text-xs px-1.5 py-0.5 rounded mr-1 ${jbColor(matchedRow['정책_중분류'])}`}>
                  {matchedRow['정책_중분류']}
                </span>
                {matchedRow['정책_소분류']}
              </span>
            </div>

            {matchedRow['정책판가'] != null && (
              <div className="flex justify-between items-center border border-blue-200 px-3 py-2 rounded bg-blue-50">
                <span className="text-blue-700 font-semibold">변경 요금</span>
                <span className="font-bold text-blue-800 text-base">{fmt(matchedRow['정책판가'])}/월</span>
              </div>
            )}

            <div className={`flex justify-between items-center border px-3 py-3 rounded ${
              matchedRow['사은품혜택']
                ? 'border-yellow-300 bg-yellow-50'
                : 'border-gray-200 bg-gray-50'
            }`}>
              <span className={matchedRow['사은품혜택'] ? 'text-yellow-700 font-semibold' : 'text-gray-500'}>
                사은품 혜택
              </span>
              <span className={`font-bold text-xl ${
                matchedRow['사은품혜택'] ? 'text-yellow-800' : 'text-gray-400'
              }`}>
                {matchedRow['사은품혜택']
                  ? `${Math.round(matchedRow['사은품혜택'] / 10000)}만원`
                  : '해당 없음'}
              </span>
            </div>
          </div>
        </div>
      )}

      {!matchedRow && policyType && readyToProceed && (
        <div className="bg-gray-50 border border-dashed border-gray-300 p-6 text-center text-gray-400 text-sm">
          위 옵션을 순서대로 선택하면 혜택이 계산됩니다.
        </div>
      )}
    </div>
  );
};

export default BenefitCalculator;
