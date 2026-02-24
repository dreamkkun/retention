import React, { useState, useMemo } from 'react';
import policiesData from '../data/policies.json';

const BenefitCalculator = () => {
  const [internetFee, setInternetFee] = useState('');
  const [digitalFee, setDigitalFee] = useState('');
  const [contractYear, setContractYear] = useState('3');
  const [planAction, setPlanAction] = useState('maintain');
  const [isEqualBundle, setIsEqualBundle] = useState(false);
  const [customerType, setCustomerType] = useState('bundle'); // 'bundle', 'd_standalone'

  // 요금 구간 자동 판별 함수
  const getPolicySegment = (price) => {
    const priceNum = parseInt(price);
    
    if (isNaN(priceNum) || priceNum <= 0) {
      return null;
    }

    // 인터넷 판가 구간 판별 (천원 단위)
    if (priceNum >= 20000) {
      return { id: 'over_20k', name: '20천원 이상', segment: 'over_20k' };
    } else if (priceNum >= 18000) {
      return { id: 'over_18k', name: '18천원 이상', segment: 'over_18k' };
    } else if (priceNum >= 15000) {
      return { id: 'over_15k', name: '15천원 이상', segment: 'over_15k' };
    } else if (priceNum >= 12000) {
      return { id: 'over_12k', name: '12천원 이상', segment: 'over_12k' };
    } else if (priceNum >= 10000) {
      return { id: 'over_10k', name: '10천원 이상', segment: 'over_10k' };
    } else {
      return { id: 'under_10k', name: '10천원 미만', segment: 'under_10k' };
    }
  };

  // 디지털(TV) 요금 구간 판별
  const getDigitalSegment = (price) => {
    const priceNum = parseInt(price);
    
    if (isNaN(priceNum) || priceNum <= 0) {
      return null;
    }

    if (priceNum >= 14000) {
      return { id: 'over_14k', name: 'UHD급', monthly_fee: 14.3 };
    } else if (priceNum >= 12000) {
      return { id: 'over_12k', name: 'HD급', monthly_fee: 12.1 };
    } else if (priceNum >= 8000) {
      return { id: 'over_8k', name: '기본형', monthly_fee: 8.8 };
    } else {
      return { id: 'under_8k', name: '라이트', monthly_fee: 6.6 };
    }
  };

  // D단독 요금 구간 판별
  const getDStandaloneSegment = (price) => {
    const priceNum = parseInt(price);
    
    if (isNaN(priceNum) || priceNum <= 0) {
      return null;
    }

    if (priceNum >= 14000) {
      return { id: 'over_14k', name: '14천원 이상', description: 'UHD급 단독' };
    } else if (priceNum >= 12000) {
      return { id: 'over_12k', name: '12천원 이상', description: 'HD급 단독' };
    } else if (priceNum >= 8000) {
      return { id: 'over_8k', name: '8천원 이상', description: '기본형 단독' };
    } else {
      return { id: 'under_8k', name: '8천원 미만', description: '라이트 단독' };
    }
  };

  // 현재 입력된 조건에 맞는 모든 정책 옵션 조회
  const getAllPolicyOptions = useMemo(() => {
    const segment = getPolicySegment(internetFee);
    if (!segment) return [];

    const matrix = policiesData.bundle_retention_matrix;
    const rowData = matrix.rows.find(row => row.id === segment.segment);
    
    if (!rowData) return [];

    const options = [];
    
    // 각 컬럼별로 데이터 수집
    matrix.columns.forEach(column => {
      column.sub_columns.forEach(subCol => {
        const cellData = rowData.data[column.id]?.[subCol.id];
        if (cellData) {
          options.push({
            category: column.id,
            categoryName: column.name,
            subCategory: subCol.id,
            subCategoryName: subCol.name,
            description: subCol.description,
            color: column.color,
            giftCard: cellData.gift_card || 0,
            iptv: cellData.iptv || 0,
            notes: cellData.notes || '',
            recommended: column.recommended || false
          });
        }
      });
    });

    return options;
  }, [internetFee]);

  // 최대 혜택 찾기
  const getMaxBenefit = useMemo(() => {
    if (getAllPolicyOptions.length === 0) return null;
    return getAllPolicyOptions.reduce((max, option) => 
      option.giftCard > max.giftCard ? option : max
    );
  }, [getAllPolicyOptions]);

  // 디지털(TV) 혜택 계산
  const getDigitalBenefits = useMemo(() => {
    const segment = getDigitalSegment(digitalFee);
    if (!segment) return null;

    const digital = policiesData.digital_renewal;
    const product = digital.main_products.find(p => p.id === segment.id) ||
                    digital.sub_products.find(p => p.id === segment.id);
    
    return product;
  }, [digitalFee]);

  // 선택된 옵션의 상품권 (현재는 유지/상향 선택 기준)
  const getSelectedBenefit = useMemo(() => {
    const segment = getPolicySegment(internetFee);
    if (!segment) return { giftCard: 0, iptv: 0 };

    const matrix = policiesData.bundle_retention_matrix;
    const rowData = matrix.rows.find(row => row.id === segment.segment);
    
    if (!rowData) return { giftCard: 0, iptv: 0 };

    let giftCard = 0;
    let iptv = 0;

    // planAction에 따라 기본값 설정
    if (planAction === 'maintain') {
      const data = rowData.data.maintain?.unified;
      giftCard = data?.gift_card || 0;
      iptv = data?.iptv || 0;
    } else if (planAction === 'upgrade') {
      const data = rowData.data.upgrade?.['1g'];
      giftCard = data?.gift_card || 0;
      iptv = data?.iptv || 0;
    } else if (planAction === 'downgrade') {
      giftCard = 0;
      iptv = 0;
    }

    return { giftCard, iptv };
  }, [internetFee, planAction]);

  // 방어 멘트 생성
  const generateScripts = () => {
    const segment = getPolicySegment(internetFee);
    if (!segment) {
      return {
        value_proposition: '요금을 입력해주세요.',
        cost_reduction: '혜택을 계산하려면 현재 납부 중인 요금을 입력해주세요.'
      };
    }

    const { giftCard } = getSelectedBenefit;
    const inputPrice = parseInt(internetFee) || 0;
    const years = parseInt(contractYear) || 3;
    const monthlyAvgBenefit = Math.round(giftCard / (years * 12) * 10) / 10;

    const scripts = {
      value_proposition: '',
      cost_reduction: ''
    };

    if (planAction === 'maintain') {
      scripts.value_proposition = `고객님, 현재 <span class="font-bold text-blue-700">${inputPrice.toLocaleString()}원</span>을 내고 계신데, 요금제를 유지하시면 무려 <span class="font-bold text-green-700">${giftCard}만원</span>의 혜택을 바로 받으실 수 있습니다! 변경 없이 현재의 편리함을 그대로 누리시면서 추가 혜택까지 챙기세요.`;
      
      scripts.cost_reduction = `<span class="font-bold text-primary-600">${giftCard}만원 상품권</span>을 ${years}년(${years * 12}개월)으로 나누면, 매월 약 <span class="font-bold text-green-700">${monthlyAvgBenefit}천원씩</span> 할인받는 효과입니다. 실질적으로 <span class="font-bold text-purple-600">${Math.round((inputPrice - monthlyAvgBenefit * 1000) / 1000)}천원</span>에 이용하시는 셈이니 엄청난 혜택입니다!`;
    } else if (planAction === 'upgrade') {
      scripts.value_proposition = `고객님, 현재 <span class="font-bold text-blue-700">${inputPrice.toLocaleString()}원</span>에서 요금제를 상향하시면 더 빠른 속도와 함께 <span class="font-bold text-green-700">${giftCard}만원 상품권</span> 혜택을 드립니다! 가족 모두가 동시에 사용해도 끊김 없는 프리미엄 환경을 경험하세요.`;
      
      scripts.cost_reduction = `상향 시 월 2천원 추가되지만, <span class="font-bold text-green-700">${giftCard}만원 상품권</span>으로 약 <span class="font-bold text-blue-700">${Math.floor(giftCard * 10 / 2)}개월은 실질 부담 제로</span>입니다. 더 빠른 인터넷을 거의 무료로 체험하실 수 있는 절호의 기회입니다!`;
    } else if (planAction === 'downgrade') {
      const maxOption = getMaxBenefit;
      const lostBenefits = maxOption?.giftCard || 0;
      
      scripts.value_proposition = `⚠️ 고객님, 하향하시면 <span class="font-bold text-red-700">혜택이 전혀 없습니다</span>. 하지만 현재 요금 <span class="font-bold text-blue-700">${inputPrice.toLocaleString()}원</span>을 유지하시면 <span class="font-bold text-green-700">${lostBenefits}만원의 상품권</span>을 받으실 수 있습니다. 하향은 현명한 선택이 아닙니다!`;
      
      scripts.cost_reduction = `월 2천원 절감해도, <span class="font-bold text-red-700">${lostBenefits}만원 혜택을 포기</span>하시면 실질적으로 <span class="font-bold text-orange-600">큰 손해</span>입니다. 유지하시는 것이 훨씬 유리합니다!`;
    }

    return scripts;
  };

  const scripts = generateScripts();

  const getColorClasses = (colorName) => {
    const guide = policiesData.color_guide.find(g => g.color === colorName);
    return guide || { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-900' };
  };

  const formatPrice = (price) => {
    return price ? parseInt(price).toLocaleString() : '0';
  };

  return (
    <div className="space-y-8">
      <div className="card">
        <h2 className="text-2xl font-bold text-primary-700 mb-6 flex items-center">
          🧮 고객 정보 입력
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              0️⃣ 고객 유형
            </label>
            <select
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none transition-colors"
            >
              <option value="bundle">📦 번들 고객</option>
              <option value="d_standalone">📺 D단독 고객</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              1️⃣ 인터넷 현재 납부 요금
            </label>
            <div className="relative">
              <input
                type="number"
                value={internetFee}
                onChange={(e) => setInternetFee(e.target.value)}
                placeholder="예: 21000"
                className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none transition-colors text-lg font-semibold"
                disabled={customerType === 'd_standalone'}
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">
                원
              </span>
            </div>
            {internetFee && customerType !== 'd_standalone' && getPolicySegment(internetFee) && (
              <div className="mt-2 text-sm bg-blue-50 text-blue-700 px-3 py-2 rounded">
                📊 판정: <span className="font-bold">{getPolicySegment(internetFee).name}</span> 정책 적용
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              2️⃣ 디지털(TV) 현재 납부 요금
            </label>
            <div className="relative">
              <input
                type="number"
                value={digitalFee}
                onChange={(e) => setDigitalFee(e.target.value)}
                placeholder="예: 14300"
                className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none transition-colors text-lg font-semibold"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">
                원
              </span>
            </div>
            {digitalFee && getDigitalSegment(digitalFee) && (
              <div className="mt-2 text-sm bg-purple-50 text-purple-700 px-3 py-2 rounded">
                📺 판정: <span className="font-bold">{getDigitalSegment(digitalFee).name}</span>
              </div>
            )}
            {digitalFee && customerType === 'd_standalone' && getDStandaloneSegment(digitalFee) && (
              <div className="mt-2 text-sm bg-indigo-50 text-indigo-700 px-3 py-2 rounded">
                📺 판정: <span className="font-bold">{getDStandaloneSegment(digitalFee).name}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              3️⃣ 약정 기간
            </label>
            <select
              value={contractYear}
              onChange={(e) => setContractYear(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none transition-colors"
            >
              <option value="1">1년</option>
              <option value="3">3년</option>
              <option value="5">5년</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              4️⃣ 요금제 액션
            </label>
            <select
              value={planAction}
              onChange={(e) => setPlanAction(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none transition-colors"
            >
              <option value="maintain">✅ 유지</option>
              <option value="upgrade">⬆️ 상향</option>
              <option value="downgrade">⬇️ 하향</option>
            </select>
          </div>
        </div>

        {customerType === 'bundle' && internetFee && digitalFee && (
          <div className="mt-6 p-4 bg-teal-50 border-2 border-teal-300 rounded-lg">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isEqualBundle}
                onChange={(e) => setIsEqualBundle(e.target.checked)}
                className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
              />
              <span className="ml-3 text-lg font-semibold text-teal-900">
                🔗 동등결합 상품 이용 고객 (인터넷+디지털 결합)
              </span>
            </label>
            {isEqualBundle && (
              <p className="mt-2 text-sm text-teal-700">
                ✨ 동등결합 고객은 추가 혜택이 적용됩니다!
              </p>
            )}
          </div>
        )}
      </div>

      {digitalFee && customerType === 'd_standalone' && getDStandaloneSegment(digitalFee) && (
        <div className="card bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-300">
          <h2 className="text-2xl font-bold text-indigo-900 mb-6 flex items-center">
            📺 D단독 고객 혜택
          </h2>
          <p className="text-gray-600 mb-6">
            현재 요금: <span className="font-bold text-indigo-700 text-xl">{formatPrice(digitalFee)}원</span> 
            {' '}({getDStandaloneSegment(digitalFee).name} 구간)
          </p>

          {(() => {
            const segment = getDStandaloneSegment(digitalFee);
            const tier = policiesData.d_standalone.price_tiers.find(t => t.id === segment.id);
            
            if (!tier) return null;

            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(tier.policies).map(([policyId, policy]) => (
                  <div
                    key={policyId}
                    className="bg-white rounded-lg border-2 border-indigo-300 p-4 hover:shadow-xl transition-all"
                  >
                    <div className="text-center">
                      <div className="text-sm text-gray-600 mb-2">{policy.description}</div>
                      <div className="text-3xl font-bold text-indigo-700">{policy.gift_card}</div>
                      <div className="text-xs text-gray-600">만원</div>
                      {policy.discount > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="text-xs text-gray-500">월 할인</div>
                          <div className="text-lg font-bold text-orange-600">{policy.discount}만원</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {internetFee && getPolicySegment(internetFee) && customerType === 'bundle' && (
        <>
          {isEqualBundle && (
            <div className="card bg-gradient-to-br from-teal-50 to-teal-100 border-2 border-teal-300">
              <h2 className="text-2xl font-bold text-teal-900 mb-6 flex items-center">
                🔗 동등결합 상품 혜택
              </h2>
              <p className="text-gray-600 mb-6">
                인터넷+디지털 결합 고객 전용 혜택
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {policiesData.equal_bundle.categories.map((category) => (
                  <div
                    key={category.id}
                    className="bg-white rounded-lg border-2 border-teal-300 p-4 hover:shadow-xl transition-all"
                  >
                    <div className="text-center">
                      <div className="text-sm text-gray-600 mb-2">{category.name}</div>
                      <div className="text-3xl font-bold text-teal-700">{category.gift_card}</div>
                      <div className="text-xs text-gray-600">만원</div>
                      {category.discount && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="text-xs text-gray-500">추가 할인</div>
                          <div className="text-lg font-bold text-orange-600">{category.discount}만원</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              🎁 정책별 혜택 비교
            </h2>
            <p className="text-gray-600 mb-6">
              현재 입력하신 요금: <span className="font-bold text-blue-700 text-xl">{formatPrice(internetFee)}원</span> 
              {' '}({getPolicySegment(internetFee).name} 구간)
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {getAllPolicyOptions.map((option, index) => {
                const colorClasses = getColorClasses(option.color);
                const isMaxBenefit = getMaxBenefit && option.giftCard === getMaxBenefit.giftCard && option.giftCard > 0;
                const estimatedFee = parseInt(internetFee) + (option.category === 'upgrade' ? 2000 : option.category === 'downgrade' ? -2000 : 0);

                return (
                  <div
                    key={`${option.category}_${option.subCategory}`}
                    className={`relative bg-white rounded-lg border-2 ${colorClasses.border} p-4 hover:shadow-xl transition-all ${
                      isMaxBenefit ? 'ring-4 ring-yellow-400 scale-105' : ''
                    }`}
                  >
                    {isMaxBenefit && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg z-10">
                        ⭐ 최대혜택
                      </div>
                    )}
                    {option.recommended && (
                      <div className="absolute -top-3 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                        추천
                      </div>
                    )}

                    <div className={`${colorClasses.bg} ${colorClasses.text} px-3 py-2 rounded-lg mb-3 text-center`}>
                      <div className="font-bold text-sm">{option.categoryName.replace(/^\d+\.\s*/, '')}</div>
                      <div className="text-xs mt-1">{option.subCategoryName}</div>
                    </div>

                    <div className="space-y-3">
                      <div className="text-center">
                        <div className="text-xs text-gray-500">💳 상품권</div>
                        <div className="text-3xl font-bold text-green-700">{option.giftCard}</div>
                        <div className="text-xs text-gray-600">만원</div>
                      </div>

                      <div className="border-t pt-2">
                        <div className="text-xs text-gray-500 text-center mb-1">💰 예상 월 요금</div>
                        <div className="text-lg font-bold text-blue-700 text-center">
                          {Math.round(estimatedFee / 1000)}천원
                        </div>
                      </div>

                      {option.iptv > 0 && (
                        <div className="border-t pt-2">
                          <div className="text-xs text-gray-500 text-center mb-1">📺 IPTV 할인</div>
                          <div className="text-sm font-bold text-purple-700 text-center">
                            {option.iptv}만원
                          </div>
                        </div>
                      )}

                      {option.notes && (
                        <div className="text-xs text-gray-500 text-center italic">
                          {option.notes}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {digitalFee && getDigitalBenefits && (
            <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300">
              <h3 className="text-xl font-bold text-purple-900 mb-4">📺 디지털(TV) 추가 혜택</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="text-sm text-gray-600 mb-2">현재 상품</div>
                  <div className="text-lg font-bold text-purple-700">{getDigitalSegment(digitalFee).name}</div>
                  <div className="text-sm text-gray-500">월 {formatPrice(digitalFee)}원</div>
                </div>
                {getDigitalBenefits.benefits && (
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="text-sm text-gray-600 mb-2">유지 시 혜택</div>
                    <div className="text-2xl font-bold text-green-700">
                      {getDigitalBenefits.benefits.maintain.gift_card}만원
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      + 월 {getDigitalBenefits.benefits.maintain.discount}만원 할인
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="card bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-300">
            <h2 className="text-xl font-bold text-indigo-900 mb-4 flex items-center">
              💬 상담 멘트 (자동 생성)
            </h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-lg shadow-md border-l-4 border-primary-500">
                <h4 className="font-bold text-primary-700 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  💎 가치 제안형 멘트
                </h4>
                <p 
                  className="text-gray-700 leading-relaxed text-base"
                  dangerouslySetInnerHTML={{ __html: scripts.value_proposition }}
                />
              </div>

              <div className="bg-white p-5 rounded-lg shadow-md border-l-4 border-green-500">
                <h4 className="font-bold text-green-700 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  💰 요금 절감형 멘트
                </h4>
                <p 
                  className="text-gray-700 leading-relaxed text-base"
                  dangerouslySetInnerHTML={{ __html: scripts.cost_reduction }}
                />
              </div>
            </div>
          </div>

          {planAction === 'downgrade' && (
            <div className="card bg-red-50 border-2 border-red-400">
              <div className="flex items-start">
                <svg className="w-8 h-8 text-red-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="font-bold text-red-900 text-lg mb-2">⚠️ 요금제 하향 시 손해 예상</h4>
                  <p className="text-red-800 leading-relaxed">
                    요금제 하향 시에는 <span className="font-bold text-red-900">상품권 등 별도 혜택이 전혀 제공되지 않습니다</span>. 
                    {getMaxBenefit && (
                      <>
                        {' '}현재 요금을 유지하시면 <span className="font-bold text-green-700 bg-green-100 px-2 py-1 rounded">최대 {getMaxBenefit.giftCard}만원의 혜택</span>을 받으실 수 있습니다.
                      </>
                    )}
                    {' '}신중하게 결정해주시기 바랍니다.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!internetFee && (
        <div className="card bg-blue-50 border-2 border-blue-300">
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-blue-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-xl font-bold text-blue-900 mb-2">요금을 입력해주세요</h3>
            <p className="text-blue-700">
              현재 납부 중인 인터넷 요금을 입력하시면<br />
              맞춤형 혜택을 계산해드립니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BenefitCalculator;
