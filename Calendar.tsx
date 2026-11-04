import { useState } from "react";
import { Button, Calendar as AntCalendar, theme } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

type Props = {
  value: Dayjs; // ziua selectată
  onChange: (date: Dayjs) => void;
  disabledDate?: (date: Dayjs) => boolean;
};

export default function Calendar({ value, onChange, disabledDate }: Props) {
  // Luna afișată e separată de ziua selectată: așa poți răsfoi lunile fără să schimbi selecția.
  const [view, setView] = useState<Dayjs>(value);
  const { token } = theme.useToken();

  return (
    <AntCalendar
      fullscreen={false}
      value={view}
      disabledDate={disabledDate}
      onSelect={(date, { source }) => {
        setView(date);
        if (source === "date") onChange(date);
      }}
      headerRender={({ value: shown, onChange: setShown }) => (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
          <Button type="text" icon={<LeftOutlined />} onClick={() => setShown(shown.subtract(1, "month"))} />
          <span>{shown.format("MMMM YYYY")}</span>
          <Button type="text" icon={<RightOutlined />} onClick={() => setShown(shown.add(1, "month"))} />
        </div>
      )}
      fullCellRender={(date, info) => {
        if (info.type !== "date") return info.originNode;
        const selected = date.isSame(value, "day");
        const today = date.isSame(dayjs(), "day");
        const disabled = disabledDate?.(date) ?? false;
        const otherMonth = !date.isSame(view, "month");
        return (
          <div
            style={{
              width: 28,
              height: 28,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 6,
              background: selected ? token.colorPrimary : "transparent",
              border: today && !selected ? `1px solid ${token.colorPrimary}` : "1px solid transparent",
              color: selected ? "#fff" : disabled || otherMonth ? token.colorTextDisabled : token.colorText,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            {date.format("DD")}
          </div>
        );
      }}
    />
  );
}