import { useMemo } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { studio as c } from '../../src/features/avatar/appearance';
import { useCheckins } from '../../src/features/companion/useCheckins';
import { loadWeeklyRecords } from '../../src/features/companion/weeklyPages';
import { formatDayKey, summarizeWeek, weeklyObservationKinds, type WeeklySummary } from '../../src/features/companion/weeklySummary';
import { errorMessage } from '../../src/lib/api';

function countLine(summary: WeeklySummary) {
  const parts = summary.kindCounts
    .filter(item => item.count !== null)
    .map(item => `${item.label} ${item.count}건`);
  parts.push(`돌봄 ${summary.checkinCount}건`);
  return parts.join(' · ');
}

export default function WeeklyReport() {
  const focused = useIsFocused();
  const checkins = useCheckins();
  const pet = checkins.activePet;
  const week = useQuery({
    queryKey: [...checkins.key, 'weekly-window', pet?.id, checkins.demo],
    enabled: !!pet,
    queryFn: () => loadWeeklyRecords(checkins.demo, pet!.id),
  });
  const loading = !!pet && week.isLoading;
  const error = week.error ?? checkins.pets.error;
  const summary = useMemo(() => {
    if (!pet || loading || !week.data) return null;
    return summarizeWeek({
      petId: pet.id,
      observations: week.data.observations,
      feedback: week.data.observations.flatMap(item => item.feedback ?? []),
      checkins: week.data.checkins,
      demo: checkins.demo,
      observationKinds: weeklyObservationKinds(checkins.demo),
      truncatedObservations: week.data.observationsTruncated,
      truncatedCheckins: week.data.checkinsTruncated,
    });
  }, [pet, loading, week.data, checkins.demo]);
  const unavailable = summary?.kindCounts.find(item => item.count === null);
  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
    {focused && <StatusBar style="dark" />}
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" accessibilityLabel="기록으로 돌아가기" onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>기록</Text></Pressable>
      <Text style={styles.kicker}>행동 평가가 아닌 기록 집계</Text>
      <Text accessibilityRole="header" style={styles.title}>최근 7일 요약</Text>
      <View style={styles.pets}>{checkins.pets.data?.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: pet?.id === item.id }} onPress={() => void checkins.selectPet(item.id)} style={[styles.chip, pet?.id === item.id && styles.selected]}><Text style={styles.chipText}>{item.name}</Text></Pressable>)}</View>
      {!pet && <View style={styles.card}><Text style={styles.section}>기록할 아이를 등록해 주세요</Text><Text style={styles.body}>선택된 고양이가 없으면 이번 주 기록을 모을 수 없어요.</Text><Pressable accessibilityRole="button" onPress={() => router.push('/pets/new')} style={styles.add}><Text style={styles.addText}>우리 아이 등록하기</Text></Pressable></View>}
      {loading && <ActivityIndicator accessibilityLabel="주간 요약 불러오는 중" style={{ marginVertical: 24 }} color={c.accent} />}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{errorMessage(error)}</Text> : null}
      {summary && pet && <>
        <Text style={styles.body}>{formatDayKey(summary.startKey)} – {formatDayKey(summary.endKey)} · 한국 시간 · {pet.name}</Text>
        <View style={styles.card}>
          <Text style={styles.section}>남긴 기록</Text>
          <Text style={styles.count}>{summary.recordCount}건</Text>
          <Text style={styles.body}>{countLine(summary)}</Text>
          {unavailable ? <Text style={styles.body}>{unavailable.unavailableReason}</Text> : null}
          <Text style={styles.body}>{checkins.demo
            ? '이 숫자는 이 기기에 남긴 기록만 세어요. 실제 AI 분석이 아니에요. 더 남겼다는 것은 더 기록했다는 뜻이지, 행동이 나빠졌다는 뜻이 아니에요.'
            : '이미 불러온 관찰·돌봄만 세어요. 주간 요약 API는 없어요. 실제 AI 분석이 아니에요. 더 남겼다는 것은 더 기록했다는 뜻이지, 행동이 나빠졌다는 뜻이 아니에요.'}</Text>
        </View>
        {summary.insufficient ? <View style={styles.card}><Text style={styles.section}>아직 요약하기 어려워요</Text><Text accessibilityRole="alert" style={styles.body}>{summary.insufficientReason}</Text></View> : <View style={styles.card}><Text style={styles.section}>자주 남긴 상황</Text>{summary.frequentTags.length ? summary.frequentTags.map(tag => <Text key={tag.tag} style={styles.body}>{tag.tag} · {tag.count}번</Text>) : <Text style={styles.body}>이 기간 관찰에는 상황 태그가 없어요. 태그가 없다고 특별한 의미로 해석하지 않아요.</Text>}</View>}
        <View style={styles.card}><Text style={styles.section}>보호자 반응</Text><Text style={styles.body}>{summary.feedbackRecorded ? `이후 반응을 ${summary.feedbackCount}번 남겼어요. 반응의 좋고 나쁨은 판단하지 않아요.` : '이 기간 관찰에 이어서 남긴 반응은 아직 없어요.'}</Text></View>
        <Text style={styles.note}>{summary.notice}</Text>
      </>}
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background }, content: { padding: 24, paddingBottom: 40, width: '100%', maxWidth: 640, alignSelf: 'center' },
  back: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', marginBottom: 8 }, backText: { color: c.accent, fontSize: 14, fontWeight: '600' },
  kicker: { color: c.muted, fontSize: 12, marginBottom: 6 }, title: { fontSize: 30, color: c.ink, fontWeight: '700' },
  pets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 20 }, chip: { borderWidth: 1, borderColor: c.border, borderRadius: 18, paddingHorizontal: 15, paddingVertical: 12, minHeight: 44 }, selected: { backgroundColor: c.soft, borderColor: c.accent }, chipText: { fontSize: 13, color: c.ink },
  card: { backgroundColor: c.surface, borderRadius: 22, padding: 18, marginTop: 14, gap: 8 }, section: { color: c.ink, fontSize: 19, fontWeight: '600' }, count: { color: c.ink, fontSize: 28, fontWeight: '700' },
  body: { color: c.muted, fontSize: 14, lineHeight: 22 }, note: { color: c.muted, fontSize: 12, lineHeight: 20, marginTop: 16 },
  add: { minHeight: 44, backgroundColor: c.accent, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, alignItems: 'center', alignSelf: 'flex-start' }, addText: { color: c.surface, fontSize: 13, fontWeight: '600' },
  error: { color: c.error, fontSize: 13, marginTop: 12 },
});
