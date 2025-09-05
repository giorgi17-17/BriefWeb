import { useTranslation } from "react-i18next";
import Footer from "../../components/layout/Footer";
import Hero from "./homeComponents/Hero";
import HowitWorks from "./homeComponents/HowitWorks";
import WhyUs from "./homeComponents/WhyUs";
import Pricing from "./homeComponents/Pricing";
import { background, text, border } from "../../utils/themeUtils";
import SEO from "../../components/SEO/SEO";
import { getLocalizedSeoField } from "../../utils/seoTranslations";
import { useLocation } from "react-router-dom";
import { getCanonicalUrl } from "../../utils/languageSeo";

export const Home = () => {
  // const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const currentLang = i18n.language;

  // Get localized SEO content
  const title = getLocalizedSeoField("home", "title", currentLang);
  const description = getLocalizedSeoField("home", "description", currentLang);
  const keywords = getLocalizedSeoField("home", "keywords", currentLang);

  // Get canonical URL
  const canonicalUrl = getCanonicalUrl(location.pathname, currentLang);

  // Landing page specific FAQ structured data
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is Brief?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Brief is an AI-powered educational platform for students providing smart study tools, including AI flashcards, concise learning materials, quizzes, and effective study resources for personalized learning.",
        },
      },
      {
        "@type": "Question",
        name: "How does Brief help with studying?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Brief helps students by offering AI-generated flashcards, summarized lecture notes, and interactive quizzes to enhance learning efficiency. Our digital learning assistant transforms your study techniques and improves your studying experience through personalized AI education tools.",
        },
      },
      {
        "@type": "Question",
        name: "Can Brief improve my study methods?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, Brief uses educational AI to analyze your learning patterns and provide personalized study methods. Our smart learning tools help you study more efficiently, retain information better, and achieve higher grades through effective studying techniques.",
        },
      },
      {
        "@type": "Question",
        name: "Is Brief available in multiple languages?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, Brief is available in multiple languages including English and Georgian, with more languages coming soon. This ensures our AI study assistant is accessible to students worldwide.",
        },
      },
    ],
  };

  // Main organization structured data
  const organizationStructuredData = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "Brief",
    description: description,
    url: canonicalUrl,
    sameAs: [
      "https://twitter.com/yourhandle",
      "https://facebook.com/yourpage",
      "https://linkedin.com/company/yourcompany",
    ],
    offers: {
      "@type": "Offer",
      category: "Educational Resources",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
    },
  };

  // WebSite structured data for landing page
  const websiteStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: canonicalUrl.split("/").slice(0, 3).join("/"),
    potentialAction: {
      "@type": "SearchAction",
      target: `${canonicalUrl
        .split("/")
        .slice(0, 3)
        .join("/")}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div>
      <SEO
        title={title}
        description={description}
        keywords={keywords}
        structuredData={organizationStructuredData}
        canonicalUrl={canonicalUrl}
        ogImage="/images/brief-preview.jpg"
        ogType="website"
      >
        <script type="application/ld+json">
          {JSON.stringify(faqStructuredData)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(websiteStructuredData)}
        </script>
        <meta name="twitter:site" content="@briefeducation" />
        <meta name="twitter:creator" content="@briefeducation" />
        <meta property="og:site_name" content="Brief Education" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </SEO>

      {/* Hero Section for Students */}
      <Hero />

      {/* How It Works Section */}
      <div id="how-it-works">
        <HowitWorks />
      </div>

      {/* Benefits Section */}
      <div id="why-us">
        <WhyUs />
      </div>

      {/* Pricing Section */}
      <div id="pricing">
        <Pricing />
      </div>

      {/* Final CTA Section */}
      {/* <div className="py-16 bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">{t("landing.cta.title")}</h2>
          <p className="text-lg mb-8 opacity-90">{t("landing.cta.subtitle")}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-white text-black px-8 py-3 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors dark:bg-gray-200 dark:hover:bg-gray-300"
          >
            {t("landing.cta.button")}
          </button>
        </div>
      </div> */}

      {/* Stay Updated Section */}
      <div className={`py-16 ${background("primary")}`}>
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className={`text-2xl font-bold mb-4 ${text("primary")}`}>
            {t("landing.newsletter.title")}
          </h2>
          <p className={`mb-6 text-sm ${text("tertiary")}`}>
            {t("landing.newsletter.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
            <input
              type="email"
              placeholder={t("landing.newsletter.placeholder")}
              className={`px-4 py-2 flex-grow border rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-sm ${border(
                "primary"
              )} ${background("primary")} ${text("primary")}`}
            />
            <button className="px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors whitespace-nowrap text-sm dark:bg-gray-700 dark:hover:bg-gray-600">
              {t("landing.newsletter.button")}
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};
