/**
 * Geometria planului de etaj (coordonate SVG) și generarea locurilor.
 * Nu depinde de nicio bibliotecă. În aplicația reală, `Seat[]` vine din
 * backend (tabela `seats`), iar `x`/`y` se păstrează în coloana `attributes`
 * sau într-o coloană separată. `id` este cheia de legătură cu rezervările.
 */

export type SeatZone = 'A' | 'B' | 'C';
export type SeatAttribute = 'window' | 'quiet' | 'dual-monitor' | 'dock';
export type RoomKind = 'meeting' | 'kitchen' | 'wc' | 'booth' | 'storage' | 'lounge' | 'collab';

export interface Seat {
  id: string;
  zone: SeatZone;
  x: number;
  y: number;
  attributes: SeatAttribute[];
}

export interface Room {
  id: string;
  name: string;
  kind: RoomKind;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Door {
  id: string;
  label: string;
  /** Poziția golului din perete. */
  x: number;
  y: number;
  w: number;
  side: 'top' | 'bottom';
}

/** Fereastra vizibilă, tăiată strâns în jurul clădirii și al etichetelor „Intrare”. */
export const VIEWBOX = { x: 24, y: 36, w: 952, h: 410 } as const;
export const SEAT_SIZE = 22;
export const BUILDING = { x: 40, y: 70, w: 920, h: 340 } as const;

export const ZONE_LABELS: Record<SeatZone, string> = {
  A: 'Zona A',
  B: 'Zona B',
  C: 'Zona C · liniștită',
};

export const ATTRIBUTE_LABELS: Record<SeatAttribute, string> = {
  window: 'Lângă fereastră',
  quiet: 'Zonă liniștită',
  'dual-monitor': 'Două monitoare',
  dock: 'Dock station',
};

export const ROOMS: Room[] = [
  { id: 'wc', name: 'WC', kind: 'wc', x: 40, y: 70, w: 110, h: 70 },
  { id: 'kitchen', name: 'Bucătărie', kind: 'kitchen', x: 40, y: 140, w: 110, h: 140 },
  { id: 'storage', name: 'Printer · Depozit', kind: 'storage', x: 40, y: 280, w: 110, h: 130 },
  { id: 'Cabină 1', name: 'Cabină 1', kind: 'booth', x: 180, y: 178, w: 44, h: 44 },
  { id: 'Cabină 2', name: 'Cabină 2', kind: 'booth', x: 180, y: 230, w: 44, h: 44 },
  { id: 'Sala 1', name: 'Sala 1 · 8 pers.', kind: 'meeting', x: 262, y: 178, w: 130, h: 96 },
  { id: 'Sala 2', name: 'Sala 2 · 6 pers.', kind: 'meeting', x: 404, y: 178, w: 110, h: 96 },
  { id: 'Sala 3', name: 'Sala 3 · 10 pers.', kind: 'meeting', x: 526, y: 178, w: 150, h: 96 },
  { id: 'lounge', name: 'Lounge', kind: 'lounge', x: 262, y: 286, w: 130, h: 40 },
  { id: 'collab', name: 'Zonă colaborativă', kind: 'collab', x: 770, y: 178, w: 157, h: 148 },
];

/** Sălile de ședințe și cabinele se rezervă la fel ca locurile; `id` este cheia rezervării. */
export const isBookableRoom = (room: Room): boolean => room.kind === 'meeting' || room.kind === 'booth';

export const DOORS: Door[] = [
  { id: 'entry-top', label: 'Intrare', x: 400, y: BUILDING.y, w: 64, side: 'top' },
  { id: 'entry-bottom', label: 'Intrare', x: 560, y: BUILDING.y + BUILDING.h, w: 64, side: 'bottom' },
];

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Grupuri de câte 4 locuri (2×2), separate de plante. */
const POD_COUNT = 7;
const POD_X0 = 180;
const POD_STEP = 84;
const GAP = 4;
const TOP_POD_Y = 92;
const BOTTOM_POD_Y = 340;

export const PLANTS: { x: number; y: number }[] = (() => {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < POD_COUNT - 1; i += 1) {
    const x = POD_X0 + i * POD_STEP + 2 * SEAT_SIZE + GAP + (POD_STEP - (2 * SEAT_SIZE + GAP)) / 2;
    out.push({ x, y: TOP_POD_Y + SEAT_SIZE + GAP / 2 });
    out.push({ x, y: BOTTOM_POD_Y + SEAT_SIZE + GAP / 2 });
  }
  return out;
})();

export function buildSeats(): Seat[] {
  const seats: Seat[] = [];
  let a = 0;
  let b = 0;
  let c = 0;

  const withExtras = (attrs: SeatAttribute[], n: number): SeatAttribute[] => {
    if (n % 3 === 0) attrs.push('dual-monitor');
    if (n % 4 === 1) attrs.push('dock');
    return attrs;
  };

  // Zona A: grupurile din rândul de sus, lângă ferestre.
  for (let p = 0; p < POD_COUNT; p += 1) {
    for (let r = 0; r < 2; r += 1) {
      for (let k = 0; k < 2; k += 1) {
        a += 1;
        seats.push({
          id: `A${pad2(a)}`,
          zone: 'A',
          x: POD_X0 + p * POD_STEP + k * (SEAT_SIZE + GAP),
          y: TOP_POD_Y + r * (SEAT_SIZE + GAP),
          attributes: withExtras(r === 0 ? ['window'] : [], a),
        });
      }
    }
  }

  // Zona B: grupurile din rândul de jos, open space; rândul dinspre perete e lângă fereastră.
  for (let p = 0; p < POD_COUNT; p += 1) {
    for (let r = 0; r < 2; r += 1) {
      for (let k = 0; k < 2; k += 1) {
        b += 1;
        seats.push({
          id: `B${pad2(b)}`,
          zone: 'B',
          x: POD_X0 + p * POD_STEP + k * (SEAT_SIZE + GAP),
          y: BOTTOM_POD_Y + r * (SEAT_SIZE + GAP),
          attributes: withExtras(r === 1 ? ['window'] : [], b),
        });
      }
    }
  }

  // Zona C: rânduri de locuri individuale în dreapta, zona liniștită.
  const rowsY = [92, 119, 340, 367];
  rowsY.forEach((y) => {
    for (let k = 0; k < 6; k += 1) {
      c += 1;
      seats.push({
        id: `C${pad2(c)}`,
        zone: 'C',
        x: 770 + k * (SEAT_SIZE + 5),
        y,
        attributes: withExtras(y === 92 || y === 367 ? ['window', 'quiet'] : ['quiet'], c),
      });
    }
  });

  return seats;
}

export const SEATS: Seat[] = buildSeats();
