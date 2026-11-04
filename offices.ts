/**
 * Oficii și etaje de test. Până se conectează backendul, toate etajele afișează același plan de demonstrație;
 * rezervările se țin separat pentru fiecare etaj, după `Floor.id`.
 */
export interface Floor {
  id: string;
  label: string;
  /** Doar etajele cu plan desenat pot fi rezervate; restul afișează „indisponibil”. */
  available?: boolean;
}

export interface Office {
  id: string;
  name: string;
  floors: Floor[];
}

export const OFFICES: Office[] = [
  {
    id: "zity-mall",
    name: "Zity Mall",
    floors: [
      { id: "zity-mall-4b", label: "4th floor · Block B" },
      { id: "zity-mall-7", label: "7th floor · Block A", available: true },
    ],
  },
  {
    id: "orange-digital-center",
    name: "Orange Digital Center",
    floors: [{ id: "orange-digital-center-main", label: "Main floor" }],
  },
  {
    id: "headquarters",
    name: "Headquarters",
    floors: [{ id: "headquarters-main", label: "Alba Iulia 75" }],
  },
];

/** Etajul cu care pornește aplicația: primul care are plan. */
export const DEFAULT_CHOICE: { office: Office; floor: Floor } = (() => {
  for (const office of OFFICES) {
    const floor = office.floors.find((f) => f.available);
    if (floor) return { office, floor };
  }
  return { office: OFFICES[0], floor: OFFICES[0].floors[0] };
})();

/** „Zity Mall · 7th floor · Block A” pentru un ID de etaj. */
export function locationOf(floorId: string): string {
  for (const office of OFFICES) {
    const floor = office.floors.find((f) => f.id === floorId);
    if (floor) return `${office.name} · ${floor.label}`;
  }
  return floorId;
}
