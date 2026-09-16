export const VEHICLE_CLASSES = {
  CAR: 'CAR',
  TRUCK: 'TRUCK',
  BUS: 'BUS',
  MOTORCYCLE: 'MOTORCYCLE',
  PERSON: 'PERSON',
  BICYCLE: 'BICYCLE',
} as const;

export type VehicleClass = typeof VEHICLE_CLASSES[keyof typeof VEHICLE_CLASSES];

export const VEHICLE_META: Record<
  string,
  { label: string; emoji: string; color: string; bg: string; border: string }
> = {
  CAR: { label: 'Car', emoji: '🚗', color: '#10b981', bg: '#eff6ff', border: '#dbeafe' },
  TRUCK: { label: 'Truck', emoji: '🚚', color: '#ef4444', bg: '#fef2f2', border: '#fee2e2' },
  BUS: { label: 'Bus', emoji: '🚌', color: '#f59e0b', bg: '#fffbeb', border: '#fef3c7' },
  MOTORCYCLE: { label: 'Motorcycle', emoji: '🏍️', color: '#8b5cf6', bg: '#f5f3ff', border: '#ede9fe' },
  PERSON: { label: 'Pedestrian', emoji: '🚶', color: '#06b6d4', bg: '#ecfeff', border: '#cffafe' },
  BICYCLE: { label: 'Bicycle', emoji: '🚲', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
};
