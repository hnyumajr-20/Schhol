import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { RegistrarDashboard } from "./pages/registrar/RegistrarDashboard";
import { TeacherDashboard } from "./pages/teacher/TeacherDashboard";
import { ItStaffDashboard } from "./pages/itstaff/ItStaffDashboard";
import { StudentDashboard } from "./pages/student/StudentDashboard";

const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  registrar: "/registrar",
  accountant: "/admin", // Phase 2
  teacher: "/teacher",
  librarian: "/admin", // Phase 3
  it_staff: "/it-staff",
  student: "/student",
  parent: "/student", // Phase 1 stub shares the read-only shape
};

function RoleHome() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[user.role] ?? "/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RoleHome />} />

      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["registrar"]} />}>
        <Route path="/registrar" element={<RegistrarDashboard />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["teacher"]} />}>
        <Route path="/teacher" element={<TeacherDashboard />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["it_staff"]} />}>
        <Route path="/it-staff" element={<ItStaffDashboard />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["student", "parent"]} />}>
        <Route path="/student" element={<StudentDashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
