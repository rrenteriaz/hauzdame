// app/host/hoy/types.ts
// Tipos compartidos entre server y client

export interface BlockItem {
  id: string;
  title: string;
  propertyName: string;
  date: string | null; // ISO string
  status?: string;
  href: string;
}

export interface BlockData {
  count: number;
  items: BlockItem[]; // Primeros 5 para mostrar en tarjeta
  allItems?: BlockItem[]; // Todos los items para bottom sheet
}

export interface HoyData {
  unconfirmedCleanings: BlockData;
  openIncidents: BlockData;
  todayCleanings: BlockData;
  todayReservations: BlockData;
}

export interface ProximasData {
  openIncidents: BlockData;
  unconfirmedCleanings: BlockData;
  upcomingCleanings: BlockData;
  upcomingReservations: BlockData;
}

