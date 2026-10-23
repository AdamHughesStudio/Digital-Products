window.__timelines = window.__timelines || {};
var tl = gsap.timeline({ paused: true });

// ---------- scene changes ----------
// Each one hides the outgoing scene and reveals the incoming one at T.

function blurCross(o, n, T) {
  tl.to(o, { opacity: 0, filter: 'blur(20px)', duration: 0.5, ease: 'power2.in' }, T);
  tl.fromTo(n, { opacity: 0, filter: 'blur(20px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.6, ease: 'power2.out', immediateRender: false }, T + 0.15);
}
function whip(o, n, T) {
  tl.to(o, { x: -400, filter: 'blur(24px)', duration: 0.3, ease: 'power3.in' }, T);
  tl.set(o, { opacity: 0 }, T + 0.3);
  tl.fromTo(n, { opacity: 1, x: 400, filter: 'blur(24px)' }, { x: 0, filter: 'blur(0px)', duration: 0.4, ease: 'power3.out', immediateRender: false }, T + 0.3);
}
function zoomThrough(o, n, T) {
  tl.to(o, { scale: 1.2, filter: 'blur(20px)', duration: 0.25, ease: 'power3.in' }, T);
  tl.set(o, { opacity: 0 }, T + 0.25);
  tl.fromTo(n, { opacity: 1, scale: 0.75, filter: 'blur(20px)' }, { scale: 1, filter: 'blur(0px)', duration: 0.5, ease: 'expo.out', immediateRender: false }, T + 0.25);
}
function wipe(o, n, T) {
  tl.fromTo('#wipe', { xPercent: -100 }, { xPercent: 0, duration: 0.35, ease: 'power3.in', immediateRender: false }, T);
  tl.set(o, { opacity: 0 }, T + 0.35);
  tl.set(n, { opacity: 1 }, T + 0.35);
  tl.to('#wipe', { xPercent: 100, duration: 0.45, ease: 'power3.out' }, T + 0.35);
}
tl.set('#wipe', { xPercent: -100 }, 0);

// ---------- scene 1: brand open (0 to 5s) ----------
tl.fromTo('#s1-glow', { scale: 0.85, opacity: 0.5 }, { scale: 1.08, opacity: 1, duration: 5, ease: 'sine.inOut' }, 0);
tl.fromTo('#s1-plus', { scale: 0, rotation: -90, transformOrigin: '50% 50%' }, { scale: 1, rotation: 0, duration: 0.9, ease: 'back.out(1.7)' }, 0.3);
tl.fromTo('#s1-f', { x: 260, opacity: 0 }, { x: 0, opacity: 1, duration: 0.9, ease: 'expo.out' }, 0.6);
tl.fromTo('#s1-word .ch', { yPercent: 120, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7, ease: 'power4.out', stagger: 0.05 }, 1.25);
tl.fromTo('#s1-rule', { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: 'power3.inOut' }, 1.95);
tl.fromTo('#s1-tag', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'sine.out' }, 2.35);
tl.fromTo('#s1-meta', { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: 'expo.out' }, 0.5);
tl.fromTo('#s1-meta2', { x: 30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: 'expo.out' }, 0.7);

blurCross('#scene1', '#scene2', 5);

// ---------- scene 2: the hook (5 to 10.5s) ----------
tl.fromTo('#s2-ghost', { y: 60, scale: 0.94 }, { y: -30, scale: 1, duration: 5.5, ease: 'none' }, 5);
var lineAt = [5.4, 6.45, 7.5];
lineAt.forEach(function (t, i) {
  tl.fromTo('#s2-l' + i, { x: -110, opacity: 0, filter: 'blur(12px)' }, { x: 0, opacity: 1, filter: 'blur(0px)', duration: 0.45, ease: 'expo.out' }, t);
  tl.fromTo('#s2-p' + i, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2.4)' }, t + 0.1);
  if (i > 0) tl.to('#s2-l' + (i - 1), { opacity: 0.32, duration: 0.3, ease: 'power1.out' }, t);
});
tl.fromTo('#s2-p3', { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'power2.out' }, 7.8);
tl.fromTo('#s2-flabel', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: 'sine.out' }, 5.7);
tl.to('#s2-l2', { opacity: 0.32, duration: 0.3, ease: 'power1.out' }, 8.55);
tl.fromTo('#s2-ans', { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'expo.out' }, 8.55);
tl.to('#s2-p3', { backgroundColor: '#ADC8A2', borderColor: '#ADC8A2', color: '#0F1A14', scale: 1.14, duration: 0.35, ease: 'back.out(3)' }, 8.7);
tl.to('#s2-p3', { scale: 1, duration: 0.4, ease: 'power2.out' }, 9.05);
tl.to('#s2-flabel', { opacity: 0, duration: 0.25, ease: 'power1.in' }, 8.7);
tl.fromTo('#s2-flabel2', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, ease: 'expo.out' }, 8.9);

wipe('#scene2', '#scene3', 10.5);

