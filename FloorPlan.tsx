import { memo, useState, type ReactNode } from 'react';
import {
  ATTRIBUTE_LABELS,
  BUILDING,
  DOORS,
  PLANTS,
  ROOMS,
  SEATS,
  SEAT_SIZE,
  VIEWBOX,
  ZONE_LABELS,
  isBookableRoom,
  type Room,
  type Seat,
} from './floorPlanData';
import './FloorPlan.css';

export interface FloorPlanProps {
  /** Locurile de afișat. Implicit, schița de demonstrație din `floorPlanData`. */
  seats?: readonly Seat[];
  /** ID-urile locurilor, sălilor și cabinelor ocupate în intervalul ales. */
  bookedIds?: ReadonlySet<string>;
  /** Locul, sala sau cabina selectată de utilizator. */
  selectedId?: string | null;
  /** Elemente evidențiate, de exemplu propunerile asistentului vocal. */
  suggestedIds?: ReadonlySet<string>;
  /** Text despre rezervare, afișat la trecerea mouse-ului peste un loc ocupat, de exemplu „04.11, 10:00–14:00”. */
  bookedLabels?: Readonly<Record<string, string>>;
  onSelect?: (id: string) => void;
  className?: string;
  /** Conținut afișat deasupra hărții, în stânga (de exemplu „Zity Mall › Etajul 7”). */
  topLeft?: ReactNode;
  /** Conținut afișat deasupra hărții, în dreapta (de exemplu butoanele de căutare și filtrare). */
  topRight?: ReactNode;
  /** Arată butoanele −, + și legenda, plutind jos în dreapta. Implicit activ. */
  zoomable?: boolean;
  /** Dimensiunea inițială a hărții, în procente din lățimea disponibilă. Implicit 75. */
  defaultZoom?: number;
}

const ZOOM_MIN = 50;
const ZOOM_MAX = 200;
const ZOOM_STEP = 25;

const EMPTY: ReadonlySet<string> = new Set();
const NO_LABELS: Readonly<Record<string, string>> = {};

type PlaceState = 'free' | 'booked' | 'selected' | 'suggested';

const SEAT_STATE_TEXT: Record<PlaceState, string> = {
  free: 'liber',
  booked: 'ocupat',
  selected: 'selectat',
  suggested: 'recomandat',
};

const ROOM_STATE_TEXT: Record<PlaceState, string> = {
  free: 'liberă',
  booked: 'ocupată',
  selected: 'selectată',
  suggested: 'recomandată',
};

function placeState(
  id: string,
  booked: ReadonlySet<string>,
  selectedId: string | null,
  suggested: ReadonlySet<string>,
): PlaceState {
  if (booked.has(id)) return 'booked';
  if (id === selectedId) return 'selected';
  if (suggested.has(id)) return 'suggested';
  return 'free';
}

function withLabel(text: string, state: PlaceState, bookedLabel?: string): string {
  return state === 'booked' && bookedLabel ? `${text} ${bookedLabel}` : text;
}

function seatDescription(seat: Seat, state: PlaceState, bookedLabel?: string): string {
  const parts = [`Loc ${seat.id}`, ZONE_LABELS[seat.zone]];
  seat.attributes.forEach((a) => parts.push(ATTRIBUTE_LABELS[a]));
  parts.push(withLabel(SEAT_STATE_TEXT[state], state, bookedLabel));
  return parts.join(', ');
}

interface RoomShapeProps {
  room: Room;
  state: PlaceState;
  bookedLabel?: string;
  onSelect?: (id: string) => void;
}

