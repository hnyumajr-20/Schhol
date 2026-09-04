import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { manualAttendanceSchema, type ManualAttendanceInput } from "@school-mis/shared";
import { DashboardShell } from "../../components/DashboardShell";
import { api } from "../../lib/api";
import { getSocket } from "../../lib/socket";
import { useAuthStore } from "../../store/authStore";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

export function TeacherDashboard() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [liveTaps, setLiveTaps] = useState<any[]>([]);
  const [classId, setClassId] = useState("");

  const { data: timetable } = useQuery({
    queryKey: ["me", "timetable"],
    queryFn: () => api.get("/me/timetable").then((r) => r.data),
  });

  useEffect(() => {
    if (!accessToken || !classId) return;
    const socket = getSocket(accessToken);
    socket.emit("join", `class:${classId}`);
    const onRecorded = (payload: any) => setLiveTaps((prev) => [payload, ...prev].slice(0, 20));
    socket.on("attendance:recorded", onRecorded);
    return () => {
      socket.off("attendance:recorded", onRecorded);
    };
  }, [accessToken, classId]);

  return (
    <DashboardShell title="Teacher">
      <div className="grid gap-6 md:grid-cols-2">
        <Card title="My timetable">
          <pre className="overflow-x-auto rounded bg-gray-50 p-3 text-xs">
            {timetable ? JSON.stringify(timetable, null, 2) : "Loading..."}
          </pre>
        </Card>

        <Card title="Live RFID tap-ins">
          <input
            placeholder="Class ID to watch"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <ul className="divide-y divide-gray-100 text-sm">
            {liveTaps.map((t, i) => (
              <li key={i} className="py-2">{JSON.stringify(t)}</li>
            ))}
            {liveTaps.length === 0 && <li className="py-2 text-gray-500">No taps yet.</li>}
          </ul>
        </Card>
      </div>

      <ManualAttendanceCard />
    </DashboardShell>
  );
}

function ManualAttendanceCard() {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm<ManualAttendanceInput>({
    resolver: zodResolver(manualAttendanceSchema),
  });

  const mark = useMutation({
    mutationFn: (v: ManualAttendanceInput) => api.post("/attendance/manual", v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      reset();
    },
  });

  return (
    <Card title="Manual attendance (no RFID tap)">
      <form onSubmit={handleSubmit((v) => mark.mutate(v))} className="grid gap-3 md:grid-cols-2">
        <input placeholder="Student ID" {...register("student_id")} className="rounded border border-gray-300 px-3 py-2" />
        <input placeholder="Class ID" {...register("class_id")} className="rounded border border-gray-300 px-3 py-2" />
        <input placeholder="Subject ID (optional)" {...register("subject_id")} className="rounded border border-gray-300 px-3 py-2" />
        <select {...register("session")} className="rounded border border-gray-300 px-3 py-2">
          <option value="">— session (self-contained only) —</option>
          <option value="morning">Morning</option>
          <option value="end_of_day">End of day</option>
        </select>
        <select {...register("status")} className="rounded border border-gray-300 px-3 py-2">
          <option value="present">Present</option>
          <option value="late">Late</option>
          <option value="absent">Absent</option>
        </select>
        <button className="rounded bg-yellow-500 px-4 py-2 font-semibold text-gray-900 hover:bg-yellow-400 md:col-span-2">Mark attendance</button>
      </form>
    </Card>
  );
}
