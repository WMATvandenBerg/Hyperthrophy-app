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
const ACCOUNTS_KEY = "hypertrophy-auth-accounts-v1";

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

function getStoredAccounts(): DemoAccount[] {
  if (!hasStorage()) return [...DEMO_ACCOUNTS];
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as DemoAccount[]) : [];
    const valid = Array.isArray(parsed)
      ? parsed.filter((a) => a?.email && a?.password && a?.user_id)
      : [];

    const merged = [...DEMO_ACCOUNTS];
    valid.forEach((a) => {
      const exists = merged.some((x) => x.email.toLowerCase() === a.email.toLowerCase());
      if (!exists) merged.push(a);
    });
    return merged;
  } catch {
    return [...DEMO_ACCOUNTS];
  }
}

function persistCustomAccounts(accounts: DemoAccount[]) {
  if (!hasStorage()) return;
  const customOnly = accounts.filter(
    (a) => !DEMO_ACCOUNTS.some((d) => d.email.toLowerCase() === a.email.toLowerCase()),
  );
  window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(customOnly));
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
  const accounts = getStoredAccounts();
  const account = accounts.find(
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

export async function registerWithEmail(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthSession> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (name.length < 2) {
    throw new Error("Name must be at least 2 characters");
  }
  if (!email.includes("@") || email.length < 5) {
    throw new Error("Please enter a valid email");
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const accounts = getStoredAccounts();
  const exists = accounts.some((a) => a.email.toLowerCase() === email);
  if (exists) {
    throw new Error("An account with this email already exists");
  }

  const created: DemoAccount = {
    user_id: `u-${Date.now()}`,
    email,
    password,
    name,
    role: "athlete",
  };
  const next = [...accounts, created];
  persistCustomAccounts(next);

  const session: AuthSession = {
    user_id: created.user_id,
    email: created.email,
    name: created.name,
    role: created.role,
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
