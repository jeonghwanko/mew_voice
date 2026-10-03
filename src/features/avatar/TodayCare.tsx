import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MewIcon } from '../../ui/MewIcon';
import { errorMessage } from '../../lib/api';
import { dayKey, todayCareTruncationNote, todayCheckinSummary, todayCheckins } from '../companion/daily';
import { useCheckins } from '../companion/useCheckins';
import { loadTodayCheckins } from '../companion/weeklyPages';
import { homeCheckinHref } from '../companion/checkinNavigation';
import { studio as c } from './appearance';

/** Today's care check-in for the selected cat, on the home surface. */
export function TodayCare() {
  const checkins = useCheckins();
  const pet = checkins.activePet;
  const todayKey = dayKey(new Date());
  const walked = useQuery({
    queryKey: [...checkins.key, 'today-care', pet?.id, checkins.demo, todayKey],
    enabled: !!pet,
    queryFn: () => loadTodayCheckins(checkins.demo, pet!.id),
  });
  const today = todayCheckins(walked.data?.items ?? [], pet?.id);
  const summary = todayCheckinSummary(today);
  const truncationNote = todayCareTruncationNote(walked.data?.truncated === true);
  const loading = !!pet && walked.isLoading && today.length === 0;
  const failed = !!pet && walked.isError && today.length === 0;
  const line = !pet
    ? (checkins.pets.isLoading ? '함께할 아이를 확인하고 있어요' : '아이를 등록하면 오늘의 돌봄을 남길 수 있어요')
    : loading ? '오늘의 돌봄을 확인하고 있어요'
    : failed ? '오늘의 돌봄을 불러오지 못했어요'
    : summary ? `${summary.title}\n${summary.detail}`
    : '오늘 아직 기록이 없어요';
  const open = () => {
    if (!pet) { router.push('/pets/new'); return; }
    if (failed) { void walked.refetch(); return; }
    if (today[0]) router.push(homeCheckinHref(today[0].id));
    else router.push('/checkin');
  };
  const add = () => router.push(pet ? '/checkin' : '/pets/new');
  const labelBase = summary
    ? `오늘의 돌봄, ${summary.title}. ${summary.detail}`
    : `오늘의 돌봄, ${line.replace('\n', ', ')}`;
  const label = truncationNote ? `${labelBase} ${truncationNote}` : labelBase;
  return <View style={styles.card}>
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={open} style={styles.main}>
      <MewIcon name="diary" size={22} color={c.accent} />
      <View style={styles.copy}>
        <Text style={styles.kicker}>오늘의 돌봄</Text>
        <Text style={styles.body} numberOfLines={2}>{line}</Text>
        {truncationNote ? <Text style={styles.hint}>{truncationNote}</Text> : null}
        {failed ? <Text style={styles.hint}>{errorMessage(walked.error)}</Text> : null}
      </View>
      {loading ? <ActivityIndicator color={c.accent} /> : null}
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={pet ? '오늘 돌봄 기록하기' : '우리 아이 등록하기'} onPress={add} style={styles.add}>
      <Text style={styles.addText}>{pet ? '남기기' : '등록'}</Text>
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', maxWidth: 560, marginBottom: 8, paddingLeft: 14, paddingRight: 8, paddingVertical: 8, backgroundColor: '#FFFCF6F0', borderRadius: 20, borderWidth: 1, borderColor: '#FFFFFF' },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingVertical: 4 },
  copy: { flex: 1 },
  kicker: { color: c.accent, fontSize: 11, fontWeight: '700' },
  body: { color: c.ink, fontSize: 13, lineHeight: 18, marginTop: 2 },
  hint: { color: c.muted, fontSize: 11, marginTop: 2 },
  add: { minHeight: 44, paddingHorizontal: 14, borderRadius: 14, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  addText: { color: '#FFFDF8', fontSize: 13, fontWeight: '700' },
});