function RoomShape({ room, state, bookedLabel, onSelect }: RoomShapeProps) {
  const bookable = isBookableRoom(room);
  const booked = state === 'booked';
  const cx = room.x + room.w / 2;
  const cy = room.y + room.h / 2;
  const lines = room.kind === 'booth' ? room.name.split(' ') : room.name.split(' · ');
  const small = room.kind === 'booth' || room.kind === 'wc';
  const lineHeight = 11;
  const startY = cy - ((lines.length - 1) * lineHeight) / 2;
  const description = `${room.name}, ${withLabel(ROOM_STATE_TEXT[state], state, bookedLabel)}`;

  const activate = () => {
    if (bookable && !booked) onSelect?.(room.id);
  };

  const classes = ['fp-room', `fp-room--${room.kind}`];
  if (bookable) classes.push('fp-room--bookable', `fp-room--${state}`);

  return (
    <g
      className={classes.join(' ')}
      role={bookable ? 'button' : undefined}
      tabIndex={bookable ? (booked ? -1 : 0) : undefined}
      aria-pressed={bookable ? state === 'selected' : undefined}
      aria-disabled={bookable ? booked : undefined}
      aria-label={bookable ? description : undefined}
      data-place-id={bookable ? room.id : undefined}
      onClick={bookable ? activate : undefined}
      onKeyDown={
        bookable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                activate();
              }
            }
          : undefined
      }
    >
      {bookable && <title>{description}</title>}
      <rect
        className="fp-room-body"
        x={room.x}
        y={room.y}
        width={room.w}
        height={room.h}
        rx={room.kind === 'lounge' ? room.h / 2 : 3}
      />
      {room.kind === 'meeting' && (
        <rect
          className="fp-table"
          x={cx - room.w * 0.28}
          y={room.y + room.h * 0.58}
          width={room.w * 0.56}
          height={room.h * 0.22}
          rx={4}
        />
      )}
      <text
        className={small ? 'fp-room-label fp-room-label--small' : 'fp-room-label'}
        x={cx}
        y={room.kind === 'meeting' ? room.y + 24 : startY}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {lines.map((line, i) => (
          <tspan key={line} x={cx} dy={i === 0 ? 0 : lineHeight}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

/** Podeaua și ferestrele, desenate sub camere. */
const Base = memo(function Base() {
  const { x, y, w, h } = BUILDING;
  return (
    <>
      <rect className="fp-floor" x={x} y={y} width={w} height={h} />
      <line className="fp-windows" x1={x + 120} y1={y} x2={x + w - 24} y2={y} />
      <line className="fp-windows" x1={x + 120} y1={y + h} x2={x + w - 24} y2={y + h} />
      {/* Zona liniștită: fundal în jurul locurilor C01–C24 */}
      <rect className="fp-quiet" x={762} y={84} width={173} height={66} rx={8} />
      <rect className="fp-quiet" x={762} y={332} width={173} height={66} rx={8} />
    </>
  );
});

/** Plante, pereți exteriori și uși, desenate peste camere. */
const Overlay = memo(function Overlay() {
  const { x, y, w, h } = BUILDING;
  return (
    <>
      {PLANTS.map((p, i) => (
        <g key={i} className="fp-plant" aria-hidden="true">
          <circle cx={p.x} cy={p.y} r={5} />
          <circle cx={p.x} cy={p.y} r={2} />
        </g>
      ))}

      <rect className="fp-wall" x={x} y={y} width={w} height={h} />

      {DOORS.map((d) => (
        <g key={d.id}>
          <rect className="fp-door" x={d.x} y={d.y - 3} width={d.w} height={6} />
          <text
            className="fp-entry"
            x={d.x + d.w / 2}
            y={d.side === 'top' ? d.y - 16 : d.y + 24}
            textAnchor="middle"
          >
            {d.label}
          </text>
        </g>
      ))}
    </>
  );
});

interface SeatShapeProps {
  seat: Seat;
  state: PlaceState;
  bookedLabel?: string;
  onSelect?: (id: string) => void;
}

const SeatShape = memo(function SeatShape({ seat, state, bookedLabel, onSelect }: SeatShapeProps) {
  const booked = state === 'booked';
  const cx = seat.x + SEAT_SIZE / 2;
  const cy = seat.y + SEAT_SIZE / 2;

  const activate = () => {
    if (!booked) onSelect?.(seat.id);
  };

  return (
    <g
      className={`fp-seat fp-seat--${state}`}
      role="button"
      tabIndex={booked ? -1 : 0}
      aria-pressed={state === 'selected'}
      aria-disabled={booked}
      aria-label={seatDescription(seat, state, bookedLabel)}
      data-seat-id={seat.id}
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        }
      }}
    >
      <title>{seatDescription(seat, state, bookedLabel)}</title>
      {state === 'suggested' && (
        <rect
          className="fp-pulse"
          x={seat.x - 3}
          y={seat.y - 3}
          width={SEAT_SIZE + 6}
          height={SEAT_SIZE + 6}
          rx={7}
        />
      )}
      <rect className="fp-seat-body" x={seat.x} y={seat.y} width={SEAT_SIZE} height={SEAT_SIZE} rx={5} />
      {booked && (
        <g className="fp-person" aria-hidden="true">
          <circle cx={cx} cy={cy - 3.5} r={3.2} />
          <path d={`M ${cx - 6} ${cy + 7} a 6 5.5 0 0 1 12 0 z`} />
        </g>
      )}
      {state === 'selected' && (
        <path
          className="fp-check"
          d={`M ${cx - 4.5} ${cy} l 3.2 3.4 l 6 -7`}
          aria-hidden="true"
        />
      )}
    </g>
  );
});

