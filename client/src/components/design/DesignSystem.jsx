
// Color Palette Component
const ColorPalette = ({ title, colors }) => (
  <div className="mb-8">
    <h3 className="text-lg font-semibold mb-4">{title}</h3>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Object.entries(colors).map(([name, value]) => (
        <div key={name} className="flex flex-col">
          <div
            className="h-16 rounded-md mb-2"
            style={{
              backgroundColor: typeof value === "string" ? value : "#000",
            }}
          ></div>
          <div className="text-sm font-medium">{name}</div>
          <div className="text-xs text-gray-500">
            {typeof value === "string" ? value : "Multiple values"}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Typography Component
const Typography = () => (
  <div className="mb-8">
    <h3 className="text-lg font-semibold mb-4">Typography</h3>
    <div className="space-y-4">
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-xs mb-1">text-xs</p>
        <p className="text-xs">The quick brown fox jumps over the lazy dog.</p>
      </div>
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm mb-1">text-sm</p>
        <p className="text-sm">The quick brown fox jumps over the lazy dog.</p>
      </div>
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-base mb-1">text-base</p>
        <p className="text-base">
          The quick brown fox jumps over the lazy dog.
        </p>
      </div>
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-lg mb-1">text-lg</p>
        <p className="text-lg">The quick brown fox jumps over the lazy dog.</p>
      </div>
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-xl mb-1">text-xl</p>
        <p className="text-xl">The quick brown fox jumps over the lazy dog.</p>
      </div>
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-2xl mb-1">text-2xl</p>
        <p className="text-2xl">The quick brown fox jumps over the lazy dog.</p>
      </div>
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-3xl mb-1">text-3xl</p>
        <p className="text-3xl">The quick brown fox jumps over the lazy dog.</p>
      </div>
    </div>
  </div>
);

// Spacing Component
const Spacing = () => (
  <div className="mb-8">
    <h3 className="text-lg font-semibold mb-4">Spacing</h3>
    <div className="space-y-4">
      {[1, 2, 4, 6, 8, 12, 16].map((size) => (
        <div key={size} className="flex items-center">
          <div
            className={`bg-brand-purple-100 h-8`}
            style={{ width: `${size * 0.25}rem` }}
          ></div>
          <p className="ml-4 text-sm">{`p-${size} (${size * 0.25}rem)`}</p>
        </div>
      ))}
    </div>
  </div>
);

// Shadows Component
const Shadows = () => (
  <div className="mb-8">
    <h3 className="text-lg font-semibold mb-4">Shadows</h3>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
      <div className="flex flex-col items-center">
        <div className="h-24 w-24 bg-white rounded-lg shadow-sm mb-2"></div>
        <p className="text-sm">shadow-sm</p>
      </div>
      <div className="flex flex-col items-center">
        <div className="h-24 w-24 bg-white rounded-lg shadow mb-2"></div>
        <p className="text-sm">shadow</p>
      </div>
      <div className="flex flex-col items-center">
        <div className="h-24 w-24 bg-white rounded-lg shadow-md mb-2"></div>
        <p className="text-sm">shadow-md</p>
      </div>
      <div className="flex flex-col items-center">
        <div className="h-24 w-24 bg-white rounded-lg shadow-lg mb-2"></div>
        <p className="text-sm">shadow-lg</p>
      </div>
      <div className="flex flex-col items-center">
        <div className="h-24 w-24 bg-white rounded-lg shadow-xl mb-2"></div>
        <p className="text-sm">shadow-xl</p>
      </div>
      <div className="flex flex-col items-center">
        <div className="h-24 w-24 bg-white rounded-lg shadow-2xl mb-2"></div>
        <p className="text-sm">shadow-2xl</p>
      </div>
    </div>
  </div>
);

// Buttons Component
const Buttons = () => (
  <div className="mb-8">
    <h3 className="text-lg font-semibold mb-4">Buttons</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-4">
        <h4 className="text-sm font-medium mb-2">Primary Buttons</h4>
        <div className="flex flex-wrap gap-4">
          <button className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
            Primary Button
          </button>
          <button className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium opacity-50 cursor-not-allowed">
            Disabled
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-medium mb-2">Secondary Buttons</h4>
        <div className="flex flex-wrap gap-4">
          <button className="px-4 py-2 text-black border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
            Secondary Button
          </button>
          <button className="px-4 py-2 text-gray-400 border border-gray-200 rounded-lg text-sm font-medium cursor-not-allowed">
            Disabled
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Cards Component
const Cards = () => (
  <div className="mb-8">
    <h3 className="text-lg font-semibold mb-4">Cards</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-2">Basic Card</h3>
        <p className="text-gray-500 text-sm">
          This is a simple card with a border.
        </p>
      </div>

      <div className="border border-gray-200 rounded-lg p-6 shadow-md">
        <h3 className="text-xl font-bold mb-2">Shadowed Card</h3>
        <p className="text-gray-500 text-sm">
          This is a card with a shadow for more depth.
        </p>
      </div>

      <div className="bg-brand-purple-100 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-2">Colored Card</h3>
        <p className="text-gray-700 text-sm">
          This is a card with a colored background.
        </p>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-brand-blue-100 p-4">
          <h3 className="text-lg font-bold">Card with Header</h3>
        </div>
        <div className="p-6">
          <p className="text-gray-500 text-sm">
            This is a card with a distinct header section.
          </p>
        </div>
      </div>
    </div>
  </div>
);

// Main DesignSystem Component
const DesignSystem = () => {
  // Color definitions
  const brandColors = {
    "brand-black": "#000000",
    "brand-white": "#FFFFFF",
    "brand-purple-100": "#f3e8ff",
    "brand-purple-600": "#9333ea",
    "brand-blue-100": "#dbeafe",
    "brand-blue-600": "#2563eb",
    "brand-green-100": "#dcfce7",
    "brand-green-600": "#16a34a",
  };

  const uiColors = {
    "ui-success": "#10b981",
    "ui-error": "#ef4444",
    "ui-warning": "#f59e0b",
    "ui-info": "#3b82f6",
  };

  const grayScaleColors = {
    "gray-50": "#f9fafb",
    "gray-100": "#f3f4f6",
    "gray-200": "#e5e7eb",
    "gray-300": "#d1d5db",
    "gray-400": "#9ca3af",
    "gray-500": "#6b7280",
    "gray-600": "#4b5563",
    "gray-700": "#374151",
    "gray-800": "#1f2937",
    "gray-900": "#111827",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-8">Design System</h1>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b">Colors</h2>
        <ColorPalette title="Brand Colors" colors={brandColors} />
        <ColorPalette title="UI Feedback Colors" colors={uiColors} />
        <ColorPalette title="Gray Scale" colors={grayScaleColors} />
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b">Typography</h2>
        <Typography />
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b">Spacing</h2>
        <Spacing />
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b">Shadows</h2>
        <Shadows />
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b">Components</h2>
        <Buttons />
        <Cards />
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b">Usage Guide</h2>
        <div className="prose max-w-none">
          <h3>How to Use This Design System</h3>
          <p className="mb-4">
            To ensure consistency across your project, refer to this design
            system when building new components. Use the established color
            variables, spacing, typography, and component patterns.
          </p>

          <h4>Example Usage:</h4>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <pre className="whitespace-pre-wrap text-sm">
              {`<!-- Using brand colors -->
<div className="bg-brand-purple-100 text-brand-purple-600">
  This uses our brand colors
</div>

<!-- Using text styles -->
<h2 className="text-2xl font-bold mb-4">
  This follows our typography system
</h2>

<!-- Using spacing -->
<div className="p-4 mb-6">
  This follows our spacing system
</div>`}
            </pre>
          </div>

          <h4>Best Practices:</h4>
          <ul className="list-disc pl-5 mb-4">
            <li>
              Always use the color variables instead of hardcoded hex values
            </li>
            <li>Maintain consistent spacing using the spacing system</li>
            <li>
              Follow the established component patterns when creating new
              elements
            </li>
            <li>Use the appropriate text sizes for different content types</li>
          </ul>
        </div>
      </section>
    </div>
  );
};

export default DesignSystem;
