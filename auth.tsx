import { createContext, useContext, useState, type ReactNode } from "react";
import { Alert, Button, Form, Input, Modal, Typography } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { ALLOWED_DOMAINS, confirm, register, resendCode, signIn, type User } from "./authApi";

export type { User };

/** Cât timp nu te loghezi, aplicația merge ca „Guest”. Mai târziu, rezervarea poate cere logare. */
export const GUEST: User = { email: "guest", name: "Guest" };

type AuthApi = {
  /** Utilizatorul curent; `GUEST` dacă nu e logat nimeni. */
  user: User;
  isGuest: boolean;
  /** Pornește sesiunea după o logare sau o confirmare reușită. */
  startSession: (user: User) => void;
  logout: () => void;
};

const SESSION_KEY = "workplace-booking.session.v1";
const AuthContext = createContext<AuthApi | null>(null);

function readSession(): User | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      const u = parsed as Record<string, unknown>;
      if (typeof u.email === "string" && typeof u.name === "string") return { email: u.email, name: u.name };
    }
  } catch {
    /* sesiune ilizibilă: se cere din nou logarea */
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<User | null>(readSession);

  const startSession = (next: User) => {
    setSession(next);
    try {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    } catch {
      /* fără salvare: sesiunea ține doar până la reîncărcare */
    }
  };

  // Ieșirea șterge doar sesiunea. Rezervările și notificările rămân salvate pe e-mailul utilizatorului.
  const logout = () => {
    setSession(null);
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      /* nimic de făcut */
    }
  };

  const api: AuthApi = { user: session ?? GUEST, isGuest: session === null, startSession, logout };
  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthApi {
  const api = useContext(AuthContext);
  if (!api) throw new Error("useAuth must be used inside AuthProvider");
  return api;
}

type Step = "signin" | "register" | "code";

const emailRules = [
  { required: true, message: "Enter your e-mail" },
  { type: "email" as const, message: "Enter a valid e-mail" },
];

function AuthFlow({ onDone }: { onDone: () => void }) {
  const { startSession } = useAuth();
  const [step, setStep] = useState<Step>("signin");
  const [email, setEmail] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const go = (next: Step) => {
    setError("");
    setStep(next);
  };

  const handleSignIn = async (v: { email: string; password: string }) => {
    setBusy(true);
    const res = await signIn(v.email, v.password);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    startSession(res.user);
    onDone();
  };

  const handleRegister = async (v: { email: string; password: string }) => {
    setBusy(true);
    const res = await register(v.email, v.password);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setEmail(v.email.trim().toLowerCase());
    setDemoCode(res.demoCode);
    go("code");
  };

  const handleConfirm = async (v: { code: string }) => {
    setBusy(true);
    const res = await confirm(email, v.code);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    startSession(res.user);
    onDone();
  };

  const handleResend = async () => {
    const res = await resendCode(email);
    if (!res.ok) return setError(res.error);
    setError("");
    setDemoCode(res.demoCode);
  };

  const errorBox = error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} /> : null;

  if (step === "code") {
    return (
      <>
        <Typography.Paragraph type="secondary">
          We sent a 6-digit code to <b>{email}</b>. Enter it to confirm your account.
        </Typography.Paragraph>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message={`Demo mode: no e-mail is sent yet. Your code is ${demoCode}.`}
        />
        {errorBox}
        <Form layout="vertical" requiredMark={false} onFinish={handleConfirm}>
          <Form.Item
            name="code"
            label="Confirmation code"
            rules={[{ required: true, pattern: /^\d{6}$/, message: "Enter the 6-digit code" }]}
          >
            <Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" autoFocus />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={busy}>
            Confirm
          </Button>
        </Form>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <Button type="link" style={{ padding: 0 }} onClick={handleResend}>
            Send a new code
          </Button>
          <Button type="link" style={{ padding: 0 }} onClick={() => go("register")}>
            Change e-mail
          </Button>
        </div>
      </>
    );
  }

  const isRegister = step === "register";
  return (
    <>
      <Typography.Paragraph type="secondary">
        {isRegister
          ? "Register with your Outlook e-mail. We'll send you a code to confirm it."
          : "Sign in with your Outlook e-mail and password."}
      </Typography.Paragraph>
      {errorBox}
      <Form
        key={step}
        layout="vertical"
        requiredMark={false}
        initialValues={{ email }}
        onFinish={isRegister ? handleRegister : handleSignIn}
      >
        <Form.Item name="email" label="Outlook e-mail" rules={emailRules}>
          <Input prefix={<MailOutlined />} autoComplete="username" placeholder="name@outlook.com" />
        </Form.Item>
        <Form.Item
          name="password"
          label="Password"
          rules={[
            { required: true, message: "Enter your password" },
            ...(isRegister ? [{ min: 6, message: "At least 6 characters" }] : []),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} autoComplete={isRegister ? "new-password" : "current-password"} />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={busy}>
          {isRegister ? "Send code" : "Sign in"}
        </Button>
      </Form>
      <div style={{ marginTop: 12, textAlign: "center" }}>
        {isRegister ? (
          <Button type="link" onClick={() => go("signin")}>
            Already registered? Sign in
          </Button>
        ) : (
          <Button type="link" onClick={() => go("register")}>
            New here? Register
          </Button>
        )}
      </div>
      {isRegister && ALLOWED_DOMAINS.length > 0 && (
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: 0, textAlign: "center" }}>
          Accepted domains: {ALLOWED_DOMAINS.join(", ")}
        </Typography.Paragraph>
      )}
    </>
  );
}

/**
 * Fereastra de logare / înregistrare, deschisă din bara din stânga.
 * Logare reală (server, e-mail cu cod) se conectează în `authApi.ts`.
 */
export function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onCancel={onClose} footer={null} title="Account" width={400} destroyOnClose>
      {open && <AuthFlow onDone={onClose} />}
    </Modal>
  );
}
