import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react';

/** Rezervările sunt pe dată și interval orar; ora de final nu este inclusă (10–14 eliberează locul la 14:00). */
export interface Interval {
  /** Data în format AAAA-LL-ZZ. */
  date: string;
  /** Ora de start (9–18). */
  from: number;
  /** Ora de final (10–19). */
  to: number;
}

export interface Booking extends Interval {
  id: string;
  /** Etajul în care se află locul; același ID de loc există pe mai multe etaje. */
  floorId: string;
  /** E-mailul celui care a făcut rezervarea. */
  userId: string;
  /** ID-ul locului, sălii sau cabinei. */
  placeId: string;
}

/** Rezervarea pe toată ziua înseamnă 09:00–18:00. */
export const DAY_FROM = 9;
export const DAY_TO = 18;

/** Forma minimă a selecției din calendar (compatibilă cu BookingSelection, fără să depindă de el). */
export interface SelectionLike {
  date: { format(pattern: string): string };
  hourly: boolean;
  from: number;
  to: number;
}

const pad = (h: number) => String(h).padStart(2, '0');

export function intervalOf(sel: SelectionLike): Interval {
  const date = sel.date.format('YYYY-MM-DD');
  if (!sel.hourly) return { date, from: DAY_FROM, to: DAY_TO };
  // Un interval invalid (final înainte de start) este tratat ca o oră întreagă.
  return { date, from: sel.from, to: Math.max(sel.to, sel.from + 1) };
}

/** Două intervale se suprapun doar în aceeași zi și dacă se intersectează în timp. */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.date === b.date && a.from < b.to && b.from < a.to;
}

/** Locurile ocupate pe etajul dat în intervalul dat, fiecare cu rezervarea care îl blochează. */
export function bookedPlaces(bookings: readonly Booking[], interval: Interval, floorId: string): Map<string, Booking> {
  const out = new Map<string, Booking>();
  bookings.forEach((b) => {
    if (b.floorId === floorId && overlaps(b, interval)) out.set(b.placeId, b);
  });
  return out;
}

/** De exemplu „04.11, 10:00–14:00”. */
export function describeBooking(b: Interval): string {
  const [, month, day] = b.date.split('-');
  return `${day}.${month}, ${pad(b.from)}:00–${pad(b.to)}:00`;
}

/* ---------- Salvare în browser (până există backend) ---------- */

const STORAGE_KEY = 'workplace-booking.bookings.v3';

/** Etajul pentru care apar rezervările de exemplu (Zity Mall, etajul 7). */
const SEED_FLOOR_ID = 'zity-mall-7';
const SEED_USER_ID = 'colleague';

function isBooking(x: unknown): x is Booking {
  if (typeof x !== 'object' || x === null) return false;
  const b = x as Record<string, unknown>;
  return (
    typeof b.id === 'string' &&
    typeof b.floorId === 'string' &&
    typeof b.userId === 'string' &&
    typeof b.placeId === 'string' &&
    typeof b.date === 'string' &&
    typeof b.from === 'number' &&
    typeof b.to === 'number'
  );
}

/** Data următoarelor zile lucrătoare, ca rezervările de exemplu să cadă în zile ce pot fi alese în calendar. */
function nextWorkingDay(step: number): string {
  const d = new Date();
  let left = step;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) left -= 1;
  }
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `${y}-${m}-${day}`;
}

/** Rezervări de exemplu, folosite doar la prima deschidere, cât timp nu e nimic salvat. */
function seedBookings(): Booking[] {
  const d1 = nextWorkingDay(1);
  const d2 = nextWorkingDay(2);
  return [
    { id: 'seed-1', floorId: SEED_FLOOR_ID, userId: SEED_USER_ID, placeId: 'A01', date: d1, from: 9, to: 18 },
    { id: 'seed-2', floorId: SEED_FLOOR_ID, userId: SEED_USER_ID, placeId: 'A05', date: d1, from: 10, to: 14 },
    { id: 'seed-3', floorId: SEED_FLOOR_ID, userId: SEED_USER_ID, placeId: 'B03', date: d1, from: 13, to: 18 },
    { id: 'seed-4', floorId: SEED_FLOOR_ID, userId: SEED_USER_ID, placeId: 'Sala 1', date: d1, from: 11, to: 12 },
    { id: 'seed-5', floorId: SEED_FLOOR_ID, userId: SEED_USER_ID, placeId: 'A06', date: d2, from: 9, to: 13 },
    { id: 'seed-6', floorId: SEED_FLOOR_ID, userId: SEED_USER_ID, placeId: 'C02', date: d2, from: 9, to: 18 },
    { id: 'seed-7', floorId: SEED_FLOOR_ID, userId: SEED_USER_ID, placeId: 'Sala 2', date: d2, from: 14, to: 16 },
  ];
}

function load(): Booking[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return seedBookings();
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isBooking) : seedBookings();
  } catch {
    return seedBookings();
  }
}

function save(bookings: readonly Booking[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  } catch {
    /* modul privat sau spațiu plin: aplicația continuă fără salvare */
  }
}

export type AddResult = { ok: true; booking: Booking } | { ok: false; conflict: Booking };

function useBookingsStore() {
  const [bookings, setBookings] = useState<Booking[]>(load);

  useEffect(() => {
    save(bookings);
  }, [bookings]);

  /** Adaugă rezervarea doar dacă locul este liber în acel interval. */
  const add = (floorId: string, placeId: string, interval: Interval, userId: string): AddResult => {
    const conflict = bookings.find((b) => b.floorId === floorId && b.placeId === placeId && overlaps(b, interval));
    if (conflict) return { ok: false, conflict };
    const booking: Booking = {
      id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      floorId,
      userId,
      placeId,
      ...interval,
    };
    setBookings([...bookings, booking]);
    return { ok: true, booking };
  };

  const cancel = (id: string) => setBookings(bookings.filter((b) => b.id !== id));

  return { bookings, add, cancel };
}

/* ---------- Context: aceleași rezervări în toată aplicația ---------- */

type BookingsApi = ReturnType<typeof useBookingsStore>;

const BookingsContext = createContext<BookingsApi | null>(null);

export function BookingsProvider({ children }: { children: ReactNode }) {
  const api = useBookingsStore();
  return createElement(BookingsContext.Provider, { value: api }, children);
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBookings(): BookingsApi {
  const api = useContext(BookingsContext);
  if (!api) throw new Error('useBookings trebuie folosit în interiorul lui BookingsProvider');
  return api;
}
