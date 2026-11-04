/**
 * „Backendul” de autentificare, deocamdată în browser (localStorage).
 * Funcțiile de aici sunt exact ce va face serverul mai târziu:
 *   register    -> POST /auth/register   (creează contul + trimite codul pe e-mail)
 *   resendCode  -> POST /auth/resend
 *   confirm     -> POST /auth/confirm    (verifică codul)
 *   signIn      -> POST /auth/login      (e-mail + parolă)
 * Când există serverul, se înlocuiește doar conținutul acestor funcții cu `fetch`;
 * restul aplicației rămâne neschimbat.
 *
 * Atenție: într-un browser nu se poate trimite e-mail și nu există securitate reală.
 * Codul se afișează pe ecran (demo), iar parola se păstrează doar ca amprentă (hash).
 */

export type User = { email: string; name: string };
export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/**
 * Domeniile acceptate la înregistrare. Listă goală = orice adresă, pentru că e-mailurile Outlook
 * pot avea domeniul firmei sau al universității. Contul se verifică oricum prin codul trimis pe e-mail.
 * Ca să restrângi, scrie domeniile, ex.: ["outlook.com", "orange.md"].
 */
export const ALLOWED_DOMAINS: string[] = [];

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_TRIES = 5;
const USERS_KEY = "workplace-booking.users.v1";

type Account = { email: string; name: string; salt: string; hash: string; confirmed: boolean };
type PendingCode = { code: string; expires: number; tries: number };

const pending = new Map<string, PendingCode>();

export const cleanEmail = (email: string) => email.trim().toLowerCase();

export function isAllowedEmail(email: string): boolean {
  const domain = cleanEmail(email).split("@")[1] ?? "";
  if (!domain.includes(".")) return false;
  return ALLOWED_DOMAINS.length === 0 || ALLOWED_DOMAINS.includes(domain);
}

// "ana.popescu@outlook.com" -> "Ana Popescu"
export function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  const words = local.split(/[._-]+/).filter(Boolean);
  const name = words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  return name || email;
}

function readAccounts(): Record<string, Account> {
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) return parsed as Record<string, Account>;
    }
  } catch {
    /* date ilizibile: se pornește de la zero */
  }
  return {};
}

function writeAccounts(accounts: Record<string, Account>) {
  try {
    window.localStorage.setItem(USERS_KEY, JSON.stringify(accounts));
  } catch {
    /* fără salvare: contul ține doar până la reîncărcare */
  }
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function randomHex(bytes: number): string {
  return Array.from(window.crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, "0")).join("");
}

function issueCode(email: string): string {
  const code = String(100000 + (window.crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
  pending.set(email, { code, expires: Date.now() + CODE_TTL_MS, tries: 0 });
  return code;
}

const toUser = (a: Account): User => ({ email: a.email, name: a.name });

export async function register(emailInput: string, password: string): Promise<Result<{ demoCode: string }>> {
  const email = cleanEmail(emailInput);
  if (!isAllowedEmail(email)) return { ok: false, error: ALLOWED_DOMAINS.length === 0 ? "Enter a valid e-mail address." : `Use an e-mail from: ${ALLOWED_DOMAINS.join(", ")}.` };
  if (password.length < 6) return { ok: false, error: "The password needs at least 6 characters." };

  const accounts = readAccounts();
  if (accounts[email]?.confirmed) return { ok: false, error: "This e-mail is already registered. Sign in instead." };

  const salt = randomHex(16);
  accounts[email] = { email, name: nameFromEmail(email), salt, hash: await hashPassword(password, salt), confirmed: false };
  writeAccounts(accounts);
  return { ok: true, demoCode: issueCode(email) };
}

export async function resendCode(emailInput: string): Promise<Result<{ demoCode: string }>> {
  const email = cleanEmail(emailInput);
  const account = readAccounts()[email];
  if (!account || account.confirmed) return { ok: false, error: "Nothing to confirm for this e-mail." };
  return { ok: true, demoCode: issueCode(email) };
}

export async function confirm(emailInput: string, code: string): Promise<Result<{ user: User }>> {
  const email = cleanEmail(emailInput);
  const accounts = readAccounts();
  const account = accounts[email];
  const entry = pending.get(email);
  if (!account || !entry) return { ok: false, error: "The code expired. Request a new one." };
  if (Date.now() > entry.expires) {
    pending.delete(email);
    return { ok: false, error: "The code expired. Request a new one." };
  }
  if (entry.tries >= MAX_TRIES) {
    pending.delete(email);
    return { ok: false, error: "Too many attempts. Request a new code." };
  }
  if (entry.code !== code.trim()) {
    entry.tries += 1;
    return { ok: false, error: "Wrong code. Try again." };
  }
  pending.delete(email);
  accounts[email] = { ...account, confirmed: true };
  writeAccounts(accounts);
  return { ok: true, user: toUser(accounts[email]) };
}

export async function signIn(emailInput: string, password: string): Promise<Result<{ user: User }>> {
  const email = cleanEmail(emailInput);
  const account = readAccounts()[email];
  if (!account) return { ok: false, error: "No account for this e-mail. Register first." };
  if (!account.confirmed) return { ok: false, error: "This account isn't confirmed yet. Register again to get a new code." };
  if ((await hashPassword(password, account.salt)) !== account.hash) return { ok: false, error: "Wrong e-mail or password." };
  return { ok: true, user: toUser(account) };
}
