import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";

const Pricing = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="w-full py-20 px-4 theme-bg-primary">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-4 theme-text-primary">
            {t("landing.pricing.title")}
          </h2>
          <p className="text-lg max-w-xl mx-auto theme-text-tertiary">
            {t("landing.pricing.subtitle")}
          </p>
        </div>

        <div className="max-w-5xl mx-auto mt-10">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Free Plan */}
            <div className="border theme-border theme-card rounded-lg p-8">
              <div className="mb-5">
                <h3 className="text-xl font-bold mb-2 theme-text-primary">
                  {t("landing.pricing.free.title")}
                </h3>
                <p className="mb-4 text-sm theme-text-tertiary">
                  {t("landing.pricing.free.subtitle")}
                </p>
                <div className="mb-6">
                  <span className="text-4xl font-bold theme-text-primary">
                    {t("landing.pricing.free.price")}
                  </span>
                  <span className="ml-1 theme-text-tertiary">
                    {t("landing.pricing.free.period")}
                  </span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {t("landing.pricing.free.features", {
                  returnObjects: true,
                }).map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2 mt-1">
                      <Check size={16} className="text-green-500" />
                    </span>
                    <span className="text-sm theme-text-secondary">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => navigate("/login")}
                className="w-full py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                {t("landing.pricing.free.cta")}
              </button>
            </div>

            {/* Pro Plan */}
            <div className="border theme-border theme-card rounded-lg p-8 relative">
              <div className="absolute top-0 right-0 bg-blue-700 text-white text-xs px-3 py-1 uppercase font-bold rounded-bl-lg rounded-tr-lg">
                {t("landing.pricing.pro.popular")}
              </div>

              <div className="mb-5">
                <h3 className="text-xl font-bold mb-2 theme-text-primary">
                  {t("landing.pricing.pro.title")}
                </h3>
                <p className="mb-4 text-sm theme-text-tertiary">
                  {t("landing.pricing.pro.subtitle")}
                </p>
                <div className="mb-6">
                  <span className="text-4xl font-bold theme-text-primary">
                    {t("landing.pricing.pro.price")}
                  </span>
                  <span className="ml-1 theme-text-tertiary">
                    {t("landing.pricing.pro.period")}
                  </span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {t("landing.pricing.pro.features", { returnObjects: true }).map(
                  (feature, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2 mt-1">
                        <Check size={16} className="text-green-500" />
                      </span>
                      <span className="text-sm theme-text-secondary">
                        {feature}
                      </span>
                    </li>
                  )
                )}
              </ul>

              <button
                onClick={() => navigate("/payments")}
                className="w-full py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors dark:bg-blue-700 dark:hover:bg-blue-800"
              >
                {t("landing.pricing.pro.cta")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
