import { Navigate, Outlet } from "react-router-dom";
import type { UserRole } from "@school-mis/shared";
import { useAuthStore } from "../store/authStore";

export function ProtectedRoute({ allowedRoles }: { allowedRoles: UserRole[] }) {
  const { accessToken, user } = useAuthStore();

  if (!accessToken || !user) {
    return <Navigate to="/login" replace />;
  }
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
