import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import type { GamesMapProps } from './games-map.types';
import { colors } from '@/constants/theme';

// Pin styling lives in a small stylesheet, since Leaflet markers are plain HTML
const PIN_CSS = `
.ff-pin { transform: translate(-50%, -100%); display: inline-flex; flex-direction: column; align-items: center; cursor: pointer; }
.ff-pin span { font: 800 13px/1 Manrope_800ExtraBold, Manrope, system-ui, sans-serif; padding: 7px 10px; border-radius: 999px; background: ${colors.ink}; color: ${colors.lime}; box-shadow: 0 4px 12px rgba(11,11,11,.25); white-space: nowrap; transition: transform .15s ease, background .15s ease, color .15s ease; }
.ff-pin i { width: 8px; height: 8px; margin-top: -4px; background: ${colors.ink}; transform: rotate(45deg); border-radius: 1px; transition: background .15s ease; }
.ff-pin.on span { background: ${colors.lime}; color: ${colors.ink}; transform: scale(1.12); }
.ff-pin.on i { background: ${colors.lime}; }
.ff-pin.on { z-index: 1000; }
.ff-pin.group span { background: #fff; color: ${colors.ink}; border: 1.5px solid ${colors.ink}; }
.ff-pin.group i { background: ${colors.ink}; }
.ff-me { width: 18px; height: 18px; border-radius: 50%; background: ${colors.ink}; border: 3px solid ${colors.lime}; box-shadow: 0 0 0 6px rgba(199,255,0,.25); transform: translate(-50%, -50%); }
.leaflet-container { background: ${colors.mist}; font-family: Manrope_500Medium, system-ui, sans-serif; }
.leaflet-control-attribution { font-size: 9px; background: rgba(255,255,255,.7) !important; }
`;

function ensureCss() {
  if (document.getElementById('ff-map-css')) return;
  const el = document.createElement('style');
  el.id = 'ff-map-css';
  el.textContent = PIN_CSS;
  document.head.appendChild(el);
}

export function GamesMap({ me, radiusMiles, pins, selectedId, onSelect, bottomInset = 0, topInset = 0, interactive = true }: GamesMapProps) {
  const host = useRef<View>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<Record<string, L.Marker>>({});
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // create the map once
  useEffect(() => {
    ensureCss();
    const el = host.current as unknown as HTMLElement;
    const m = L.map(el, {
      zoomControl: false,
      attributionControl: true,
      dragging: interactive,
      touchZoom: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      subdomains: 'abcd',
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    }).addTo(m);
    L.circle([me.lat, me.lng], { radius: radiusMiles * 1609.34, color: colors.ink, weight: 1, opacity: 0.35, dashArray: '4 6', fillColor: colors.lime, fillOpacity: 0.06 }).addTo(m);
    L.marker([me.lat, me.lng], { icon: L.divIcon({ className: '', html: '<div class="ff-me"></div>', iconSize: [0, 0] }), interactive: false, keyboard: false }).addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      markers.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const fitted = useRef('');

  /**
   * Draw pins, grouping any that would overlap at the current zoom into a single
   * "3 games" bubble. Tapping a bubble zooms in to split it. The selected game always
   * keeps its own pin.
   */
  const draw = () => {
    const m = map.current;
    if (!m) return;
    Object.values(markers.current).forEach((mk) => mk.remove());
    markers.current = {};
    const sel = selectedRef.current;
    const pts = pins.map((p) => ({ p, xy: m.latLngToLayerPoint([p.lat, p.lng]) }));
    const groups: { members: typeof pts }[] = [];
    pts.forEach((pt) => {
      const g = pt.p.id === sel ? undefined : groups.find((gr) => gr.members[0].p.id !== sel && gr.members[0].xy.distanceTo(pt.xy) < 46);
      if (g) g.members.push(pt);
      else groups.push({ members: [pt] });
    });
    groups.forEach(({ members }) => {
      if (members.length === 1) {
        const p = members[0].p;
        const mk = L.marker([p.lat, p.lng], {
          icon: L.divIcon({ className: '', html: `<div class="ff-pin${p.id === sel ? ' on' : ''}"><span>${p.label}</span><i></i></div>`, iconSize: [0, 0] }),
          title: p.label,
          zIndexOffset: p.id === sel ? 1000 : 0,
        });
        mk.on('click', () => onSelectRef.current(p.id));
        mk.addTo(m);
        markers.current[p.id] = mk;
        return;
      }
      const lat = members.reduce((n, x) => n + x.p.lat, 0) / members.length;
      const lng = members.reduce((n, x) => n + x.p.lng, 0) / members.length;
      const mk = L.marker([lat, lng], {
        icon: L.divIcon({ className: '', html: `<div class="ff-pin group"><span>${members.length} games</span><i></i></div>`, iconSize: [0, 0] }),
        title: `${members.length} games`,
      });
      mk.on('click', () => {
        const b = L.latLngBounds(members.map((x) => [x.p.lat, x.p.lng] as [number, number]));
        m.flyToBounds(b, { paddingTopLeft: [60, topInset + 60], paddingBottomRight: [60, bottomInset + 40], maxZoom: Math.max(m.getZoom() + 2, 13), duration: 0.5 });
      });
      mk.addTo(m);
      markers.current[`group-${members[0].p.id}`] = mk;
    });
  };
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const redraw = () => drawRef.current();
    m.on('zoomend', redraw);
    return () => {
      m.off('zoomend', redraw);
    };
  }, []);

  // frame the games when the set changes, then draw
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const key = pins.map((p) => p.id).join(',');
    if (fitted.current !== key) {
      fitted.current = key;
      const pts: [number, number][] = [[me.lat, me.lng], ...pins.map((p) => [p.lat, p.lng] as [number, number])];
      m.fitBounds(L.latLngBounds(pts), { paddingTopLeft: [40, topInset + 40], paddingBottomRight: [40, bottomInset + 30], maxZoom: 12, animate: false });
    }
    drawRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins.map((p) => p.id).join(',')]);

  // highlight the selected game and bring it into view
  useEffect(() => {
    drawRef.current();
    const m = map.current;
    const sel = pins.find((p) => p.id === selectedId);
    if (m && sel) {
      const size = m.getSize();
      const pt = m.latLngToContainerPoint([sel.lat, sel.lng]);
      const visible = pt.x > 40 && pt.x < size.x - 40 && pt.y > topInset + 40 && pt.y < size.y - bottomInset - 20;
      if (!visible) {
        // centre it in the clear area between the top controls and the card row
        const target = m.containerPointToLatLng([size.x / 2, topInset + (size.y - topInset - bottomInset) / 2]);
        m.panBy([pt.x - m.latLngToContainerPoint(target).x, pt.y - m.latLngToContainerPoint(target).y], { animate: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return <View ref={host} style={{ flex: 1 }} pointerEvents={interactive ? 'auto' : 'none'} accessibilityLabel="Map of games near you" />;
}
