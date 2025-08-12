import { useTranslation } from "react-i18next";
import { background, text } from "../../../utils/themeUtils";
import { Lightbulb, Upload, PenLine } from "lucide-react";

const HowitWorks = () => {
  const { t } = useTranslation();

  // Step data with icons
  const steps = [
    {
      id: 1,
      title: t("landing.howItWorks.steps.upload.title"),
      description: t("landing.howItWorks.steps.upload.description"),
      icon: Upload,
      schemaType: "UploadAction",
    },
    {
      id: 2,
      title: t("landing.howItWorks.steps.analyze.title"),
      description: t("landing.howItWorks.steps.analyze.description"),
      icon: Lightbulb,
      schemaType: "AnalyzeAction",
    },
    {
      id: 3,
      title: t("landing.howItWorks.steps.study.title"),
      description: t("landing.howItWorks.steps.study.description"),
      icon: PenLine,
      schemaType: "LearnAction",
    },
  ];

  return (
    <section
      className={`mt-12 md:mt-20 py-10 md:py-16 ${background("primary")}`}
      itemScope
      itemType="https://schema.org/HowTo"
      id="how-it-works"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="text-center max-w-3xl mx-auto mb-8 md:mb-16">
          <h2
            className={`text-2xl md:text-3xl font-bold mb-4 md:mb-6 ${text(
              "primary"
            )}`}
            itemProp="name"
          >
            {t("landing.howItWorks.title")}
          </h2>
          <p
            className={`text-base md:text-lg ${text("tertiary")}`}
            itemProp="description"
          >
            {t("landing.howItWorks.subtitle")}
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-12">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex flex-col items-center text-center theme-card p-6 md:p-8 rounded-xl shadow-sm ${background(
                "secondary"
              )} hover:shadow-md transition-shadow duration-300 mb-4 sm:mb-0`}
              itemProp="step"
              itemScope
              itemType={`https://schema.org/${step.schemaType}`}
            >
              <meta itemProp="position" content={step.id.toString()} />
              <div className="mb-4 p-3 rounded-full bg-blue-600 dark:bg-blue-800 text-white">
                <step.icon className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <h3
                className={`text-lg md:text-xl font-semibold mb-2 md:mb-3 ${text(
                  "primary"
                )}`}
                itemProp="name"
              >
                {step.title}
              </h3>
              <p
                className={`text-sm md:text-base ${text("tertiary")}`}
                itemProp="text"
              >
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 md:mt-16 text-center">
          <p className={`text-base md:text-lg mb-4 ${text("secondary")}`}>
            {t("landing.howItWorks.conclusion")}
          </p>
        </div>
      </div>
    </section>
  );
};

export default HowitWorks;
