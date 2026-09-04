import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { api } from "../lib/api";

interface DashboardShellProps {
  title: string;
  navItems?: readonly string[];
  activeNavItem?: string;
  onNavItemChange?: (item: string) => void;
  children: ReactNode;
}

export function DashboardShell({
  title,
  navItems,
  activeNavItem,
  onNavItemChange,
  children,
}: DashboardShellProps) {
  const navigate = useNavigate();
  const { user, clear } = useAuthStore();

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } finally {
      clear();
      navigate("/login", { replace: true });
    }
  }

  const items = navItems ?? [title];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col overflow-y-auto border-r-4 border-yellow-400 bg-gray-900 text-white">
        <div className="flex items-center gap-3 px-4 py-5">
          <img src="/logo.png" alt="BRIDAPS school crest" className="h-10 w-10 object-contain" />
          <div className="leading-tight">
            <p className="text-sm font-semibold">BRIDAPS</p>
            <p className="text-xs text-gray-400">School MIS</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {items.map((item) => {
            const isActive = navItems ? item === activeNavItem : true;
            const clickable = Boolean(navItems);
            return (
              <button
                key={item}
                type="button"
                onClick={() => clickable && onNavItemChange?.(item)}
                aria-disabled={!clickable}
                className={`block w-full rounded px-3 py-2 text-left text-sm font-medium transition-colors ${
                  isActive ? "bg-yellow-500 text-gray-900" : "text-gray-300 hover:bg-gray-800"
                } ${clickable ? "" : "cursor-default"}`}
              >
                {item}
              </button>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-gray-800 px-4 py-4">
          <p className="truncate text-xs text-gray-400">{user?.email ?? user?.idNumber}</p>
          <button
            onClick={handleLogout}
            className="w-full rounded bg-gray-700 px-3 py-1.5 text-sm hover:bg-gray-600"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex-1">
        <header className="border-b border-gray-200 bg-white px-6 py-4">
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        </header>
        <main className="mx-auto max-w-6xl space-y-8 p-6">{children}</main>
      </div>
    </div>
  );
}
