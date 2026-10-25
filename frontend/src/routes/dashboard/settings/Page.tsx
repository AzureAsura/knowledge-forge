import { useState, type DragEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff, IdCard, KeyRound, Lock, Save, UploadCloud, UserPlus, type LucideIcon } from "lucide-react";
import UserAvatar from "@/components/ui/UserAvatar";
import { useMe } from "@/features/auth/queries";
import { roleSchema } from "@/features/auth/schemas";
import {
  changePasswordMutation,
  createUserMutation,
  updateProfileMutation,
  uploadAvatarMutation,
} from "@/features/users/mutations";
import {
  createUserFormSchema,
  passwordFormSchema,
  profileFormSchema,
  type CreateUserForm,
  type PasswordForm,
  type ProfileForm,
} from "@/features/users/schemas";
import { ApiError } from "@/lib/api/errors";
import { session } from "@/lib/api/session";
import { MAX_IMAGE_BYTES } from "@/features/scrolls/upload";

type TabId = "profile" | "password" | "admin";

const input = "w-full bg-base neu-pressed rounded-[14px] p-3 text-[14px] sm:text-[15px] font-bold text-[#1F2937] focus:outline-none transition-all";
const label = "text-[13px] sm:text-[14px] font-bold text-[#1F2937]";
const primaryButton =
  "bg-[#3B82F6] text-white px-6 py-2.5 rounded-[14px] text-[14px] font-bold neu-raised-sm hover:bg-[#2563EB] active:scale-95 flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none";

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="text-[11px] font-semibold text-[#EF4444]">{message}</p> : null;

