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

// 가치제고 세부 순서 (후번들 → UHD전환 → 업셀링)
const VALUE_SUB_ORDER = ['후번들', 'UHD전환', '업셀링'];

const PolicyBoard = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [policyImages, setPolicyImages] = useState([]);
  const [expandedImage, setExpandedImage] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/policy-images`)
      .then(res => res.json())
      .then(data => { if (data.images) setPolicyImages(data.images); })
      .catch(() => {});
  }, []);

  // 활성 필터에 맞게 이미지 필터링
  const filteredImages = activeFilter === 'all'
    ? policyImages
    : policyImages.filter(img => img.category === activeFilter);

  // 가치제고 카테고리는 세부 순서(후번들→UHD전환→업셀링) 유지
  const sortedImages = [...filteredImages].sort((a, b) => {
    if (a.category === 'value' && b.category === 'value') {
      const ai = VALUE_SUB_ORDER.findIndex(k => a.title.includes(k));
      const bi = VALUE_SUB_ORDER.findIndex(k => b.title.includes(k));
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    }
    return 0;
  });

  const getImageSrc = (img) => {
    if (img.url) {
      return img.url.startsWith('/api/') ? `${API_URL}${img.url}` : img.url;
    }
    return `${API_URL}/api/images/${encodeURIComponent(img.filename.replace('/assets/', ''))}`;
  };

  const renderVersionInfo = () => (
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
  );

  const renderImages = () => {
    if (sortedImages.length === 0) {
      return (
        <div className="text-center py-16 text-gray-400 border border-dashed border-gray-300 rounded">
          <p className="text-lg mb-1">등록된 정책 이미지가 없습니다</p>
          <p className="text-sm">관리자 페이지에서 이미지를 업로드해주세요</p>
        </div>
      );
    }

    // 가치제고 카테고리는 세부 제목별 그룹 표시
    if (activeFilter === 'value') {
      const groups = VALUE_SUB_ORDER.map(key => ({
        key,
        images: sortedImages.filter(img => img.title.includes(key)),
      })).filter(g => g.images.length > 0);

      // 매핑 안 된 나머지
      const others = sortedImages.filter(img =>
        !VALUE_SUB_ORDER.some(k => img.title.includes(k))
      );
      if (others.length > 0) groups.push({ key: '기타', images: others });

      return (
        <div className="space-y-6">
          {groups.map(group => (
            <div key={group.key}>
              <h4 className="text-base font-semibold text-gray-700 mb-3 border-l-4 border-gray-400 pl-3">
                {group.key}
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                {group.images.map(img => renderImageCard(img))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="grid md:grid-cols-2 gap-4">
        {sortedImages.map(img => renderImageCard(img))}
      </div>
    );
  };

  const renderImageCard = (img) => (
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
  );

  return (
    <div>
      {renderVersionInfo()}

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

      {/* 정책 이미지 */}
      <div className="bg-white">
        {renderImages()}
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
                ✕
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
