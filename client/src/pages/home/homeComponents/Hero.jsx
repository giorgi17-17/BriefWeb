import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { background, text } from "../../../utils/themeUtils";
import { usePostHog } from "posthog-js/react";
import { useAuth } from "../../../utils/authHooks";
import { ArrowRight } from "lucide-react";

const Hero = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const posthog = usePostHog();
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === "en";

  const handleStartLearningClick = () => {
    const eventProperties = { location: "hero_section", source: "home_page" };
    try {
      posthog.capture("start_learning_clicked", eventProperties);
    } catch (error) {
      // Non-blocking: analytics failure should not break navigation
      console.warn("PostHog capture failed", error);
    }

    if (user) navigate("/dashboard");
    else navigate("/register");
  };

  // Accent the last word (English only) with a gradient text
  const titleText = t("landing.hero.title");
  let titleContent;
  if (isEnglish) {
    const words = titleText.split(" ");
    const last = words.pop();
    const rest = words.join(" ");
    titleContent = (
      <>
        {rest}{" "}
        <span className="bg-gradient-to-r from-blue-600 via-green-500 to-blue-600 bg-clip-text text-transparent">
          {last}
        </span>
      </>
    );
  } else titleContent = titleText;

  return (
    <section
      className={`min-h-[calc(100svh-4rem)] flex items-stretch -mt-8 -mb-8 ${background(
        "primary"
      )}`}
      itemScope
      itemType="https://schema.org/WelcomeAction"
    >
      <div className="w-full">
        {/* Glow container inspired by the reference, full-width and without border */}
        <div className="relative isolate overflow-hidden rounded-none sm:rounded-3xl bg-gradient-to-br from-white/70 to-white/10 dark:from-transparent dark:to-transparent px-4 sm:px-8 md:px-12 min-h-full flex items-center">
          {/* Colored glows */}
          <div className="pointer-events-none absolute -top-40 right-[-5%] h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.6),transparent_70%)] blur-[120px] dark:opacity-80" />
          <div className="pointer-events-none absolute -bottom-40 left-[-5%] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.55),transparent_72%)] blur-[120px] dark:opacity-80" />

          {/* Neutral overlays to preserve original background in TL and BR */}
          <div
            className="pointer-events-none absolute -top-40 -left-40 h-[36rem] w-[36rem] rounded-3xl blur-[100px]"
            style={{
              background:
                "linear-gradient(135deg, var(--background) 0%, rgba(0,0,0,0) 65%)",
            }}
          />
          <div
            className="pointer-events-none absolute -bottom-40 -right-40 h-[38rem] w-[38rem] rounded-3xl blur-[100px]"
            style={{
              background:
                "linear-gradient(315deg, var(--background) 0%, rgba(0,0,0,0) 68%)",
            }}
          />

          <header className="relative text-center max-w-5xl mx-auto px-4 sm:px-6 flex flex-col items-center space-y-10 md:space-y-16">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-gray-900 dark:text-white backdrop-blur-sm bg-gray-100 dark:bg-white/10 ring-1 ring-black/5 dark:ring-white/10">
              <span className="inline-block " />
              {t("landing.hero.tagline")}
            </div>

            <h1
              className={`text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight ${text(
                "primary"
              )}`}
              itemProp="name"
            >
              {titleContent}
            </h1>

            <p
              className={`text-base sm:text-lg md:text-xl max-w-2xl mx-auto ${text(
                "tertiary"
              )}`}
              itemProp="description"
            >
              {t("landing.hero.subtitle")}
            </p>

            <div
              className="flex flex-wrap justify-center gap-5 md:gap-8"
              itemProp="potentialAction"
              itemScope
              itemType="https://schema.org/StartAction"
            >
              <button
                onClick={handleStartLearningClick}
                className="group inline-flex items-center gap-2 rounded-full bg-blue-700 text-white px-8 py-3.5 text-sm md:text-base font-medium shadow-sm hover:bg-blue-800 transition-colors dark:bg-blue-700 dark:hover:bg-blue-600"
              >
                {user
                  ? t("landing.hero.continueLearning")
                  : t("landing.hero.startLearning")}
                <ArrowRight
                  className="size-4 md:size-5 opacity-90 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                  strokeWidth={2.2}
                />
              </button>
            </div>
          </header>
        </div>
      </div>
    </section>
  );
};

export default Hero;
