import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  ChatCircleDots, Heart, NotePencil, Leaf, Wind, Moon,
  ClipboardText, House, SignOut,
} from "@phosphor-icons/react";
import ModeToggle from "@/components/ModeToggle";

const NAV = [
  { to: "/dashboard", label: "Home", icon: House },
  { to: "/chat", label: "Talk", icon: ChatCircleDots },
  { to: "/mood", label: "Mood", icon: Heart },
  { to: "/journal", label: "Journal", icon: NotePencil },
  { to: "/habits", label: "Habits", icon: Leaf },
  { to: "/breathing", label: "Breathe", icon: Wind },
  { to: "/sleep", label: "Sleep", icon: Moon },
  { to: "/therapist", label: "Therapist", icon: ClipboardText },
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-sand-100">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-sand-100/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2" data-testid="brand-logo">
            <div className="w-8 h-8 rounded-full bg-sage-400 grid place-items-center">
              <Leaf weight="duotone" size={18} className="text-sand-50" />
            </div>
            <span className="font-heading text-lg font-medium text-ink-900">Mindful</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                data-testid={`nav-${label.toLowerCase()}`}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors ${
                    isActive
                      ? "bg-sage-100 text-ink-900"
                      : "text-ink-600 hover:bg-sand-200/60"
                  }`
                }
              >
                <Icon weight="duotone" size={18} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              data-testid="logout-button"
              className="text-ink-600 hover:text-ink-900 hover:bg-sand-200/60"
            >
              <SignOut weight="duotone" size={18} />
              <span className="hidden sm:inline ml-2">{user?.name?.split(" ")[0] || "Logout"}</span>
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="md:hidden flex items-center gap-1 overflow-x-auto px-3 pb-3 -mt-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              data-testid={`mnav-${label.toLowerCase()}`}
              className={({ isActive }) =>
                `shrink-0 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                  isActive ? "bg-sage-400 text-sand-50" : "bg-sand-50 text-ink-600 border border-border"
                }`
              }
            >
              <Icon weight="duotone" size={14} />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
