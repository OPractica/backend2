import { useEffect, useState } from "react";
import { Button, Select, Switch } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { Calendar } from "../../shared/ui/molecules/Calendar";

export type BookingSelection = {
  date: Dayjs;
  hourly: boolean;
  from: number; // ora de start (doar pentru rezervarea pe ore)
  to: number; // ora de final
};

type Props = {
  placeLabel: string | null; // locul ales pe hartă (deocamdată null)
  onBook: (selection: BookingSelection) => void;
  // Anunță pagina de fiecare dată când se schimbă data sau orele, ca harta să arate ce e liber.
  // Trebuie să fie o funcție stabilă (de exemplu setState), altfel se reapelează la fiecare randare.
  onSelectionChange?: (selection: BookingSelection) => void;
  // Valorile de pornire (de exemplu din căutarea cu AI). Se aplică doar la montare; schimbă `key` ca să le reiei.
  initial?: BookingSelection;
};

// Orele posibile: 9..18
const HOURS = Array.from({ length: 10 }, (_, i) => 9 + i).map((h) => ({
  value: h,
  label: `${String(h).padStart(2, "0")}:00`,
}));

// Regulile de rezervare: nu în trecut, nu sâmbăta și duminica.
const isDisabled = (d: Dayjs) => d.isBefore(dayjs(), "day") || d.day() === 0 || d.day() === 6;

// Ziua de start: azi, sau prima zi lucrătoare după azi.
const firstWorkingDay = (): Dayjs => {
  let d = dayjs();
  while (d.day() === 0 || d.day() === 6) d = d.add(1, "day");
  return d;
};

const pad = (h: number) => String(h).padStart(2, "0");

export default function BookingPanel({ placeLabel, onBook, onSelectionChange, initial }: Props) {
  const [date, setDate] = useState<Dayjs>(initial?.date ?? firstWorkingDay());
  const [hourly, setHourly] = useState(initial?.hourly ?? false);
  const [from, setFrom] = useState(initial?.from ?? 9);
  const [to, setTo] = useState(initial?.to ?? 18);

  useEffect(() => {
    onSelectionChange?.({ date, hourly, from, to });
  }, [date, hourly, from, to, onSelectionChange]);

  const invalidRange = hourly && to <= from;
  const canBook = placeLabel !== null && !invalidRange;
  const when = hourly ? `${pad(from)}:00–${pad(to)}:00` : "09:00–18:00";

  return (
    <div style={{ width: 320 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Switch checked={hourly} onChange={setHourly} />
        <span>Hourly</span>
      </div>

      {hourly && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Select value={from} onChange={setFrom} options={HOURS} style={{ width: 100 }} />
          <span>to</span>
          <Select value={to} onChange={setTo} options={HOURS} style={{ width: 100 }} />
        </div>
      )}
      {invalidRange && <div style={{ color: "#cf1322", marginBottom: 8 }}>End time must be after start time</div>}

      <Calendar value={date} onChange={setDate} disabledDate={isDisabled} />

      <div style={{ border: "1px dashed #d9d9d9", borderRadius: 8, padding: 12, fontSize: 12, margin: "12px 0" }}>
        {placeLabel
          ? `Selected ${date.format("DD MMM")}, place ${placeLabel}, ${when}`
          : `Selected ${date.format("DD MMM")}. Please select place or another date`}
      </div>

      <Button type="primary" block disabled={!canBook} onClick={() => onBook({ date, hourly, from, to })}>
        Book
      </Button>
    </div>
  );
}
