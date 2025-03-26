import { Helmet } from "react-helmet-async";
import PropTypes from "prop-types";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getAlternateLanguages } from "../../utils/languageSeo";

const SEO = ({
  title,
  description,
  keywords = [],
  ogImage = "",
  ogType = "website",
  canonicalUrl = "",
  noIndex = false,
  structuredData = null,
  alternateLanguages = [],
  children,
}) => {
  const location = useLocation();
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  // Base site title that will be appended to all page titles
  const siteTitle = "Brief - Educational Platform for Students";
  const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;

  // Generate hreflang links if not provided
  const hreflangLinks =
    alternateLanguages.length > 0
      ? alternateLanguages
      : getAlternateLanguages(location.pathname, currentLang);

  return (
    <Helmet>
      {/* Basic SEO tags */}
      <html lang={currentLang} />
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(", ")} />
      )}

      {/* Canonical URL */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Alternate language versions */}
      {hreflangLinks.map((link) => (
        <link
          key={link.lang}
          rel="alternate"
          hrefLang={link.lang}
          href={link.url}
        />
      ))}
      {/* x-default hreflang for search engines */}
      <link
        rel="alternate"
        hrefLang="x-default"
        href={
          hreflangLinks.find((link) => link.lang === "en")?.url ||
          hreflangLinks[0]?.url
        }
      />

      {/* Robots meta tag */}
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}

      {/* Open Graph / Facebook */}
      <meta property="og:locale" content={currentLang} />
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      {ogImage && <meta property="og:image" content={ogImage} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      {ogImage && <meta name="twitter:image" content={ogImage} />}

      {/* Structured data for rich results */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}

      {/* Add any additional head elements */}
      {children}
    </Helmet>
  );
};

SEO.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  keywords: PropTypes.arrayOf(PropTypes.string),
  ogImage: PropTypes.string,
  ogType: PropTypes.string,
  canonicalUrl: PropTypes.string,
  noIndex: PropTypes.bool,
  structuredData: PropTypes.object,
  alternateLanguages: PropTypes.arrayOf(
    PropTypes.shape({
      lang: PropTypes.string.isRequired,
      url: PropTypes.string.isRequired,
    })
  ),
  children: PropTypes.node,
};

export default SEO;
