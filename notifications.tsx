import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import dayjs from "dayjs";
import { Button, Drawer, Empty, List } from "antd";
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { useBookings } from "../../entities/booking/bookings";

export type NoticeKind = "booked" | "cancelled" | "reminder";
export type Notice = { id: string; kind: NoticeKind; text: string; createdAt: string; read: boolean };
type NewNotice = { id?: string; kind: NoticeKind; text: string };

type NotificationsApi = {
  items: Notice[];
  unread: number;
  push: (n: NewNotice) => void;
  markAllRead: () => void;
  clear: () => void;
};

const NotificationsContext = createContext<NotificationsApi | null>(null);
const storageKey = (email: string) => `workplace-booking.notifications.v1.${email}`;
const pad = (h: number) => String(h).padStart(2, "0");

function load(email: string): Notice[] {
  try {
    const raw = window.localStorage.getItem(storageKey(email));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (n): n is Notice =>
        typeof n === "object" &&
        n !== null &&
        typeof n.id === "string" &&
        typeof n.text === "string" &&
        typeof n.createdAt === "string" &&
        typeof n.read === "boolean" &&
        (n.kind === "booked" || n.kind === "cancelled" || n.kind === "reminder")
    );
  } catch {
    return [];
  }
}

/** Notificările sunt separate pentru fiecare utilizator; provider-ul se reia cu `key={email}`. */
export function NotificationsProvider({ userEmail, children }: { userEmail: string; children: ReactNode }) {
  const [items, setItems] = useState<Notice[]>(() => load(userEmail));

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey(userEmail), JSON.stringify(items));
    } catch {
      /* fără salvare */
    }
  }, [items, userEmail]);

  const push = useCallback((n: NewNotice) => {
    setItems((prev) => {
      const id = n.id ?? `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      if (prev.some((p) => p.id === id)) return prev;
      const next: Notice = { id, kind: n.kind, text: n.text, createdAt: new Date().toISOString(), read: false };
      return [next, ...prev].slice(0, 50);
    });
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => (prev.every((i) => i.read) ? prev : prev.map((i) => ({ ...i, read: true }))));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, unread: items.filter((i) => !i.read).length, push, markAllRead, clear }),
    [items, push, markAllRead, clear]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications(): NotificationsApi {
  const api = useContext(NotificationsContext);
  if (!api) throw new Error("useNotifications must be used inside NotificationsProvider");
  return api;
}

/** La fiecare rezervare proprie de azi care nu s-a încheiat, apare o reamintire (o singură dată pe rezervare). */
export function RemindersWatcher({ userEmail }: { userEmail: string }) {
  const { bookings } = useBookings();
  const { push } = useNotifications();

  useEffect(() => {
    const now = new Date();
    const today = dayjs(now).format("YYYY-MM-DD");
    bookings.forEach((b) => {
      if (b.userId === userEmail && b.date === today && b.to > now.getHours()) {
        push({
          id: `reminder-${b.id}`,
          kind: "reminder",
          text: `Today: ${b.placeId}, ${pad(b.from)}:00–${pad(b.to)}:00`,
        });
      }
    });
  }, [bookings, userEmail, push]);

  return null;
}

const ICONS: Record<NoticeKind, ReactNode> = {
  booked: <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 20 }} />,
  cancelled: <CloseCircleOutlined style={{ color: "#f5222d", fontSize: 20 }} />,
  reminder: <ClockCircleOutlined style={{ color: "#ff7900", fontSize: 20 }} />,
};

export function NotificationsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, markAllRead, clear } = useNotifications();

  const close = () => {
    markAllRead(); // ce ai văzut se marchează citit la închidere
    onClose();
  };

  return (
    <Drawer
      title="Notifications"
      open={open}
      onClose={close}
      width={380}
      extra={
        items.length > 0 ? (
          <Button size="small" onClick={clear}>
            Clear all
          </Button>
        ) : null
      }
    >
      {items.length === 0 ? (
        <Empty description="No notifications yet" />
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={items}
          renderItem={(n) => (
            <List.Item key={n.id}>
              <List.Item.Meta
                avatar={ICONS[n.kind]}
                title={<span style={{ fontWeight: n.read ? 400 : 600 }}>{n.text}</span>}
                description={dayjs(n.createdAt).format("DD MMM, HH:mm")}
              />
            </List.Item>
          )}
        />
      )}
    </Drawer>
  );
}
