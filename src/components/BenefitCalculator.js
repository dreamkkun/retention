import React, { useState, useMemo } from 'react';
import policiesData from '../data/policies.json';

const BenefitCalculator = () => {
  const [internetFee, setInternetFee] = useState('');
  const [digitalFee, setDigitalFee] = useState('');
  const [contractYear, setContractYear] = useState('3');
  const [planAction, setPlanAction] = useState('maintain');
  const [subOption, setSubOption] = useState(''); // 1G, 500M 등 세부 옵션
  const [isEqualBundle, setIsEqualBundle] = useState(false);
  const [customerType, setCustomerType] = useState('bundle'); // 'bundle', 'd_standalone', 'i_standalone'

  const getPolicySegment = (price) => {
    const priceNum = parseInt(price);
    if (isNaN(priceNum) || priceNum <= 0) return null;

    if (priceNum >= 20000) return { id: 'over_20k', name: '20천원 이상' };
    else if (priceNum >= 18000) return { id: 'over_18k', name: '18천원 이상' };
    else if (priceNum >= 15000) return { id: 'over_15k', name: '15천원 이상' };
    else if (priceNum >= 12000) return { id: 'over_12k', name: '12천원 이상' };
    else if (priceNum >= 10000) return { id: 'over_10k', name: '10천원 이상' };
    else return { id: 'under_10k', name: '10천원 미만' };
  };

  const getDStandaloneSegment = (price) => {
    const priceNum = parseInt(price);
    if (isNaN(priceNum) || priceNum <= 0) return null;

    if (priceNum >= 14000) return { id: 'over_14k', name: '14천원 이상' };
    else if (priceNum >= 12000) return { id: 'over_12k', name: '12천원 이상' };
    else if (priceNum >= 8000) return { id: 'over_8k', name: '8천원 이상' };
    else return { id: 'under_8k', name: '8천원 미만' };
  };

  // 합산 금액 계산
  const getTotalFee = useMemo(() => {
    const internet = parseInt(internetFee) || 0;
    const digital = parseInt(digitalFee) || 0;
    return internet + digital;
  }, [internetFee, digitalFee]);

  // 선택된 planAction에 따른 sub_columns 가져오기
  const getAvailableSubOptions = useMemo(() => {
    const matrix = policiesData.bundle_retention_matrix;
    const column = matrix.columns.find(col => col.id === planAction);
    return column ? column.sub_columns : [];
  }, [planAction]);

  // 디지털 혜택 계산
  const getDigitalBenefit = useMemo(() => {
    const digitalSegment = getPolicySegment(digitalFee);
    if (!digitalSegment) return { giftCard: 0, discount: 0 };

    const digitalData = policiesData.digital_renewal;
    
    // main_products에서 찾기
    for (const product of digitalData.main_products) {
      if (product.monthly_fee <= parseInt(digitalFee) / 10000) {
        return {
          giftCard: product.benefits.maintain.gift_card || 0,
          discount: product.benefits.maintain.discount || 0
        };
      }
    }

    // sub_products에서 찾기
    for (const product of digitalData.sub_products) {
      if (product.monthly_fee <= parseInt(digitalFee) / 10000) {
        return {
          giftCard: product.gift_card || 0,
          discount: 0
        };
      }
    }

    return { giftCard: 0, discount: 0 };
  }, [digitalFee]);

  const calculateBenefit = useMemo(() => {
    if (customerType === 'bundle') {
      const segment = getPolicySegment(internetFee);
      if (!segment || !subOption) return null;

      const matrix = policiesData.bundle_retention_matrix;
      const rowData = matrix.rows.find(row => row.id === segment.id);
      if (!rowData) return null;

      const cellData = rowData.data[planAction]?.[subOption];
      const digitalBenefit = getDigitalBenefit;

      const internetGiftCard = cellData?.gift_card || 0;
      const internetIptv = cellData?.iptv || 0;
      const digitalGiftCard = digitalBenefit.giftCard;
      const digitalDiscount = digitalBenefit.discount;

      let totalGiftCard = internetGiftCard + digitalGiftCard;
      let totalDiscount = digitalDiscount;

      if (isEqualBundle) {
        const equalData = policiesData.equal_bundle.categories.find(c => c.id === planAction);
        totalGiftCard += equalData?.gift_card || 0;
        totalDiscount += equalData?.discount || 0;
      }

      return {
        segment: segment.name,
        internetBenefit: {
          giftCard: internetGiftCard,
          iptv: internetIptv
        },
        digitalBenefit: {
          giftCard: digitalGiftCard,
          discount: digitalDiscount
        },
        totalGiftCard: totalGiftCard,
        totalDiscount: totalDiscount,
        isEqualBundle: isEqualBundle
      };

    } else if (customerType === 'd_standalone') {
      const segment = getDStandaloneSegment(digitalFee);
      if (!segment) return null;

      const tier = policiesData.d_standalone.price_tiers.find(t => t.id === segment.id);
      if (!tier) return null;

      let policy = null;
      if (planAction === 'maintain') policy = tier.policies.maintain;
      else if (planAction === 'upgrade') policy = tier.policies.change;
      else if (planAction === 'middle') policy = tier.policies.discount_apply;

      return {
        segment: segment.name,
        totalGiftCard: policy?.gift_card || 0,
        totalDiscount: policy?.discount || 0,
        internetBenefit: null,
        digitalBenefit: null,
        isEqualBundle: false
      };
    } else if (customerType === 'i_standalone') {
      const segment = getPolicySegment(internetFee);
      if (!segment || !subOption) return null;

      const matrix = policiesData.bundle_retention_matrix;
      const rowData = matrix.rows.find(row => row.id === segment.id);
      if (!rowData) return null;

      const cellData = rowData.data[planAction]?.[subOption];

      return {
        segment: segment.name,
        totalGiftCard: cellData?.gift_card || 0,
        totalDiscount: 0,
        internetBenefit: {
          giftCard: cellData?.gift_card || 0,
          iptv: cellData?.iptv || 0
        },
        digitalBenefit: null,
        isEqualBundle: false
      };
    }

    return null;
  }, [internetFee, digitalFee, contractYear, planAction, subOption, isEqualBundle, customerType, getDigitalBenefit]);

  const generateDefenseScript = () => {
    if (!calculateBenefit) return null;

    const { totalGiftCard, totalDiscount } = calculateBenefit;
    const totalFee = getTotalFee;

    return {
      value: `고객님, 현재 ${totalFee.toLocaleString()}원을 내고 계신데, 요금제를 ${planAction === 'maintain' ? '유지' : '변경'}하시면 무려 ${totalGiftCard}만원의 혜택을 바로 받으실 수 있습니다!`,
      discount: totalDiscount > 0 ? `추가로 매월 ${totalDiscount}만원씩 할인 혜택도 드립니다.` : null
    };
  };

  return (
    <div className="max-w-4xl">
      <div className="bg-gray-100 border border-gray-300 p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">맞춤형 혜택 계산기</h2>
        
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              고객 유형
            </label>
            <select
              value={customerType}
              onChange={(e) => {
                setCustomerType(e.target.value);
                setSubOption('');
              }}
              className="w-full px-3 py-2 border border-gray-300 bg-white focus:border-gray-500 focus:outline-none"
            >
              <option value="bundle">번들 고객</option>
              <option value="i_standalone">I단독 고객</option>
              <option value="d_standalone">D단독 고객</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              약정 기간
            </label>
            <select
              value={contractYear}
              onChange={(e) => setContractYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 bg-white focus:border-gray-500 focus:outline-none"
            >
              <option value="1">1년</option>
              <option value="3">3년</option>
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              인터넷 현재 요금 (원)
            </label>
            <input
              type="number"
              value={internetFee}
              onChange={(e) => setInternetFee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 focus:border-gray-500 focus:outline-none"
              placeholder="예: 21000"
              disabled={customerType === 'd_standalone'}
            />
            {internetFee && getPolicySegment(internetFee) && customerType !== 'd_standalone' && (
              <div className="mt-2 text-sm bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2">
                판정: <span className="font-bold">{getPolicySegment(internetFee).name}</span>
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
              onChange={(e) => setDigitalFee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 focus:border-gray-500 focus:outline-none"
              placeholder="예: 14300"
              disabled={customerType === 'i_standalone'}
            />
            {digitalFee && getDStandaloneSegment(digitalFee) && customerType === 'd_standalone' && (
              <div className="mt-2 text-sm bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2">
                판정: <span className="font-bold">{getDStandaloneSegment(digitalFee).name}</span>
              </div>
            )}
          </div>
        </div>

        {(internetFee || digitalFee) && (
          <div className="bg-white border border-gray-400 p-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">합산 금액</span>
              <span className="text-xl font-bold text-gray-800">{getTotalFee.toLocaleString()}원</span>
            </div>
          </div>
        )}

        {(customerType === 'bundle' || customerType === 'i_standalone') && (
          <>
            {customerType === 'bundle' && (
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isEqualBundle}
                    onChange={(e) => setIsEqualBundle(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm font-semibold text-gray-700">동등결합 고객</span>
                </label>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                요금제 변경 여부
              </label>
              <select
                value={planAction}
                onChange={(e) => {
                  setPlanAction(e.target.value);
                  setSubOption('');
                }}
                className="w-full px-3 py-2 border border-gray-300 bg-white focus:border-gray-500 focus:outline-none"
              >
                <option value="maintain">요금제 유지</option>
                <option value="upgrade">요금제 상향</option>
                <option value="middle">중간요금제</option>
                <option value="lowest">최저요금제</option>
                <option value="standalone">단독전환</option>
              </select>
            </div>

            {getAvailableSubOptions.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  세부 옵션
                </label>
                <select
                  value={subOption}
                  onChange={(e) => setSubOption(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 bg-white focus:border-gray-500 focus:outline-none"
                >
                  <option value="">선택하세요</option>
                  {getAvailableSubOptions.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.name} - {option.description}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        {customerType === 'd_standalone' && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              요금제 변경 여부
            </label>
            <select
              value={planAction}
              onChange={(e) => setPlanAction(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 bg-white focus:border-gray-500 focus:outline-none"
            >
              <option value="maintain">유지</option>
              <option value="upgrade">변경</option>
              <option value="middle">할인적용</option>
            </select>
          </div>
        )}

        <button
          onClick={() => {}}
          className="w-full bg-gray-700 hover:bg-gray-800 text-white font-semibold py-3 transition-colors"
        >
          혜택 계산하기
        </button>
      </div>

      {calculateBenefit && (
        <>
          <div className="bg-white border-2 border-gray-400 p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">계산 결과</h3>
            
            {customerType === 'bundle' && calculateBenefit.internetBenefit && (
              <>
                <div className="mb-4">
                  <h4 className="text-md font-semibold text-gray-700 mb-2">인터넷 혜택</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="border border-gray-300 p-4 bg-gray-50">
                      <div className="text-sm text-gray-600 mb-1">상품권</div>
                      <div className="text-2xl font-bold text-gray-800">{calculateBenefit.internetBenefit.giftCard}만원</div>
                    </div>
                    {calculateBenefit.internetBenefit.iptv > 0 && (
                      <div className="border border-gray-300 p-4 bg-gray-50">
                        <div className="text-sm text-gray-600 mb-1">IPTV 혜택</div>
                        <div className="text-2xl font-bold text-gray-800">{calculateBenefit.internetBenefit.iptv}만원</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-md font-semibold text-gray-700 mb-2">디지털 혜택</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="border border-gray-300 p-4 bg-gray-50">
                      <div className="text-sm text-gray-600 mb-1">상품권</div>
                      <div className="text-2xl font-bold text-gray-800">{calculateBenefit.digitalBenefit.giftCard}만원</div>
                    </div>
                    {calculateBenefit.digitalBenefit.discount > 0 && (
                      <div className="border border-gray-300 p-4 bg-gray-50">
                        <div className="text-sm text-gray-600 mb-1">월 할인</div>
                        <div className="text-2xl font-bold text-gray-800">{calculateBenefit.digitalBenefit.discount}만원</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t-2 border-gray-400 pt-4">
                  <h4 className="text-md font-semibold text-gray-700 mb-2">총 혜택 (합산)</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="border-2 border-blue-500 p-4 bg-blue-50">
                      <div className="text-sm text-blue-700 mb-1">총 상품권</div>
                      <div className="text-3xl font-bold text-blue-800">{calculateBenefit.totalGiftCard}만원</div>
                    </div>
                    {calculateBenefit.totalDiscount > 0 && (
                      <div className="border-2 border-green-500 p-4 bg-green-50">
                        <div className="text-sm text-green-700 mb-1">총 월 할인</div>
                        <div className="text-3xl font-bold text-green-800">{calculateBenefit.totalDiscount}만원</div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {(customerType === 'd_standalone' || customerType === 'i_standalone') && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border border-gray-300 p-4 bg-gray-50">
                  <div className="text-sm text-gray-600 mb-1">상품권 혜택</div>
                  <div className="text-2xl font-bold text-gray-800">{calculateBenefit.totalGiftCard}만원</div>
                </div>

                {calculateBenefit.totalDiscount > 0 && (
                  <div className="border border-gray-300 p-4 bg-gray-50">
                    <div className="text-sm text-gray-600 mb-1">월 할인 혜택</div>
                    <div className="text-2xl font-bold text-gray-800">{calculateBenefit.totalDiscount}만원</div>
                  </div>
                )}
              </div>
            )}

            {calculateBenefit.isEqualBundle && (
              <div className="mt-4 bg-blue-50 border border-blue-300 p-3 text-sm text-blue-800">
                ℹ️ 동등결합 고객 추가 혜택 포함
              </div>
            )}
          </div>

          {generateDefenseScript() && (
            <div className="bg-gray-100 border border-gray-300 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-3">방어 멘트</h3>
              
              <div className="bg-white border border-gray-300 p-4 mb-3">
                <div className="text-sm text-gray-600 mb-1">💡 가치제안형</div>
                <p className="text-gray-800">{generateDefenseScript().value}</p>
              </div>

              {generateDefenseScript().discount && (
                <div className="bg-white border border-gray-300 p-4">
                  <div className="text-sm text-gray-600 mb-1">💰 요금절감형</div>
                  <p className="text-gray-800">{generateDefenseScript().discount}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BenefitCalculator;
