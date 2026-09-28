import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors } from '@/constants/theme';

// Brand artwork for the welcome hero, drawn at the card's real size so the F always
// anchors to the top right corner and the connection sits in the open space.

/** An organic closed contour, like a line on a course survey map */
function contour(cx: number, cy: number, r: number, seed: number, squash = 0.72) {
  const pts: string[] = [];
  const steps = 72;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const wobble = 1 + 0.07 * Math.sin(3 * t + seed) + 0.045 * Math.cos(5 * t + seed * 1.7) + 0.02 * Math.sin(8 * t + seed * 0.6);
    const x = cx + Math.cos(t) * r * wobble;
    const y = cy + Math.sin(t) * r * wobble * squash;
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return pts.join(' ') + 'Z';
}

type Pt = { x: number; y: number };
type Curve = [Pt, Pt, Pt, Pt];

function bez([p0, p1, p2, p3]: Curve, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y };
}

/** Evenly spaced points along a curve, so the dotted trail looks the same at any speed */
function sample(curve: Curve, gap: number) {
  const fine: Pt[] = [];
  for (let i = 0; i <= 240; i++) fine.push(bez(curve, i / 240));
  const lens = [0];
  for (let i = 1; i < fine.length; i++) lens.push(lens[i - 1] + Math.hypot(fine[i].x - fine[i - 1].x, fine[i].y - fine[i - 1].y));
  const total = lens[lens.length - 1];
  const dots: { p: Pt; at: number }[] = [];
  let j = 0;
  for (let d = gap; d < total; d += gap) {
    while (lens[j] < d) j++;
    dots.push({ p: fine[j], at: d / total });
  }
  return { fine, lens, total, dots };
}

/** Point at a share of the curve's length, for the ball's position */
function along(s: ReturnType<typeof sample>, share: number): Pt {
  const target = share * s.total;
  let j = 0;
  while (j < s.lens.length - 1 && s.lens[j] < target) j++;
  return s.fine[j];
}

const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const clamp = (x: number) => Math.max(0, Math.min(1, x));

// Timeline in ms: tee, shot 1, pause, shot 2, land on the green, hold, fade, replay
const T = { shot1: 700, shot1End: 1800, shot2: 2300, shot2End: 3700, fade: 7600, loop: 8300 };

function useClock(enabled: boolean) {
  const [ms, setMs] = useState(enabled ? 0 : T.shot2End + 800);
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      setMs((now - start) % T.loop);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);
  return ms;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

/**
 * width and height: card size. openTop and openBottom: the empty band between the logo
 * and the headline, where the two shots are played.
 */
