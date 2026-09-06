import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { changePasswordSchema, type ChangePasswordInput } from "@school-mis/shared";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { accessToken, user, setSession } = useAuthStore();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  async function onSubmit(values: ChangePasswordInput) {
    setServerError(null);
    try {
      await api.post("/auth/change-password", values);
      // The endpoint returns 204 — update the cached session locally so
      // ProtectedRoute stops redirecting here.
      if (accessToken && user) {
        setSession(accessToken, { ...user, must_change_password: false });
      }
      navigate("/", { replace: true });
    } catch (err: any) {
      setServerError(err?.response?.data?.message ?? "Could not change password");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-4 rounded-lg border-t-4 border-yellow-400 bg-white p-8 shadow"
      >
        <h1 className="text-xl font-semibold text-gray-900">Set a new password</h1>
        <p className="text-sm text-gray-600">
          You're using a temporary password. Set your own before continuing.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700">Current (temporary) password</label>
          <input
            type="password"
            {...register("current_password")}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
          {errors.current_password && (
            <p className="mt-1 text-sm text-red-600">{errors.current_password.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">New password</label>
          <input
            type="password"
            {...register("new_password")}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
          {errors.new_password && (
            <p className="mt-1 text-sm text-red-600">{errors.new_password.message}</p>
          )}
        </div>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-yellow-500 px-3 py-2 font-semibold text-gray-900 hover:bg-yellow-400 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Set password"}
        </button>
      </form>
    </div>
  );
}
