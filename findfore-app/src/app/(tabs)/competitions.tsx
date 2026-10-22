import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Competitions live on Home now, under the Competitions tab, with filters that open over the feed.
 * Old links here (shared, or saved to a phone) land there, with any country or type they carried.
 */
export default function Competitions() {
  const { country, show } = useLocalSearchParams<{ country?: string; show?: string }>();
  const extra = `${country ? `&country=${encodeURIComponent(country)}` : ''}${show ? `&show=${encodeURIComponent(show)}` : ''}`;
  return <Redirect href={`/?cat=competitions${extra}` as never} />;
}
