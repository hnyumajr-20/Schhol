import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { loginSchema, type LoginInput } from "@school-mis/shared";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    try {
      const res = await api.post("/auth/login", values);
      setSession(res.data.access_token, res.data.user);
      navigate("/", { replace: true });
    } catch (err: any) {
      setServerError(err?.response?.data?.message ?? "Login failed");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-4 rounded-lg bg-white p-8 shadow"
      >
        <h1 className="text-xl font-semibold text-slate-900">School MIS Login</h1>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Email / ID number / phone
          </label>
          <input
            {...register("identifier")}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
          {errors.identifier && (
            <p className="mt-1 text-sm text-red-600">{errors.identifier.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            {...register("password")}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-slate-900 px-3 py-2 text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
