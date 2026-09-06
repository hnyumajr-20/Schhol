import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

// Deliberately doesn't redirect on mustChangePassword (unlike ProtectedRoute)
// — this guards the change-password page itself, which is where that
// redirect sends people, so applying the same rule here would loop forever.
export function RequireAuth() {
  const { accessToken, user } = useAuthStore();

  if (!accessToken || !user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
