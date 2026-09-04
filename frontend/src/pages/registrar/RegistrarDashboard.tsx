import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  intakeStudentSchema,
  matchParentSchema,
  createParentSchema,
  type IntakeStudentInput,
  type MatchParentInput,
  type CreateParentInput,
} from "@school-mis/shared";
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

export function RegistrarDashboard() {
  return (
    <DashboardShell title="Registrar">
      <div className="grid gap-6 md:grid-cols-2">
        <ParentMatchCard />
        <StudentIntakeCard />
      </div>
      <PendingApprovalsCard />
    </DashboardShell>
  );
}

function ParentMatchCard() {
  const [result, setResult] = useState<any>(null);
  const matchForm = useForm<MatchParentInput>({ resolver: zodResolver(matchParentSchema) });
  const createForm = useForm<CreateParentInput>({ resolver: zodResolver(createParentSchema) });

  const matchParent = useMutation({
    mutationFn: (v: MatchParentInput) => api.post(`/parents/match`, v).then((r) => r.data),
    onSuccess: (data) => setResult(data),
  });

  const createParent = useMutation({
    mutationFn: (v: CreateParentInput) => api.post("/parents", v).then((r) => r.data),
    onSuccess: (data) => setResult(data),
  });

  return (
    <Card title="Find or create parent">
      <form onSubmit={matchForm.handleSubmit((v) => matchParent.mutate(v))} className="space-y-3">
        <input placeholder="Parent phone" {...matchForm.register("phone")} className="w-full rounded border border-slate-300 px-3 py-2" />
        <button className="rounded bg-slate-900 px-4 py-2 text-white">Search by phone</button>
      </form>

      {result === null && matchParent.isSuccess && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-600">No match — create a new parent:</p>
          <form onSubmit={createForm.handleSubmit((v) => createParent.mutate(v))} className="space-y-3">
            <input placeholder="First name" {...createForm.register("first_name")} className="w-full rounded border border-slate-300 px-3 py-2" />
            <input placeholder="Last name" {...createForm.register("last_name")} className="w-full rounded border border-slate-300 px-3 py-2" />
            <input placeholder="Phone" {...createForm.register("phone")} className="w-full rounded border border-slate-300 px-3 py-2" />
            <button className="rounded bg-slate-900 px-4 py-2 text-white">Create parent</button>
          </form>
        </div>
      )}

      {result && (
        <pre className="mt-4 overflow-x-auto rounded bg-slate-50 p-3 text-xs">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </Card>
  );
}

function StudentIntakeCard() {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<IntakeStudentInput>({
    resolver: zodResolver(intakeStudentSchema),
  });

  const intake = useMutation({
    mutationFn: (v: IntakeStudentInput) => api.post("/students", v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students", "pending"] });
      reset();
    },
  });

  return (
    <Card title="Student intake">
      <form onSubmit={handleSubmit((v) => intake.mutate(v))} className="space-y-3">
        <input placeholder="First name" {...register("first_name")} className="w-full rounded border border-slate-300 px-3 py-2" />
        <input placeholder="Last name" {...register("last_name")} className="w-full rounded border border-slate-300 px-3 py-2" />
        <input type="date" {...register("date_of_birth")} className="w-full rounded border border-slate-300 px-3 py-2" />
        <input placeholder="Gender" {...register("gender")} className="w-full rounded border border-slate-300 px-3 py-2" />
        <input placeholder="Class ID (optional)" {...register("class_id")} className="w-full rounded border border-slate-300 px-3 py-2" />
        <input placeholder="Parent ID (from match/create above)" {...register("parent_id")} className="w-full rounded border border-slate-300 px-3 py-2" />
        {intake.isError && <p className="text-sm text-red-600">Intake failed.</p>}
        <button disabled={isSubmitting} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
          Submit intake
        </button>
      </form>
    </Card>
  );
}

function PendingApprovalsCard() {
  const queryClient = useQueryClient();
  const { data: pending } = useQuery({
    queryKey: ["students", "pending"],
    queryFn: () => api.get("/students", { params: { status: "pending" } }).then((r) => r.data),
  });

  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/students/${id}/approve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["students", "pending"] }),
  });

  return (
    <Card title="Pending admissions">
      <ul className="divide-y divide-slate-100 text-sm">
        {(pending ?? []).map((s: any) => (
          <li key={s.id} className="flex items-center justify-between py-2">
            <span>{s.first_name} {s.last_name}</span>
            <button
              onClick={() => approve.mutate(s.id)}
              className="rounded bg-emerald-600 px-3 py-1 text-white hover:bg-emerald-700"
            >
              Approve
            </button>
          </li>
        ))}
        {(pending ?? []).length === 0 && <li className="py-2 text-slate-500">No pending students.</li>}
      </ul>
    </Card>
  );
}
