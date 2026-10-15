import { Redirect } from 'expo-router';

/** The + button opens the post a game form directly; this route only exists to hold its place in the tab bar */
export default function Post() {
  return <Redirect href="/post/game" />;
}
