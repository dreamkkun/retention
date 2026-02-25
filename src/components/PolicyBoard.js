import React, { useState } from 'react';
import policiesData from '../data/policies.json';

const PolicyBoard = () => {
  const [activeFilter, setActiveFilter] = useState('all');

  const filters = [
    { id: 'all', label: '전체 보기' },
    { id: 'bundle', label: '번들 재약정' },
    { id: 'equal_bundle', label: '동등결합' },
    { id: 'digital', label: '디지털(TV)' },
    { id: 'd_standalone', label: 'D단독' },
  ];

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

  const renderBundleRetentionMatrix = () => {
    const { columns, rows } = policiesData.bundle_retention_matrix;

    return (
      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-3">번들 재약정 정책</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-100">
                <th rowSpan="2" className="table-header">인터넷<br/>현재 판가</th>
                {columns.map(column => (
                  <th 
                    key={column.id} 
                    colSpan={column.sub_columns.length} 
                    className="table-header"
                  >
                    {column.name}
                    {column.recommended && <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded">추천</span>}
                  </th>
                ))}
              </tr>
              <tr className="bg-gray-50">
                {columns.map(column => 
                  column.sub_columns.map(subCol => (
                    <th key={`${column.id}_${subCol.id}`} className="table-header text-sm">
                      {subCol.name}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td className="table-cell bg-gray-50 font-semibold">{row.name}</td>
                  {columns.map(column => 
                    column.sub_columns.map(subCol => {
                      const cellData = row.data[column.id]?.[subCol.id];
                      const isRecommended = column.recommended && row.id === 'over_20k';
                      
                      return (
                        <td 
                          key={`${row.id}_${column.id}_${subCol.id}`} 
                          className={`table-cell ${isRecommended ? 'recommended-box' : ''}`}
                        >
                          {cellData ? (
                            <div>
                              <div className="font-bold text-base">{cellData.gift_card || 0}</div>
                              {cellData.iptv > 0 && (
                                <div className="text-xs text-gray-600 mt-1">IPTV {cellData.iptv}</div>
                              )}
                            </div>
                          ) : (
                            <div className="text-gray-400">-</div>
                          )}
                        </td>
                      );
                    })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-2 text-xs text-gray-600">
          * 단위: 만원 | 추천구간: 파란색 박스
        </div>
      </div>
    );
  };

  const renderDigitalRenewal = () => {
    const digitalData = policiesData.digital_renewal;

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-400">
          <thead>
            <tr className="bg-gray-100">
              <th className="table-header">상품</th>
              <th className="table-header">월 요금</th>
              <th className="table-header">유지 혜택</th>
              <th className="table-header">상향 혜택</th>
            </tr>
          </thead>
          <tbody>
            {digitalData.main_products.map(product => (
              <tr key={product.id}>
                <td className="table-cell bg-gray-50 font-semibold">{product.name}</td>
                <td className="table-cell">{product.monthly_fee}만원</td>
                <td className="table-cell">
                  <div className="font-bold">{product.benefits.maintain.gift_card}만원</div>
                  <div className="text-xs text-gray-600">할인 {product.benefits.maintain.discount}만원</div>
                </td>
                <td className="table-cell">
                  <div className="font-bold">{product.benefits.upgrade.gift_card}만원</div>
                  <div className="text-xs text-gray-600">할인 {product.benefits.upgrade.discount}만원</div>
                </td>
              </tr>
            ))}
            {digitalData.sub_products.map(product => (
              <tr key={product.id}>
                <td className="table-cell bg-gray-50 font-semibold">{product.name}</td>
                <td className="table-cell">{product.monthly_fee}만원</td>
                <td className="table-cell font-bold" colSpan="2">{product.gift_card}만원</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderEqualBundle = () => {
    const equalBundleData = policiesData.equal_bundle;

    return (
      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-3">동등결합 정책</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-100">
                <th className="table-header">구분</th>
                <th className="table-header">상품권</th>
                <th className="table-header">월 할인</th>
                <th className="table-header">설명</th>
              </tr>
            </thead>
            <tbody>
              {equalBundleData.categories.map(category => (
                <tr key={category.id}>
                  <td className="table-cell bg-gray-50 font-semibold">{category.name}</td>
                  <td className="table-cell font-bold">{category.gift_card}만원</td>
                  <td className="table-cell">{category.discount > 0 ? `${category.discount}만원` : '-'}</td>
                  <td className="table-cell text-xs text-gray-600">{category.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderDStandalone = () => {
    const dStandaloneData = policiesData.d_standalone;

    return (
      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-3">D단독 정책</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-100">
                <th className="table-header">판가 구간</th>
                <th className="table-header">요금제 유지</th>
                <th className="table-header">요금제 변경</th>
                <th className="table-header">할인적용</th>
                <th className="table-header">약정변경</th>
              </tr>
            </thead>
            <tbody>
              {dStandaloneData.price_tiers.map(tier => (
                <tr key={tier.id}>
                  <td className="table-cell bg-gray-50 font-semibold">{tier.name}</td>
                  <td className="table-cell">
                    <div className="font-bold">{tier.policies.maintain.gift_card}만원</div>
                    {tier.policies.maintain.discount > 0 && (
                      <div className="text-xs text-gray-600">할인 {tier.policies.maintain.discount}만원</div>
                    )}
                  </td>
                  <td className="table-cell">
                    <div className="font-bold">{tier.policies.change.gift_card}만원</div>
                    {tier.policies.change.discount > 0 && (
                      <div className="text-xs text-gray-600">할인 {tier.policies.change.discount}만원</div>
                    )}
                  </td>
                  <td className="table-cell">
                    <div className="font-bold">{tier.policies.discount_apply.gift_card}만원</div>
                    {tier.policies.discount_apply.discount > 0 && (
                      <div className="text-xs text-gray-600">할인 {tier.policies.discount_apply.discount}만원</div>
                    )}
                  </td>
                  <td className="table-cell">
                    <div className="font-bold">{tier.policies.contract_change.gift_card}만원</div>
                    {tier.policies.contract_change.discount > 0 && (
                      <div className="text-xs text-gray-600">할인 {tier.policies.contract_change.discount}만원</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div>
      {renderVersionInfo()}

      <div className="mb-6 flex gap-2 flex-wrap">
        {filters.map(filter => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`py-2 px-4 rounded border transition-colors ${
              activeFilter === filter.id
                ? 'bg-gray-700 text-white border-gray-700'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="bg-white">
        {(activeFilter === 'all' || activeFilter === 'bundle') && (
          <>
            {renderBundleRetentionMatrix()}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-800 mb-3">디지털(TV) 혜택 (번들 고객용)</h3>
              {renderDigitalRenewal()}
            </div>
          </>
        )}
        {(activeFilter === 'all' || activeFilter === 'digital') && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-3">디지털 재약정 정책</h3>
            {renderDigitalRenewal()}
          </div>
        )}
        {(activeFilter === 'all' || activeFilter === 'equal_bundle') && renderEqualBundle()}
        {(activeFilter === 'all' || activeFilter === 'd_standalone') && renderDStandalone()}
      </div>
    </div>
  );
};

export default PolicyBoard;
