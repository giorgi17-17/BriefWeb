const fs = require("fs");
const path = require("path");

// Base URL of your website
const BASE_URL = "https://yourwebsite.com";

// Supported languages
const LANGUAGES = ["en", "ka"]; // English and Georgian (add more as needed)

// Define the routes for your sitemap
// Each route has a path, changefreq, and priority
const routes = [
  { path: "/", changefreq: "weekly", priority: 1.0 },
  { path: "/login", changefreq: "monthly", priority: 0.8 },
  { path: "/register", changefreq: "monthly", priority: 0.8 },
  // Public pages
  { path: "/lectures", changefreq: "daily", priority: 0.9 },
  // Exclude authenticated/private routes from sitemap
];

// Generate the sitemap XML content
function generateSitemap() {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

  // Add each route to the sitemap with language alternates
  routes.forEach((route) => {
    // For each route, create entries for each language
    LANGUAGES.forEach((lang) => {
      const langPath = lang === "en" ? route.path : `/${lang}${route.path}`;

      xml += "  <url>\n";
      xml += `    <loc>${BASE_URL}${langPath}</loc>\n`;
      xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
      xml += `    <priority>${route.priority}</priority>\n`;

      // Add hreflang alternate links for all languages
      LANGUAGES.forEach((alternateLang) => {
        const alternatePath =
          alternateLang === "en"
            ? route.path
            : `/${alternateLang}${route.path}`;
        xml += `    <xhtml:link rel="alternate" hreflang="${alternateLang}" href="${BASE_URL}${alternatePath}" />\n`;
      });

      // Add x-default hreflang (usually points to English)
      xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}${route.path}" />\n`;

      xml += "  </url>\n";
    });
  });

  xml += "</urlset>";
  return xml;
}

// Write the sitemap to a file
function writeSitemap() {
  const sitemap = generateSitemap();
  const publicDir = path.resolve(__dirname, "../public");

  // Create public directory if it doesn't exist
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Write the sitemap to a file
  fs.writeFileSync(path.resolve(publicDir, "sitemap.xml"), sitemap);

  console.log("Multilingual sitemap generated successfully!");
}

// Run the function
writeSitemap();
