export type Role = "athlete" | "coach";

export interface AuthSession {
  user_id: string;
  email: string;
  name: string;
  role: Role;
}

interface DemoAccount extends AuthSession {
  password: string;
}

const SESSION_KEY = "hypertrophy-auth-session-v1";

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    user_id: "u-demo-athlete",
    email: "demo@hypertrophy.app",
    password: "Demo123!",
    name: "Demo Athlete",
    role: "athlete",
  },
  {
    user_id: "u-demo-coach",
    email: "coach@hypertrophy.app",
    password: "Coach123!",
    name: "Demo Coach",
    role: "coach",
  },
];

function hasStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getStoredSession(): AuthSession | null {
  if (!hasStorage()) return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.user_id || !parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function loginWithEmail(email: string, password: string): Promise<AuthSession> {
  const account = DEMO_ACCOUNTS.find(
    (a) => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password,
  );

  if (!account) {
    throw new Error("Invalid email or password");
  }

  const session: AuthSession = {
    user_id: account.user_id,
    email: account.email,
    name: account.name,
    role: account.role,
  };

  if (hasStorage()) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  return session;
}

export async function logoutSession(): Promise<void> {
  if (hasStorage()) {
    window.localStorage.removeItem(SESSION_KEY);
  }
}

export const demoCredentials = {
  athlete: { email: "demo@hypertrophy.app", password: "Demo123!" },
  coach: { email: "coach@hypertrophy.app", password: "Coach123!" },
};
