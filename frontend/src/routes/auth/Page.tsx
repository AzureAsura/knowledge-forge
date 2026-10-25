import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, LogIn, ShieldCheck } from "lucide-react";
import { loginMutation } from "@/features/auth/mutations";
import { loginFormSchema, type LoginForm } from "@/features/auth/schemas";
import { errorMessage } from "@/lib/api/errors";
import { safeNext } from "@/lib/router/guards";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const login = useMutation(loginMutation);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginFormSchema) });

  const onSubmit = (values: LoginForm) =>
    login.mutate(values, {
      onSuccess: () => navigate(safeNext(params.get("next")), { replace: true }),
    });

  return (
    <div className={`min-h-screen w-full bg-base text-[#4B5563] font-sans flex items-center justify-center p-4 sm:p-6 md:p-8`}>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className={`w-14 h-14 rounded-[20px] bg-base neu-raised flex items-center justify-center text-[#3B82F6]`}>
              <ShieldCheck size={32} />
            </div>
          </div>
          <h1 className="text-[26px] sm:text-[28px] font-extrabold text-[#1F2937] tracking-tight">
            Welcome Back
          </h1>
          <p className="text-[13px] text-[#6B7280]">
            Sign in to continue to Knowledge Forge
          </p>
        </div>

        <div className={`bg-base neu-raised rounded-[28px] p-6 sm:p-8 space-y-6`}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[13px] font-bold text-[#1F2937] block">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                  placeholder="name@company.com"
                  className={`w-full bg-base neu-pressed rounded-[16px] pl-11 pr-4 py-3 text-[14px] font-semibold text-[#1F2937] placeholder:text-[#9CA3AF] focus:outline-none transition-all`}
                />
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280]" />
              </div>
              {errors.email && (
                <p className="text-[11px] font-semibold text-[#EF4444]">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-[13px] font-bold text-[#1F2937] block">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  {...register("password")}
                  placeholder="••••••••••••"
                  className={`w-full bg-base neu-pressed rounded-[16px] pl-11 pr-11 py-3 text-[14px] font-semibold text-[#1F2937] placeholder:text-[#9CA3AF] focus:outline-none transition-all`}
                />
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1F2937] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] font-semibold text-[#EF4444]">{errors.password.message}</p>
              )}
            </div>

            {login.isError && (
              <p role="alert" className="text-[12px] font-semibold text-[#EF4444]">
                {errorMessage(login.error)}
              </p>
            )}

            <button
              type="submit"
              disabled={login.isPending}
              className={`w-full bg-[#3B82F6] text-white py-3.5 px-4 rounded-[16px] neu-raised-sm text-[14px] font-bold hover:bg-[#2563EB] active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none transition-all flex items-center justify-center gap-2`}
            >
              <LogIn size={18} />
              <span>{login.isPending ? "Signing in…" : "Sign In"}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
