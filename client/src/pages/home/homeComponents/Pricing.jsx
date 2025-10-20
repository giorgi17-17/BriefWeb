import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useStartBogCheckout } from "../../../hooks/useBogAuth";
import { useAuth } from "../../../utils/authHooks";
import { useUserPlan } from "../../../contexts/UserPlanContext";
import { DISCOUNT_CONFIG, BASE_PRICES, getPricingInfo } from "../../../config/pricingConfig";
import React, { useMemo } from 'react'
import PropTypes from 'prop-types';


export default function Pricing() {
  const { t } = useTranslation();
  const { isPremium } = useUserPlan();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { mutate: startBog } = useStartBogCheckout();

  const isLoggedIn = Boolean(user);
  const isDisabled = isLoggedIn && isPremium;

  // Build plans once per translation change
  const plans = useMemo(
    () => {
      const freePricingInfo = getPricingInfo(BASE_PRICES.free);
      const proPricingInfo = getPricingInfo(BASE_PRICES.pro);

      return [
        {
          id: "free",
          name: t("landing.pricing.free.title"),
          price: "0 ₾",
          period: t("landing.pricing.free.period"),
          description: t("landing.pricing.free.subtitle"),
          features: [
            t("landing.pricing.free.features.feature1"),
            t("landing.pricing.free.features.feature2"),
            t("landing.pricing.free.features.feature3"),
            t("landing.pricing.free.features.feature4"),
            t("landing.pricing.free.features.feature5"),
          ],
          cta: t("landing.pricing.free.cta"),
          popular: false,
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          pricingInfo: freePricingInfo,
        },
        {
          id: "pro",
          name: t("landing.pricing.pro.title"),
          price: `${proPricingInfo.finalPrice} ₾`,
          originalPrice: proPricingInfo.hasDiscount ? `${proPricingInfo.originalPrice} ₾` : null,
          period: t("landing.pricing.pro.period"),
          description: t("landing.pricing.pro.subtitle"),
          features: [
            t("landing.pricing.pro.features.feature1"),
            t("landing.pricing.pro.features.feature2"),
            t("landing.pricing.pro.features.feature3"),
            t("landing.pricing.pro.features.feature4"),
            t("landing.pricing.pro.features.feature5"),
          ],
          cta: t("landing.pricing.pro.cta"),
          popular: true,
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          pricingInfo: proPricingInfo,
        },
      ];
    },
    [t]
  );

  const handleCta = React.useCallback(
    (plan) => {
      if (!isLoggedIn) {
        navigate("/login");
        return;
      }
      
      if (isPremium) return; // disabled also stops click; extra guard
      
      // Handle different plan types
      if (plan.id === "free") {
        // For free plan, redirect to dashboard or register
        navigate("/dashboard");
      } else {
        // For paid plans, start the checkout process
        startBog();
      }
    },
    [isLoggedIn, isPremium, navigate, startBog]
  );

  return (
    <section
      id="pricing"
      className="py-20"
      style={{ backgroundColor: '#0B0B0E' }}
      itemScope
      itemType="https://schema.org/AggregateOffer"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold mb-4 text-white" itemProp="name">
            {t("landing.pricing.title")}
          </h2>
          <p className="text-gray-300 text-lg" itemProp="description">
            {t("landing.pricing.subtitle")}
          </p>
          <meta itemProp="priceCurrency" content="USD" />
        </header>

        <div className="grid lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isDisabled={isDisabled}
              onCta={handleCta}
            />
          ))}
        </div>

        <p className="text-center mt-8 text-sm text-gray-400">
          {t("landing.pricing.guarantee")}
        </p>
      </div>
    </section>
  );
}

