import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerDeviceSchema, assignRfidSchema, type RegisterDeviceInput, type AssignRfidInput } from "@school-mis/shared";
import { DashboardShell } from "../../components/DashboardShell";
import { api } from "../../lib/api";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

export function ItStaffDashboard() {
  return (
    <DashboardShell title="IT Staff">
      <div className="grid gap-6 md:grid-cols-2">
        <DeviceRegisterCard />
        <RfidAssignCard />
      </div>
      <PasswordResetCard />
    </DashboardShell>
  );
}

function DeviceRegisterCard() {
  const queryClient = useQueryClient();
  const { data: devices } = useQuery({
    queryKey: ["devices"],
    queryFn: () => api.get("/devices").then((r) => r.data),
  });
  const { register, handleSubmit, reset } = useForm<RegisterDeviceInput>({
    resolver: zodResolver(registerDeviceSchema),
  });
  const [apiKey, setApiKey] = useState<string | null>(null);

  const createDevice = useMutation({
    mutationFn: (v: RegisterDeviceInput) => api.post("/devices", v).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      setApiKey(data.api_key ?? null);
      reset();
    },
  });

  return (
    <Card title="Register attendance/library device">
      <form onSubmit={handleSubmit((v) => createDevice.mutate(v))} className="space-y-3">
        <input placeholder="Device name" {...register("device_name")} className="w-full rounded border border-slate-300 px-3 py-2" />
        <select {...register("purpose")} className="w-full rounded border border-slate-300 px-3 py-2">
          <option value="attendance">Attendance</option>
          <option value="library">Library</option>
        </select>
        <input placeholder="Class ID (attendance devices)" {...register("class_id")} className="w-full rounded border border-slate-300 px-3 py-2" />
        <button className="rounded bg-slate-900 px-4 py-2 text-white">Register device</button>
      </form>

      {apiKey && (
        <p className="mt-3 break-all rounded bg-amber-50 p-3 text-xs text-amber-800">
          Device API key (shown once — copy it into the device now): <strong>{apiKey}</strong>
        </p>
      )}

      <ul className="mt-4 divide-y divide-slate-100 text-sm">
        {(devices ?? []).map((d: any) => (
          <li key={d.id} className="flex justify-between py-2">
            <span>{d.device_name} ({d.purpose})</span>
            <span className="text-slate-500">{d.status}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function RfidAssignCard() {
  const [userId, setUserId] = useState("");
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<AssignRfidInput>({
    resolver: zodResolver(assignRfidSchema),
  });
  const [status, setStatus] = useState<string | null>(null);

  const assign = useMutation({
    mutationFn: (v: AssignRfidInput) => api.patch(`/users/${userId}/rfid`, v),
    onSuccess: () => {
      setStatus("RFID card assigned.");
      reset();
    },
    onError: () => setStatus("Failed to assign RFID card."),
  });

  return (
    <Card title="Assign RFID card">
      <p className="mb-3 text-xs text-slate-500">
        Read the blank card's UID with the third-party reader software, then paste it below (PRD 1.1 / 4.3.6).
      </p>
      <div className="space-y-3">
        <input
          placeholder="User ID (staff or student)"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full rounded border border-slate-300 px-3 py-2"
        />
        <form onSubmit={handleSubmit((v) => assign.mutate(v))} className="flex gap-2">
          <input
            placeholder="Pasted RFID UID"
            {...register("rfid_uid")}
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
          <button disabled={!userId || isSubmitting} className="whitespace-nowrap rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
            Assign
          </button>
        </form>
        {status && <p className="text-sm text-slate-600">{status}</p>}
      </div>
    </Card>
  );
}

function PasswordResetCard() {
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const reset = useMutation({
    mutationFn: () => api.post(`/users/${userId}/reset-password`),
    onSuccess: () => setStatus("Password reset — user must set a new password at next login."),
    onError: () => setStatus("Failed to reset password."),
  });

  return (
    <Card title="Reset a user's password">
      <div className="flex gap-2">
        <input
          placeholder="User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full max-w-sm rounded border border-slate-300 px-3 py-2"
        />
        <button
          disabled={!userId}
          onClick={() => reset.mutate()}
          className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          Reset password
        </button>
      </div>
      {status && <p className="mt-2 text-sm text-slate-600">{status}</p>}
    </Card>
  );
}
