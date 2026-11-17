import { TERMS_VERSION } from '@/constants/legal';
import { supabase } from '@/lib/supabase';

/** Records that the signed-in golfer agrees to the current terms and privacy policy */
export async function acceptTerms() {
  const { error } = await supabase.rpc('accept_terms', { v: TERMS_VERSION });
  return !error;
}

/** Whether the signed-in golfer has agreed to the current terms. Null when we can't tell, so nobody is blocked by a dropped connection. */
export async function hasAcceptedTerms(): Promise<boolean | null> {
  const { data, error } = await supabase.from('terms_acceptances').select('version').eq('version', TERMS_VERSION).limit(1);
  if (error) return null;
  return (data ?? []).length > 0;
}
