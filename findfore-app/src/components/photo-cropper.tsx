import { Ionicons } from '@expo/vector-icons';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Image, Modal, PanResponder, Platform, Pressable, StyleSheet, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, T } from '@/components/ui';
import { colors, space } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { cropToSquare, pickPhoto } from '@/lib/photo';

const MAX_ZOOM = 4;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Crop = (uri: string) => Promise<string | null>;
const CropContext = createContext<Crop | null>(null);

/** Hosts the crop screen so any part of the app can ask for a photo to be framed */
export function PhotoCropProvider({ children }: { children: ReactNode }) {
  const [job, setJob] = useState<{ uri: string; resolve: (v: string | null) => void } | null>(null);
  const crop = useCallback<Crop>((uri) => new Promise((resolve) => setJob({ uri, resolve })), []);
  return (
    <CropContext.Provider value={crop}>
      {children}
      {job ? (
        <PhotoCropper
          uri={job.uri}
          onDone={(result) => {
            job.resolve(result);
            setJob(null);
          }}
        />
      ) : null}
    </CropContext.Provider>
  );
}

/**
 * Choose a profile photo, then frame it: zoom and move it inside a round frame and confirm.
 * Returns the finished square photo, or null if they backed out at either step.
 */
export function usePickProfilePhoto() {
  const crop = useContext(CropContext);
  return useCallback(async () => {
    const uri = await pickPhoto();
    if (!uri) return null;
    // the phone apps use the system's own crop, which has already happened
    if (Platform.OS !== 'web' || !crop) return uri;
    return crop(uri);
  }, [crop]);
}

function PhotoCropper({ uri, onDone }: { uri: string; onDone: (result: string | null) => void }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const frame = Math.min(width - space.xl * 2, 340);
  const stageH = frame + 96;
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const viewRef = useRef(view);
  viewRef.current = view;

  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    Image.getSize(uri, (w, h) => setNatural({ w, h }), () => done.current(null));
  }, [uri]);

  // the scale at which the photo exactly covers the frame
  const base = natural ? frame / Math.min(natural.w, natural.h) : 1;

  /** Never let the photo move so far that the frame shows an empty edge */
  const settle = useCallback(
    (zoom: number, x: number, y: number) => {
      if (!natural) return { zoom, x, y };
      const z = clamp(zoom, 1, MAX_ZOOM);
      const maxX = (natural.w * base * z - frame) / 2;
      const maxY = (natural.h * base * z - frame) / 2;
      return { zoom: z, x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) };
    },
    [natural, base, frame],
  );

  const zoomTo = useCallback(
    (zoom: number) => {
      const v = viewRef.current;
      const z = clamp(zoom, 1, MAX_ZOOM);
      // zoom around the middle of the frame, so the face stays where it is
      setView(settle(z, (v.x * z) / v.zoom, (v.y * z) / v.zoom));
    },
    [settle],
  );

  // one finger moves the photo, two fingers pinch to zoom
  const gesture = useRef({ zoom: 1, x: 0, y: 0, dx: 0, dy: 0, dist: 0 });
  const settleRef = useRef(settle);
  settleRef.current = settle;
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          gesture.current = { ...viewRef.current, dx: 0, dy: 0, dist: 0 };
        },
        onPanResponderMove: (e: GestureResponderEvent, g) => {
          const touches = e.nativeEvent.touches;
          const st = gesture.current;
          if (touches && touches.length >= 2) {
            const d = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
            if (!st.dist) {
              Object.assign(st, viewRef.current, { dist: d });
              return;
            }
            const z = clamp((st.zoom * d) / st.dist, 1, MAX_ZOOM);
            setView(settleRef.current(z, (st.x * z) / st.zoom, (st.y * z) / st.zoom));
            return;
          }
          // back to one finger after a pinch: carry on from where the photo is now
          if (st.dist) Object.assign(st, viewRef.current, { dist: 0, dx: g.dx, dy: g.dy });
          setView(settleRef.current(st.zoom, st.x + g.dx - st.dx, st.y + g.dy - st.dy));
        },
      }),
    [],
  );

  // a mouse wheel or trackpad zooms too, on a computer
  const stageRef = useRef<View>(null);
  useEffect(() => {
    const node = stageRef.current as unknown as HTMLElement | null;
    if (Platform.OS !== 'web' || !node?.addEventListener) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomTo(viewRef.current.zoom * Math.exp(-e.deltaY / 400));
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [zoomTo]);

  const confirm = async () => {
    if (!natural) return;
    setBusy(true);
    const s = base * view.zoom;
    const size = frame / s;
    const cx = natural.w / 2 - view.x / s;
    const cy = natural.h / 2 - view.y / s;
    try {
      const result = await cropToSquare(uri, {
        x: clamp(cx - size / 2, 0, natural.w - size),
        y: clamp(cy - size / 2, 0, natural.h - size),
        size,
      });
      haptic.success();
      onDone(result);
    } catch {
      setBusy(false);
      onDone(null);
    }
  };

  const dw = natural ? natural.w * base * view.zoom : frame;
  const dh = natural ? natural.h * base * view.zoom : frame;
  const shade = 1200;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => onDone(null)} statusBarTranslucent>
      <View style={[s.screen, { paddingTop: insets.top + space.sm, paddingBottom: Math.max(insets.bottom, 16) + space.sm }]}>
        <View style={s.header}>
          <Pressable onPress={() => onDone(null)} hitSlop={12} accessibilityRole="button" style={s.headerSide}>
            <T variant="bodyStrong" color={colors.onInk}>Cancel</T>
          </Pressable>
          <T variant="subheading" color={colors.white}>Frame your photo</T>
          <View style={s.headerSide} />
        </View>

        <View ref={stageRef} style={[s.stage, { height: stageH }, Platform.OS === 'web' && ({ touchAction: 'none', userSelect: 'none', cursor: 'grab' } as object)]} {...pan.panHandlers}>
          {natural ? (
            <Image
              source={{ uri }}
              style={{ position: 'absolute', width: dw, height: dh, left: width / 2 - dw / 2 + view.x, top: stageH / 2 - dh / 2 + view.y }}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : null}
          {/* everything outside the round frame is dimmed */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: width / 2 - frame / 2 - shade,
              top: stageH / 2 - frame / 2 - shade,
              width: frame + shade * 2,
              height: frame + shade * 2,
              borderRadius: frame / 2 + shade,
              borderWidth: shade,
              borderColor: 'rgba(10,10,10,0.72)',
            }}
          />
          <View pointerEvents="none" style={[s.ring, { left: width / 2 - frame / 2, top: stageH / 2 - frame / 2, width: frame, height: frame, borderRadius: frame / 2 }]} />
        </View>

        <T variant="small" color={colors.onInkMuted} style={{ textAlign: 'center', marginTop: space.md }}>
          Pinch or use the slider to zoom. Drag to move.
        </T>

        <View style={[s.zoomRow, { width: frame }]}>
          <Pressable onPress={() => zoomTo(view.zoom / 1.25)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Zoom out">
            <Ionicons name="remove" size={22} color={colors.onInk} />
          </Pressable>
          <ZoomSlider value={(view.zoom - 1) / (MAX_ZOOM - 1)} onChange={(t) => zoomTo(1 + t * (MAX_ZOOM - 1))} />
          <Pressable onPress={() => zoomTo(view.zoom * 1.25)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Zoom in">
            <Ionicons name="add" size={22} color={colors.onInk} />
          </Pressable>
        </View>

        <View style={{ flex: 1 }} />
        <View style={{ paddingHorizontal: space.md }}>
          <Button title="Use this photo" loading={busy} disabled={!natural} onPress={confirm} />
        </View>
      </View>
    </Modal>
  );
}

