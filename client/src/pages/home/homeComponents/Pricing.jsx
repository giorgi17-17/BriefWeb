import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useStartBogCheckout } from "../../../hooks/useBogAuth";
import { useAuth } from "../../../utils/authHooks";
import { useUserPlan } from "../../../contexts/UserPlanContext";
import React, { useMemo } from 'react'


export default function Pricing() {
  const { t } = useTranslation();
  const { isPremiumUser } = useUserPlan();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { mutate: startBog } = useStartBogCheckout();

  const isLoggedIn = Boolean(user);
  const isDisabled = isLoggedIn && isPremiumUser;

  // Build plans once per translation change
  const plans = useMemo(
    () => [
      {
        id: "free",
        name: t("landing.pricing.free.title"),
        price: "0",
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
      },
      {
        id: "pro",
        name: t("landing.pricing.pro.title"),
        price: "5",
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
      },
    ],
    [t]
  );

  const handleCta = React.useCallback(
    (plan) => {
      if (!isLoggedIn) {
        navigate("/login");
        return;
      }
      if (isPremiumUser) return; // disabled also stops click; extra guard
      // If you add more paid tiers later, you can branch on plan.id
      startBog();
    },
    [isLoggedIn, isPremiumUser, navigate, startBog]
  );

  return (
    <section
      id="pricing"
      className="py-20 theme-bg-primary"
      itemScope
      itemType="https://schema.org/AggregateOffer"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold mb-4 theme-text-primary" itemProp="name">
            {t("landing.pricing.title")}
          </h2>
          <p className="theme-text-tertiary text-lg" itemProp="description">
            {t("landing.pricing.subtitle")}
          </p>
          <meta itemProp="priceCurrency" content="USD" />
        </header>

        <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isDisabled={isDisabled}
              isLoggedIn={isLoggedIn}
              onCta={handleCta}
            />
          ))}
        </div>

        <p className="text-center mt-8 text-sm theme-text-tertiary">
          {t("landing.pricing.guarantee")}
        </p>
      </div>
    </section>
  );
}

function PlanCard({ plan, isDisabled, isLoggedIn, onCta }) {
  return (
    <div
      className={`theme-card rounded-xl p-8 theme-border flex flex-col h-full ${plan.popular ? "relative z-10 shadow-xl border-blue-500" : ""
        }`}
      itemScope
      itemType="https://schema.org/Offer"
    >
      {plan.popular && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-600 dark:bg-blue-700 text-white px-4 py-1 rounded-full text-sm font-medium">
          {/* keep your copy source */}
          {/** If you prefer i18n: {t("landing.pricing.popularBadge")} */}
          Popular
        </div>
      )}

      <div className="mb-5">
        <h3 className="text-xl font-bold theme-text-primary mb-2" itemProp="name">
          {plan.name}
        </h3>
        <p className="theme-text-tertiary text-sm mb-4" itemProp="description">
          {plan.description}
        </p>

        <div className="flex items-baseline mb-2">
          <span className="text-3xl font-bold theme-text-primary" itemProp="price">
            {plan.price === "0" ? "Free" : plan.price}
          </span>
          <meta itemProp="priceCurrency" content={plan.priceCurrency} />
          <meta itemProp="availability" content={plan.availability} />
          {plan.price !== "0" && (
            <span className="text-sm theme-text-tertiary ml-1">{plan.period}</span>
          )}
        </div>
      </div>

      <ul className="space-y-3 mb-8 flex-grow" itemProp="itemOffered">
        {plan.features.map((feature, idx) => (
          <li key={`${plan.id}-feat-${idx}`} className="flex items-start">
            <svg
              className="h-5 w-5 text-green-500 mt-0.5 mr-2"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm theme-text-secondary">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onCta(plan)}
        disabled={isDisabled}
        data-plan={plan.id}
        aria-disabled={isDisabled}
        className={[
          "w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors",
          plan.popular
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "theme-button-secondary border border-white hover:border-white/80",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
          "disabled:hover:bg-inherit disabled:hover:text-inherit disabled:shadow-none",
        ].join(" ")}
      >
        <meta itemProp="name" content={plan.cta} />
        {isLoggedIn && isDisabled ? "Current plan" : plan.cta}
      </button>
    </div>
  );
}