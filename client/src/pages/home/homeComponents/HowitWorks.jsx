import { useTranslation } from "react-i18next";
import { background, text } from "../../../utils/themeUtils";
import { Lightbulb, Upload, PenLine } from "lucide-react";

const HowitWorks = () => {
  const { t } = useTranslation();

  const getTranslatedText = (key, defaultText) => {
    const translated = t(key);
    // Check if the translation failed and returned the key itself
    return translated === key ? defaultText : translated;
  };

  // Step data with icons
  const steps = [
    {
      id: 1,
      title: getTranslatedText(
        "landing.howItWorks.steps.upload.title",
        "Upload Your Notes"
      ),
      description: getTranslatedText(
        "landing.howItWorks.steps.upload.description",
        "Simply upload your lecture notes, slides, or any study material to get started."
      ),
      icon: Upload,
      schemaType: "UploadAction",
    },
    {
      id: 2,
      title: getTranslatedText(
        "landing.howItWorks.steps.analyze.title",
        "AI Processing"
      ),
      description: getTranslatedText(
        "landing.howItWorks.steps.analyze.description",
        "Our AI analyzes your content and extracts key concepts and important details."
      ),
      icon: Lightbulb,
      schemaType: "AnalyzeAction",
    },
    {
      id: 3,
      title: getTranslatedText(
        "landing.howItWorks.steps.study.title",
        "Study Smarter"
      ),
      description: getTranslatedText(
        "landing.howItWorks.steps.study.description",
        "Use the generated flashcards and summaries to review and master the material."
      ),
      icon: PenLine,
      schemaType: "LearnAction",
    },
  ];

  return (
    <section
      className={`py-10 md:py-16 ${background("primary")}`}
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
            {getTranslatedText("landing.howItWorks.title", "How It Works")}
          </h2>
          <p
            className={`text-base md:text-lg ${text("tertiary")}`}
            itemProp="description"
          >
            {getTranslatedText(
              "landing.howItWorks.subtitle",
              "Three simple steps to transform your study materials into effective learning tools."
            )}
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
            {getTranslatedText(
              "landing.howItWorks.conclusion",
              "Start using Brief today and experience a more efficient way to study."
            )}
          </p>
        </div>
      </div>
    </section>
  );
};

export default HowitWorks;
