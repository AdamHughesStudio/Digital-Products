import { Platform, Share } from 'react-native';

import { SITE_URL } from '@/constants/site';

/**
 * Share a listing. Uses the system share sheet where there is one; on browsers without it the
 * link is copied instead. Returns 'copied' so the caller can say so.
 */
export async function shareLink(title: string, path: string): Promise<'shared' | 'copied' | 'failed'> {
  const url = `${SITE_URL}${path}`;
  if (Platform.OS === 'web') {
    const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }) : undefined;
    if (nav?.share) {
      try {
        await nav.share({ title, url });
        return 'shared';
      } catch {
        return 'failed';
      }
    }
    try {
      await nav?.clipboard?.writeText(`${title} ${url}`);
      return 'copied';
    } catch {
      return 'failed';
    }
  }
  try {
    await Share.share({ message: `${title} ${url}`, url, title });
    return 'shared';
  } catch {
    return 'failed';
  }
}
