import React, { useState, useMemo } from 'react';
import policiesData from '../data/policies.json';

const BenefitCalculator = () => {
  const [internetFee, setInternetFee] = useState('');
  const [digitalFee, setDigitalFee] = useState('');
  const [contractYear, setContractYear] = useState('3');
  const [planAction, setPlanAction] = useState('maintain');
  const [isEqualBundle, setIsEqualBundle] = useState(false);
  const [customerType, setCustomerType] = useState('bundle');

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

  const calculateBenefit = useMemo(() => {
    if (customerType === 'bundle') {
      const segment = getPolicySegment(internetFee);
      if (!segment) return null;

      const matrix = policiesData.bundle_retention_matrix;
      const rowData = matrix.rows.find(row => row.id === segment.id);
      if (!rowData) return null;

      let cellData = null;
      if (planAction === 'maintain') {
        cellData = rowData.data.maintain?.unified;
      } else if (planAction === 'upgrade') {
        cellData = rowData.data.upgrade?.['1g'];
      } else if (planAction === 'middle') {
        cellData = rowData.data.middle?.half_price;
      }

      if (isEqualBundle) {
        const equalData = policiesData.equal_bundle.categories.find(c => c.id === planAction);
        return {
          segment: segment.name,
          giftCard: (cellData?.gift_card || 0) + (equalData?.gift_card || 0),
          discount: equalData?.discount || 0,
          iptv: cellData?.iptv || 0,
          isEqualBundle: true
        };
      }

      return {
        segment: segment.name,
        giftCard: cellData?.gift_card || 0,
        discount: 0,
        iptv: cellData?.iptv || 0,
        isEqualBundle: false
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
        giftCard: policy?.gift_card || 0,
        discount: policy?.discount || 0,
        iptv: 0,
        isEqualBundle: false
      };
    }

    return null;
  }, [internetFee, digitalFee, contractYear, planAction, isEqualBundle, customerType]);

  const generateDefenseScript = () => {
    if (!calculateBenefit) return null;

    const { giftCard, discount } = calculateBenefit;
    const inputPrice = customerType === 'bundle' ? parseInt(internetFee) : parseInt(digitalFee);

    return {
      value: `고객님, 현재 ${inputPrice.toLocaleString()}원을 내고 계신데, 요금제를 ${planAction === 'maintain' ? '유지' : '변경'}하시면 무려 ${giftCard}만원의 혜택을 바로 받으실 수 있습니다!`,
      discount: discount > 0 ? `추가로 매월 ${discount}만원씩 할인 혜택도 드립니다.` : null
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
              onChange={(e) => setCustomerType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 bg-white focus:border-gray-500 focus:outline-none"
            >
              <option value="bundle">번들 고객</option>
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

        {customerType === 'bundle' ? (
          <>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                인터넷 현재 요금 (원)
              </label>
              <input
                type="number"
                value={internetFee}
                onChange={(e) => setInternetFee(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:border-gray-500 focus:outline-none"
                placeholder="예: 21000"
              />
              {internetFee && getPolicySegment(internetFee) && (
                <div className="mt-2 text-sm bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2">
                  판정: <span className="font-bold">{getPolicySegment(internetFee).name}</span>
                </div>
              )}
            </div>

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
          </>
        ) : (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              디지털(TV) 현재 요금 (원)
            </label>
            <input
              type="number"
              value={digitalFee}
              onChange={(e) => setDigitalFee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 focus:border-gray-500 focus:outline-none"
              placeholder="예: 14300"
            />
            {digitalFee && getDStandaloneSegment(digitalFee) && (
              <div className="mt-2 text-sm bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2">
                판정: <span className="font-bold">{getDStandaloneSegment(digitalFee).name}</span>
              </div>
            )}
          </div>
        )}

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
            <option value="upgrade">상향</option>
            <option value="middle">중간요금제</option>
          </select>
        </div>

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
            
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="border border-gray-300 p-4 bg-gray-50">
                <div className="text-sm text-gray-600 mb-1">상품권 혜택</div>
                <div className="text-2xl font-bold text-gray-800">{calculateBenefit.giftCard}만원</div>
              </div>

              {calculateBenefit.discount > 0 && (
                <div className="border border-gray-300 p-4 bg-gray-50">
                  <div className="text-sm text-gray-600 mb-1">월 할인 혜택</div>
                  <div className="text-2xl font-bold text-gray-800">{calculateBenefit.discount}만원</div>
                </div>
              )}

              {calculateBenefit.iptv > 0 && (
                <div className="border border-gray-300 p-4 bg-gray-50">
                  <div className="text-sm text-gray-600 mb-1">IPTV 혜택</div>
                  <div className="text-2xl font-bold text-gray-800">{calculateBenefit.iptv}만원</div>
                </div>
              )}
            </div>

            {calculateBenefit.isEqualBundle && (
              <div className="bg-blue-50 border border-blue-300 p-3 text-sm text-blue-800">
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