// ---------- feature scenes ----------
function feature(n, t0, end, callouts, backPhone) {
  var s = '#s' + n;
  var dur = end - t0;
  tl.fromTo('#ghost-' + (n - 2), { x: 120 }, { x: -60, duration: dur, ease: 'none' }, t0);
  tl.fromTo(s + '-stage', { y: 12 }, { y: -12, duration: dur, ease: 'sine.inOut' }, t0);
  tl.fromTo(s + '-eyebrow', { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.7, ease: 'expo.out' }, t0 + 0.15);
  tl.fromTo(s + '-hl0, ' + s + '-hl1', { yPercent: 110 }, { yPercent: 0, duration: 0.75, ease: 'power4.out', stagger: 0.12 }, t0 + 0.3);
  tl.fromTo(s + '-sub', { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.out' }, t0 + 0.8);
  tl.fromTo(s + '-phone', { y: 170, opacity: 0, rotationX: 14, transformPerspective: 1600 }, { y: 0, opacity: 1, rotationX: 0, transformPerspective: 1600, duration: 1.0, ease: 'power3.out' }, t0 + 0.35);
  if (backPhone) {
    tl.fromTo(s + '-back', { x: -160, opacity: 0, rotationY: 18, transformPerspective: 1400 }, { x: 0, opacity: 0.55, rotationY: 12, transformPerspective: 1400, duration: 0.9, ease: 'expo.out' }, t0 + 0.6);
  }
  for (var i = 0; i < callouts; i++) {
    var c = s + '-c' + i;
    var ti = t0 + 1.7 + i * 1.55;
    tl.fromTo(c + '-ring', { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2.2)' }, ti);
    tl.fromTo(c + '-dot', { scale: 0, opacity: 0, transformOrigin: '50% 50%' }, { scale: 1, opacity: 1, duration: 0.3, ease: 'power2.out' }, ti + 0.2);
    tl.fromTo(c + '-line', { strokeDashoffset: 600 }, { strokeDashoffset: 0, duration: 0.6, ease: 'power2.inOut' }, ti + 0.2);
    tl.fromTo(c + '-label', { opacity: 0, x: 36, yPercent: -50 }, { opacity: 1, x: 0, yPercent: -50, duration: 0.6, ease: 'expo.out' }, ti + 0.5);
    var reps = Math.max(0, Math.floor((end - ti - 0.6) / 1.2) - 1);
    tl.fromTo(c + '-ring .ring-pulse', { scale: 1, opacity: 0.9 }, { scale: 1.18, opacity: 0, duration: 1.2, ease: 'sine.out', repeat: reps }, ti + 0.6);
  }
}

feature(3, 10.85, 20, 3, false);
whip('#scene3', '#scene4', 20);

feature(4, 20.3, 28.5, 3, false);
tl.fromTo('#s4-st0, #s4-ar0, #s4-st1, #s4-ar1, #s4-st2', { x: -24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: 'power3.out', stagger: 0.12 }, 21.4);
tl.fromTo('#s4-st2', { boxShadow: '0 0 0 0 rgba(173, 200, 162, 0.7)' }, { boxShadow: '0 0 0 14px rgba(173, 200, 162, 0)', duration: 1.2, ease: 'sine.out', repeat: 4 }, 22.2);
zoomThrough('#scene4', '#scene5', 28.5);

feature(5, 28.75, 37, 3, true);
whip('#scene5', '#scene6', 37);

feature(6, 37.3, 45.5, 3, true);
blurCross('#scene6', '#scene7', 45.5);

feature(7, 45.8, 53, 3, true);

// ---------- scene 8: word wall, hard cuts on the beat (53 to 56.5s) ----------
tl.set('#scene7', { opacity: 0 }, 53);
tl.set('#scene8', { opacity: 1 }, 53);
var wallBg = ['#577A67', '#0F1A14', '#ADC8A2', '#17271E', '#577A67'];
var wallInk = ['#FBF7EE', '#ADC8A2', '#0F1A14', '#FBF7EE', '#FBF7EE'];
for (var w = 0; w < 5; w++) {
  var tw = 53 + w * 0.68;
  tl.set('#s8-bg', { backgroundColor: wallBg[w] }, tw);
  if (w > 0) tl.set('#s8-w' + (w - 1), { opacity: 0 }, tw);
  tl.fromTo('#s8-w' + w, { opacity: 1, scale: 1.3, color: wallInk[w] }, { opacity: 1, scale: 1, color: wallInk[w], duration: 0.35, ease: 'expo.out', immediateRender: false }, tw);
}

wipe('#scene8', '#scene9', 56.5);

// ---------- scene 9: call to action (56.5 to 60s) ----------
tl.fromTo('#s9-glow', { scale: 0.9 }, { scale: 1.06, duration: 3.5, ease: 'sine.inOut' }, 56.5);
tl.fromTo('#s9-plus', { scale: 0, rotation: -90, transformOrigin: '50% 50%' }, { scale: 1, rotation: 0, duration: 0.7, ease: 'back.out(1.8)' }, 56.9);
tl.fromTo('#s9-f', { x: 200, opacity: 0 }, { x: 0, opacity: 1, duration: 0.7, ease: 'expo.out' }, 57.05);
tl.fromTo('#s9-word', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power4.out' }, 57.15);
tl.fromTo('#s9-tag', { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.7, ease: 'expo.out' }, 57.35);
tl.fromTo('#s9-url', { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(2)' }, 57.5);
tl.fromTo('#s9-meta', { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.5, ease: 'sine.out' }, 57.7);
// the only exit: a fade to the forest canvas at the very end
tl.to('#scene9 .cta, #s9-meta', { opacity: 0, duration: 0.45, ease: 'power2.in' }, 59.55);

window.__timelines['main'] = tl;
