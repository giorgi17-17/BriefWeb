import { useTranslation } from "react-i18next";

const WhyUs = () => {
  const { t } = useTranslation();

  // Define benefits data with schema types
  const benefits = [
    {
      id: "save-time",
      title: t("landing.whyUs.saveTime.title"),
      description: t("landing.whyUs.saveTime.description"),
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="theme-text-secondary"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      ),
      schemaType: "TimeManagementBenefit",
    },
    {
      id: "improve-grades",
      title: t("landing.whyUs.grades.title"),
      description: t("landing.whyUs.grades.description"),
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="theme-text-secondary"
          aria-hidden="true"
        >
          <path d="M20.91 8.84 8.56 2.23a1.93 1.93 0 0 0-1.81 0L3.1 4.13a2.12 2.12 0 0 0-.05 3.69l12.22 6.93a2 2 0 0 0 1.94 0L21 12.51a2.12 2.12 0 0 0-.09-3.67Z"></path>
          <path d="m3.09 8.84 12.35-6.61a1.93 1.93 0 0 1 1.81 0l3.65 1.9a2.12 2.12 0 0 1 .1 3.69L8.73 14.75a2 2 0 0 1-1.94 0L3 12.51a2.12 2.12 0 0 1 .09-3.67Z"></path>
          <line x1="12" y1="22" x2="12" y2="13"></line>
          <path d="M20 13.5v3.37a2.06 2.06 0 0 1-1.11 1.83l-6 3.08a1.93 1.93 0 0 1-1.78 0l-6-3.08A2.06 2.06 0 0 1 4 16.87V13.5"></path>
        </svg>
      ),
      schemaType: "AcademicPerformanceBenefit",
    },
    {
      id: "study-smarter",
      title: t("landing.whyUs.smarter.title"),
      description: t("landing.whyUs.smarter.description"),
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="theme-text-secondary"
          aria-hidden="true"
        >
          <path d="M15.5 9.5 12 12l-5.5 4 1.5 3h10l1.5-3-4-6.5"></path>
          <path d="M20.5 16a2.5 2.5 0 0 1-5 0"></path>
          <path d="M14.5 8.5c-.6-1.1-1.5-2-2.5-2.5"></path>
          <path d="M8.5 8.5c.6-1.1 1.5-2 2.5-2.5"></path>
          <path d="M6 10a2 2 0 0 0-2 2c0 1.1.9 2 2 2 1.1 0 2-.9 2-2a2 2 0 0 0-2-2z"></path>
          <path d="M18 10a2 2 0 0 0-2 2c0 1.1.9 2 2 2 1.1 0 2-.9 2-2a2 2 0 0 0-2-2z"></path>
        </svg>
      ),
      schemaType: "LearningEfficiencyBenefit",
    },
  ];

  return (
    <section
      className="py-20 theme-bg-primary"
      id="why-us"
      itemScope
      itemType="https://schema.org/ItemList"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="text-center mb-8">
          <p className="text-sm uppercase tracking-wider mb-2 theme-text-tertiary">
            {t("landing.whyUs.tagline")}
          </p>
          <h2 className="text-3xl font-bold theme-text-primary" itemProp="name">
            {t("landing.whyUs.title")}
          </h2>
          <p
            className="mt-4 max-w-2xl mx-auto theme-text-tertiary"
            itemProp="description"
          >
            {t("landing.whyUs.subtitle")}
          </p>
        </header>

        <div className="grid md:grid-cols-3 gap-16 mt-16">
          {benefits.map((benefit, index) => (
            <div
              key={benefit.id}
              className="flex flex-col items-start"
              itemScope
              itemType="https://schema.org/Thing"
              itemProp="itemListElement"
            >
              <meta itemProp="position" content={String(index + 1)} />
              <div className="flex mb-5">
                <div className="rounded-full w-12 h-12 flex items-center justify-center theme-bg-tertiary">
                  {benefit.icon}
                </div>
              </div>
              <h3
                className="text-xl font-bold mb-3 theme-text-primary"
                itemProp="name"
              >
                {benefit.title}
              </h3>
              <p className="text-sm theme-text-tertiary" itemProp="description">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <p className="text-sm theme-text-tertiary">
            {t("landing.whyUs.joinOthers")}
          </p>
        </div>
      </div>
    </section>
  );
};

export default WhyUs;
