import { useMemo, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { CompanionCheckin, CompanionObservation } from '@findthem/shared';
import { MewIcon, type MewIconName } from '../../src/ui/MewIcon';
import { studio as c } from '../../src/features/avatar/appearance';
import { useCheckins, checkinLabels, useCitedCheckinMoments } from '../../src/features/companion/useCheckins';
import { citedCaresForAnswer, citedReactionsForAnswer, presentConversationAnswer } from '../../src/features/companion/daily';
import { useCitedReactionMoments } from '../../src/features/companion/citedReactions';
import { appendDiaryPage, diaryConversationRows, diaryIntro, mergeDiaryRecords } from '../../src/features/companion/diaryTimeline';
import { loadSavedConversations } from '../../src/features/companion/conversationPages';
import { loadCheckinListPage, loadObservationListPage, loadWeeklyRecords } from '../../src/features/companion/weeklyPages';
import { errorMessage } from '../../src/lib/api';

type OlderDiary = {
  petId: string;
  weekStamp: number;
  observations: CompanionObservation[];
  checkins: CompanionCheckin[];
  observationsCursor: string | null;
  checkinsCursor: string | null;
  seenObservationCursors: string[];
  seenCheckinCursors: string[];
};

export default function History() {
  const focused = useIsFocused();
  const checkins = useCheckins();
  const petId = checkins.activePet?.id;
  const [older, setOlder] = useState<OlderDiary | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState<unknown>(null);
  const threads = useQuery({
    queryKey: [...checkins.key, 'conversations', petId],
    enabled: !!petId,
    queryFn: () => loadSavedConversations(checkins.demo, petId!),
  });
  const week = useQuery({
    queryKey: [...checkins.key, 'weekly-window', petId, checkins.demo],
    enabled: !!petId,
    queryFn: () => loadWeeklyRecords(checkins.demo, petId!),
  });
  const citedCheckinIds = useMemo(() => (threads.data?.items ?? []).flatMap(item => item.citedCheckinIds ?? []), [threads.data]);
  const citedObservationIds = useMemo(() => (threads.data?.items ?? []).flatMap(item => item.citedObservationIds ?? []), [threads.data]);
  const careMoments = useCitedCheckinMoments(citedCheckinIds);
  const reactionMoments = useCitedReactionMoments(citedObservationIds);
  const savedThreads = diaryConversationRows((threads.data?.items ?? []).map(item => ({
    ...item,
    answer: presentConversationAnswer(item.answer, citedCaresForAnswer(item.citedCheckinIds, careMoments), citedReactionsForAnswer(item.citedObservationIds, reactionMoments)) ?? item.answer,
  })), petId);
  const olderForPet = older && older.petId === petId && older.weekStamp === week.dataUpdatedAt ? older : null;
  const observationCursor = olderForPet ? olderForPet.observationsCursor : (week.data?.observationsNextCursor ?? null);
  const checkinCursor = olderForPet ? olderForPet.checkinsCursor : (week.data?.checkinsNextCursor ?? null);
  const waitingForWeek = !!petId && !week.data && week.isLoading;
  const observations = waitingForWeek ? [] : mergeDiaryRecords([
    checkins.observations.data?.pages.flatMap(page => page.items) ?? [],
    week.data?.observations ?? [],
    olderForPet?.observations ?? [],
  ]);
  const care = waitingForWeek ? [] : mergeDiaryRecords([
    checkins.items,
    week.data?.checkins ?? [],
    olderForPet?.checkins ?? [],
  ]);
  const observationLabel = (kind: string) => kind === 'AUDIO' ? '울음 관찰' : kind === 'VIDEO' ? '짧은 영상 기록' : '사진 관찰';
  const rows = [
    ...care.map(item => ({ id: `checkin-${item.id}`, at: item.occurredAt, label: checkinLabels[item.kind], note: item.note, icon: 'diary' as MewIconName, target: `/checkin?id=${item.id}` })),
    ...observations.map(item => ({ id: `observation-${item.id}`, at: item.createdAt, label: item.question || observationLabel(item.kind), note: item.inference?.observation[0] ?? null, icon: 'cat' as MewIconName, target: `/observations/${item.id}` })),
    ...savedThreads.map(item => ({ ...item, icon: 'talk' as MewIconName })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const hasMore = !!observationCursor || !!checkinCursor;
  const loading = checkins.list.isLoading || checkins.observations.isLoading || threads.isLoading || waitingForWeek;
  const error = checkins.list.error ?? checkins.observations.error ?? checkins.pets.error ?? threads.error ?? week.error ?? olderError;
  const rereadNote = threads.isLoading ? '저장한 대화를 불러오고 있어요' : savedThreads.length ? '이전 질문과 답변을 다시 읽어요' : '아직 다시 읽을 대화가 없어요';
  const loadOlder = async () => {
    if (!petId || loadingOlder || (!observationCursor && !checkinCursor)) return;
    const demo = checkins.demo;
    const weekStamp = week.dataUpdatedAt;
    const obsCursor = observationCursor;
    const careCursor = checkinCursor;
    setLoadingOlder(true);
    setOlderError(null);
    try {
      const [obsPage, carePage] = await Promise.all([
        obsCursor ? loadObservationListPage(demo, petId, obsCursor) : Promise.resolve(null),
        careCursor ? loadCheckinListPage(demo, petId, careCursor) : Promise.resolve(null),
      ]);
      setOlder(current => {
        const base = current && current.petId === petId && current.weekStamp === weekStamp ? current : {
          petId, weekStamp, observations: [], checkins: [],
          observationsCursor: obsCursor, checkinsCursor: careCursor,
          seenObservationCursors: [], seenCheckinCursors: [],
        };
        const nextObservations = obsPage && obsCursor
          ? appendDiaryPage(base.observations, obsPage, obsCursor, base.seenObservationCursors)
          : { items: base.observations, nextCursor: base.observationsCursor, seenCursors: base.seenObservationCursors };
        const nextCheckins = carePage && careCursor
          ? appendDiaryPage(base.checkins, carePage, careCursor, base.seenCheckinCursors)
          : { items: base.checkins, nextCursor: base.checkinsCursor, seenCursors: base.seenCheckinCursors };
        return {
          petId, weekStamp,
          observations: nextObservations.items,
          checkins: nextCheckins.items,
          observationsCursor: nextObservations.nextCursor,
          checkinsCursor: nextCheckins.nextCursor,
          seenObservationCursors: nextObservations.seenCursors,
          seenCheckinCursors: nextCheckins.seenCursors,
        };
      });
    } catch (cause) {
      setOlderError(cause);
    } finally {
      setLoadingOlder(false);
    }
  };
  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
    {focused && <StatusBar style="dark" />}
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>함께 쌓아가는 하루</Text>
      <View style={styles.header}><Text accessibilityRole="header" style={styles.title}>기록</Text><Pressable accessibilityRole="button" accessibilityLabel="오늘 기록하기" onPress={() => router.push(checkins.activePet ? '/checkin' : '/pets/new')} style={styles.add}><Text style={styles.addText}>＋ 기록</Text></Pressable></View>
      <View style={styles.pets}>{checkins.pets.data?.map(pet => <Pressable key={pet.id} accessibilityRole="button" accessibilityState={{ selected: checkins.activePet?.id === pet.id }} onPress={() => void checkins.selectPet(pet.id)} style={[styles.chip, checkins.activePet?.id === pet.id && styles.selected]}><Text style={styles.chipText}>{pet.name}</Text></Pressable>)}</View>
      <Pressable accessibilityRole="button" accessibilityLabel="대화 기록 보기" onPress={() => router.push('/(tabs)/conversation')} style={styles.conversations}><MewIcon name="talk" /><View style={{ flex: 1 }}><Text style={styles.label}>나누었던 이야기</Text><Text style={styles.note}>{rereadNote}</Text></View><MewIcon name="arrow" size={18} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="주간 기록 요약 보기" onPress={() => router.push('/reports/weekly')} style={styles.conversations}><MewIcon name="diary" /><View style={{ flex: 1 }}><Text style={styles.label}>최근 7일 요약</Text><Text style={styles.note}>기록 수와 상황 태그, 반응 여부만 모아요</Text></View><MewIcon name="arrow" size={18} /></Pressable>
      <Text style={styles.section}>{checkins.activePet ? `${checkins.activePet.name}의 일기` : '우리 아이의 일기'}</Text>
      <Text style={styles.body}>{diaryIntro(checkins.demo)}</Text>
      {loading && <ActivityIndicator accessibilityLabel="기록 불러오는 중" style={{ marginVertical: 24 }} color={c.accent} />}
      {error ? <View style={styles.empty}><Text accessibilityRole="alert" style={styles.error}>{errorMessage(error)}</Text><Pressable accessibilityRole="button" onPress={() => { setOlderError(null); void checkins.list.refetch(); void checkins.observations.refetch(); void checkins.pets.refetch(); void threads.refetch(); void week.refetch(); }} style={styles.add}><Text style={styles.addText}>다시 불러오기</Text></Pressable></View> : null}
      {rows.map(row => <Pressable key={row.id} accessibilityRole="button" onPress={() => router.push(row.target as Href)} style={styles.row}><View style={styles.icon}><MewIcon name={row.icon} size={20} /></View><View style={{ flex: 1 }}><Text style={styles.label}>{row.label}</Text>{row.note && <Text style={styles.note} numberOfLines={2}>{row.note}</Text>}<Text style={styles.time}>{new Date(row.at).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Seoul' })}</Text></View><MewIcon name="arrow" size={16} color={c.muted} /></Pressable>)}
      {!rows.length && !loading && !error && <View style={styles.empty}><MewIcon name="diary" size={46} /><Text style={styles.section}>{checkins.activePet ? '첫 페이지를 함께 채워요' : '기록할 아이를 등록해 주세요'}</Text><Text style={styles.body}>오늘 함께한 작은 순간부터 남겨 보세요.</Text><Pressable accessibilityRole="button" onPress={() => router.push(checkins.activePet ? '/checkin' : '/pets/new')} style={styles.add}><Text style={styles.addText}>{checkins.activePet ? '오늘 기록하기' : '우리 아이 등록하기'}</Text></Pressable></View>}
      {hasMore && <Pressable accessibilityRole="button" disabled={loadingOlder} onPress={() => void loadOlder()} style={styles.more}><Text style={styles.label}>{loadingOlder ? '불러오는 중…' : '이전 기록 더 보기'}</Text></Pressable>}
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background }, content: { padding: 24, paddingBottom: 40, width: '100%', maxWidth: 640, alignSelf: 'center' },
  kicker: { color: c.muted, fontSize: 12, marginBottom: 6 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { fontSize: 30, color: c.ink, fontWeight: '700' },
  add: { minHeight: 44, backgroundColor: c.accent, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, alignItems: 'center' }, addText: { color: c.surface, fontSize: 13, fontWeight: '600' },
  pets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 20 }, chip: { borderWidth: 1, borderColor: c.border, borderRadius: 18, paddingHorizontal: 15, paddingVertical: 12, minHeight: 44 }, selected: { backgroundColor: c.soft, borderColor: c.accent }, chipText: { fontSize: 13, color: c.ink },
  conversations: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, backgroundColor: c.surface, borderRadius: 22, marginBottom: 24 },
  section: { color: c.ink, fontSize: 19, fontWeight: '600', marginBottom: 9 }, body: { color: c.muted, fontSize: 13, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 19, borderBottomColor: c.border, borderBottomWidth: 1 }, icon: { width: 40, height: 40, backgroundColor: c.soft, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  label: { color: c.ink, fontSize: 15, fontWeight: '600' }, note: { color: c.muted, fontSize: 13, marginTop: 4, lineHeight: 20 }, time: { color: c.accent, fontSize: 11, marginTop: 7 },
  empty: { alignItems: 'center', paddingVertical: 36, gap: 16 }, error: { color: c.error, fontSize: 13 }, more: { padding: 18, alignItems: 'center', marginTop: 12 },
});
