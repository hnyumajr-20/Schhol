import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createStaffSchema,
  createAcademicYearSchema,
  createClassSchema,
  createSubjectSchema,
  createTimetableSlotSchema,
  createTimetableEntrySchema,
  type CreateStaffInput,
  type CreateAcademicYearInput,
  type CreateClassInput,
  type CreateSubjectInput,
  type CreateTimetableSlotInput,
  type CreateTimetableEntryInput,
} from "@school-mis/shared";
import { DashboardShell } from "../../components/DashboardShell";
import { Modal } from "../../components/Modal";
import { api } from "../../lib/api";

const TABS = ["Overview", "Staff", "Academic Calendar", "Classes & Subjects", "Timetable"] as const;
type Tab = (typeof TABS)[number];

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("Overview");

  return (
    <DashboardShell
      title="Admin"
      navItems={TABS}
      activeNavItem={tab}
      onNavItemChange={(t) => setTab(t as Tab)}
    >
      {tab === "Overview" && <OverviewSection />}
      {tab === "Staff" && <StaffSection />}
      {tab === "Academic Calendar" && <AcademicCalendarSection />}
      {tab === "Classes & Subjects" && <ClassesSection />}
      {tab === "Timetable" && <TimetableSection />}
    </DashboardShell>
  );
}

function formatTime(isoTime: string): string {
  // Timetable slots store start/end as a full ISO timestamp on 1970-01-01
  // (a Postgres TIME column round-tripped through Prisma) — show just HH:MM.
  return new Date(isoTime).toISOString().slice(11, 16);
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

interface StatTileProps {
  label: string;
  value: number | undefined;
  accent?: "yellow" | "warning";
  hint?: string;
}

function StatTile({ label, value, accent = "yellow", hint }: StatTileProps) {
  const accentClass = accent === "warning" ? "bg-amber-500" : "bg-yellow-500";
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <div className={`mb-3 h-1.5 w-8 rounded-full ${accentClass}`} />
      <p className="text-3xl font-semibold text-gray-900">
        {value === undefined ? (
          <span className="inline-block h-8 w-14 animate-pulse rounded bg-gray-100 align-middle" />
        ) : (
          value.toLocaleString()
        )}
      </p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
      {hint && <p className="mt-2 text-xs font-medium text-amber-700">{hint}</p>}
    </div>
  );
}

function OverviewSection() {
  const { data } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => api.get("/dashboard/summary").then((r) => r.data),
  });

  const pending = data?.pending_students as number | undefined;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <StatTile label="Staff" value={data?.staff_count} />
      <StatTile label="Approved students" value={data?.approved_students} />
      <StatTile
        label="Pending admissions"
        value={pending}
        accent={pending && pending > 0 ? "warning" : "yellow"}
        hint={pending && pending > 0 ? "Needs review" : undefined}
      />
      <StatTile label="Classes" value={data?.class_count} />
      <StatTile label="Devices online" value={data?.devices_online} />
    </div>
  );
}

