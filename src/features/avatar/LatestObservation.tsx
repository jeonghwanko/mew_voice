import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MewIcon } from '../../ui/MewIcon';
import { errorMessage } from '../../lib/api';
import { HOME_OBSERVATION_EMPTY, homeObservationSummary } from '../companion/homeObservation';
import { useCompanion } from '../companion/useCompanion';
import { studio as c } from './appearance';

/** Latest saved photo, cry, or short video for the selected cat. Not a second care check-in. */
export function LatestObservation() {
  const companion = useCompanion();
  const pet = companion.activePet;
  const loaded = companion.observations.data?.pages.flatMap(page => page.items) ?? [];
  const summary = homeObservationSummary(loaded, pet?.id, companion.demo);
  const loading = !!pet && companion.observations.isLoading && loaded.length === 0;
  const failed = !!pet && companion.observations.isError && !summary;
  if (!pet) return null;
  const line = loading
    ? '최근 관찰을 확인하고 있어요'
    : failed
      ? '최근 관찰을 불러오지 못했어요'
      : summary
        ? [summary.kindLabel, summary.timeLabel].filter(Boolean).join(' · ')
        : HOME_OBSERVATION_EMPTY;
  const open = () => {
    if (failed) { void companion.observations.refetch(); return; }
    if (summary) router.push(`/observations/${summary.id}`);
  };
  const label = summary
    ? `최근 관찰, ${summary.kindLabel}, ${summary.timeLabel}. ${summary.honesty ?? ''} ${summary.reaction ? `저장한 반응 ${summary.reaction}` : '저장한 반응 없음'}`.replace(/\s+/g, ' ').trim()
    : `최근 관찰, ${line}`;
  return <View style={styles.card}>
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={!summary && !failed} onPress={open} style={styles.main}>
      <MewIcon name="cat" size={22} color={c.accent} />
      <View style={styles.copy}>
        <Text style={styles.kicker}>최근 관찰</Text>
        <Text style={styles.body} numberOfLines={2}>{line}</Text>
        {summary?.honesty ? <Text style={styles.note} numberOfLines={2}>{summary.honesty}</Text> : null}
        {summary?.reaction ? <Text style={styles.note} numberOfLines={1}>저장한 반응: {summary.reaction}</Text> : null}
        {failed ? <Text style={styles.hint}>{errorMessage(companion.observations.error)}</Text> : null}
      </View>
      {loading ? <ActivityIndicator color={c.accent} /> : null}
    </Pressable>
    {summary ? <Pressable accessibilityRole="button" accessibilityLabel="관찰 자세히 보기" onPress={() => router.push(`/observations/${summary.id}`)} style={styles.open}><Text style={styles.openText}>보기</Text></Pressable> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', maxWidth: 560, marginBottom: 8, paddingLeft: 14, paddingRight: 8, paddingVertical: 8, backgroundColor: '#FFFCF6F0', borderRadius: 20, borderWidth: 1, borderColor: '#FFFFFF' },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingVertical: 4 },
  copy: { flex: 1 },
  kicker: { color: c.accent, fontSize: 11, fontWeight: '700' },
  body: { color: c.ink, fontSize: 13, lineHeight: 18, marginTop: 2 },
  note: { color: c.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  hint: { color: c.muted, fontSize: 11, marginTop: 2 },
  open: { minHeight: 44, paddingHorizontal: 14, borderRadius: 14, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  openText: { color: '#FFFDF8', fontSize: 13, fontWeight: '700' },
});
