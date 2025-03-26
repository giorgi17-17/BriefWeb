# Brief Educational Platform SEO Implementation

This document outlines the SEO (Search Engine Optimization) implementation for the Brief educational platform.

## Components and Files

### SEO Component (`components/SEO/SEO.jsx`)

A reusable React component using `react-helmet-async` to manage document head metadata. This component accepts various props to customize SEO settings for each page:

- `title`: Page title (appended with site name)
- `description`: Meta description
- `keywords`: Array of keywords
- `ogImage`: Social media image URL
- `ogType`: Open Graph content type
- `canonicalUrl`: Canonical URL
- `noIndex`: Boolean to control indexing
- `structuredData`: JSON-LD structured data
- `children`: Additional head elements

### Layout Component (`components/layout/Layout.jsx`)

A wrapper component that includes the SEO component with default settings, Header, and Footer.

### Site-wide SEO Files

- `public/sitemap.xml`: XML sitemap for search engines
- `public/robots.txt`: Controls crawler behavior
- `public/manifest.json`: PWA manifest with site metadata
- `scripts/generate-sitemap.cjs`: Script to generate sitemap dynamically

## Implementation Details

### Meta Tags

Each page includes:

- Title and description
- Open Graph tags for social sharing
- Twitter card metadata
- Viewport and charset settings
- Theme color

### Structured Data

JSON-LD structured data is included for:

- Organization information
- Course content
- Learning resources
- Web pages

### Technical SEO

- Canonical URLs to prevent duplicate content
- Robots meta tags to control indexing
- Sitemap generation script integrated with build process
- Dynamic metadata based on page content

## Usage Guide

### Basic Page SEO

```jsx
import SEO from "../../components/SEO/SEO";

const YourPage = () => {
  return (
    <>
      <SEO
        title="Page Title"
        description="Page description for search engines"
        keywords={["keyword1", "keyword2"]}
      />
      {/* Page content */}
    </>
  );
};
```

### Using Layout Component

```jsx
import Layout from "../../components/layout/Layout";

const YourPage = () => {
  return (
    <Layout
      title="Page Title"
      description="Page description for search engines"
    >
      {/* Page content */}
    </Layout>
  );
};
```

### Adding Structured Data

```jsx
const structuredData = {
  "@context": "https://schema.org",
  "@type": "Course",
  name: "Course Name",
  description: "Course description",
  provider: {
    "@type": "Organization",
    name: "Brief",
    sameAs: "https://yourwebsite.com",
  },
};

<SEO title="Course Page" structuredData={structuredData} />;
```

## Maintenance

To update the sitemap:

```bash
npm run generate-sitemap
```

The sitemap is automatically generated during the build process (`npm run build`).
