// Course photography, bundled with the app for now. Only a few courses have their own photo, so
// every other course borrows one of the general parkland shots, picked the same way each time so
// a course always shows the same picture.
const STAND_IN_PHOTOS: Record<string, number> = {
  'haggs-castle': require('@/assets/images/courses/haggs-castle.jpg'),
  'buchanan-castle': require('@/assets/images/courses/buchanan-castle.jpg'),
  'cathkin-braes': require('@/assets/images/courses/cathkin-braes.jpg'),
};
// photos of one place only, never lent to another course
const PHOTOS: Record<string, number> = {
  ...STAND_IN_PHOTOS,
  // the Swilcan Bridge on the Old Course, for St Andrews Links and its courses
  'old-course': require('@/assets/images/courses/st-andrews-old-course.jpg'),
};
const STAND_INS = Object.values(STAND_IN_PHOTOS);

/** The course's own photo, or a stand in from the photos we have */
export function photoFor(courseId?: string): number {
  if (courseId && PHOTOS[courseId]) return PHOTOS[courseId];
  const seed = (courseId ?? 'course').split('').reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
  return STAND_INS[seed % STAND_INS.length];
}