export function HeroArt({ width, height, openTop, openBottom }: { width: number; height: number; openTop: number; openBottom: number }) {
  const band = openBottom - openTop;
  const showShots = width > 0 && band > 120;
  const reduced = useReducedMotion();
  const ms = useClock(showShots && !reduced);

  // the green: centre of the contour rings in the top right
  const green: Pt = { x: width - 64, y: 132 };

  const art = useMemo(() => {
    if (!width || !height) return null;
    const upper = Array.from({ length: 10 }, (_, i) => contour(green.x, green.y, 30 + i * 30, 0.9 + i * 0.22));
    const lower = Array.from({ length: 5 }, (_, i) => contour(-16, height - 30, 70 + i * 34, 2.4 + i * 0.3, 0.6));
    const tee: Pt = { x: width * 0.1, y: openTop + band * 0.84 };
    const lay: Pt = { x: width * 0.38, y: openTop + band * 0.46 };
    const shot1 = sample([tee, { x: tee.x + (lay.x - tee.x) * 0.05, y: tee.y - (tee.y - lay.y) * 1.05 }, { x: tee.x + (lay.x - tee.x) * 0.6, y: lay.y - 14 }, lay], 6.5);
    const shot2 = sample([lay, { x: lay.x + (green.x - lay.x) * 0.3, y: lay.y - (lay.y - green.y) * 0.95 }, { x: lay.x + (green.x - lay.x) * 0.72, y: green.y - 16 }, green], 6.5);
    return { upper, lower, tee, lay, shot1, shot2 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, openTop, band]);

  if (!art) return null;

  // flag F: 230 x 295 in its own units, scaled so the bar and triangle cross the right edge
  const scale = Math.min(1.3, width / 280);
  const fx = width - 172 * scale;
  const fy = -34 * scale;

  const p1 = easeOut(clamp((ms - T.shot1) / (T.shot1End - T.shot1)));
  const p2 = easeOut(clamp((ms - T.shot2) / (T.shot2End - T.shot2)));
  const fade = 1 - clamp((ms - T.fade) / (T.loop - T.fade));
  const inFlight1 = ms > T.shot1 && ms < T.shot1End;
  const inFlight2 = ms > T.shot2 && ms < T.shot2End;
  const landed = ms >= T.shot2End;
  // landing ripples
  const ripple = (from: number) => clamp((ms - from) / 700);
  const r1 = ripple(T.shot1End);
  const r2 = ripple(T.shot2End);
  // the green lights up when the ball lands, then settles
  const glow = landed ? 0.1 + 0.3 * (1 - clamp((ms - T.shot2End) / 1600)) + 0.12 : 0.1;
  const ball1 = along(art.shot1, p1);
  const ball2 = along(art.shot2, p2);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        {/* the F dissolves well before it reaches the headline */}
        <LinearGradient id="fFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.lime} stopOpacity={0.12} />
          <Stop offset="0.45" stopColor={colors.lime} stopOpacity={0.05} />
          <Stop offset="0.8" stopColor={colors.lime} stopOpacity={0} />
        </LinearGradient>
      </Defs>

      {/* topographic contours, almost tone on tone. The inner rings are the green */}
      <G fill="none" strokeWidth={1}>
        {art.upper.map((d, i) => (
          <Path
            key={`u${i}`}
            d={d}
            stroke={i <= 1 ? colors.lime : i === 3 ? 'rgba(199,255,0,0.1)' : 'rgba(255,255,255,0.045)'}
            strokeOpacity={i <= 1 ? (showShots ? glow * fade + 0.1 * (1 - fade) : 0.1) * (i === 0 ? 1 : 0.6) : 1}
          />
        ))}
        {art.lower.map((d, i) => (
          <Path key={`l${i}`} d={d} stroke="rgba(255,255,255,0.035)" />
        ))}
      </G>

      {/* oversized flag F from the logo, entering from the upper right and cropped by the card */}
      <G transform={`translate(${fx.toFixed(1)} ${fy.toFixed(1)}) scale(${scale.toFixed(3)})`}>
        <Path d="M0 14Q0 0 14 0H230V100L58 57V295H0Z" fill="url(#fFade)" />
        <Path d="M82 92L230 141L82 190Z" fill="url(#fFade)" />
      </G>

      {showShots ? (
        <G opacity={fade}>
          {/* shot 1, then shot 2, as dotted trails that draw behind the ball */}
          {art.shot1.dots.filter((d) => d.at <= p1).map((d, i) => (
            <Circle key={`a${i}`} cx={d.p.x} cy={d.p.y} r={1.1} fill={colors.lime} fillOpacity={0.6} />
          ))}
          {art.shot2.dots.filter((d) => d.at <= p2).map((d, i) => (
            <Circle key={`b${i}`} cx={d.p.x} cy={d.p.y} r={1.1} fill={colors.lime} fillOpacity={0.6} />
          ))}

          {/* the tee */}
          <Circle cx={art.tee.x} cy={art.tee.y} r={9} fill="none" stroke={colors.lime} strokeOpacity={0.22} strokeWidth={1} />
          <Circle cx={art.tee.x} cy={art.tee.y} r={3.5} fill={colors.lime} />

          {/* where shot 1 lands */}
          {ms >= T.shot1End ? (
            <>
              <Circle cx={art.lay.x} cy={art.lay.y} r={3.5 + r1 * 10} fill="none" stroke={colors.lime} strokeOpacity={0.5 * (1 - r1)} strokeWidth={1} />
              <Circle cx={art.lay.x} cy={art.lay.y} r={3.5} fill={colors.lime} fillOpacity={0.85} />
            </>
          ) : null}

          {/* on the green */}
          {landed ? (
            <>
              <Circle cx={green.x} cy={green.y} r={3.5 + r2 * 14} fill="none" stroke={colors.lime} strokeOpacity={0.6 * (1 - r2)} strokeWidth={1} />
              <Circle cx={green.x} cy={green.y} r={3.5} fill={colors.lime} />
            </>
          ) : null}

          {/* the ball in flight */}
          {inFlight1 ? <Circle cx={ball1.x} cy={ball1.y} r={2.8} fill={colors.white} /> : null}
          {inFlight2 ? <Circle cx={ball2.x} cy={ball2.y} r={2.8} fill={colors.white} /> : null}
        </G>
      ) : null}
    </Svg>
  );
}

/** Small outlined forward triangle, the directional motif from the F */
export function ForwardMark({ size = 14, color = colors.lime }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" pointerEvents="none">
      <Path d="M2.5 2 L12 7 L2.5 12 Z" fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
    </Svg>
  );
}
