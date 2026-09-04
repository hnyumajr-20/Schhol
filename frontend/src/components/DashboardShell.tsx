import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { api } from "../lib/api";

export function DashboardShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
        <h1 className="text-lg font-semibold">School MIS — {title}</h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="opacity-80">{user?.email ?? user?.idNumber}</span>
          <button
            onClick={handleLogout}
            className="rounded bg-slate-700 px-3 py-1 hover:bg-slate-600"
          >
            Log out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-8 p-6">{children}</main>
    </div>
  );
}
