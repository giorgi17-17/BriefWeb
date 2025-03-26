# Multilingual SEO Implementation Guide

This document outlines the multilingual SEO implementation for the Brief educational platform.

## Overview

The Brief platform supports multiple languages (currently English and Georgian, with plans to add more). This guide explains how SEO is implemented to optimize for search engines across all supported languages.

## Key Components

### 1. Language-Specific SEO Component

The SEO component (`src/components/SEO/SEO.jsx`) has been enhanced to support:

- Language-specific metadata
- Hreflang annotations for all language variants
- Canonical URLs with language prefixes
- Language-specific structured data

### 2. Localization Utilities

Multiple utilities help manage multilingual SEO:

- `src/utils/languageSeo.js`: Functions for generating language-specific SEO elements
- `src/utils/seoTranslations.js`: Content translations for SEO metadata across languages

### 3. Multilingual Sitemap

A multilingual sitemap is generated (`scripts/generate-sitemap.cjs`) with:

- Language-specific URLs
- Hreflang annotations for all language variants
- x-default annotations for search engines

## Implementation Details

### URL Structure

- English (default): `https://yourwebsite.com/page-name`
- Other languages: `https://yourwebsite.com/{language-code}/page-name`

### Hreflang Annotations

Each page includes alternate language links:

```html
<link rel="alternate" hreflang="en" href="https://yourwebsite.com/page-name" />
<link
  rel="alternate"
  hreflang="ka"
  href="https://yourwebsite.com/ka/page-name"
/>
<link
  rel="alternate"
  hreflang="x-default"
  href="https://yourwebsite.com/page-name"
/>
```

### Content Translation

SEO metadata is translated using the `seoTranslations` object:

```javascript
// Example from seoTranslations.js
export const seoTranslations = {
  home: {
    title: {
      en: "Brief - Educational Platform for Students",
      ka: "Brief - საგანმანათლებლო პლატფორმა სტუდენტებისთვის",
    },
    // other translations...
  },
};
```

## Landing Page SEO

The homepage/landing page has special SEO optimizations:

### Multiple Structured Data Elements

The landing page includes multiple structured data elements:

1. **Organization Schema**: Information about Brief as an educational organization

   ```javascript
   {
     "@context": "https://schema.org",
     "@type": "EducationalOrganization",
     "name": "Brief",
     "description": "...",
     // Additional properties
   }
   ```

2. **Website Schema**: Website search functionality and URL information

   ```javascript
   {
     "@context": "https://schema.org",
     "@type": "WebSite",
     "url": "https://yourwebsite.com",
     "potentialAction": {
       "@type": "SearchAction",
       "target": "https://yourwebsite.com/search?q={search_term_string}",
       "query-input": "required name=search_term_string"
     }
   }
   ```

3. **FAQ Schema**: Frequently asked questions that appear in Google search results
   ```javascript
   {
     "@context": "https://schema.org",
     "@type": "FAQPage",
     "mainEntity": [
       {
         "@type": "Question",
         "name": "What is Brief?",
         "acceptedAnswer": {
           "@type": "Answer",
           "text": "..."
         }
       },
       // Additional FAQs
     ]
   }
   ```

### Enhanced Meta Tags

The landing page has additional meta tags for social media and SEO:

- Twitter specific tags:

  ```html
  <meta name="twitter:site" content="@briefeducation" />
  <meta name="twitter:creator" content="@briefeducation" />
  ```

- Open Graph site name:

  ```html
  <meta property="og:site_name" content="Brief Education" />
  ```

- Performance optimization tags:
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin="anonymous"
  />
  ```

### Social Media Sharing Image

A dedicated image optimized for social media sharing:

- Location: `/public/images/brief-preview.jpg`
- Size: Optimized for sharing (1200×630 pixels)
- Usage: Referenced in `ogImage` prop in the SEO component

### Expanded Keywords

The landing page includes additional keywords specifically related to:

- Educational technology terminology
- Learning process terms
- Product-specific features

### Verification Files

For search engine verification, these files can be added to the `public` directory:

- Google Search Console: `google[verification-code].html`
- Bing Webmaster Tools: `BingSiteAuth.xml`
- Yandex Webmaster: `yandex_[verification-code].html`

## Usage Guide

### Basic Page Implementation

```jsx
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import SEO from "../../components/SEO/SEO";
import { getLocalizedSeoField } from "../../utils/seoTranslations";
import { getCanonicalUrl } from "../../utils/languageSeo";

const YourPage = () => {
  const location = useLocation();
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  // Get localized SEO content
  const title = getLocalizedSeoField("pageName", "title", currentLang);
  const description = getLocalizedSeoField(
    "pageName",
    "description",
    currentLang
  );
  const keywords = getLocalizedSeoField("pageName", "keywords", currentLang);

  // Get canonical URL
  const canonicalUrl = getCanonicalUrl(location.pathname, currentLang);

  return (
    <>
      <SEO
        title={title}
        description={description}
        keywords={keywords}
        canonicalUrl={canonicalUrl}
      />
      {/* Page content */}
    </>
  );
};
```

### Adding a New Language

1. Update supported languages in `languageSeo.js`:

   ```javascript
   const SUPPORTED_LANGUAGES = ["en", "ka", "fr"]; // Added French
   ```

2. Add translations in `seoTranslations.js`:

   ```javascript
   home: {
     title: {
       en: "Brief - Educational Platform for Students",
       ka: "Brief - საგანმანათლებლო პლატფორმა სტუდენტებისთვის",
       fr: "Brief - Plateforme éducative pour étudiants"
     },
     // Add translations for all fields
   }
   ```

3. Update the sitemap generator to include the new language:
   ```javascript
   const LANGUAGES = ["en", "ka", "fr"]; // Added French
   ```

## Best Practices

1. **Always use hreflang annotations**: Ensure all pages have proper language annotations
2. **Translate all metadata**: Title, description, and keywords should be translated for all pages
3. **Use language-specific canonical URLs**: Point to the correct language version
4. **Translate structured data**: Schema.org data should be localized
5. **Keep URL structures consistent**: Use the same path patterns across languages
6. **Use x-default**: Help search engines identify the default language version

## Testing Multilingual SEO

Use these tools to validate your implementation:

- Google Search Console (International Targeting)
- hreflang Testing Tool (https://technicalseo.com/tools/hreflang/)
- Structured Data Testing Tool (https://search.google.com/structured-data/testing-tool/)

## Maintenance

The sitemap is automatically generated during the build process. To manually update:

```bash
npm run generate-sitemap
```