/** A zoom track: tap or drag anywhere along it */
function ZoomSlider({ value, onChange }: { value: number; onChange: (t: number) => void }) {
  const [trackW, setTrackW] = useState(1);
  const start = useRef(0);
  const widthRef = useRef(1);
  widthRef.current = trackW;
  const change = useRef(onChange);
  change.current = onChange;
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          start.current = e.nativeEvent.locationX;
          change.current(clamp(start.current / widthRef.current, 0, 1));
        },
        onPanResponderMove: (_e, g) => change.current(clamp((start.current + g.dx) / widthRef.current, 0, 1)),
      }),
    [],
  );
  return (
    <View
      style={[s.track, Platform.OS === 'web' && ({ touchAction: 'none', cursor: 'pointer' } as object)]}
      onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
      accessibilityRole="adjustable"
      accessibilityLabel="Zoom"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      {...pan.panHandlers}
    >
      <View pointerEvents="none" style={s.trackLine}>
        <View style={[s.trackFill, { width: `${value * 100}%` }]} />
      </View>
      <View pointerEvents="none" style={[s.knob, { left: value * trackW - 11 }]} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.md, height: 48 },
  headerSide: { width: 64 },
  stage: { width: '100%', overflow: 'hidden', marginTop: space.lg },
  ring: { position: 'absolute', borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)' },
  zoomRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, alignSelf: 'center', marginTop: space.lg },
  track: { flex: 1, height: 36, justifyContent: 'center' },
  trackLine: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' },
  trackFill: { height: 4, backgroundColor: colors.accent },
  knob: { position: 'absolute', top: 7, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white },
});
