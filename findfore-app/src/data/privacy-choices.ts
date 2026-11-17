import { createLocalStore } from './local-store';
import { supabase } from '@/lib/supabase';

/**
 * Whether someone is happy for PlusFore to use analytics, and to show personalised adverts.
 * Both start off, and stay off until the golfer turns them on in Profile, then Privacy.
 * Nothing uses them yet: any analytics or advert code must check privacyChoicesNow() before it
 * starts, and the account keeps a copy as the record of consent.
 */
export interface PrivacyChoices {
  analytics: boolean;
  personalisedAds: boolean;
}

const store = createLocalStore<PrivacyChoices>('findfore:privacy-choices', { analytics: false, personalisedAds: false });

export const usePrivacyChoices = store.use;
export const privacyChoicesNow = store.get;

export async function setPrivacyChoice(key: keyof PrivacyChoices, on: boolean) {
  const next = { ...store.get(), [key]: on };
  store.set(next);
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  await supabase
    .from('privacy_choices')
    .upsert({ user_id: data.session.user.id, analytics: next.analytics, personalised_ads: next.personalisedAds, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
}
