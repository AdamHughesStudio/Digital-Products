import { Platform } from 'react-native';

/**
 * The web address links point to: PlusFore's own domain. Links to games, opens, championships and
 * profiles land on the website, which forwards them to the app.
 */
export const SITE_HOST = 'getplusfore.app';
export const SITE_URL = `https://${SITE_HOST}`;

/** Where the app's own server routes live: the same site on the web, the live server on the apps */
const API_HOST = 'https://findfore-app.vercel.app';
export const apiUrl = (path: string) => (Platform.OS === 'web' ? path : `${API_HOST}${path}`);
