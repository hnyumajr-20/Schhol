import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { useState } from "react";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@school-mis/shared";
import { api } from "../lib/api";

export function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordInput) {
    // Always show the same message whether or not the email exists —
    // the backend deliberately doesn't reveal that either (auth.service.ts).
    await api.post("/auth/forgot-password", values).catch(() => {});
    setSubmitted(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-sm space-y-4 rounded-lg border-t-4 border-yellow-400 bg-white p-8 shadow">
        <h1 className="text-xl font-semibold text-gray-900">Reset your password</h1>

        {submitted ? (
          <p className="text-sm text-gray-700">
            If that email is on file, a reset link has been sent. Check your inbox.
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                {...register("email")}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded bg-yellow-500 px-3 py-2 font-semibold text-gray-900 hover:bg-yellow-400 disabled:opacity-50"
            >
              {isSubmitting ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}

        <Link to="/login" className="block text-center text-sm text-gray-600 hover:underline">
          Back to login
        </Link>
      </div>
    </div>
  );
}
