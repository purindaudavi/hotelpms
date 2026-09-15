"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import {
  BedDouble,
  BriefcaseBusiness,
  Building2,
  Eye,
  EyeOff,
  IdCard,
  LockKeyhole,
  LogIn,
  Mail,
  Monitor,
  Moon,
  Phone,
  ShieldCheck,
  Sun,
  UserPlus,
  UserRound
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { LucideIcon } from "lucide-react";
import { appName } from "@/app/data/pms-data";
import { useColorScheme } from "@/app/components/hooks/use-color-scheme";
import { getAuthErrorMessage, loginUser, registerUser } from "@/app/lib/auth-api";
import { hasStoredWorkspaceSession, storeDemoSession } from "@/app/lib/current-user";


const rememberedEmailKey = "staypilot-remembered-email";
const workspacePath = "/properties/demo/dashboard";

type AuthMode = "login" | "register";
type MessageType = "info" | "success" | "error";

const initialRegisterForm = {
  name: "",
  email: "",
  password: "",
  role: "Front Desk",
  emp_no: "",
  mobile: ""
};

export default function LoginPage() {
  const router = useRouter();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("info");

  const brandName = appName.replace(/\s+PMS$/i, "");

  useEffect(() => {
    const rememberedEmail = window.localStorage.getItem(rememberedEmailKey);
    const params = new URLSearchParams(window.location.search);
    const reason = params.get("reason");

    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }

    if (reason === "session-expired") {
      showMessage("Your session expired. Sign in again to continue.", "info");
      return;
    }

    if (reason === "password-reset") {
      showMessage("Password updated. Sign in again with your new password.", "success");
      return;
    }

    if (hasStoredWorkspaceSession()) {
      router.replace(workspacePath);
    }
  }, [router]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    showMessage("", "info");

    if (!email.trim() || !password) {
      showMessage("Enter your email address and password.", "error");
      return;
    }

    setLoading(true);
    try {
      await loginUser({ email: email.trim(), password });
      if (rememberMe) {
        window.localStorage.setItem(rememberedEmailKey, email.trim());
      } else {
        window.localStorage.removeItem(rememberedEmailKey);
      }
      router.push(workspacePath);
    } catch (error) {
      showMessage(getAuthErrorMessage(error, "Sign in failed. Check your email and password."), "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    showMessage("", "info");

    const name = registerForm.name.trim();
    const registerEmail = registerForm.email.trim();

    if (!name || !registerEmail || !registerForm.password || !registerForm.role.trim()) {
      showMessage("Name, email, password and role are required.", "error");
      return;
    }

    if (registerForm.password.length < 6) {
      showMessage("Use at least 6 characters for the password.", "error");
      return;
    }

    setLoading(true);
    try {
      const result = await registerUser({
        ...registerForm,
        name,
        email: registerEmail,
        role: registerForm.role.trim(),
        emp_no: registerForm.emp_no.trim(),
        mobile: registerForm.mobile.trim()
      });
      setAuthMode("login");
      setEmail(registerEmail);
      setPassword("");
      setRegisterForm(initialRegisterForm);
      showMessage(`${result}. You can sign in now.`, "success");
    } catch (error) {
      showMessage(getAuthErrorMessage(error, "Registration failed. Try another email address."), "error");
    } finally {
      setLoading(false);
    }
  }

  function openDemoWorkspace() {
    storeDemoSession();
    router.push(workspacePath);
  }

  function handleForgotPassword() {
    showMessage("Password reset is available from Account security after you sign in.", "info");
  }

  function showMessage(text: string, type: MessageType) {
    setMessage(text);
    setMessageType(type);
  }

  const panelTitle = authMode === "login" ? "Welcome back" : "Create user";
  const panelSubtitle = authMode === "login"
    ? "Sign in to access your property workspace."
    : "Add a user that can sign in through your auth API.";

  return (
    <main className="login-root grid min-h-screen bg-[#f7f9fc] lg:grid-cols-[minmax(0,1.08fr)_minmax(500px,0.92fr)]">
      <section className="relative hidden overflow-hidden bg-[#02070c] px-[clamp(28px,3.1vw,54px)] text-white lg:block">
        <Image
          alt="StayPilot dashboard with live arrivals, occupancy, revenue, and operations overview"
          className="pointer-events-none object-cover object-center"
          fill
          priority
          sizes="54vw"
          src="/assets/login-dashboard-showcase.png"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[38%] bg-gradient-to-b from-[#02070c]/45 via-[#02070c]/10 to-transparent" />

        <div className="relative z-10 mx-auto w-full max-w-[815px] pt-[clamp(28px,4.8vh,62px)]">
          <div className="flex items-center gap-4">
            <span className="grid size-12 place-items-center rounded-xl border border-white/20 bg-white/[0.025] shadow-[0_10px_30px_rgba(0,119,255,0.12)] xl:size-14">
              <BedDouble className="size-7 text-[#0086ff] xl:size-8" strokeWidth={1.8} />
            </span>
            <div>
              <p className="text-[24px] font-bold leading-none tracking-[-0.04em] xl:text-[28px]">
                {brandName}
              </p>
              <p className="mt-1.5 text-xs text-slate-400 xl:mt-2 xl:text-sm">
                Cloud Property Management System
              </p>
            </div>
          </div>

          <h1 className="mt-5 max-w-[670px] text-[clamp(34px,3vw,51px)] font-bold leading-[1.08] tracking-[-0.045em] xl:mt-7">
            Everything your property
            <br />
            needs, in <span className="text-[#087cff]">one workspace.</span>
          </h1>
          <p className="mt-3 max-w-[590px] text-[clamp(14px,1.15vw,19px)] leading-relaxed text-slate-400 xl:mt-4">
            Manage reservations, rooms, rates, availability, guests, invoices
            and daily hotel operations with clarity.
          </p>
        </div>
      </section>

      <section className="login-auth-pane relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_52%,#edf5ff_100%)] px-5 py-10 sm:px-8 lg:px-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-[linear-gradient(90deg,#087cff,#14b8a6,#f59e0b)]" />
        <button
          aria-label={colorScheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-pressed={colorScheme === "dark"}
          className="absolute right-5 top-6 z-20 grid size-11 place-items-center rounded-lg border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 sm:right-8"
          onClick={toggleColorScheme}
          title={colorScheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          type="button"
        >
          {colorScheme === "dark" ? <Moon className="size-5" /> : <Sun className="size-5" />}
        </button>
        <div className="login-card relative z-10 w-full max-w-[515px] rounded-2xl border border-slate-200/80 bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,0.13)] sm:p-10 lg:p-[42px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid size-11 place-items-center rounded-xl bg-cyan-50">
              <BedDouble className="size-6 text-blue-600" />
            </span>
            <div>
              <p className="text-xl font-bold tracking-tight text-slate-950">
                {brandName}
              </p>
              <p className="text-xs text-slate-500">Property Management System</p>
            </div>
          </div>

          <span className="grid size-[70px] place-items-center rounded-xl bg-cyan-100/80">
            <Building2 className="size-9 text-[#087cff]" strokeWidth={1.8} />
          </span>

          <div className="login-mode-switch mt-6 flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            <ModeButton active={authMode === "login"} icon={LogIn} label="Sign in" onClick={() => setAuthMode("login")} />
            <ModeButton active={authMode === "register"} icon={UserPlus} label="Register" onClick={() => setAuthMode("register")} />
          </div>

          <h2 className="login-panel-title mt-6 text-[35px] font-bold leading-none tracking-tight text-[#071635]">
            {panelTitle}
          </h2>
          <p className="mt-3 text-[15px] text-slate-500">
            {panelSubtitle}
          </p>

          {authMode === "login" ? (
            <form className="mt-8 space-y-5" onSubmit={handleLogin}>
              <TextField
                autoComplete="email"
                icon={Mail}
                label="Email address"
                onChange={setEmail}
                placeholder="name@property.com"
                type="email"
                value={email}
              />

              <PasswordField
                autoComplete="current-password"
                label="Password"
                onChange={setPassword}
                placeholder="Enter your password"
                setShowPassword={setShowPassword}
                showPassword={showPassword}
                value={password}
              />

              <div className="flex items-center justify-between gap-4 text-sm">
                <label className="flex cursor-pointer items-center gap-2.5 text-slate-500">
                  <input
                    checked={rememberMe}
                    className="size-5 rounded border-slate-300 accent-blue-600"
                    onChange={(event) => setRememberMe(event.target.checked)}
                    type="checkbox"
                  />
                  Remember me
                </label>
                <button
                  className="font-medium text-blue-600 transition hover:text-blue-800 hover:underline"
                  onClick={handleForgotPassword}
                  type="button"
                >
                  Forgot password?
                </button>
              </div>

              <Message text={message} type={messageType} />

              <button
                className="flex h-[50px] w-full items-center justify-center rounded-lg bg-gradient-to-r from-[#0868ef] to-[#087cff] text-sm font-semibold text-white shadow-[0_10px_25px_rgba(8,124,255,0.23)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-65"
                disabled={loading}
                type="submit"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          ) : (
            <form className="mt-8 space-y-4" onSubmit={handleRegister}>
              <TextField
                autoComplete="name"
                icon={UserRound}
                label="Full name"
                onChange={(value) => setRegisterForm((current) => ({ ...current, name: value }))}
                placeholder="Asiri Perera"
                value={registerForm.name}
              />
              <TextField
                autoComplete="email"
                icon={Mail}
                label="Email address"
                onChange={(value) => setRegisterForm((current) => ({ ...current, email: value }))}
                placeholder="name@property.com"
                type="email"
                value={registerForm.email}
              />
              <PasswordField
                autoComplete="new-password"
                label="Password"
                onChange={(value) => setRegisterForm((current) => ({ ...current, password: value }))}
                placeholder="Create a password"
                setShowPassword={setShowPassword}
                showPassword={showPassword}
                value={registerForm.password}
              />
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-600">Role</span>
                <span className="flex h-[50px] items-center rounded-lg border border-slate-300 bg-white px-4 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
                  <BriefcaseBusiness className="mr-3 size-[18px] shrink-0 text-slate-400" />
                  <select
                    className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none"
                    onChange={(event) => setRegisterForm((current) => ({ ...current, role: event.target.value }))}
                    value={registerForm.role}
                  >
                    <option>Owner / Administrator</option>
                    <option>Manager</option>
                    <option>Front Desk</option>
                    <option>Housekeeping</option>
                    <option>Finance</option>
                    <option>Reports</option>
                  </select>
                </span>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  icon={IdCard}
                  label="Employee no."
                  onChange={(value) => setRegisterForm((current) => ({ ...current, emp_no: value }))}
                  placeholder="01"
                  value={registerForm.emp_no}
                />
                <TextField
                  autoComplete="tel"
                  icon={Phone}
                  label="Mobile"
                  onChange={(value) => setRegisterForm((current) => ({ ...current, mobile: value }))}
                  placeholder="070 355 1339"
                  type="tel"
                  value={registerForm.mobile}
                />
              </div>

              <Message text={message} type={messageType} />

              <button
                className="flex h-[50px] w-full items-center justify-center rounded-lg bg-gradient-to-r from-[#0868ef] to-[#087cff] text-sm font-semibold text-white shadow-[0_10px_25px_rgba(8,124,255,0.23)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-65"
                disabled={loading}
                type="submit"
              >
                {loading ? "Creating user..." : "Create user"}
              </button>
            </form>
          )}

          <div className="my-6 flex items-center gap-4 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            <span>or</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            className="login-demo-button flex h-[50px] w-full items-center justify-center gap-2.5 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-[#102044] transition hover:border-blue-300 hover:bg-blue-50/50"
            onClick={openDemoWorkspace}
            type="button"
          >
            <Monitor className="size-[18px]" />
            Explore demo workspace
          </button>

          <p className="mt-7 flex items-center justify-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="size-4" />
            Secure access <span aria-hidden="true">-</span> Activity audited
          </p>
        </div>
      </section>
    </main>
  );
}

function ModeButton({
  active,
  icon: Icon,
  label,
  onClick
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-md text-sm font-semibold transition ${
        active ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
      }`}
      onClick={onClick}
      type="button"
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

function TextField({
  autoComplete,
  icon: Icon,
  label,
  onChange,
  placeholder,
  type = "text",
  value
}: {
  autoComplete?: string;
  icon: LucideIcon;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-600">{label}</span>
      <span className="flex h-[50px] items-center rounded-lg border border-slate-300 bg-white px-4 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
        <Icon className="mr-3 size-[18px] shrink-0 text-slate-400" />
        <input
          autoComplete={autoComplete}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          value={value}
        />
      </span>
    </label>
  );
}

function PasswordField({
  autoComplete,
  label,
  onChange,
  placeholder,
  setShowPassword,
  showPassword,
  value
}: {
  autoComplete: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  setShowPassword: Dispatch<SetStateAction<boolean>>;
  showPassword: boolean;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-600">{label}</span>
      <span className="flex h-[50px] items-center rounded-lg border border-slate-300 bg-white px-4 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
        <LockKeyhole className="mr-3 size-[18px] shrink-0 text-slate-400" />
        <input
          autoComplete={autoComplete}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={showPassword ? "text" : "password"}
          value={value}
        />
        <button
          aria-label={showPassword ? "Hide password" : "Show password"}
          className="ml-2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          onClick={() => setShowPassword((current) => !current)}
          type="button"
        >
          {showPassword ? (
            <EyeOff className="size-[18px]" />
          ) : (
            <Eye className="size-[18px]" />
          )}
        </button>
      </span>
    </label>
  );
}

function Message({ text, type }: { text: string; type: MessageType }) {
  if (!text) return null;

  const classes = {
    info: "border-sky-200 bg-sky-50 text-sky-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-rose-200 bg-rose-50 text-rose-800"
  }[type];

  return (
    <p className={`rounded-lg border px-4 py-3 text-sm leading-relaxed ${classes}`}>
      {text}
    </p>
  );
}
