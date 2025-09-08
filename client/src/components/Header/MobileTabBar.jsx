import { Link, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";

const MobileTabBar = ({
  items = [],
  onPlus,
  activeTab,
  setActiveTab,
  isGenerating = false,
  activeLocation = "/", // "/" (default nav) or "/subjects" (subjects nav)
}) => {
  const location = useLocation();
  const path = location.pathname || "/";

  const isInSubjects = path === "/subjects" || path.startsWith("/subjects/");

  const shouldRenderFor = (loc) => {
    if (loc === "/subjects") return isInSubjects;
    if (loc === "/") return !isInSubjects; // fallback scope
    // generic prefix match
    return path === loc || path.startsWith(`${loc.replace(/\/+$/, "")}/`);
  };

  if (!shouldRenderFor(activeLocation)) return null;

  // For navigation-mode items
  const isActiveRoute = (to) =>
    path === to || path.startsWith(`${to.replace(/\/+$/, "")}/`);

  // For tab-mode items
  const isActiveTab = (key) => activeTab === key;

  const renderItem = (item) => {
    const { label, icon: Icon, mode, to, key } = item;
    const isActive = mode === "navigate" ? isActiveRoute(to) : isActiveTab(key);

    const commonClasses = "flex flex-col items-center gap-1 px-2 py-1 min-w-16";
    const iconClasses = isActive ? "text-emerald-400" : "text-zinc-400";
    const textClasses = `text-[11px] ${isActive ? "text-emerald-400" : "text-zinc-400"
      } ${mode === "tab" && isGenerating ? "opacity-60" : ""}`;

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

  // Split items for the floating plus
  const hasFloatingPlus = Boolean(onPlus);
  const leftItems = items.slice(0, 2);
  const rightItems = items.slice(2);

  return (
    <nav
      className="
        md:hidden
        fixed left-1/2 -translate-x-1/2
        bottom-[calc(12px+env(safe-area-inset-bottom,0))]
        w-[min(720px,calc(100%-16px))]
        rounded-3xl
        bg-[#0E1726]/95 dark:bg-[#0B1220]/95
        border border-white/10
        backdrop-blur
        px-4 py-2
        z-[60]
      "
      aria-label="Bottom navigation"
      role="tablist"
    >
      <div
        className={`${hasFloatingPlus ? "relative " : ""}flex items-center justify-between`}
      >
        {hasFloatingPlus ? (
          <>
            {/* left items */}
            {leftItems.map(renderItem)}

            {/* center floating + */}
            <button
              onClick={onPlus}
              aria-label="Create"
              className="
                absolute left-1/2 -translate-x-1/2 -top-6
                w-14 h-14 rounded-full
                bg-emerald-500 hover:bg-emerald-600
                text-white shadow-[0_8px_24px_rgba(16,185,129,0.4)]
                grid place-items-center
              "
            >
              <Plus size={28} />
            </button>

            {/* right items */}
            {rightItems.map(renderItem)}
          </>
        ) : (
          // all items in a row
          items.map(renderItem)
        )}
      </div>

      {/* decorative handle */}
      <div className="pointer-events-none mt-2 flex justify-center">
        <div className="w-24 h-1.5 rounded-full bg-white/70 dark:bg-white/30" />
      </div>
    </nav>
  );
};

export default MobileTabBar;
