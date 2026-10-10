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
  /** What a pin is, for grouped bubbles: "games" or "opens" */
  noun?: string;
  selectedId?: string;
  onSelect: (id: string) => void;
  /** space to keep clear at the bottom of the map, where the card row sits */
  bottomInset?: number;
  topInset?: number;
  /** false for a still preview: no panning or zooming, taps handled by the parent */
  interactive?: boolean;
  /** false to leave out the "you are here" dot and radius ring, for a single place on a profile */
  showMe?: boolean;
  /** zoom straight to this level on the first pin, instead of fitting every pin */
  zoom?: number;
}
