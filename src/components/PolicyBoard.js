import React, { useState, useEffect, useMemo } from 'react';
import policiesData from '../data/policies.json';
import { CONST_POLICY_DATA } from '../data/policyData';
import API_URL from '../config';

const policyRows = (policiesData.policy_rows?.length > 0)
  ? policiesData.policy_rows
  : CONST_POLICY_DATA;

// ── Format helpers ───────────────────────────────────────────────────────────
const fmtGift  = (n) => n != null ? `${Math.round(n / 10000)}만원` : null;
const fmtPrice = (n) => n != null ? `${Number(n).toLocaleString()}원` : null;

// ── Color config per 중분류 ───────────────────────────────────────────────────
const JB = {
  '동일요금':       { hd: 'bg-emerald-100 text-emerald-900', cell: 'bg-emerald-50'  },
  '신규요금':       { hd: 'bg-blue-100 text-blue-900',       cell: 'bg-blue-50'     },
  '반값요금':       { hd: 'bg-orange-100 text-orange-900',   cell: 'bg-orange-50'   },
  '특화요금':       { hd: 'bg-purple-100 text-purple-900',   cell: 'bg-purple-50'   },
  '절충형':         { hd: 'bg-yellow-100 text-yellow-900',   cell: 'bg-yellow-50'   },
  '채널하향':       { hd: 'bg-gray-200 text-gray-700',       cell: 'bg-gray-100'    },
  'IPTV전환(상향)': { hd: 'bg-indigo-100 text-indigo-900',   cell: 'bg-indigo-50'   },
};
const jbCfg = (j) => JB[j] || { hd: 'bg-gray-100 text-gray-800', cell: 'bg-white' };

// ── Ordered price_grp lists ──────────────────────────────────────────────────
const INET_PG   = ['20천원이상','18천원이상','15천원이상','12천원이상','10천원이상','10천원미만'];
const DIG_MAIN  = ['13천원이상','10천원이상','7천원이상','7천원미만'];
const DIG_MULTI = ['8천원이상','5천원이상','5천원미만'];

// ── Column definitions ───────────────────────────────────────────────────────
const BUNDLE_COLS = [
  { j:'동일요금',       b:'기존유지',           s:'기존유지'         },
  { j:'동일요금',       b:'WIFI상향',           s:'WiFi상향'         },
  { j:'동일요금',       b:'상품상향',           s:'상품상향'         },
  { j:'신규요금',       b:'플래티넘기가(WiFi+)', s:'플래티넘(WiFi+)'  },
  { j:'신규요금',       b:'기가리이트(WiFi+)',   s:'기가라이트(WiFi+)'},
  { j:'신규요금',       b:'광랜(광랜限)',        s:'광랜(광랜限)'     },
  { j:'반값요금',       b:'플래티넘기가(1G)',    s:'플래티넘(1G)'     },
  { j:'반값요금',       b:'기가라이트(500M)',    s:'기가라이트(500M)' },
  { j:'반값요금',       b:'광랜(100M)',          s:'광랜(100M)'       },
  { j:'특화요금',       b:'플래티넘기가(1G)',    s:'플래티넘(1G)'     },
  { j:'특화요금',       b:'기가라이트(500M)',    s:'기가라이트(500M)' },
  { j:'특화요금',       b:'광랜(100M)',          s:'광랜(100M)'       },
];

const STANDALONE_INET_COLS = [
  { j:'동일요금',       b:'동일상품',           s:'동일상품'         },
  { j:'동일요금',       b:'WiFi상향',           s:'WiFi상향'         },
  { j:'동일요금',       b:'상품상향',           s:'상품상향'         },
  { j:'신규요금',       b:'플래티넘기가(WiFi+)', s:'플래티넘(WiFi+)'  },
  { j:'신규요금',       b:'기가리이트(WiFi+)',   s:'기가라이트(WiFi+)'},
  { j:'신규요금',       b:'광랜(광랜限)',        s:'광랜(광랜限)'     },
  { j:'반값요금',       b:'플래티넘기가',        s:'플래티넘기가'     },
  { j:'반값요금',       b:'기가라이트',          s:'기가라이트'       },
  { j:'반값요금',       b:'광랜',               s:'광랜'             },
];

