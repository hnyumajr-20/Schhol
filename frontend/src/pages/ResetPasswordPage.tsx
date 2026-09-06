import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { resetPasswordSchema, type ResetPasswordInput } from "@school-mis/shared";
import { api } from "../lib/api";

export function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  async function onSubmit(values: ResetPasswordInput) {
    setServerError(null);
    try {
      await api.post(`/auth/reset-password/${token}`, values);
      navigate("/login", { replace: true });
    } catch (err: any) {
      setServerError(err?.response?.data?.message ?? "That reset link is invalid or expired");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-4 rounded-lg border-t-4 border-yellow-400 bg-white p-8 shadow"
      >
        <h1 className="text-xl font-semibold text-gray-900">Choose a new password</h1>

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
          {isSubmitting ? "Saving..." : "Set new password"}
        </button>

        <Link to="/login" className="block text-center text-sm text-gray-600 hover:underline">
          Back to login
        </Link>
      </form>
    </div>
  );
}
