import { useMemo, useState } from "react";
import { Button, Card, Empty, Input, Space, Tag, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { OFFICES, type Floor, type Office } from "../../entities/office/offices";

type Props = {
  onSelect: (office: Office, floor: Floor) => void;
};

export default function OfficeList({ onSelect }: Props) {
  const [query, setQuery] = useState("");

  const offices = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return OFFICES;

    return OFFICES.filter((o) =>
      `${o.name} ${o.floors.map((f) => f.label).join(" ")}`
        .toLowerCase()
        .includes(q)
    );
  }, [query]);

  return (
    <div style={{ padding: 16, maxWidth: 960, margin: "0 auto" }}>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Choose an office
      </Typography.Title>

      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Search office or office unit"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ maxWidth: 360, marginBottom: 16 }}
      />

      {offices.length === 0 ? (
        <Empty description="No offices found" />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {offices.map((office) => (
            <Card
              key={office.id}
              title={office.name}
              extra={
                <Tag>
                  {office.floors.length}{" "}
                  {office.floors.length === 1 ? "office" : "offices"}
                </Tag>
              }
            >
              <Space wrap>
                {office.floors.map((floor) => (
                  <Button
                    key={floor.id}
                    onClick={() => onSelect(office, floor)}
                  >
                    {floor.label}
                    {!floor.available && (
                      <span style={{ color: "#8c8c8c" }}>
                        {" "}· unavailable
                      </span>
                    )}
                  </Button>
                ))}
              </Space>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}