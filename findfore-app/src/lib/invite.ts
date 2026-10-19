import type { Golfer } from '@/data/types';
import { shareLink } from './share';

/** The link that opens someone's profile, or the sign up page if the person tapping it isn't on PlusFore yet */
export const profilePath = (g: Pick<Golfer, 'username'>) => `/u/${g.username}`;

/** Share your own profile so golf friends can add you. Returns 'copied' when the link went to the clipboard */
export function shareMyProfile(me: Golfer) {
  return shareLink(`Add me on PlusFore, I’m @${me.username}. Find games, opens and golfers near you.`, profilePath(me));
}
