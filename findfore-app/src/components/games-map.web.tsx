import 'leaflet/dist/leaflet.css';
import 'maplibre-gl/dist/maplibre-gl.css';

import { maplibreGL } from '@maplibre/maplibre-gl-leaflet';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import type { GamesMapProps, MapArea } from './games-map.types';
import { colors } from '@/constants/theme';

// Pin styling lives in a small stylesheet, since Leaflet markers are plain HTML
const PIN_CSS = `
.ff-pin { transform: translate(-50%, -100%); display: inline-flex; flex-direction: column; align-items: center; cursor: pointer; }
.ff-pin span { font: 800 13px/1 Manrope_800ExtraBold, Manrope, system-ui, sans-serif; padding: 7px 10px; border-radius: 999px; background: ${colors.ink}; color: ${colors.white}; box-shadow: 0 4px 12px rgba(11,11,11,.25); white-space: nowrap; transition: transform .15s ease, background .15s ease, color .15s ease; }
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

/**
 * The real map: OpenStreetMap, served free by OpenFreeMap as vector tiles and drawn by MapLibre
 * underneath Leaflet's pins. Positron is a quiet, light style that lets the pins lead.
 * The credit line is hidden while PlusFore is a private prototype. OpenStreetMap and OpenFreeMap
 * both require it on anything public, so it must come back (or a paid map with its own terms) at launch.
 */
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';

/** MapLibre needs WebGL; the few browsers without it get the drawn stand-in below */
const webgl = () => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
};

/** A stand-in map: soft streets, parks and water drawn per tile, for browsers that can't show the real one */
const seeded = (x: number, y: number, z: number, n: number) => {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + n * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const MockTiles = L.GridLayer.extend({
  createTile(c: L.Coords) {
    const tile = document.createElement('canvas');
    tile.width = tile.height = 512;
    const g = tile.getContext('2d')!;
    g.scale(2, 2);
    g.fillStyle = '#EEF0EC';
    g.fillRect(0, 0, 256, 256);
    const r = (n: number) => seeded(c.x, c.y, c.z, n);
    // water, parks and a few blocks, kept inside the tile so neighbours never clash
    if (r(1) > 0.8) {
      g.fillStyle = '#D5E6F2';
      g.beginPath();
      g.ellipse(70 + r(2) * 120, 70 + r(3) * 120, 30 + r(4) * 40, 20 + r(5) * 30, r(6) * 3, 0, Math.PI * 2);
      g.fill();
    }
    for (let k = 0; k < 2; k++) {
      if (r(10 + k) > 0.45) {
        g.fillStyle = '#DDEBD0';
        const w = 40 + r(20 + k) * 60;
        const h = 36 + r(30 + k) * 56;
        const px = 20 + r(40 + k) * (216 - w);
        const py = 20 + r(50 + k) * (216 - h);
        g.beginPath();
        g.roundRect(px, py, w, h, 14);
        g.fill();
      }
    }
    // streets: a fine grid across the tile, a wider road on its edges
    g.strokeStyle = '#FFFFFF';
    g.lineCap = 'round';
    g.lineWidth = 3;
    for (let o = 64; o < 256; o += 64) {
      const jx = (r(60 + o) - 0.5) * 8;
      g.beginPath(); g.moveTo(o + jx, 0); g.lineTo(o + jx, 256); g.stroke();
      g.beginPath(); g.moveTo(0, o + jx); g.lineTo(256, o + jx); g.stroke();
    }
    g.lineWidth = 7;
    g.strokeStyle = '#F8F3E4';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(256, 0); g.moveTo(0, 0); g.lineTo(0, 256); g.stroke();
    // a diagonal avenue now and then
    if (r(90) > 0.7) {
      g.lineWidth = 5;
      g.beginPath(); g.moveTo(0, 40 + r(91) * 180); g.lineTo(256, 40 + r(92) * 180); g.stroke();
    }
    return tile;
  },
}) as unknown as new (o: L.GridLayerOptions) => L.GridLayer;

function ensureCss() {
  if (document.getElementById('ff-map-css')) return;
  const el = document.createElement('style');
  el.id = 'ff-map-css';
  el.textContent = PIN_CSS;
  document.head.appendChild(el);
}

export function GamesMap({ me, radiusMiles, pins, selectedId, onSelect, bottomInset = 0, topInset = 0, interactive = true, noun = 'games', showMe = true, zoom, onAreaChange }: GamesMapProps) {
  const follow = !!onAreaChange;
  const onAreaRef = useRef(onAreaChange);
  onAreaRef.current = onAreaChange;
  const insetsRef = useRef({ topInset, bottomInset });
  insetsRef.current = { topInset, bottomInset };
  const reportRef = useRef<() => void>(() => {});
  // the sheet moving up or down changes how much map is showing
  useEffect(() => {
    if (follow) reportRef.current();
  }, [follow, topInset, bottomInset]);
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
      attributionControl: false,
      dragging: interactive,
      touchZoom: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
    });
    if (webgl()) maplibreGL({ style: MAP_STYLE, attributionControl: false, interactive: false } as Parameters<typeof maplibreGL>[0]).addTo(m);
    else new MockTiles({ maxZoom: 18, tileSize: 256 }).addTo(m);
    if (showMe && !follow) L.circle([me.lat, me.lng], { radius: radiusMiles * 1609.34, color: colors.ink, weight: 1, opacity: 0.35, dashArray: '4 6', fillColor: colors.lime, fillOpacity: 0.06 }).addTo(m);
    if (showMe) L.marker([me.lat, me.lng], { icon: L.divIcon({ className: '', html: '<div class="ff-me"></div>', iconSize: [0, 0] }), interactive: false, keyboard: false }).addTo(m);
    map.current = m;
    if (follow) {
      // start on the golfer's area, then let them roam
      const reach = L.latLng(me.lat, me.lng).toBounds(radiusMiles * 1609.34 * 2);
      m.fitBounds(reach, { paddingTopLeft: [20, topInset + 20], paddingBottomRight: [20, bottomInset + 20], animate: false });
      m.setMinZoom(5);
    }
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
        icon: L.divIcon({ className: '', html: `<div class="ff-pin group"><span>${members.length} ${noun}</span><i></i></div>`, iconSize: [0, 0] }),
        title: `${members.length} ${noun}`,
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
    // tell the screen what's visible, once the map settles after a pan or pinch
    let timer: ReturnType<typeof setTimeout> | undefined;
    const report = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const size = m.getSize();
        const { topInset: top, bottomInset: bottom } = insetsRef.current;
        const nw = m.containerPointToLatLng([0, top]);
        const se = m.containerPointToLatLng([size.x, Math.max(top + 40, size.y - bottom)]);
        const area: MapArea = {
          north: nw.lat,
          west: nw.lng,
          south: se.lat,
          east: se.lng,
          centre: { lat: (nw.lat + se.lat) / 2, lng: (nw.lng + se.lng) / 2 },
        };
        onAreaRef.current?.(area);
      }, 180);
    };
    reportRef.current = report;
    if (follow) {
      m.on('moveend', report);
      report();
    }
    return () => {
      m.off('zoomend', redraw);
      m.off('moveend', report);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // frame the games when the set changes, then draw
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const key = pins.map((p) => p.id).join(',');
    // a map that follows the golfer never jumps to fit the pins
    if (!follow && fitted.current !== key) {
      fitted.current = key;
      if (zoom && pins[0]) {
        m.setView([pins[0].lat, pins[0].lng], zoom, { animate: false });
        drawRef.current();
        return;
      }
      const pts: [number, number][] = [...(showMe ? [[me.lat, me.lng] as [number, number]] : []), ...pins.map((p) => [p.lat, p.lng] as [number, number])];
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
