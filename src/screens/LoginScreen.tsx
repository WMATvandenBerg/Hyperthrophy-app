import { useState } from "react";
import { Lock, Mail, ShieldCheck } from "lucide-react";
import { AppCard, PrimaryButton, ScreenContainer, SecondaryButton, TextInput } from "../components/ui";
import { demoCredentials } from "../lib/auth";

export function LoginScreen({
  onLogin,
  onRegister,
}: {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (input: { name: string; email: string; password: string }) => Promise<void>;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(demoCredentials.athlete.email);
  const [password, setPassword] = useState(demoCredentials.athlete.password);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await onLogin(email, password);
      } else {
        await onRegister({ name, email, password });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : mode === "login" ? "Login failed" : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer hideNav>
      <div className="space-y-4 pt-6">
        <h1 className="text-3xl font-semibold">Hypertrophy Science</h1>
        <p className="text-sm text-zinc-400">Log in to your account to access your mesocycle data, progression engine, and workout analytics.</p>

        <AppCard className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <SecondaryButton
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={mode === "login" ? "border-lime text-lime" : ""}
            >
              Sign In
            </SecondaryButton>
            <SecondaryButton
              onClick={() => {
                setMode("register");
                setError("");
                setEmail("");
                setPassword("");
              }}
              className={mode === "register" ? "border-lime text-lime" : ""}
            >
              Create Account
            </SecondaryButton>
          </div>

          {mode === "register" && (
            <>
              <p className="text-xs text-zinc-400">Name</p>
              <TextInput value={name} onChange={setName} placeholder="Your name" />
            </>
          )}

          <p className="text-xs text-zinc-400">Email</p>
          <div className="flex items-center gap-2 rounded-2xl bg-surface2 px-3 py-2">
            <Mail className="h-4 w-4 text-lime" />
            <TextInput value={email} onChange={setEmail} placeholder="you@example.com" />
          </div>

          <p className="text-xs text-zinc-400">Password</p>
          <div className="flex items-center gap-2 rounded-2xl bg-surface2 px-3 py-2">
            <Lock className="h-4 w-4 text-lime" />
            <TextInput value={password} onChange={setPassword} type="password" placeholder="********" />
          </div>

          {error ? <p className="text-xs text-red-300">{error}</p> : null}
          <PrimaryButton onClick={submit} disabled={loading}>
            {loading ? mode === "login" ? "Signing in..." : "Creating..." : mode === "login" ? "Sign In" : "Create Account"}
          </PrimaryButton>
        </AppCard>

        <AppCard className="space-y-2">
          <div className="flex items-center gap-2 text-lime"><ShieldCheck className="h-4 w-4" /> Demo Accounts</div>
          <p className="text-xs text-zinc-300">Athlete: <span className="text-lime">demo@hypertrophy.app</span> / <span className="text-lime">Demo123!</span></p>
          <p className="text-xs text-zinc-300">Coach: <span className="text-lime">coach@hypertrophy.app</span> / <span className="text-lime">Coach123!</span></p>
          <div className="grid grid-cols-2 gap-2">
            <SecondaryButton onClick={() => { setEmail(demoCredentials.athlete.email); setPassword(demoCredentials.athlete.password); }}>
              Use Athlete
            </SecondaryButton>
            <SecondaryButton onClick={() => { setEmail(demoCredentials.coach.email); setPassword(demoCredentials.coach.password); }}>
              Use Coach
            </SecondaryButton>
          </div>
        </AppCard>
      </div>
    </ScreenContainer>
  );
}
