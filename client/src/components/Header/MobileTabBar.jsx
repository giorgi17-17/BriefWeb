import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
import PropTypes from "prop-types";

// ⬇️ use the hook from your ThemeContext file
import { useTheme } from "../../contexts/ThemeContext"; // adjust the path

export default function MobileTabBar({
  items = [],
  onPlus,
  activeTab,
  setActiveTab,
  isGenerating = false,
  activeLocation = "/", // "/" (default nav) or "/subjects" (subjects nav)
}) {
  const location = useLocation();
  const path = location.pathname || "/";

  // ✅ read only the theme (no toggle here)
  const { theme } = useTheme();

  const isInSubjects = path === "/subjects" || path.startsWith("/subjects/");

  const shouldRenderFor = (loc) => {
    if (loc === "/subjects") return isInSubjects;
    if (loc === "/") return !isInSubjects; // fallback scope
    return path === loc || path.startsWith(`${loc.replace(/\/+$/, "")}/`);
  };

  if (!shouldRenderFor(activeLocation)) return null;

  const isActiveRoute = (to) =>
    path === to || path.startsWith(`${to.replace(/\/+$/, "")}/`);

  const isActiveTab = (key) => activeTab === key;

  const renderItem = (item) => {
    const { label, icon: Icon, mode, to, key } = item;
    const isActive = mode === "navigate" ? isActiveRoute(to || "") : isActiveTab(key);

    const commonClasses = "flex flex-col items-center gap-1 px-2 py-1 min-w-16";
    const iconClasses = isActive
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-zinc-600 dark:text-zinc-400";
    const textClasses = [
      "text-[11px]",
      isActive ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-700 dark:text-zinc-400",
      mode === "tab" && isGenerating ? "opacity-60" : "",
    ].join(" ");

    if (mode === "navigate") {
      return (
        <Link key={`nav-${label}`} to={to} className={commonClasses}>
          <Icon size={22} className={iconClasses} />
          <span className={textClasses}>{label}</span>
        </Link>
      );
    }

    if (mode === "tab") {
      return (
        <button
          key={`tab-${key}`}
          type="button"
          role="tab"
          aria-selected={isActive}
          disabled={isGenerating}
          onClick={() => !isGenerating && setActiveTab && setActiveTab(key)}
          className={commonClasses}
        >
          <Icon size={22} className={iconClasses} />
          <span className={textClasses}>{label}</span>
        </button>
      );
    }

    return null;
  };

  const hasFloatingPlus = Boolean(onPlus);
  const leftItems = items.slice(0, 2);
  const rightItems = items.slice(2);

  return (
    <nav
      data-theme={theme} // 👈 optional but useful for non-Tailwind CSS or testing
      className="
        md:hidden
        fixed left-1/2 -translate-x-1/2
        bottom-[calc(12px+env(safe-area-inset-bottom,0))]
        w-[min(720px,calc(100%-16px))]
        rounded-3xl
        bg-white/90 dark:bg-neutral-900/90
        border border-black/5 dark:border-white/10
        backdrop-blur
        px-4 py-2
        shadow-lg dark:shadow-black/30
        z-[60]
      "
      aria-label={`Bottom navigation (${theme} mode)`}
      role="tablist"
    >
      <div className={`${hasFloatingPlus ? "relative " : ""}flex items-center justify-between`}>
        {hasFloatingPlus ? (
          <>
            {leftItems.map(renderItem)}

            <button
              onClick={onPlus}
              aria-label="Create"
              type="button"
              className="
                absolute left-1/2 -translate-x-1/2 -top-6
                h-14 w-14 rounded-full grid place-items-center
                bg-emerald-600 hover:bg-emerald-700 text-white
                dark:bg-emerald-500 dark:hover:bg-emerald-600
                shadow-[0_8px_24px_rgba(16,185,129,0.35)]
                dark:shadow-[0_8px_24px_rgba(16,185,129,0.25)]
                ring-1 ring-emerald-700/20 dark:ring-emerald-300/20
              "
            >
              <Plus size={28} />
            </button>

            {rightItems.map(renderItem)}
          </>
        ) : (
          items.map(renderItem)
        )}
      </div>

      <div className="pointer-events-none mt-2 flex justify-center">
        <div className="h-1.5 w-24 rounded-full bg-black/20 dark:bg-white/30" />
      </div>
    </nav>
  );
}

MobileTabBar.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      icon: PropTypes.elementType.isRequired,
      mode: PropTypes.oneOf(["navigate", "tab"]).isRequired,
      to: PropTypes.string,
      key: PropTypes.string,
    })
  ),
  onPlus: PropTypes.func,
  activeTab: PropTypes.string,
  setActiveTab: PropTypes.func,
  isGenerating: PropTypes.bool,
  activeLocation: PropTypes.string,
};

MobileTabBar.defaultProps = {
  items: [],
  onPlus: undefined,
  activeTab: undefined,
  setActiveTab: undefined,
  isGenerating: false,
  activeLocation: "/",
};
