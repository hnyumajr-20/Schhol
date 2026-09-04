import { useQuery } from "@tanstack/react-query";
import { DashboardShell } from "../../components/DashboardShell";
import { api } from "../../lib/api";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

export function StudentDashboard() {
  const { data: timetable } = useQuery({
    queryKey: ["me", "timetable"],
    queryFn: () => api.get("/me/timetable").then((r) => r.data),
  });
  const { data: attendance } = useQuery({
    queryKey: ["me", "attendance"],
    queryFn: () => api.get("/me/attendance").then((r) => r.data),
  });

  return (
    <DashboardShell title="Student / Parent">
      <div className="grid gap-6 md:grid-cols-2">
        <Card title="My timetable">
          <pre className="overflow-x-auto rounded bg-gray-50 p-3 text-xs">
            {timetable ? JSON.stringify(timetable, null, 2) : "Loading..."}
          </pre>
        </Card>
        <Card title="My attendance">
          <pre className="overflow-x-auto rounded bg-gray-50 p-3 text-xs">
            {attendance ? JSON.stringify(attendance, null, 2) : "Loading..."}
          </pre>
        </Card>
      </div>
      <p className="text-xs text-gray-500">
        Grades, fee invoices, and messaging land in Phase 2/3 per the PRD — this is a read-only Phase 1 stub.
      </p>
    </DashboardShell>
  );
}