function ProfileTab() {
  const me = useMe();
  const update = useMutation(updateProfileMutation);
  const avatar = useMutation(uploadAvatarMutation);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { fullName: me.fullName, username: me.username, bio: me.bio },
  });

  const onSubmit = (values: ProfileForm) =>
    update.mutate(values, {
      onSuccess: () => toast.success("Profile updated"),
      onError: (error) => {
        if (error instanceof ApiError && error.status === 409) setError("username", { message: error.message });
      },
    });

  const upload = (file?: File) => {
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) return void toast.error("Avatars must be 4 MB or smaller");
    avatar.mutate(file, { onSuccess: () => toast.success("Avatar updated") });
  };
  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    upload(e.dataTransfer.files[0]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      <div className="lg:col-span-3 bg-base neu-raised rounded-[24px] p-5 sm:p-6 flex flex-col justify-between gap-5 h-full">
        <div className="flex flex-col gap-4 flex-1 justify-center">
          <h2 className="text-[16px] sm:text-[17px] leading-snug text-[#1F2937] font-extrabold border-b border-[#E5E7EB] pb-3">Avatar</h2>

          <div className="flex flex-col items-center justify-center gap-3 my-auto py-2">
            <div className="w-full max-w-[220px] aspect-square rounded-[24px] bg-base neu-raised-sm p-1.5 overflow-hidden shrink-0 text-7xl">
              <UserAvatar src={me.avatarUrl} name={me.fullName} width={480} className="rounded-[18px]" />
            </div>
          </div>
        </div>

        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="bg-base neu-pressed rounded-[18px] p-5 sm:p-6 flex flex-col items-center justify-center text-center gap-2 hover:opacity-90 transition-opacity cursor-pointer shrink-0 focus-within:ring-2 focus-within:ring-[#3B82F6]"
        >
          <UploadCloud size={30} className="text-[#3B82F6]" />
          <div className="text-[13px] sm:text-[14px] font-bold text-[#1F2937]">
            {avatar.isPending ? "Uploading…" : "Drag & drop a new photo here"}
          </div>
          <p className="text-[11px] text-[#6B7280]">Supports PNG, JPG or WebP (Max 4MB)</p>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            disabled={avatar.isPending}
            onChange={(e) => {
              upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="lg:col-span-9 bg-base neu-raised rounded-[24px] p-5 sm:p-6 flex flex-col justify-between gap-6 h-full">
        <form id="profile-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <h2 className="text-[16px] sm:text-[17px] leading-snug text-[#1F2937] font-extrabold border-b border-[#E5E7EB] pb-3 mb-5">
            Profile Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label htmlFor="email" className={`${label} flex items-center justify-between`}>
                <span>Email Address</span>
                <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-base neu-pressed text-[#6B7280]">READ-ONLY</span>
              </label>
              <input
                id="email"
                type="email"
                value={me.email}
                readOnly
                disabled
                className="w-full bg-base neu-pressed rounded-[14px] p-3 text-[14px] sm:text-[15px] font-semibold text-[#6B7280] cursor-not-allowed opacity-80 select-none"
              />
              <p className="text-[11px] font-medium text-[#6B7280]">Email akun diurus di tingkat administrasi dan tidak dapat diubah.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="fullName" className={label}>
                Full Name
              </label>
              <input id="fullName" type="text" aria-invalid={!!errors.fullName} {...register("fullName")} className={input} />
              <FieldError message={errors.fullName?.message} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="username" className={label}>
                Username
              </label>
              <div className="flex items-center">
                <span className="px-3.5 py-3 bg-base neu-pressed rounded-l-[14px] text-[14px] font-extrabold text-[#3B82F6]">@</span>
                <input
                  id="username"
                  type="text"
                  aria-invalid={!!errors.username}
                  {...register("username")}
                  className="w-full bg-base neu-pressed rounded-r-[14px] p-3 text-[14px] sm:text-[15px] font-bold text-[#1F2937] focus:outline-none transition-all"
                />
              </div>
              <FieldError message={errors.username?.message} />
            </div>

            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label htmlFor="bio" className={label}>
                Bio
              </label>
              <textarea
                id="bio"
                rows={3}
                aria-invalid={!!errors.bio}
                {...register("bio")}
                className="w-full bg-base neu-pressed rounded-[14px] p-3 text-[14px] sm:text-[15px] font-medium text-[#1F2937] focus:outline-none transition-all resize-none"
              />
              <FieldError message={errors.bio?.message} />
            </div>
          </div>
        </form>

        <div className="pt-4 border-t border-[#E5E7EB] flex justify-end">
          <button type="submit" form="profile-form" disabled={update.isPending} className={primaryButton}>
            <Save size={17} />
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function PasswordTab() {
  const navigate = useNavigate();
  const [showCurrent, setShowCurrent] = useState(false);
  const change = useMutation(changePasswordMutation);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordFormSchema) });

  // The backend revokes every refresh token, so this session is over: send the user to sign in again.
  const onSubmit = (values: PasswordForm) =>
    change.mutate(values, {
      onSuccess: () => {
        session.clear();
        toast.success("Password updated. Please sign in again.");
        navigate("/auth", { replace: true });
      },
    });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="bg-base neu-raised rounded-[24px] p-5 sm:p-6 flex flex-col gap-5 max-w-2xl"
    >
      <h2 className="text-[16px] sm:text-[17px] leading-snug text-[#1F2937] font-extrabold border-b border-[#E5E7EB] pb-3">Change Password</h2>

      <div className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="currentPassword" className="text-[12px] font-bold text-[#1F2937]">
            Current Password
          </label>
          <div className="relative">
            <input
              id="currentPassword"
              type={showCurrent ? "text" : "password"}
              autoComplete="current-password"
              aria-invalid={!!errors.currentPassword}
              placeholder="Enter current password"
              {...register("currentPassword")}
              className={`${input} pr-10`}
            />
            <button
              type="button"
              aria-label={showCurrent ? "Hide password" : "Show password"}
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1F2937] transition-colors"
            >
              {showCurrent ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          <FieldError message={errors.currentPassword?.message} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="newPassword" className="text-[12px] font-bold text-[#1F2937]">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.newPassword}
              placeholder="Enter new password"
              {...register("newPassword")}
              className={input}
            />
            <FieldError message={errors.newPassword?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmPassword" className="text-[12px] font-bold text-[#1F2937]">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              placeholder="Retype new password"
              {...register("confirmPassword")}
              className={input}
            />
            <FieldError message={errors.confirmPassword?.message} />
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-[#E5E7EB] flex justify-end">
        <button type="submit" disabled={change.isPending} className={primaryButton}>
          <KeyRound size={17} />
          <span>Update Password</span>
        </button>
      </div>
    </form>
  );
}

function AdminTab() {
  const create = useMutation(createUserMutation);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserForm>({ resolver: zodResolver(createUserFormSchema), defaultValues: { role: "scholar" } });

  return (
    <form
      onSubmit={handleSubmit((values) =>
        create.mutate(values, {
          onSuccess: (user) => {
            toast.success(`Created @${user.username}`);
            reset();
          },
        }),
      )}
      noValidate
      className="bg-base neu-raised rounded-[24px] p-5 sm:p-6 flex flex-col gap-5 max-w-2xl"
    >
      <h2 className="text-[16px] sm:text-[17px] leading-snug text-[#1F2937] font-extrabold border-b border-[#E5E7EB] pb-3">Create User</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(
          [
            ["fullName", "Full Name", "text"],
            ["username", "Username", "text"],
            ["email", "Email Address", "email"],
            ["password", "Initial Password", "password"],
          ] as const
        ).map(([name, text, type]) => (
          <div key={name} className="flex flex-col gap-1.5">
            <label htmlFor={`new-${name}`} className={label}>
              {text}
            </label>
            <input
              id={`new-${name}`}
              type={type}
              autoComplete={type === "password" ? "new-password" : "off"}
              aria-invalid={!!errors[name]}
              {...register(name)}
              className={input}
            />
            <FieldError message={errors[name]?.message} />
          </div>
        ))}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-role" className={label}>
            Role
          </label>
          <select id="new-role" {...register("role")} className={`${input} appearance-none cursor-pointer capitalize`}>
            {roleSchema.options.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="pt-3 border-t border-[#E5E7EB] flex justify-end">
        <button type="submit" disabled={create.isPending} className={primaryButton}>
          <UserPlus size={17} />
          <span>Create User</span>
        </button>
      </div>
    </form>
  );
}

export default function SettingsPage() {
  const me = useMe();
  const [params, setParams] = useSearchParams();

  const tabs: { id: TabId; label: string; icon: LucideIcon }[] = [
    { id: "profile", label: "Profile", icon: IdCard },
    { id: "password", label: "Password", icon: Lock },
    ...(me.role === "admin" ? [{ id: "admin" as const, label: "Admin", icon: UserPlus }] : []),
  ];
  const requested = params.get("tab");
  const activeTab = tabs.find((t) => t.id === requested)?.id ?? "profile";

  return (
    <div className="w-full space-y-6 bg-base text-[#4B5563] font-sans">
      <div role="tablist" aria-label="Settings sections" className="flex items-center gap-2 sm:gap-3 border-b border-[#E5E7EB] pt-1 pb-3 overflow-x-auto scrollbar-none min-w-0">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setParams(tab.id === "profile" ? {} : { tab: tab.id })}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] sm:text-[14px] shrink-0 whitespace-nowrap transition-all duration-200 ${
                isActive ? "bg-[#3B82F6] text-white neu-raised-sm font-bold" : "bg-base text-[#4B5563] neu-raised-sm neu-hover font-medium"
              }`}
            >
              <tab.icon size={17} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === "profile" && <ProfileTab />}
      {activeTab === "password" && <PasswordTab />}
      {activeTab === "admin" && <AdminTab />}
    </div>
  );
}
