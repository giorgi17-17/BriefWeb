// --- Mobile bottom tab bar (only visible < md) ---
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Sparkles, BookOpen, CircleUserRound, Plus } from "lucide-react";
import { useAuth } from "../../utils/authHooks";

function MobileTabBar() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // where each tab goes (tweak paths if yours differ)
  const items = [
    { label: "Home",       to: user ? "/dashboard" : "/", icon: Home },
    { label: "AI Assistant", to: "/assistant",             icon: Sparkles },
    // placeholder spot in the middle for + button
    { label: "Resources",  to: "/resources",               icon: BookOpen },
    { label: "Profile",    to: "/profile",                 icon: CircleUserRound },
  ];

  const isActive = (to) =>
    location.pathname === to || location.pathname.startsWith(to + "/");

  const onPlus = () => {
    // go to your “new/create” page (change if needed)
    navigate("/create");
  };

  return (
    <nav
      className="
        md:hidden
        fixed left-1/2 -translate-x-1/2 bottom-[calc(12px+env(safe-area-inset-bottom,0))]
        w-[min(720px,calc(100%-16px))]
        rounded-3xl
        bg-[#0E1726]/95 dark:bg-[#0B1220]/95
        border border-white/10
        backdrop-blur
        px-4 py-2
        z-[60]
      "
      aria-label="Bottom navigation"
    >
      <div className="relative flex items-center justify-between">
        {/* left two */}
        {items.slice(0, 2).map(({ label, to, icon: Icon }) => (
          <Link
            key={label}
            to={to}
            className="flex flex-col items-center gap-1 px-2 py-1 min-w-16"
          >
            <Icon
              size={22}
              className={isActive(to) ? "text-emerald-400" : "text-zinc-400"}
            />
            <span
              className={`text-[11px] ${
                isActive(to) ? "text-emerald-400" : "text-zinc-400"
              }`}
            >
              {label}
            </span>
          </Link>
        ))}

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

        {/* right two */}
        {items.slice(2).map(({ label, to, icon: Icon }) => (
          <Link
            key={label}
            to={to}
            className="flex flex-col items-center gap-1 px-2 py-1 min-w-16"
          >
            <Icon
              size={22}
              className={isActive(to) ? "text-emerald-400" : "text-zinc-400"}
            />
            <span
              className={`text-[11px] ${
                isActive(to) ? "text-emerald-400" : "text-zinc-400"
              }`}
            >
              {label}
            </span>
          </Link>
        ))}
      </div>

      {/* small “handle” bar like iOS (purely decorative) */}
      <div className="pointer-events-none mt-2 flex justify-center">
        <div className="w-24 h-1.5 rounded-full bg-white/70 dark:bg-white/30" />
      </div>
    </nav>
  );
}

export default MobileTabBar