const DIGITAL_TV_COLS = [
  { j:'동일요금',       b:'동일매체',  s:'동일매체'  },
  { j:'동일요금',       b:'UHD전환',   s:'UHD전환'   },
  { j:'절충형',         b:'동일매체',  s:'동일매체'  },
  { j:'절충형',         b:'UHD전환',   s:'UHD전환'   },
  { j:'채널하향',       b:'Pro라이트', s:'Pro라이트' },
  { j:'채널하향',       b:'이코노미',  s:'이코노미'  },
  { j:'IPTV전환(상향)', b:'Pro맥스',   s:'Pro맥스'   },
  { j:'IPTV전환(상향)', b:'Pro라이트', s:'Pro라이트' },
];

// ── 중분류 그룹 구조 (span 계산용) ──────────────────────────────────────────
const groupCols = (cols) => {
  const groups = [];
  cols.forEach(col => {
    const last = groups[groups.length - 1];
    if (last && last.j === col.j) last.span++;
    else groups.push({ j: col.j, span: 1 });
  });
  return groups;
};

// ── 공통 매트릭스 테이블 ─────────────────────────────────────────────────────
// allRows: 판가 헤더 행 계산용 전체 행 풀
const MatrixTable = ({ rowKeys, rowLabel, cols, lookup, allRows, note }) => {
  const groups = groupCols(cols);

  // 컬럼별 고정 판가 (요금대와 무관하게 동일하므로 첫 번째 매칭 행에서 추출)
  const colPrices = useMemo(() =>
    cols.map(col => {
      const row = (allRows || []).find(
        r => r['정책_중분류'] === col.j && r['정책_소분류'] === col.b
      );
      return row?.['정책판가'] ?? null;
    }), [cols, allRows]);

  const hasPriceRow = colPrices.some(p => p != null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse border border-gray-300 min-w-max">
        <thead>
          {/* 1행: 중분류 그룹 */}
          <tr>
            <th
              rowSpan={hasPriceRow ? 3 : 2}
              className="border border-gray-300 px-3 py-2 text-left bg-gray-100 font-semibold text-gray-700 whitespace-nowrap min-w-[90px] align-middle"
            >
              {rowLabel}
            </th>
            {groups.map((g, i) => (
              <th
                key={i}
                colSpan={g.span}
                className={`border border-gray-300 px-2 py-1.5 text-center text-xs font-bold ${jbCfg(g.j).hd}`}
              >
                {g.j}
              </th>
            ))}
          </tr>
          {/* 2행: 소분류 */}
          <tr>
            {cols.map((col, i) => (
              <th
                key={i}
                className={`border border-gray-300 px-2 py-1 text-center text-xs font-medium text-gray-600 whitespace-nowrap ${jbCfg(col.j).cell}`}
              >
                {col.s}
              </th>
            ))}
          </tr>
          {/* 3행: 판가 (고정 요금 있는 경우만) */}
          {hasPriceRow && (
            <tr>
              {cols.map((col, i) => (
                <td
                  key={i}
                  className={`border border-gray-300 px-2 py-1 text-center text-xs ${jbCfg(col.j).cell}`}
                >
                  {colPrices[i] != null ? (
                    <span className="text-blue-700 font-semibold">
                      {fmtPrice(colPrices[i])}<span className="text-gray-400 font-normal">/월</span>
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">동일요금</span>
                  )}
                </td>
              ))}
            </tr>
          )}
        </thead>
        <tbody>
          {rowKeys.map((rk, ri) => (
            <tr key={ri} className="hover:brightness-95 transition-all">
              <td className="border border-gray-300 px-3 py-2 font-semibold text-gray-800 whitespace-nowrap bg-gray-50">
                {rk}
              </td>
              {cols.map((col, ci) => {
                const row = lookup(rk, col.j, col.b);
                const gift = row ? fmtGift(row['사은품혜택']) : null;
                return (
                  <td
                    key={ci}
                    className={`border border-gray-200 px-2 py-2.5 text-center text-sm ${jbCfg(col.j).cell}`}
                  >
                    {gift
                      ? <span className="font-bold text-gray-800">{gift}</span>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {note && <p className="text-xs text-gray-400 mt-1.5">{note}</p>}
    </div>
  );
};

// ── 디지털 IPTV 매트릭스 (요금대 무관 → 단일 행) ────────────────────────────
const DigitalIPTVMatrix = ({ svcType }) => {
  const rows = useMemo(() =>
    policyRows.filter(r =>
      r['정책_대분류'] === '디지털단독_재약정' &&
      r['svc_type'] === svcType &&
      r['상품군'] === 'IPTV'
    ), [svcType]);

  const lookup = (_rk, j, b) =>
    rows.find(r => r['정책_중분류'] === j && r['정책_소분류'] === b);

  return (
    <MatrixTable
      rowKeys={['IPTV']}
      rowLabel="상품"
      cols={DIGITAL_TV_COLS}
      lookup={lookup}
      allRows={rows}
    />
  );
};

// ── 디지털 UHD/HD 매트릭스 ────────────────────────────────────────────────────
const DigitalTVMatrix = ({ svcType, product, priceOrder }) => {
  const rows = useMemo(() =>
    policyRows.filter(r =>
      r['정책_대분류'] === '디지털단독_재약정' &&
      r['svc_type'] === svcType &&
      r['상품군'] === product
    ), [svcType, product]);

  const lookup = (priceGrp, j, b) =>
    rows.find(r => r['price_grp'] === priceGrp && r['정책_중분류'] === j && r['정책_소분류'] === b);

  return (
    <MatrixTable
      rowKeys={priceOrder}
      rowLabel="TV 요금대"
      cols={DIGITAL_TV_COLS}
      lookup={lookup}
      allRows={rows}
    />
  );
};

// ── 디지털 정책 공통 블록 (번들탭/디지털탭 공용) ────────────────────────────
const DigitalPolicyBlock = ({ defaultSubTab = '주상품' }) => {
  const [subTab, setSubTab] = useState(defaultSubTab);
  const svcType    = subTab === '주상품' ? '디지털_주상품' : '디지털_복수형';
  const priceOrder = subTab === '주상품' ? DIG_MAIN : DIG_MULTI;

  return (
    <div>
      {/* 주상품/복수형 서브탭 */}
      <div className="flex gap-2 mb-4">
        {[
          { id: '주상품', label: '주상품 (TV 1대)' },
          { id: '복수형', label: '복수형 (TV 2대+)' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`px-4 py-1.5 rounded border text-sm font-medium transition-colors ${
              subTab === t.id
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* IPTV */}
      <div className="mb-5">
        <h5 className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1.5">
          <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-xs">IPTV</span>
          IPTV (요금대 무관)
        </h5>
        <DigitalIPTVMatrix svcType={svcType} />
      </div>

      {/* UHD */}
      <div className="mb-5">
        <h5 className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1.5">
          <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs">UHD</span>
          UHD
        </h5>
        <DigitalTVMatrix svcType={svcType} product="UHD" priceOrder={priceOrder} />
      </div>

      {/* HD */}
      <div className="mb-2">
        <h5 className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1.5">
          <span className="bg-gray-600 text-white px-2 py-0.5 rounded text-xs">HD</span>
          HD
        </h5>
        <DigitalTVMatrix svcType={svcType} product="HD" priceOrder={priceOrder} />
      </div>
    </div>
  );
};

// ── 인터넷번들 재약정 섹션 (인터넷 + 디지털 통합) ───────────────────────────
const InternetBundleSection = () => {
  const inetRows = useMemo(() =>
    policyRows.filter(r => r['정책_대분류'] === '인터넷번들_재약정'), []);

  const lookup = (priceGrp, j, b) =>
    inetRows.find(r => r['price_grp'] === priceGrp && r['정책_중분류'] === j && r['정책_소분류'] === b);

  return (
    <div>
      {/* ① 인터넷 정책표 */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
          <span className="bg-emerald-600 text-white px-2.5 py-1 rounded text-xs">인터넷</span>
          인터넷 재약정 정책
        </h3>
        <p className="text-xs text-gray-500 mb-3 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded">
          인터넷 현재 요금 기준 요금대별 재약정 혜택 | 단위: 사은품상품권
          <span className="ml-2 text-gray-400">* 판가행: 요금대 무관하게 동일 적용</span>
        </p>
        <MatrixTable
          rowKeys={INET_PG}
          rowLabel="인터넷 요금대"
          cols={BUNDLE_COLS}
          lookup={lookup}
          allRows={inetRows}
          note="* 상품군(플래티넘기가/기가라이트/광랜/광랜라이트) 무관하게 동일 혜택 적용"
        />
      </div>

      {/* 구분선 */}
      <div className="border-t-2 border-dashed border-gray-300 my-6" />

      {/* ② 디지털(TV) 정책표 */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
          <span className="bg-indigo-600 text-white px-2.5 py-1 rounded text-xs">디지털(TV)</span>
          번들 고객 TV 재약정 정책
        </h3>
        <p className="text-xs text-gray-500 mb-3 bg-indigo-50 border border-indigo-200 px-3 py-2 rounded">
          번들 고객(인터넷+TV) TV 현재 요금 기준 재약정 혜택 | 단위: 사은품상품권
        </p>
        <DigitalPolicyBlock />
      </div>
    </div>
  );
};

// ── 인터넷단독 재약정 섹션 ────────────────────────────────────────────────────
const InternetStandaloneSection = () => {
  const rows = useMemo(() =>
    policyRows.filter(r => r['정책_대분류'] === '인터넷단독_재약정'), []);

  const products = ['플래티넘기가', '기가라이트', '광랜', '광랜라이트'];
  const lookup = (product, j, b) =>
    rows.find(r => r['상품군'] === product && r['정책_중분류'] === j && r['정책_소분류'] === b);

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3 bg-blue-50 border border-blue-200 px-3 py-2 rounded">
        인터넷 단독 또는 번들→단독 전환 고객 | 상품군별 재약정 혜택 | 단위: 사은품상품권
        <span className="ml-2 text-gray-400">* 판가행: 변경 요금 고정값</span>
      </p>
      <MatrixTable
        rowKeys={products}
        rowLabel="인터넷 상품군"
        cols={STANDALONE_INET_COLS}
        lookup={lookup}
        allRows={rows}
      />
    </div>
  );
};

// ── 디지털단독 재약정 섹션 (탭) ──────────────────────────────────────────────
const DigitalStandaloneSection = () => (
  <div>
    <p className="text-xs text-gray-500 mb-3 bg-indigo-50 border border-indigo-200 px-3 py-2 rounded">
      디지털(TV) 고객 재약정 정책 | TV 현재 요금 기준 요금대별 혜택 (IPTV 제외)
      <span className="ml-2 text-gray-400">* 판가행: 변경 요금 고정값</span>
    </p>
    <DigitalPolicyBlock />
  </div>
);

// ── 정책 이미지 카드 ─────────────────────────────────────────────────────────
const ImageCards = ({ images, onExpand, getImgSrc }) => {
  if (!images.length) return null;
  return (
    <div className="grid md:grid-cols-2 gap-4 mb-6">
      {images.map(img => (
        <div key={img.id} className="border border-gray-300 rounded overflow-hidden shadow-sm">
          <div className="bg-gray-100 px-3 py-2 flex justify-between items-center">
            <span className="font-semibold text-sm text-gray-800">{img.title}</span>
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">{img.category}</span>
          </div>
          <img
            src={getImgSrc(img)}
            alt={img.title}
            className="w-full cursor-zoom-in hover:opacity-90 transition-opacity"
            onClick={() => onExpand(img)}
            onError={e => { e.target.style.display = 'none'; }}
          />
        </div>
      ))}
    </div>
  );
};

// ── 범례 ─────────────────────────────────────────────────────────────────────
const Legend = () => (
  <div className="flex flex-wrap gap-2 mb-4 text-xs">
    {Object.entries(JB).map(([label, cfg]) => (
      <span key={label} className={`px-2.5 py-0.5 rounded font-semibold ${cfg.hd}`}>
        {label}
      </span>
    ))}
  </div>
);

// ── 메인 PolicyBoard ─────────────────────────────────────────────────────────
const TABS = [
  { id: 'bundle',     label: '인터넷 번들 재약정',  badge: 'bg-emerald-600', desc: '인터넷+TV 번들' },
  { id: 'standalone', label: '인터넷 단독 재약정',   badge: 'bg-blue-600',    desc: '인터넷 단독'    },
  { id: 'digital',    label: '디지털단독 재약정',    badge: 'bg-indigo-600',  desc: 'TV 단독'        },
];

const PolicyBoard = () => {
  const [activeTab, setActiveTab] = useState('bundle');
  const [policyImages, setPolicyImages] = useState([]);
  const [expandedImage, setExpandedImage] = useState(null);
  const [liveMeta, setLiveMeta] = useState(null); // 백엔드에서 실시간 메타데이터

  useEffect(() => {
    fetch(`${API_URL}/api/policy-images`)
      .then(r => r.json())
      .then(d => setPolicyImages(d.images?.length ? d.images : (policiesData.policy_images || [])))
      .catch(() => setPolicyImages(policiesData.policy_images || []));

    fetch(`${API_URL}/api/policy-meta`)
      .then(r => r.json())
      .then(d => { if (d.success) setLiveMeta(d.metadata); })
      .catch(() => {}); // 백엔드 오프라인이면 정적 데이터 사용
  }, []);

  const meta = liveMeta || policiesData.metadata || {};

  const getImgSrc = (img) => {
    const fn = img.filename || '';
    if (fn.startsWith('/assets/')) return fn;
    if (img.url && !img.url.startsWith('/api/')) return img.url;
    return `${API_URL}/api/images/${encodeURIComponent(fn.replace('/assets/', '') || fn)}`;
  };

  const filteredImages = policyImages.filter(img =>
    activeTab === 'all' || img.category === activeTab
  );

  return (
    <div>
      {/* 헤더 */}
      <div className="bg-gray-100 border border-gray-300 px-5 py-4 mb-5">
        <h2 className="text-xl font-bold text-gray-800">
          {meta.update_week ? `[${meta.update_week}] ` : ''}
          인터넷/TV 리텐션 정책
        </h2>
        {meta.last_updated && (
          <p className="text-sm text-gray-500 mt-0.5">
            최종 업데이트: {meta.last_updated}
          </p>
        )}
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2 rounded border text-sm font-semibold transition-colors ${
              activeTab === t.id
                ? `${t.badge} text-white border-transparent`
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {t.label}
            <span className={`ml-1.5 text-xs font-normal opacity-70 ${activeTab === t.id ? 'text-white' : 'text-gray-400'}`}>
              {t.desc}
            </span>
          </button>
        ))}
      </div>

      {/* 이미지 카드 */}
      {filteredImages.length > 0 && (
        <ImageCards images={filteredImages} onExpand={setExpandedImage} getImgSrc={getImgSrc} />
      )}

      {/* 범례 */}
      <Legend />

      {/* 정책 테이블 */}
      <div className="bg-white border border-gray-200 rounded p-5">
        {activeTab === 'bundle'     && <InternetBundleSection />}
        {activeTab === 'standalone' && <InternetStandaloneSection />}
        {activeTab === 'digital'    && <DigitalStandaloneSection />}
      </div>

      {/* 이미지 확대 모달 */}
      {expandedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={() => setExpandedImage(null)}
        >
          <div className="max-w-5xl w-full max-h-full overflow-auto bg-white rounded">
            <div className="bg-gray-100 px-4 py-2 flex justify-between items-center sticky top-0">
              <span className="font-semibold text-gray-800">{expandedImage.title}</span>
              <button
                onClick={() => setExpandedImage(null)}
                className="text-gray-600 hover:text-gray-900 text-xl font-bold ml-4"
              >
                ✕
              </button>
            </div>
            <img
              src={getImgSrc(expandedImage)}
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
