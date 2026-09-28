export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
}

export interface GamesMapProps {
  me: { lat: number; lng: number };
  radiusMiles: number;
  pins: MapPin[];
  selectedId?: string;
  onSelect: (id: string) => void;
  /** space to keep clear at the bottom of the map, where the card row sits */
  bottomInset?: number;
  topInset?: number;
  /** false for a still preview: no panning or zooming, taps handled by the parent */
  interactive?: boolean;
}
