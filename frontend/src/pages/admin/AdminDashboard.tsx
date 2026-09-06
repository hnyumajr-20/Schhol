import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createStaffSchema,
  createAcademicYearSchema,
  createSemesterSchema,
  createPeriodSchema,
  createClassSchema,
  createSubjectSchema,
  createTimetableSlotSchema,
  createTimetableEntrySchema,
  type CreateStaffInput,
  type CreateAcademicYearInput,
  type CreateSemesterInput,
  type CreatePeriodInput,
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
  upcoming: "bg-gray-400",
  closed: "bg-gray-500",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

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
            <th className="py-2 pr-4 font-medium">CV</th>
            <th className="py-2 pr-4 font-medium">Status</th>
            {onDeactivate && <th className="py-2 pr-4 font-medium" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((s) => (
            <tr key={s.id} className="hover:bg-gray-50">
              <td className="py-2.5 pr-4">
                <div className="flex items-center gap-2.5">
                  {s.image_url ? (
                    <img src={s.image_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
                      {s.first_name?.[0]}
                      {s.last_name?.[0]}
                    </span>
                  )}
                  <span className="font-medium text-gray-900">
                    {s.first_name} {s.last_name}
                  </span>
                </div>
              </td>
              <td className="py-2.5 pr-4 text-gray-600">{ROLE_LABEL(s.role)}</td>
              <td className="py-2.5 pr-4 text-gray-600">{s.email ?? s.phone ?? "—"}</td>
              <td className="py-2.5 pr-4 text-gray-600">{s.id_number ?? "—"}</td>
              <td className="py-2.5 pr-4">
                {s.cv_url ? (
                  <a href={s.cv_url} target="_blank" rel="noreferrer" className="text-yellow-700 hover:underline">
                    View
                  </a>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
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
  const [query, setQuery] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
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
    mutationFn: (values: CreateStaffInput) => {
      const formData = new FormData();
      for (const [key, value] of Object.entries(values)) {
        if (value !== undefined && value !== "") formData.append(key, String(value));
      }
      if (photoFile) formData.append("photo", photoFile);
      if (cvFile) formData.append("cv", cvFile);
      return api.post("/staff", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      reset();
      setPhotoFile(null);
      setCvFile(null);
      setShowCreate(false);
    },
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => api.post(`/staff/${id}/deactivate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });

  const q = query.trim().toLowerCase();
  const list: any[] = (staff ?? []).filter((s: any) => {
    if (!q) return true;
    return [s.first_name, s.last_name, s.email, s.phone, s.id_number, s.role]
      .filter(Boolean)
      .some((field: string) => field.toLowerCase().includes(q));
  });
  const active = list.filter((s) => s.status === "active");
  const pending = list.filter((s) => s.status === "pending");
  const inactive = list.filter((s) => s.status === "inactive");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatTile label="Active" value={active.length} />
        <StatTile label="Pending" value={pending.length} accent={pending.length > 0 ? "warning" : "yellow"} />
        <StatTile label="Inactive" value={inactive.length} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, phone, ID..."
          className="w-full min-w-0 rounded border border-gray-300 px-3 py-2 text-sm sm:w-64"
        />
        <button
          onClick={() => setShowCreate(true)}
          className="whitespace-nowrap rounded bg-yellow-500 px-4 py-2 font-semibold text-gray-900 hover:bg-yellow-400"
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
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Date of birth</label>
              <input type="date" {...register("date_of_birth")} className="w-full rounded border border-gray-300 px-3 py-2" />
            </div>
            <input placeholder="Address" {...register("address")} className="w-full rounded border border-gray-300 px-3 py-2" />
            <input placeholder="Email" {...register("email")} className="w-full rounded border border-gray-300 px-3 py-2" />
            <input placeholder="Phone" {...register("phone")} className="w-full rounded border border-gray-300 px-3 py-2" />
            <input
              placeholder="Emergency contact"
              {...register("emergency_contact")}
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
            <input type="number" step="0.01" placeholder="Salary" {...register("salary")} className="w-full rounded border border-gray-300 px-3 py-2" />

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">CV / resume</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-200"
              />
            </div>

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
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
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

  const list: any[] = years ?? [];
  const selectedYear = list.find((y) => y.id === selectedYearId);

  if (selectedYear) {
    return <AcademicYearDetail year={selectedYear} onBack={() => setSelectedYearId(null)} />;
  }

  return (
    <div className="space-y-6">
      <Card title="Create academic year">
        <form onSubmit={handleSubmit((v) => createYear.mutate(v))} className="grid gap-3 sm:grid-cols-3">
          <input
            placeholder="Name (e.g. 2026/2027)"
            {...register("name")}
            className="rounded border border-gray-300 px-3 py-2 sm:col-span-3"
          />
          <input type="date" {...register("start_date")} className="rounded border border-gray-300 px-3 py-2" />
          <input type="date" {...register("end_date")} className="rounded border border-gray-300 px-3 py-2" />
          <button className="rounded bg-yellow-500 px-4 py-2 font-semibold text-gray-900 hover:bg-yellow-400">Create</button>
        </form>
      </Card>

      <Card title="Academic years">
        {list.length === 0 && <p className="text-sm text-gray-500">No academic years yet.</p>}
        <ul className="divide-y divide-gray-100 text-sm">
          {list.map((y) => (
            <li key={y.id}>
              <button
                onClick={() => setSelectedYearId(y.id)}
                className="flex w-full items-center justify-between py-3 text-left hover:bg-gray-50"
              >
                <span>
                  <span className="font-medium text-gray-900">{y.name}</span>
                  <span className="ml-2 text-xs text-gray-500">
                    {y.semesters.length} semester{y.semesters.length === 1 ? "" : "s"}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <StatusBadge status={y.status} />
                  <span className="text-gray-400">→</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function AcademicYearDetail({ year, onBack }: { year: any; onBack: () => void }) {
  const queryClient = useQueryClient();
  const [showAddSemester, setShowAddSemester] = useState(false);
  const [addPeriodFor, setAddPeriodFor] = useState<string | null>(null);

  const semesterForm = useForm<CreateSemesterInput>({ resolver: zodResolver(createSemesterSchema) });
  const createSemester = useMutation({
    mutationFn: (values: CreateSemesterInput) => api.post(`/academic-years/${year.id}/semesters`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      semesterForm.reset();
      setShowAddSemester(false);
    },
  });

  const periodForm = useForm<CreatePeriodInput>({ resolver: zodResolver(createPeriodSchema) });
  const createPeriod = useMutation({
    mutationFn: (values: CreatePeriodInput) => api.post(`/academic-years/semesters/${addPeriodFor}/periods`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      periodForm.reset();
      setAddPeriodFor(null);
    },
  });

  const semesters = [...year.semesters].sort((a: any, b: any) => a.sequence - b.sequence);
  const periodTargetSemester = semesters.find((s: any) => s.id === addPeriodFor);
  const takenSemesterSeqs = semesters.map((s: any) => s.sequence);
  const takenPeriodSeqs = periodTargetSemester ? periodTargetSemester.periods.map((p: any) => p.sequence) : [];

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm font-medium text-gray-600 hover:text-gray-900">
        ← Back to academic years
      </button>

      <Card title={year.name}>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>
            {formatDate(year.start_date)} – {formatDate(year.end_date)}
          </span>
          <StatusBadge status={year.status} />
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Semesters</h3>
        {semesters.length < 2 && (
          <button
            onClick={() => setShowAddSemester(true)}
            className="rounded bg-yellow-500 px-3 py-1.5 text-sm font-semibold text-gray-900 hover:bg-yellow-400"
          >
            + Add semester
          </button>
        )}
      </div>

      {semesters.length === 0 && <p className="text-sm text-gray-500">No semesters yet.</p>}

      {semesters.map((sem: any) => {
        const periods = [...sem.periods].sort((a: any, b: any) => a.sequence - b.sequence);
        return (
          <Card key={sem.id} title={`${sem.name} (Semester ${sem.sequence})`}>
            <div className="mb-3 flex items-center gap-3 text-xs text-gray-500">
              <span>
                {formatDate(sem.start_date)} – {formatDate(sem.end_date)}
              </span>
              <StatusBadge status={sem.status} />
            </div>

            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Periods</h4>
              {periods.length < 3 && (
                <button
                  onClick={() => setAddPeriodFor(sem.id)}
                  className="text-xs font-medium text-yellow-700 hover:underline"
                >
                  + Add period
                </button>
              )}
            </div>

            {periods.length === 0 ? (
              <p className="text-xs text-gray-500">No periods yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100 text-sm">
                {periods.map((p: any) => (
                  <li key={p.id} className="flex items-center justify-between py-2">
                    <span className="flex items-center gap-2">
                      {p.name}
                      {p.is_exam_period && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                          Exam
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(p.start_date)} – {formatDate(p.end_date)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}

      {showAddSemester && (
        <Modal title="Add semester" onClose={() => setShowAddSemester(false)}>
          <form onSubmit={semesterForm.handleSubmit((v) => createSemester.mutate(v))} className="space-y-3">
            <select
              {...semesterForm.register("sequence", { valueAsNumber: true })}
              className="w-full rounded border border-gray-300 px-3 py-2"
            >
              {[1, 2]
                .filter((n) => !takenSemesterSeqs.includes(n))
                .map((n) => (
                  <option key={n} value={n}>
                    Semester {n}
                  </option>
                ))}
            </select>
            <input
              placeholder="Name (e.g. First Semester)"
              {...semesterForm.register("name")}
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
            <input type="date" {...semesterForm.register("start_date")} className="w-full rounded border border-gray-300 px-3 py-2" />
            <input type="date" {...semesterForm.register("end_date")} className="w-full rounded border border-gray-300 px-3 py-2" />
            {createSemester.isError && <p className="text-sm text-red-600">Failed to create semester.</p>}
            <button className="w-full rounded bg-yellow-500 px-4 py-2 font-semibold text-gray-900 hover:bg-yellow-400">
              Add semester
            </button>
          </form>
        </Modal>
      )}

      {addPeriodFor && (
        <Modal title="Add period" onClose={() => setAddPeriodFor(null)}>
          <form onSubmit={periodForm.handleSubmit((v) => createPeriod.mutate(v))} className="space-y-3">
            <select
              {...periodForm.register("sequence", { valueAsNumber: true })}
              className="w-full rounded border border-gray-300 px-3 py-2"
            >
              {[1, 2, 3]
                .filter((n) => !takenPeriodSeqs.includes(n))
                .map((n) => (
                  <option key={n} value={n}>
                    Period {n}
                  </option>
                ))}
            </select>
            <input
              placeholder="Name (e.g. Period 1)"
              {...periodForm.register("name")}
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" {...periodForm.register("is_exam_period")} /> Exam period
            </label>
            <input type="date" {...periodForm.register("start_date")} className="w-full rounded border border-gray-300 px-3 py-2" />
            <input type="date" {...periodForm.register("end_date")} className="w-full rounded border border-gray-300 px-3 py-2" />
            {createPeriod.isError && <p className="text-sm text-red-600">Failed to create period.</p>}
            <button className="w-full rounded bg-yellow-500 px-4 py-2 font-semibold text-gray-900 hover:bg-yellow-400">
              Add period
            </button>
          </form>
        </Modal>
      )}
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
