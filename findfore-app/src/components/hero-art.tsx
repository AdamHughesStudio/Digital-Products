import { StyleSheet } from 'react-native';
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

/**
 * width and height: card size. openTop and openBottom: the empty band between the logo
 * and the headline, where the connection motif may sit.
 */
export function HeroArt({ width, height, openTop, openBottom }: { width: number; height: number; openTop: number; openBottom: number }) {
  if (!width || !height) return null;
  const upper = Array.from({ length: 10 }, (_, i) => contour(width - 64, 132, 30 + i * 30, 0.9 + i * 0.22));
  const lower = Array.from({ length: 5 }, (_, i) => contour(-16, height - 30, 70 + i * 34, 2.4 + i * 0.3, 0.6));

  // flag F: 230 x 295 in its own units, scaled so the bar and triangle cross the right edge
  const scale = Math.min(1.3, width / 280);
  const fx = width - 172 * scale;
  const fy = -34 * scale;

  // connection: two golfers finding one another locally
  const band = openBottom - openTop;
  const showConnection = band > 120;
  const ax = width * 0.1;
  const ay = openTop + band * 0.78;
  const bx = width * 0.36;
  const by = openTop + band * 0.32;

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

      {/* topographic contours, almost tone on tone */}
      <G fill="none" strokeWidth={1}>
        {upper.map((d, i) => (
          <Path key={`u${i}`} d={d} stroke={i === 3 ? 'rgba(199,255,0,0.1)' : 'rgba(255,255,255,0.045)'} />
        ))}
        {lower.map((d, i) => (
          <Path key={`l${i}`} d={d} stroke="rgba(255,255,255,0.035)" />
        ))}
      </G>

      {/* oversized flag F from the logo, entering from the upper right and cropped by the card */}
      <G transform={`translate(${fx.toFixed(1)} ${fy.toFixed(1)}) scale(${scale.toFixed(3)})`}>
        <Path d="M0 14Q0 0 14 0H230V100L58 57V295H0Z" fill="url(#fFade)" />
        <Path d="M82 92L230 141L82 190Z" fill="url(#fFade)" />
      </G>

      {showConnection ? (
        <G>
          <Path
            d={`M${ax} ${ay} C ${ax + (bx - ax) * 0.2} ${ay - (ay - by) * 0.95}, ${ax + (bx - ax) * 0.65} ${by - 8}, ${bx} ${by}`}
            fill="none"
            stroke={colors.lime}
            strokeOpacity={0.5}
            strokeWidth={1}
            strokeDasharray="2 5"
            strokeLinecap="round"
          />
          <Circle cx={ax} cy={ay} r={9} fill="none" stroke={colors.lime} strokeOpacity={0.22} strokeWidth={1} />
          <Circle cx={ax} cy={ay} r={3.5} fill={colors.lime} />
          <Circle cx={bx} cy={by} r={3.5} fill={colors.lime} fillOpacity={0.85} />
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
