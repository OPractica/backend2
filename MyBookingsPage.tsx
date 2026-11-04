import dayjs from "dayjs";
import { Button, Popconfirm, Table, Tag, Typography, type TableColumnsType } from "antd";
import type { Booking } from "../../entities/booking";
import { useBookings } from "../../entities/booking/bookings";
import { locationOf } from "../../entities/office/offices";
import { useAuth } from "../../features/auth/auth";
import { useNotifications } from "../../features/notifications/notifications";

const pad = (h: number) => String(h).padStart(2, "0");
const timeOf = (b: Booking) => `${pad(b.from)}:00–${pad(b.to)}:00`;
const isPast = (b: Booking) => dayjs(`${b.date}T${pad(b.to)}:00`).isBefore(dayjs());

export default function MyBookingsPage() {
  const { user } = useAuth();
  const { bookings, cancel } = useBookings();
  const { push } = useNotifications();

  const mine = bookings
    .filter((b) => b.userId === user?.email)
    .sort((a, b) => (a.date === b.date ? a.from - b.from : a.date.localeCompare(b.date)));

  const columns: TableColumnsType<Booking> = [
    { title: "Place", dataIndex: "placeId", key: "place" },
    { title: "Location", key: "location", render: (_, b) => locationOf(b.floorId) },
    { title: "Date", key: "date", render: (_, b) => dayjs(b.date).format("ddd, DD MMM YYYY") },
    { title: "Time", key: "time", render: (_, b) => timeOf(b) },
    {
      title: "",
      key: "status",
      render: (_, b) => (isPast(b) ? <Tag>Past</Tag> : <Tag color="orange">Upcoming</Tag>),
    },
    {
      title: "",
      key: "actions",
      align: "right",
      render: (_, b) => (
        <Popconfirm
          title="Cancel this booking?"
          okText="Cancel booking"
          cancelText="Keep"
          onConfirm={() => {
            cancel(b.id);
            push({
              kind: "cancelled",
              text: `${b.placeId} cancelled for ${dayjs(b.date).format("DD MMM")}, ${timeOf(b)}`,
            });
          }}
        >
          <Button size="small" danger disabled={isPast(b)}>
            Cancel
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div style={{ background: "#fff", border: "1px solid #ececec", borderRadius: 8, padding: 16 }}>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        My bookings
      </Typography.Title>
      <Table<Booking>
        rowKey="id"
        columns={columns}
        dataSource={mine}
        pagination={false}
        scroll={{ x: true }}
        locale={{ emptyText: "No bookings yet. Pick a place on the map." }}
      />
    </div>
  );
}
