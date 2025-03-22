import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { background, text } from "../../../utils/themeUtils";
import { usePostHog } from "posthog-js/react";

const Hero = () => {
  const navigate = useNavigate();
  const posthog = usePostHog();
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === "en";

  console.log("PostHog available:", !!posthog);

  const handleStartLearningClick = () => {
    // Track the button click event in PostHog
    const eventProperties = {
      location: "hero_section",
      source: "home_page",
    };

    console.log("Tracking event: start_learning_clicked", eventProperties);

    try {
      posthog.capture("start_learning_clicked", eventProperties);
      console.log("Event sent to PostHog");
    } catch (error) {
      console.error("PostHog event error:", error);
    }

    // Navigate to dashboard
    navigate("/dashboard");
  };

  return (
    <div className={`py-16 ${background("primary")}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-block rounded-full bg-[#dcdcdc] dark:bg-gray-700 px-4 py-1.5 text-sm font-medium text-gray-800 dark:text-gray-200 mb-6">
            {t("landing.hero.tagline")}
          </div>
          <h1 className={`text-5xl font-bold mb-6 ${text("primary")}`}>
            {t("landing.hero.title")}{" "}
            {isEnglish && (
              <span className="text-white bg-blue-700 dark:bg-blue-700 rounded-md px-2">
                Brief
              </span>
            )}
          </h1>
          <p className={`text-xl mb-8 max-w-2xl mx-auto ${text("tertiary")}`}>
            {t("landing.hero.subtitle")}
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            <button
              onClick={handleStartLearningClick}
              className="bg-blue-700 text-white px-8 py-3 rounded-lg text-[16px] font-medium hover:bg-blue-800 transition-colors dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              {t("landing.hero.startLearning")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
