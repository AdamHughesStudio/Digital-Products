import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Field, Sheet, T } from '@/components/ui';
import { useToast } from '@/components/toast';
import { colors, space } from '@/constants/theme';
import type { Course } from '@/data/types';
import { suggestCourse } from '@/lib/cloud';
import { haptic } from '@/lib/haptics';

/**
 * "Don't see your course?" A golfer tells us about a missing club, or a missing course at a club.
 * It comes to us to check: the directory is ours, so nothing here shows in the app until we add it.
 */
export function SuggestCourseSheet({ visible, onClose, club, initialName }: { visible: boolean; onClose: () => void; club?: Course; initialName?: string }) {
  const toast = useToast();
  const [clubName, setClubName] = useState('');
  const [courseName, setCourseName] = useState('');
  const [town, setTown] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setClubName(club?.name ?? initialName ?? '');
    setCourseName('');
    setTown(club?.town ?? '');
    setNote('');
  }, [visible, club, initialName]);

  const ok = clubName.trim().length >= 2 && (!club || courseName.trim().length >= 2);

  const send = async () => {
    if (!ok || sending) return;
    setSending(true);
    const r = await suggestCourse({ clubId: club?.id, clubName, courseName, town, note });
    setSending(false);
    if (!r.ok) return toast(r.error, { icon: 'alert-circle-outline' });
    haptic.success();
    onClose();
    toast('Thanks. We’ll check it and add it to FindFore', { icon: 'checkmark-circle' });
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={club ? 'Missing a course?' : 'Don’t see your course?'}>
      <T variant="body" color={colors.textMuted}>
        {club ? `Tell us which course at ${club.name} is missing.` : 'Tell us where you play.'} We check every course before it goes on FindFore, so it may take a few days to appear.
      </T>
      <View style={{ gap: space.md, marginTop: space.lg }}>
        {club ? null : <Field label="Club" value={clubName} onChangeText={setClubName} placeholder="e.g. Hilton Park Golf Club" maxLength={120} autoCapitalize="words" />}
        <Field label={club ? 'Course' : 'Course, if the club has more than one'} value={courseName} onChangeText={setCourseName} placeholder={club ? 'e.g. The Allander' : 'Optional'} maxLength={80} autoCapitalize="words" />
        {club ? null : <Field label="Town" value={town} onChangeText={setTown} placeholder="e.g. Milngavie" maxLength={80} autoCapitalize="words" />}
        <Field label="Anything else" value={note} onChangeText={setNote} placeholder="Optional" maxLength={500} multiline />
      </View>
      <Button title="Send to FindFore" onPress={send} disabled={!ok} loading={sending} style={{ marginTop: space.xl }} />
    </Sheet>
  );
}