function PlanCard({ plan, isDisabled, onCta }) {
  const { t } = useTranslation();
  const hasDiscount = plan.pricingInfo?.hasDiscount;
  const isPro = plan.id === "pro";

  const cardStyle = isPro 
    ? {
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
        boxShadow: '0 20px 40px rgba(59, 130, 246, 0.3)',
      }
    : {
        backgroundColor: '#111111',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
      };

  return (
    <div
      className="rounded-2xl p-8 flex flex-col h-full relative"
      style={cardStyle}
      itemScope
      itemType="https://schema.org/Offer"
    >
      {/* Popular Badge */}
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-white text-gray-900 px-4 py-1 rounded-full text-sm font-semibold">
          Popular
        </div>
      )}

      {/* Discount Badge - Yellow Pill */}
      {hasDiscount && DISCOUNT_CONFIG.enabled && (
        <div className="mb-4">
          <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-yellow-400 text-black mb-3 shadow-lg">
            50% OFF
          </div>
          <p className="text-sm text-blue-300 font-medium">
            🎓 {t("landing.pricing.discount.studentCard")}
          </p>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white mb-2" itemProp="name">
          {plan.name}
        </h3>
        <p className={`text-sm mb-6 ${isPro ? 'text-blue-100' : 'text-gray-400'}`} itemProp="description">
          {plan.description}
        </p>

        <div className="flex items-baseline mb-2">
          {/* Original price with strikethrough if discounted */}
          {hasDiscount && plan.originalPrice && (
            <span className="text-xl font-semibold text-gray-300 mr-3 relative">
              <span className="relative">
                6.99 ₾
                <span className="absolute top-1/2 left-0 w-full h-0.5 bg-red-400 transform -translate-y-1/2"></span>
              </span>
            </span>
          )}
          
          {/* Current/discounted price */}
          <span 
            className="text-4xl font-bold text-white" 
            itemProp="price"
          >
            {hasDiscount && isPro ? '3.5 ₾' : plan.price}
          </span>
          
          <meta itemProp="priceCurrency" content={plan.priceCurrency} />
          <meta itemProp="availability" content={plan.availability} />
          {plan.price !== "0 ₾" && (
            <span className={`text-sm ml-2 ${isPro ? 'text-blue-200' : 'text-gray-400'}`}>
              {plan.period}
            </span>
          )}
        </div>
      </div>

      <ul className="space-y-4 mb-8 flex-grow" itemProp="itemOffered">
        {plan.features.map((feature, idx) => (
          <li key={`${plan.id}-feat-${idx}`} className="flex items-start">
            <svg
              className="h-5 w-5 text-green-400 mt-0.5 mr-3 flex-shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span className={`text-sm ${isPro ? 'text-blue-100' : 'text-gray-300'}`}>
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onCta(plan)}
        disabled={isDisabled}
        data-plan={plan.id}
        aria-disabled={isDisabled}
        className={`w-full rounded-xl px-6 py-3 text-sm font-semibold transition-colors duration-200 ${
          isPro
            ? 'bg-white text-blue-600 hover:bg-gray-100'
            : 'bg-gray-800 text-white border border-gray-600 hover:bg-gray-700 hover:border-gray-500'
        } ${
          isDisabled 
            ? 'cursor-not-allowed' 
            : ''
        }`}
      >
        <meta itemProp="name" content={plan.cta} />
        {isDisabled ? "Current plan" : plan.cta}
      </button>
    </div>
  );
}

PlanCard.propTypes = {
  plan: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    price: PropTypes.string.isRequired,
    originalPrice: PropTypes.string,
    period: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    features: PropTypes.arrayOf(PropTypes.string).isRequired,
    cta: PropTypes.string.isRequired,
    popular: PropTypes.bool.isRequired,
    priceCurrency: PropTypes.string.isRequired,
    availability: PropTypes.string.isRequired,
    pricingInfo: PropTypes.shape({
      hasDiscount: PropTypes.bool.isRequired,
      originalPrice: PropTypes.number.isRequired,
      finalPrice: PropTypes.number.isRequired,
      discountPercentage: PropTypes.number.isRequired,
      savings: PropTypes.number.isRequired,
    }).isRequired,
  }).isRequired,
  isDisabled: PropTypes.bool.isRequired,
  onCta: PropTypes.func.isRequired,
};
