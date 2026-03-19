import React, { useState, useMemo } from 'react';
import policiesData from '../data/policies.json';
import { CONST_POLICY_DATA } from '../data/policyData';

const policyRows = (policiesData.policy_rows && policiesData.policy_rows.length > 0)
  ? policiesData.policy_rows
  : CONST_POLICY_DATA;

// 요금 → price_grp 변환
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
const getDigitalMainPriceGrp = (fee) => {
  const p = parseInt(fee);
  if (!p || p <= 0) return null;
  if (p >= 13000) return '13천원이상';
  if (p >= 10000) return '10천원이상';
  if (p >= 7000)  return '7천원이상';
  return '7천원미만';
};
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

const fmtWon  = (n) => n != null ? `${Number(n).toLocaleString()}원` : '-';
const fmtMan  = (n) => n != null ? `${Math.round(n / 10000)}만원` : null;

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

// ── 공통: 중분류/소분류 선택 UI ───────────────────────────────────────────────
const PolicySelector = ({ filteredRows, jungbong, setJungbong, sobong, setSobong, stepOffset = 0 }) => {
  const availableJungbong = useMemo(() =>
    [...new Set(filteredRows.map(r => r['정책_중분류']).filter(Boolean))],
  [filteredRows]);

  const availableSobong = useMemo(() => {
    if (!jungbong) return [];
    return [...new Set(
      filteredRows
        .filter(r => r['정책_중분류'] === jungbong)
        .map(r => r['정책_소분류'])
        .filter(Boolean)
    )];
  }, [filteredRows, jungbong]);

  if (availableJungbong.length === 0) return null;

  return (
    <>
      <div className="mb-3">
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
          정책 중분류
        </label>
        <div className="flex flex-wrap gap-1.5">
          {availableJungbong.map(j => (
            <button
              key={j}
              onClick={() => { setJungbong(j); setSobong(''); }}
              className={`px-3 py-1 border rounded text-xs font-medium transition-colors ${
                jungbong === j ? jbColor(j) + ' border' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >{j}</button>
          ))}
        </div>
      </div>
      {availableSobong.length > 0 && (
        <div className="mb-1">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            정책 소분류
          </label>
          <div className="flex flex-wrap gap-1.5">
            {availableSobong.map(s => (
              <button
                key={s}
                onClick={() => setSobong(s)}
                className={`px-3 py-1 border rounded text-xs transition-colors ${
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
  );
};

// ── 단일 결과 행 ──────────────────────────────────────────────────────────────
const ResultRow = ({ label, value, highlight, large }) => (
  <div className={`flex justify-between items-center px-3 py-2 rounded border ${
    highlight ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-gray-50'
  }`}>
    <span className={`text-sm ${highlight ? 'text-yellow-700 font-semibold' : 'text-gray-500'}`}>{label}</span>
    <span className={`font-bold ${large ? 'text-xl' : 'text-sm'} ${highlight ? 'text-yellow-800' : 'text-gray-800'}`}>{value}</span>
  </div>
);

// ── 번들 전용 계산기 (인터넷 + TV 동시 선택, 합산) ────────────────────────────
const BundleCalculator = () => {
  // 인터넷
  const [internetFee,  setInternetFee]  = useState('');
  const [inetJungbong, setInetJungbong] = useState('');
  const [inetSobong,   setInetSobong]   = useState('');
  // TV
  const [svcType,      setSvcType]      = useState('');
  const [product,      setProduct]      = useState('');
  const [tvFee,        setTvFee]        = useState('');
  const [tvJungbong,   setTvJungbong]   = useState('');
  const [tvSobong,     setTvSobong]     = useState('');

  const inetPriceGrp = useMemo(() => getInternetPriceGrp(internetFee), [internetFee]);
  const tvPriceGrp   = useMemo(() => {
    if (!product || product === 'IPTV') return null;
    if (svcType === '디지털_주상품') return getDigitalMainPriceGrp(tvFee);
    if (svcType === '디지털_복수형') return getDigitalMultiPriceGrp(tvFee);
    return null;
  }, [product, svcType, tvFee]);

  // 인터넷 번들 행 필터
  const inetRows = useMemo(() => {
    let rows = policyRows.filter(r => r['정책_대분류'] === '인터넷번들_재약정');
    if (inetPriceGrp) rows = rows.filter(r => r['price_grp'] === inetPriceGrp);
    return rows;
  }, [inetPriceGrp]);

  // TV(디지털) 행 필터
  const tvAvailableProducts = useMemo(() => {
    let rows = policyRows.filter(r => r['정책_대분류'] === '디지털단독_재약정');
    if (svcType) rows = rows.filter(r => r['svc_type'] === svcType);
    return [...new Set(rows.map(r => r['상품군']).filter(Boolean))];
  }, [svcType]);

  const tvRows = useMemo(() => {
    let rows = policyRows.filter(r => r['정책_대분류'] === '디지털단독_재약정');
    if (svcType)    rows = rows.filter(r => r['svc_type'] === svcType);
    if (product)    rows = rows.filter(r => r['상품군']   === product);
    if (tvPriceGrp) rows = rows.filter(r => r['price_grp'] === tvPriceGrp);
    return rows;
  }, [svcType, product, tvPriceGrp]);

  // 매칭 행
  const inetMatched = useMemo(() =>
    (inetJungbong && inetSobong)
      ? inetRows.find(r => r['정책_중분류'] === inetJungbong && r['정책_소분류'] === inetSobong) || null
      : null,
  [inetRows, inetJungbong, inetSobong]);

  const tvMatched = useMemo(() =>
    (tvJungbong && tvSobong)
      ? tvRows.find(r => r['정책_중분류'] === tvJungbong && r['정책_소분류'] === tvSobong) || null
      : null,
  [tvRows, tvJungbong, tvSobong]);

  const inetGift  = inetMatched?.['사은품혜택'] ?? 0;
  const tvGift    = tvMatched?.['사은품혜택']   ?? 0;
  const totalGift = inetGift + tvGift;
  const hasResult = inetMatched || tvMatched;

  const needTvFee = svcType && product && product !== 'IPTV';

  return (
    <div className="space-y-4">
      {/* 인터넷 / TV 두 패널 */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* ── 인터넷 패널 ── */}
        <div className="border-2 border-emerald-300 rounded p-4 bg-emerald-50">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded">인터넷</span>
            <span className="text-sm font-semibold text-emerald-800">인터넷 재약정</span>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-600 mb-1">현재 인터넷 요금 (원)</label>
            <input
              type="number"
              value={internetFee}
              onChange={e => { setInternetFee(e.target.value); setInetJungbong(''); setInetSobong(''); }}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:border-emerald-400 focus:outline-none bg-white"
              placeholder="예: 21000"
            />
            {inetPriceGrp && (
              <div className="mt-1 text-xs bg-emerald-100 border border-emerald-200 text-emerald-800 px-2 py-1 rounded">
                요금대: <span className="font-bold">{inetPriceGrp}</span>
              </div>
            )}
          </div>

          {inetPriceGrp && (
            <PolicySelector
              filteredRows={inetRows}
              jungbong={inetJungbong} setJungbong={setInetJungbong}
              sobong={inetSobong}     setSobong={setInetSobong}
            />
          )}

          {inetMatched && (
            <div className="mt-3 bg-white border border-emerald-300 rounded px-3 py-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-xs">인터넷 사은품</span>
                <span className="font-bold text-emerald-700 text-base">
                  {fmtMan(inetMatched['사은품혜택']) || '—'}
                </span>
              </div>
              {inetMatched['정책판가'] != null && (
                <div className="flex justify-between items-center mt-1">
                  <span className="text-gray-500 text-xs">변경 요금</span>
                  <span className="font-semibold text-blue-700 text-xs">{fmtWon(inetMatched['정책판가'])}/월</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── TV 패널 ── */}
        <div className="border-2 border-indigo-300 rounded p-4 bg-indigo-50">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded">TV</span>
            <span className="text-sm font-semibold text-indigo-800">TV 재약정</span>
          </div>

          {/* 가입 유형 */}
          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-600 mb-1">가입 유형</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: '디지털_주상품', label: '주상품', desc: 'TV 1대' },
                { id: '디지털_복수형', label: '복수형', desc: 'TV 2대+' },
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => { setSvcType(st.id); setProduct(''); setTvFee(''); setTvJungbong(''); setTvSobong(''); }}
                  className={`px-2 py-1.5 border rounded text-xs text-center transition-colors ${
                    svcType === st.id
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-semibold">{st.label}</div>
                  <div className="opacity-70">{st.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 상품군 */}
          {svcType && tvAvailableProducts.length > 0 && (
            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-600 mb-1">상품군</label>
              <div className="flex flex-wrap gap-1.5">
                {tvAvailableProducts.map(p => (
                  <button
                    key={p}
                    onClick={() => { setProduct(p); setTvFee(''); setTvJungbong(''); setTvSobong(''); }}
                    className={`px-3 py-1 border rounded text-xs transition-colors ${
                      product === p
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >{p}</button>
                ))}
              </div>
            </div>
          )}

          {/* TV 요금 입력 (UHD/HD만) */}
          {needTvFee && (
            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-600 mb-1">현재 TV 요금 (원)</label>
              <input
                type="number"
                value={tvFee}
                onChange={e => { setTvFee(e.target.value); setTvJungbong(''); setTvSobong(''); }}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:border-indigo-400 focus:outline-none bg-white"
                placeholder="예: 13000"
              />
              {tvPriceGrp && (
                <div className="mt-1 text-xs bg-indigo-100 border border-indigo-200 text-indigo-800 px-2 py-1 rounded">
                  요금대: <span className="font-bold">{tvPriceGrp}</span>
                </div>
              )}
            </div>
          )}

          {/* TV 중분류/소분류 */}
          {(product === 'IPTV' || tvPriceGrp) && product && (
            <PolicySelector
              filteredRows={tvRows}
              jungbong={tvJungbong} setJungbong={setTvJungbong}
              sobong={tvSobong}     setSobong={setTvSobong}
            />
          )}

          {tvMatched && (
            <div className="mt-3 bg-white border border-indigo-300 rounded px-3 py-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-xs">TV 사은품</span>
                <span className="font-bold text-indigo-700 text-base">
                  {fmtMan(tvMatched['사은품혜택']) || '—'}
                </span>
              </div>
              {tvMatched['정책판가'] != null && (
                <div className="flex justify-between items-center mt-1">
                  <span className="text-gray-500 text-xs">변경 요금</span>
                  <span className="font-semibold text-blue-700 text-xs">{fmtWon(tvMatched['정책판가'])}/월</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 합산 결과 ── */}
      {hasResult && (
        <div className="bg-white border-2 border-gray-400 rounded p-5">
          <h3 className="text-base font-bold text-gray-800 mb-3">번들 혜택 합산 결과</h3>
          <div className="space-y-2">
            {inetMatched && (
              <div className="flex justify-between items-center px-3 py-2 rounded border border-emerald-200 bg-emerald-50">
                <span className="text-sm text-emerald-700 font-medium flex items-center gap-1.5">
                  <span className="bg-emerald-600 text-white text-xs px-1.5 py-0.5 rounded">인터넷</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${jbColor(inetMatched['정책_중분류'])}`}>
                    {inetMatched['정책_중분류']}
                  </span>
                  {inetMatched['정책_소분류']}
                </span>
                <span className="font-bold text-emerald-800">
                  {fmtMan(inetMatched['사은품혜택']) || '—'}
                </span>
              </div>
            )}
            {tvMatched && (
              <div className="flex justify-between items-center px-3 py-2 rounded border border-indigo-200 bg-indigo-50">
                <span className="text-sm text-indigo-700 font-medium flex items-center gap-1.5">
                  <span className="bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded">TV</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${jbColor(tvMatched['정책_중분류'])}`}>
                    {tvMatched['정책_중분류']}
                  </span>
                  {tvMatched['정책_소분류']}
                </span>
                <span className="font-bold text-indigo-800">
                  {fmtMan(tvMatched['사은품혜택']) || '—'}
                </span>
              </div>
            )}
            {/* 합계 */}
            <div className="flex justify-between items-center px-3 py-3 rounded border-2 border-yellow-400 bg-yellow-50 mt-1">
              <span className="text-yellow-800 font-bold">합산 사은품 혜택</span>
              <span className="font-black text-2xl text-yellow-900">
                {totalGift > 0 ? fmtMan(totalGift) : '—'}
              </span>
            </div>
            {/* 변경 요금 안내 */}
            {(inetMatched?.['정책판가'] != null || tvMatched?.['정책판가'] != null) && (
              <div className="flex justify-between items-center px-3 py-2 rounded border border-blue-200 bg-blue-50">
                <span className="text-blue-700 font-semibold text-sm">변경 요금</span>
                <span className="text-blue-800 font-bold text-sm">
                  {[
                    inetMatched?.['정책판가'] != null && `인터넷 ${fmtWon(inetMatched['정책판가'])}`,
                    tvMatched?.['정책판가']   != null && `TV ${fmtWon(tvMatched['정책판가'])}`,
                  ].filter(Boolean).join(' / ')}/월
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {!hasResult && (
        <div className="bg-gray-50 border border-dashed border-gray-300 p-5 text-center text-gray-400 text-sm rounded">
          인터넷과 TV 각각 조건을 선택하면 합산 혜택이 계산됩니다.
        </div>
      )}
    </div>
  );
};

// ── 인터넷단독 / 디지털단독 계산기 (기존 단일 흐름) ──────────────────────────
const SingleCalculator = ({ policyType }) => {
  const [svcType,  setSvcType]  = useState('');
  const [product,  setProduct]  = useState('');
  const [fee,      setFee]      = useState('');
  const [jungbong, setJungbong] = useState('');
  const [sobong,   setSobong]   = useState('');

  const isStandaloneInet = policyType === '인터넷단독_재약정';
  const isDigital        = policyType === '디지털단독_재약정';

  const priceGrp = useMemo(() => {
    if (isStandaloneInet) return null; // 인터넷단독은 price_grp 없음
    if (!product || product === 'IPTV') return null;
    if (svcType === '디지털_주상품') return getDigitalMainPriceGrp(fee);
    if (svcType === '디지털_복수형') return getDigitalMultiPriceGrp(fee);
    return null;
  }, [policyType, isStandaloneInet, svcType, product, fee]);

  const availableProducts = useMemo(() => {
    let rows = policyRows.filter(r => r['정책_대분류'] === policyType);
    if (isDigital && svcType) rows = rows.filter(r => r['svc_type'] === svcType);
    return [...new Set(rows.map(r => r['상품군']).filter(Boolean))];
  }, [policyType, isDigital, svcType]);

  const filteredRows = useMemo(() => {
    let rows = policyRows.filter(r => r['정책_대분류'] === policyType);
    if (isDigital && svcType)  rows = rows.filter(r => r['svc_type']  === svcType);
    if (product)               rows = rows.filter(r => r['상품군']    === product);
    if (priceGrp)              rows = rows.filter(r => r['price_grp'] === priceGrp);
    return rows;
  }, [policyType, isDigital, svcType, product, priceGrp]);

  const matchedRow = useMemo(() =>
    (jungbong && sobong)
      ? filteredRows.find(r => r['정책_중분류'] === jungbong && r['정책_소분류'] === sobong) || null
      : null,
  [filteredRows, jungbong, sobong]);

  const needSvcType = isDigital;
  const needProduct = isStandaloneInet || isDigital;
  const needFee     = isDigital && svcType && product && product !== 'IPTV';
  const showPolicy  = isStandaloneInet
    ? !!product
    : product === 'IPTV' ? !!product : !!priceGrp;

  return (
    <div className="space-y-4">
      {/* 가입 유형 (디지털만) */}
      {needSvcType && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">② 가입 유형</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: '디지털_주상품', label: '주상품', desc: 'TV 1대' },
              { id: '디지털_복수형', label: '복수형', desc: 'TV 2대+' },
            ].map(st => (
              <button
                key={st.id}
                onClick={() => { setSvcType(st.id); setProduct(''); setFee(''); setJungbong(''); setSobong(''); }}
                className={`px-3 py-2 border rounded text-sm text-center transition-colors ${
                  svcType === st.id ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="font-semibold">{st.label}</div>
                <div className="text-xs opacity-70">{st.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 상품군 */}
      {needProduct && availableProducts.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {isDigital ? '③' : '②'} 상품군
          </label>
          <div className="flex flex-wrap gap-2">
            {availableProducts.map(p => (
              <button
                key={p}
                onClick={() => { setProduct(p); setFee(''); setJungbong(''); setSobong(''); }}
                className={`px-4 py-1.5 border rounded text-sm transition-colors ${
                  product === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >{p}</button>
            ))}
          </div>
        </div>
      )}

      {/* 요금 입력 */}
      {needFee && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">④ TV 현재 요금 (원)</label>
          <input
            type="number"
            value={fee}
            onChange={e => { setFee(e.target.value); setJungbong(''); setSobong(''); }}
            className="w-full px-3 py-2 border border-gray-300 focus:border-gray-500 focus:outline-none"
            placeholder="예: 13000"
          />
          {priceGrp && (
            <div className="mt-1 text-sm bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1">
              요금대: <span className="font-bold">{priceGrp}</span>
            </div>
          )}
        </div>
      )}

      {/* 중분류/소분류 */}
      {showPolicy && (
        <PolicySelector
          filteredRows={filteredRows}
          jungbong={jungbong} setJungbong={setJungbong}
          sobong={sobong}     setSobong={setSobong}
        />
      )}

      {/* 결과 */}
      {matchedRow ? (
        <div className="bg-white border-2 border-gray-400 p-5">
          <h3 className="text-base font-bold text-gray-800 mb-3">계산 결과</h3>
          <div className="space-y-2 text-sm">
            {matchedRow['상품군'] && (
              <ResultRow label="상품군" value={matchedRow['상품군']} />
            )}
            {matchedRow['price_grp'] && (
              <ResultRow label="요금대" value={matchedRow['price_grp']} />
            )}
            <div className="flex justify-between items-center px-3 py-2 rounded border border-gray-200 bg-gray-50">
              <span className="text-gray-500 text-sm">중분류 / 소분류</span>
              <span className="font-semibold text-sm">
                <span className={`text-xs px-1.5 py-0.5 rounded mr-1 border ${jbColor(matchedRow['정책_중분류'])}`}>
                  {matchedRow['정책_중분류']}
                </span>
                {matchedRow['정책_소분류']}
              </span>
            </div>
            {matchedRow['정책판가'] != null && (
              <ResultRow label="변경 요금" value={`${fmtWon(matchedRow['정책판가'])}/월`} />
            )}
            <div className={`flex justify-between items-center px-3 py-3 rounded border ${
              matchedRow['사은품혜택'] ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-gray-50'
            }`}>
              <span className={`text-sm font-semibold ${matchedRow['사은품혜택'] ? 'text-yellow-700' : 'text-gray-500'}`}>
                사은품 혜택
              </span>
              <span className={`font-black text-2xl ${matchedRow['사은품혜택'] ? 'text-yellow-800' : 'text-gray-400'}`}>
                {fmtMan(matchedRow['사은품혜택']) || '해당 없음'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-dashed border-gray-300 p-5 text-center text-gray-400 text-sm">
          위 옵션을 순서대로 선택하면 혜택이 계산됩니다.
        </div>
      )}
    </div>
  );
};

// ── 메인 BenefitCalculator ────────────────────────────────────────────────────
const BenefitCalculator = () => {
  const [policyType, setPolicyType] = useState('');

  return (
    <div className="max-w-4xl">
      <div className="bg-gray-100 border border-gray-300 p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">맞춤형 혜택 계산기</h2>

        {/* ① 정책 유형 */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">① 정책 유형</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {POLICY_TYPES.map(pt => (
              <button
                key={pt.id}
                onClick={() => setPolicyType(pt.id)}
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

        {/* 선택된 정책 유형별 계산기 */}
        {policyType === '인터넷번들_재약정' && <BundleCalculator key="bundle" />}
        {policyType === '인터넷단독_재약정' && <SingleCalculator key="inet-solo" policyType="인터넷단독_재약정" />}
        {policyType === '디지털단독_재약정' && <SingleCalculator key="digital-solo" policyType="디지털단독_재약정" />}
      </div>
    </div>
  );
};

export default BenefitCalculator;