const STATUS_DOT: Record<string, string> = {
  active: "bg-green-500",
  pending: "bg-amber-500",
  inactive: "bg-gray-400",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium capitalize text-gray-700">
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status] ?? "bg-gray-400"}`} />
      {status}
    </span>
  );
}

function ROLE_LABEL(role: string): string {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function StaffTable({
  rows,
  onDeactivate,
}: {
  rows: any[];
  onDeactivate?: (id: string) => void;
}) {
  if (rows.length === 0) {
    return <p className="px-1 py-4 text-sm text-gray-500">No staff in this group.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
            <th className="py-2 pr-4 font-medium">Name</th>
            <th className="py-2 pr-4 font-medium">Role</th>
            <th className="py-2 pr-4 font-medium">Contact</th>
            <th className="py-2 pr-4 font-medium">ID number</th>
            <th className="py-2 pr-4 font-medium">Status</th>
            {onDeactivate && <th className="py-2 pr-4 font-medium" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((s) => (
            <tr key={s.id} className="hover:bg-gray-50">
              <td className="py-2.5 pr-4 font-medium text-gray-900">
                {s.first_name} {s.last_name}
              </td>
              <td className="py-2.5 pr-4 text-gray-600">{ROLE_LABEL(s.role)}</td>
              <td className="py-2.5 pr-4 text-gray-600">{s.email ?? s.phone ?? "—"}</td>
              <td className="py-2.5 pr-4 text-gray-600">{s.id_number ?? "—"}</td>
              <td className="py-2.5 pr-4">
                <StatusBadge status={s.status} />
              </td>
              {onDeactivate && (
                <td className="py-2.5 pr-4 text-right">
                  {s.status === "active" && (
                    <button
                      onClick={() => onDeactivate(s.id)}
                      className="text-xs font-medium text-gray-500 hover:text-red-600"
                    >
                      Deactivate
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StaffSection() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const { data: staff } = useQuery({
    queryKey: ["staff"],
    queryFn: () => api.get("/staff").then((r) => r.data),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateStaffInput>({ resolver: zodResolver(createStaffSchema) });

  const createStaff = useMutation({
    mutationFn: (values: CreateStaffInput) => api.post("/staff", values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      reset();
      setShowCreate(false);
    },
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => api.post(`/staff/${id}/deactivate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });

  const list: any[] = staff ?? [];
  const active = list.filter((s) => s.status === "active");
  const pending = list.filter((s) => s.status === "pending");
  const inactive = list.filter((s) => s.status === "inactive");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-6">
          <div>
            <p className="text-2xl font-semibold text-gray-900">{active.length}</p>
            <p className="text-xs text-gray-500">Active</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-gray-900">{pending.length}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-gray-900">{inactive.length}</p>
            <p className="text-xs text-gray-500">Inactive</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-yellow-500 px-4 py-2 font-semibold text-gray-900 hover:bg-yellow-400"
        >
          + Create staff
        </button>
      </div>

      <Card title={`Active staff (${active.length})`}>
        <StaffTable rows={active} onDeactivate={(id) => deactivate.mutate(id)} />
      </Card>

      {pending.length > 0 && (
        <Card title={`Pending staff (${pending.length})`}>
          <StaffTable rows={pending} />
        </Card>
      )}

      {inactive.length > 0 && (
        <Card title={`Inactive staff (${inactive.length})`}>
          <StaffTable rows={inactive} />
        </Card>
      )}

      {showCreate && (
        <Modal title="Create staff" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleSubmit((v) => createStaff.mutate(v))} className="space-y-3">
            <select {...register("role")} className="w-full rounded border border-gray-300 px-3 py-2">
              <option value="registrar">Registrar</option>
              <option value="accountant">Accountant</option>
              <option value="teacher">Teacher</option>
              <option value="librarian">Librarian</option>
              <option value="it_staff">IT Staff</option>
              <option value="admin">Admin</option>
            </select>
            <input placeholder="First name" {...register("first_name")} className="w-full rounded border border-gray-300 px-3 py-2" />
            <input placeholder="Last name" {...register("last_name")} className="w-full rounded border border-gray-300 px-3 py-2" />
            <input type="date" {...register("date_of_birth")} className="w-full rounded border border-gray-300 px-3 py-2" />
            <input placeholder="Address" {...register("address")} className="w-full rounded border border-gray-300 px-3 py-2" />
            <input placeholder="Email" {...register("email")} className="w-full rounded border border-gray-300 px-3 py-2" />
            <input placeholder="Phone" {...register("phone")} className="w-full rounded border border-gray-300 px-3 py-2" />
            <input type="number" step="0.01" placeholder="Salary" {...register("salary")} className="w-full rounded border border-gray-300 px-3 py-2" />
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
            {createStaff.isError && <p className="text-sm text-red-600">Failed to create staff.</p>}
            <button
              disabled={isSubmitting}
              className="w-full rounded bg-yellow-500 px-4 py-2 font-semibold text-gray-900 hover:bg-yellow-400 disabled:opacity-50"
            >
              Create + send onboarding email
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function AcademicCalendarSection() {
  const queryClient = useQueryClient();
  const { data: years } = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => api.get("/academic-years").then((r) => r.data),
  });

  const { register, handleSubmit, reset } = useForm<CreateAcademicYearInput>({
    resolver: zodResolver(createAcademicYearSchema),
  });

  const createYear = useMutation({
    mutationFn: (values: CreateAcademicYearInput) => api.post("/academic-years", values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      reset();
    },
  });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card title="Create academic year">
        <form onSubmit={handleSubmit((v) => createYear.mutate(v))} className="space-y-3">
          <input placeholder="Name (e.g. 2026/2027)" {...register("name")} className="w-full rounded border border-gray-300 px-3 py-2" />
          <input type="date" {...register("start_date")} className="w-full rounded border border-gray-300 px-3 py-2" />
          <input type="date" {...register("end_date")} className="w-full rounded border border-gray-300 px-3 py-2" />
          <button className="rounded bg-yellow-500 px-4 py-2 font-semibold text-gray-900 hover:bg-yellow-400">Create</button>
        </form>
        <p className="mt-2 text-xs text-gray-500">
          Semesters and periods are added from each year's detail once created (2 semesters, 3 periods each, per PRD 4.1.9).
        </p>
      </Card>

      <Card title="Academic years">
        <ul className="divide-y divide-gray-100 text-sm">
          {(years ?? []).map((y: any) => (
            <li key={y.id} className="flex justify-between py-2">
              <span>{y.name}</span>
              <span className="text-gray-500">{y.status}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function ClassesSection() {
  const queryClient = useQueryClient();
  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: () => api.get("/classes").then((r) => r.data),
  });
  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => api.get("/subjects").then((r) => r.data),
  });

  const classForm = useForm<CreateClassInput>({ resolver: zodResolver(createClassSchema) });
  const createClass = useMutation({
    mutationFn: (v: CreateClassInput) => api.post("/classes", v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      classForm.reset();
    },
  });

  const subjectForm = useForm<CreateSubjectInput>({ resolver: zodResolver(createSubjectSchema) });
  const createSubject = useMutation({
    mutationFn: (v: CreateSubjectInput) => api.post("/subjects", v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      subjectForm.reset();
    },
  });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card title="Create class">
        <form onSubmit={classForm.handleSubmit((v) => createClass.mutate(v))} className="space-y-3">
          <input placeholder="Name (e.g. Grade 4A)" {...classForm.register("name")} className="w-full rounded border border-gray-300 px-3 py-2" />
          <input type="number" step="0.01" placeholder="Fixed fee" {...classForm.register("fixed_fee")} className="w-full rounded border border-gray-300 px-3 py-2" />
          <input type="number" placeholder="Max students" {...classForm.register("max_students")} className="w-full rounded border border-gray-300 px-3 py-2" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...classForm.register("is_self_contained")} /> Self-contained
          </label>
          <button className="rounded bg-yellow-500 px-4 py-2 font-semibold text-gray-900 hover:bg-yellow-400">Create class</button>
        </form>
        <ul className="mt-4 divide-y divide-gray-100 text-sm">
          {(classes ?? []).map((c: any) => (
            <li key={c.id} className="py-2">{c.name} — max {c.max_students}</li>
          ))}
        </ul>
      </Card>

      <Card title="Create subject">
        <form onSubmit={subjectForm.handleSubmit((v) => createSubject.mutate(v))} className="space-y-3">
          <input placeholder="Name" {...subjectForm.register("name")} className="w-full rounded border border-gray-300 px-3 py-2" />
          <input placeholder="Code" {...subjectForm.register("code")} className="w-full rounded border border-gray-300 px-3 py-2" />
          <button className="rounded bg-yellow-500 px-4 py-2 font-semibold text-gray-900 hover:bg-yellow-400">Create subject</button>
        </form>
        <ul className="mt-4 divide-y divide-gray-100 text-sm">
          {(subjects ?? []).map((s: any) => (
            <li key={s.id} className="py-2">{s.name} ({s.code})</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function TimetableSection() {
  const queryClient = useQueryClient();
  const { data: slots } = useQuery({
    queryKey: ["timetable-slots"],
    queryFn: () => api.get("/timetable-slots").then((r) => r.data),
  });

  const slotForm = useForm<CreateTimetableSlotInput>({ resolver: zodResolver(createTimetableSlotSchema) });
  const createSlot = useMutation({
    mutationFn: (v: CreateTimetableSlotInput) => api.post("/timetable-slots", v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetable-slots"] });
      slotForm.reset();
    },
  });

  const entryForm = useForm<CreateTimetableEntryInput>({ resolver: zodResolver(createTimetableEntrySchema) });
  const [entryError, setEntryError] = useState<string | null>(null);
  const createEntry = useMutation({
    mutationFn: (v: CreateTimetableEntryInput) => api.post("/timetable-entries", v),
    onSuccess: () => {
      setEntryError(null);
      entryForm.reset();
    },
    onError: (err: any) => {
      setEntryError(
        err?.response?.status === 409
          ? "Conflict: that teacher or class already has an entry in this slot/day."
          : "Failed to create entry."
      );
    },
  });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card title="Weekly timetable slots">
        <form onSubmit={slotForm.handleSubmit((v) => createSlot.mutate(v))} className="space-y-3">
          <input type="time" {...slotForm.register("start_time")} className="w-full rounded border border-gray-300 px-3 py-2" />
          <input type="time" {...slotForm.register("end_time")} className="w-full rounded border border-gray-300 px-3 py-2" />
          <button className="rounded bg-yellow-500 px-4 py-2 font-semibold text-gray-900 hover:bg-yellow-400">Add slot</button>
        </form>
        <ul className="mt-4 divide-y divide-gray-100 text-sm">
          {(slots ?? []).map((s: any) => (
            <li key={s.id} className="py-2">{formatTime(s.start_time)} – {formatTime(s.end_time)}</li>
          ))}
        </ul>
      </Card>

      <Card title="Place a class-subject-teacher into a slot">
        <form onSubmit={entryForm.handleSubmit((v) => createEntry.mutate(v))} className="space-y-3">
          <input placeholder="Class ID" {...entryForm.register("class_id")} className="w-full rounded border border-gray-300 px-3 py-2" />
          <input placeholder="Subject ID" {...entryForm.register("subject_id")} className="w-full rounded border border-gray-300 px-3 py-2" />
          <input placeholder="Teacher ID" {...entryForm.register("teacher_id")} className="w-full rounded border border-gray-300 px-3 py-2" />
          <input placeholder="Timetable Slot ID" {...entryForm.register("timetable_slot_id")} className="w-full rounded border border-gray-300 px-3 py-2" />
          <select {...entryForm.register("day_of_week", { valueAsNumber: true })} className="w-full rounded border border-gray-300 px-3 py-2">
            <option value={1}>Monday</option>
            <option value={2}>Tuesday</option>
            <option value={3}>Wednesday</option>
            <option value={4}>Thursday</option>
            <option value={5}>Friday</option>
          </select>
          {entryError && <p className="text-sm text-red-600">{entryError}</p>}
          <button className="rounded bg-yellow-500 px-4 py-2 font-semibold text-gray-900 hover:bg-yellow-400">Place entry</button>
        </form>
        <p className="mt-2 text-xs text-gray-500">
          IDs are pasted from the Staff/Classes/Subjects lists for now — a picker UI comes later.
        </p>
      </Card>
    </div>
  );
}
