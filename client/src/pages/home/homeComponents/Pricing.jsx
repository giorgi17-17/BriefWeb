import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Pricing = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Define pricing plans with schema data
  const plans = [
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
  ];

  return (
    <section
      className="py-20 theme-bg-primary"
      id="pricing"
      itemScope
      itemType="https://schema.org/Offer"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="text-center max-w-3xl mx-auto mb-16">
          <h2
            className="text-3xl font-bold mb-4 theme-text-primary"
            itemProp="name"
          >
            {t("landing.pricing.title")}
          </h2>
          <p className="theme-text-tertiary text-lg" itemProp="description">
            {t("landing.pricing.subtitle")}
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`theme-card rounded-xl p-8 theme-border flex flex-col h-full ${
                plan.popular ? "relative z-10 shadow-xl border-blue-500" : ""
              }`}
              itemScope
              itemType="https://schema.org/Offer"
              itemProp={plan.popular ? "highPrice" : "lowPrice"}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-600 dark:bg-blue-700 text-white px-4 py-1 rounded-full text-sm font-medium">
                  {t("landing.pricing.popularBadge")}
                </div>
              )}

              <div className="mb-5">
                <h3
                  className="text-xl font-bold theme-text-primary mb-2"
                  itemProp="name"
                >
                  {plan.name}
                </h3>
                <p
                  className="theme-text-tertiary text-sm mb-4"
                  itemProp="description"
                >
                  {plan.description}
                </p>
                <div className="flex items-baseline mb-2">
                  <span
                    className="text-3xl font-bold theme-text-primary"
                    itemProp="price"
                  >
                    {plan.price === "0"
                      ? t("landing.pricing.free.price")
                      : t("landing.pricing.pro.price")}
                  </span>

                  <meta itemProp="priceCurrency" content={plan.priceCurrency} />
                  <meta itemProp="availability" content={plan.availability} />

                  {plan.price !== "0" && (
                    <span className="text-sm theme-text-tertiary ml-1">
                      {plan.period}
                    </span>
                  )}
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-grow" itemProp="itemOffered">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <svg
                      className="h-5 w-5 text-green-500 mt-0.5 mr-2"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-sm theme-text-secondary">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() =>
                  navigate(plan.id === "free" ? "/register" : "/payments")
                }
                className={`w-full rounded-lg px-4 py-2 text-sm font-medium ${
                  plan.popular
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "theme-button-secondary border border-white"
                }`}
                itemProp="potentialAction"
                itemScope
                itemType="https://schema.org/BuyAction"
              >
                <meta itemProp="name" content={plan.cta} />
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center mt-8 text-sm theme-text-tertiary">
          {t("landing.pricing.guarantee")}
        </p>
      </div>
    </section>
  );
};

export default Pricing;