export function FloorPlan({
  seats = SEATS,
  bookedIds = EMPTY,
  selectedId = null,
  suggestedIds = EMPTY,
  bookedLabels = NO_LABELS,
  onSelect,
  className,
  topLeft,
  topRight,
  zoomable = true,
  defaultZoom = 75,
}: FloorPlanProps) {
  const selected = seats.find((s) => s.id === selectedId);
  const [zoom, setZoom] = useState(defaultZoom);
  const [legendOpen, setLegendOpen] = useState(false);
  const step = (delta: number) => setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z + delta)));

  return (
    <div className={className ? `fp ${className}` : 'fp'}>
      {(topLeft || topRight) && (
        <div className="fp-top">
          <div className="fp-top-left">{topLeft}</div>
          <div className="fp-top-right">{topRight}</div>
        </div>
      )}
      <div className="fp-scroll">
        <div className="fp-stage" style={{ width: zoomable ? `${zoom}%` : '100%' }}>
      <svg
        className="fp-svg"
        viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.w} ${VIEWBOX.h}`}
        role="group"
        aria-label="Schița etajului cu locurile de lucru, sălile și cabinele"
      >
        <Base />

        {ROOMS.map((room) => (
          <RoomShape
            key={room.id}
            room={room}
            state={isBookableRoom(room) ? placeState(room.id, bookedIds, selectedId, suggestedIds) : 'free'}
            bookedLabel={bookedLabels[room.id]}
            onSelect={onSelect}
          />
        ))}

        <Overlay />

        {seats.map((seat) => (
          <SeatShape
            key={seat.id}
            seat={seat}
            state={placeState(seat.id, bookedIds, selectedId, suggestedIds)}
            bookedLabel={bookedLabels[seat.id]}
            onSelect={onSelect}
          />
        ))}

        {selected && (
          <g className="fp-tag" pointerEvents="none">
            <rect x={selected.x + SEAT_SIZE / 2 - 17} y={selected.y - 21} width={34} height={16} rx={4} />
            <text x={selected.x + SEAT_SIZE / 2} y={selected.y - 13} textAnchor="middle" dominantBaseline="central">
              {selected.id}
            </text>
          </g>
        )}
      </svg>
        </div>
      </div>

      {legendOpen && (
        <ul className="fp-legend" aria-label="Legend">
          <li><i className="fp-sw fp-sw--free" />Free</li>
          <li><i className="fp-sw fp-sw--booked" />Booked</li>
          <li><i className="fp-sw fp-sw--selected" />Selected</li>
          <li><i className="fp-sw fp-sw--suggested" />Recommended</li>
          <li><i className="fp-sw fp-sw--window" />Windows</li>
        </ul>
      )}

      {zoomable && (
        <div className="fp-zoom" role="group" aria-label="Map controls">
          <button
            type="button"
            className="fp-round"
            aria-label="Legend"
            aria-pressed={legendOpen}
            title="Legend"
            onClick={() => setLegendOpen(!legendOpen)}
          >
            i
          </button>
          <button
            type="button"
            className="fp-round fp-round--text"
            aria-label={`Zoom ${zoom}%, press to reset to ${defaultZoom}%`}
            title={`Reset to ${defaultZoom}%`}
            onClick={() => setZoom(defaultZoom)}
          >
            {zoom}%
          </button>
          <button type="button" className="fp-round" aria-label="Zoom out" title="Zoom out" disabled={zoom <= ZOOM_MIN} onClick={() => step(-ZOOM_STEP)}>
            −
          </button>
          <button type="button" className="fp-round" aria-label="Zoom in" title="Zoom in" disabled={zoom >= ZOOM_MAX} onClick={() => step(ZOOM_STEP)}>
            +
          </button>
        </div>
      )}
    </div>
  );
}

export default FloorPlan;
