import type { ImageSource } from 'expo-image';

import { courseById } from './courses';

// Course photography. A club's own photo comes first: one we bundle, or one under an open licence
// from the club list (with a credit that must be shown). Every other course borrows one of the
// general parkland shots, picked the same way each time so a course always shows the same picture.
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
export function photoFor(courseId?: string): number | ImageSource {
  if (courseId && PHOTOS[courseId]) return PHOTOS[courseId];
  const own = courseId ? courseById(courseId)?.photo : undefined;
  if (own) return { uri: own.url };
  const seed = (courseId ?? 'course').split('').reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
  return STAND_INS[seed % STAND_INS.length];
}

/** The course's own photo, or nothing when all we could show is a borrowed one. Takes the course itself so a list redraws when the club's details arrive */
export function ownPhoto(course?: { id: string; photo?: { url: string } }): number | ImageSource | undefined {
  if (!course) return undefined;
  if (PHOTOS[course.id]) return PHOTOS[course.id];
  return course.photo ? { uri: course.photo.url } : undefined;
}

/** Whether we hold a photo of this course itself */
export function hasOwnPhoto(courseId?: string): boolean {
  if (!courseId) return false;
  return !!PHOTOS[courseId] || !!courseById(courseId)?.photo;
}

/** The credit to show with a club's photo, when it's one that needs crediting */
export function photoCreditFor(courseId?: string) {
  if (!courseId || PHOTOS[courseId]) return undefined;
  return courseById(courseId)?.photo;
}
