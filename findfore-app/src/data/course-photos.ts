// Course photography, bundled with the app for now. Only three courses have their own photo, so
// every other course borrows one of these, picked the same way each time so a course always shows
// the same picture.
const PHOTOS: Record<string, number> = {
  'haggs-castle': require('@/assets/images/courses/haggs-castle.jpg'),
  'buchanan-castle': require('@/assets/images/courses/buchanan-castle.jpg'),
  'cathkin-braes': require('@/assets/images/courses/cathkin-braes.jpg'),
};
const STAND_INS = Object.values(PHOTOS);

/** The course's own photo, or a stand in from the photos we have */
export function photoFor(courseId?: string): number {
  if (courseId && PHOTOS[courseId]) return PHOTOS[courseId];
  const seed = (courseId ?? 'course').split('').reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
  return STAND_INS[seed % STAND_INS.length];
}
