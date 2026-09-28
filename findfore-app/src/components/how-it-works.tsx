import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Row, T } from './ui';
import { colors, space } from '@/constants/theme';

const STEPS: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; body: string }[] = [
  { icon: 'flag', title: 'Got a tee time?', body: 'Post it and golfers nearby can ask to join.' },
  { icon: 'search', title: 'Free to play?', body: 'Request a space in a game, or post when you’re free.' },
  { icon: 'chatbubbles', title: 'Then chat', body: 'Messages open once a host says yes.' },
  { icon: 'wallet', title: 'Credits keep it fair', body: 'Joining a game uses 1 credit. You start with 5, earn 1 for every game you host, or get more each month with Pro.' },
  { icon: 'thumbs-up', title: 'After your round', body: 'Rate how it went and save the golfers you’d play with again.' },
];

export function HowItWorksSteps() {
  return (
    <View style={{ gap: space.lg }}>
      {STEPS.map((st) => (
        <Row key={st.title} gap={space.md} align="flex-start">
          <View style={s.icon}>
            <Ionicons name={st.icon} size={16} color={colors.lime} />
          </View>
          <View style={{ flex: 1 }}>
            <T variant="bodyStrong">{st.title}</T>
            <T variant="small" color={colors.textMuted}>{st.body}</T>
          </View>
        </Row>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  icon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
});
