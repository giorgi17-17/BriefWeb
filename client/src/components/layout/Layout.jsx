import PropTypes from "prop-types";
import Header from "../Header/Header";
import Footer from "./Footer";
import SEO from "../SEO/SEO";

const Layout = ({
  children,
  title = "",
  description = "",
  keywords = [],
  ogImage = "",
  structuredData = null,
  noIndex = false,
}) => {
  // Default SEO values for the site
  const defaultDescription =
    "Brief - Educational platform for students providing concise learning materials and quizzes";
  const defaultKeywords = [
    "education",
    "learning platform",
    "student resources",
    "study materials",
    "online learning",
  ];

  // Merge default and custom values
  const finalDescription = description || defaultDescription;
  const finalKeywords = [...defaultKeywords, ...keywords];

  return (
    <div className="min-h-screen w-full theme-bg-primary flex flex-col">
      <SEO
        title={title}
        description={finalDescription}
        keywords={finalKeywords}
        ogImage={ogImage}
        structuredData={structuredData}
        noIndex={noIndex}
      />
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">{children}</main>
      <Footer />
    </div>
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
  description: PropTypes.string,
  keywords: PropTypes.arrayOf(PropTypes.string),
  ogImage: PropTypes.string,
  structuredData: PropTypes.object,
  noIndex: PropTypes.bool,
};

export default Layout;
