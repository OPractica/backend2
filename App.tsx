import { useState, type ReactNode } from "react";
import dayjs from "dayjs";
import updateLocale from "dayjs/plugin/updateLocale";
import { Avatar, Badge, Button, ConfigProvider, Tooltip, Typography } from "antd";
import {
  AppstoreOutlined,
  BellOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  LoginOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { BookingPage } from "../pages/BookingPage";
import MyBookingsPage from "../pages/MyBookingsPage/MyBookingsPage";
import OfficeList from "../features/office-list/OfficeList";
import { AuthProvider, LoginModal, useAuth, type User } from "../features/auth/auth";
import {
  NotificationsDrawer,
  NotificationsProvider,
  RemindersWatcher,
  useNotifications,
} from "../features/notifications/notifications";
import { BookingsProvider } from "../entities/booking/bookings";
import { DEFAULT_CHOICE, type Floor, type Office } from "../entities/office/offices";

dayjs.extend(updateLocale);
dayjs.updateLocale("en", { weekStart: 1 });

const ORANGE = "#ff7900";

type View = "offices" | "booking" | "mine";
type Choice = { office: Office; floor: Floor };

const NAV: { key: View; label: string; icon: ReactNode }[] = [
  { key: "offices", label: "Offices", icon: <AppstoreOutlined /> },
  { key: "booking", label: "Book a place", icon: <EnvironmentOutlined /> },
  { key: "mine", label: "My bookings", icon: <CalendarOutlined /> },
];

type RailButtonProps = {
  label: string;
  icon: ReactNode;
  collapsed: boolean;
  active?: boolean;
  accent?: boolean;
  badge?: number;
  onClick: () => void;
};

function RailButton({ label, icon, collapsed, active = false, accent = false, badge = 0, onClick }: RailButtonProps) {
  const button = (
    <Button
      type="text"
      onClick={onClick}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      style={{
        width: "100%",
        height: 48,
        borderRadius: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: 12,
        padding: collapsed ? 0 : "0 18px",
        color: active || accent ? ORANGE : "#4a4a4a",
        background: active ? "#fff4ea" : "transparent",
        boxShadow: active ? `inset 3px 0 0 ${ORANGE}` : "none",
      }}
    >
      <Badge count={badge} size="small">
        <span style={{ fontSize: 18, color: "inherit", display: "inline-flex" }}>{icon}</span>
      </Badge>
      {!collapsed && <span style={{ fontSize: 14 }}>{label}</span>}
    </Button>
  );
  return collapsed ? (
    <Tooltip title={label} placement="right">
      {button}
    </Tooltip>
  ) : (
    button
  );
}

type ShellProps = {
  user: User;
  view: View;
  onView: (v: View) => void;
  onOpenNotifications: () => void;
  onSignIn: () => void;
  children: ReactNode;
};

function Shell({ user, view, onView, onOpenNotifications, onSignIn, children }: ShellProps) {
  const { isGuest, logout } = useAuth();
  const { unread } = useNotifications();
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f3f4f6" }}>
      <nav
        aria-label="Main menu"
        style={{
          width: collapsed ? 56 : 200,
          flex: "0 0 auto",
          background: "#fff",
          borderRight: "1px solid #ececec",
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
          transition: "width 0.15s",
        }}
      >
        <Button
          type="text"
          aria-label={collapsed ? "Expand menu" : "Collapse menu"}
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => setCollapsed(!collapsed)}
          style={{
            height: 52,
            width: "100%",
            borderRadius: 0,
            justifyContent: collapsed ? "center" : "flex-start",
            padding: collapsed ? 0 : "0 18px",
          }}
        />

        {NAV.map((item) => (
          <RailButton
            key={item.key}
            label={item.label}
            icon={item.icon}
            collapsed={collapsed}
            active={view === item.key}
            onClick={() => onView(item.key)}
          />
        ))}
        <RailButton
          label="Notifications"
          icon={<BellOutlined />}
          collapsed={collapsed}
          badge={unread}
          onClick={onOpenNotifications}
        />

        <div style={{ flex: 1 }} />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: 10,
            padding: collapsed ? "12px 0" : "12px 16px",
            minWidth: 0,
          }}
        >
          <Tooltip title={isGuest ? "Guest (not signed in)" : `${user.name} (${user.email})`} placement="right">
            <Avatar style={{ background: isGuest ? "#bfbfbf" : ORANGE, flex: "0 0 auto" }} icon={isGuest ? <UserOutlined /> : undefined}>
              {isGuest ? null : user.name[0]?.toUpperCase()}
            </Avatar>
          </Tooltip>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.name}
              </div>
              <div style={{ fontSize: 11, color: "#8c8c8c", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {isGuest ? "Not signed in" : user.email}
              </div>
            </div>
          )}
        </div>
        {isGuest ? (
          <RailButton label="Sign in" icon={<LoginOutlined />} collapsed={collapsed} accent onClick={onSignIn} />
        ) : (
          <RailButton label="Sign out" icon={<LogoutOutlined />} collapsed={collapsed} onClick={logout} />
        )}
      </nav>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            height: 52,
            background: "#fff",
            borderBottom: "1px solid #ececec",
            display: "flex",
            alignItems: "center",
            padding: "0 24px",
          }}
        >
          <Typography.Text strong style={{ fontSize: 18 }}>
            Workplace Booking
          </Typography.Text>
        </header>
        <main style={{ flex: 1, minWidth: 0, padding: 16 }}>{children}</main>
      </div>
    </div>
  );
}

function AppBody({ user }: { user: User }) {
  const [view, setView] = useState<View>("booking");
  const [choice, setChoice] = useState<Choice>(DEFAULT_CHOICE);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <>
      <RemindersWatcher userEmail={user.email} />
      <Shell user={user} view={view} onView={setView} onOpenNotifications={() => setNotificationsOpen(true)}
        onSignIn={() => setLoginOpen(true)}
      >
        {view === "offices" && (
          <OfficeList
            onSelect={(office, floor) => {
              setChoice({ office, floor });
              setView("booking");
            }}
          />
        )}
        {view === "booking" && (
          <BookingPage
            key={choice.floor.id}
            office={choice.office}
            floor={choice.floor}
            onChangeFloor={(office, floor) => setChoice({ office, floor })}
          />
        )}
        {view === "mine" && <MyBookingsPage />}
      </Shell>
      <NotificationsDrawer open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}

function AppWithUser() {
  const { user } = useAuth();
  // Notificările sunt separate pentru fiecare utilizator; la schimbarea lui se reia providerul
  return (
    <NotificationsProvider key={user.email} userEmail={user.email}>
      <AppBody user={user} />
    </NotificationsProvider>
  );
}

export default function App() {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: ORANGE } }}>
      <AuthProvider>
        <BookingsProvider>
          <AppWithUser />
        </BookingsProvider>
      </AuthProvider>
    </ConfigProvider>
  );
}
