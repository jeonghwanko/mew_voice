import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { MewIcon, type MewIconName } from '../../src/ui/MewIcon';
import { studio as c } from '../../src/features/avatar/appearance';
import { useCheckins, checkinLabels } from '../../src/features/companion/useCheckins';
import { errorMessage } from '../../src/lib/api';

export default function History() {
  const focused = useIsFocused();
  const checkins = useCheckins();
  const observations = checkins.observations.data?.pages.flatMap(page => page.items) ?? [];
  const observationLabel = (kind: string) => kind === 'AUDIO' ? '울음 관찰' : kind === 'VIDEO' ? '짧은 영상 기록' : '사진 관찰';
  const rows = [
    ...checkins.items.map(item => ({ id: `checkin-${item.id}`, at: item.occurredAt, label: checkinLabels[item.kind], note: item.note, icon: 'diary' as MewIconName, target: `/checkin?id=${item.id}` })),
    ...observations.map(item => ({ id: `observation-${item.id}`, at: item.createdAt, label: item.question || observationLabel(item.kind), note: item.inference?.observation[0] ?? null, icon: 'cat' as MewIconName, target: `/observations/${item.id}` })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const hasMore = !!checkins.list.hasNextPage || !!checkins.observations.hasNextPage;
  const loadingMore = checkins.list.isFetchingNextPage || checkins.observations.isFetchingNextPage;
  const loading = checkins.list.isLoading || checkins.observations.isLoading;
  const error = checkins.list.error ?? checkins.observations.error ?? checkins.pets.error;
  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
    {focused && <StatusBar style="dark" />}
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>함께 쌓아가는 하루</Text>
      <View style={styles.header}><Text accessibilityRole="header" style={styles.title}>기록</Text><Pressable accessibilityRole="button" accessibilityLabel="오늘 기록하기" onPress={() => router.push(checkins.activePet ? '/checkin' : '/pets/new')} style={styles.add}><Text style={styles.addText}>＋ 기록</Text></Pressable></View>
      <View style={styles.pets}>{checkins.pets.data?.map(pet => <Pressable key={pet.id} accessibilityRole="button" accessibilityState={{ selected: checkins.activePet?.id === pet.id }} onPress={() => void checkins.selectPet(pet.id)} style={[styles.chip, checkins.activePet?.id === pet.id && styles.selected]}><Text style={styles.chipText}>{pet.name}</Text></Pressable>)}</View>
      <Pressable accessibilityRole="button" accessibilityLabel="대화 기록 보기" onPress={() => router.push('/(tabs)/conversation')} style={styles.conversations}><MewIcon name="talk" /><View style={{ flex: 1 }}><Text style={styles.label}>나누었던 이야기</Text><Text style={styles.note}>이전 질문과 답변을 다시 읽어요</Text></View><MewIcon name="arrow" size={18} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="주간 기록 요약 보기" onPress={() => router.push('/reports/weekly')} style={styles.conversations}><MewIcon name="diary" /><View style={{ flex: 1 }}><Text style={styles.label}>최근 7일 요약</Text><Text style={styles.note}>기록 수와 상황 태그, 반응 여부만 모아요</Text></View><MewIcon name="arrow" size={18} /></Pressable>
      <Text style={styles.section}>{checkins.activePet ? `${checkins.activePet.name}의 일기` : '우리 아이의 일기'}</Text>
      <Text style={styles.body}>사진, 울음, 짧은 영상, 돌봄 기록을 시간순으로 모았어요.</Text>
      {loading && <ActivityIndicator accessibilityLabel="기록 불러오는 중" style={{ marginVertical: 24 }} color={c.accent} />}
      {error ? <View style={styles.empty}><Text accessibilityRole="alert" style={styles.error}>{errorMessage(error)}</Text><Pressable accessibilityRole="button" onPress={() => { void checkins.list.refetch(); void checkins.observations.refetch(); void checkins.pets.refetch(); }} style={styles.add}><Text style={styles.addText}>다시 불러오기</Text></Pressable></View> : null}
      {rows.map(row => <Pressable key={row.id} accessibilityRole="button" onPress={() => router.push(row.target as Href)} style={styles.row}><View style={styles.icon}><MewIcon name={row.icon} size={20} /></View><View style={{ flex: 1 }}><Text style={styles.label}>{row.label}</Text>{row.note && <Text style={styles.note} numberOfLines={2}>{row.note}</Text>}<Text style={styles.time}>{new Date(row.at).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Seoul' })}</Text></View><MewIcon name="arrow" size={16} color={c.muted} /></Pressable>)}
      {!rows.length && !loading && !error && <View style={styles.empty}><MewIcon name="diary" size={46} /><Text style={styles.section}>{checkins.activePet ? '첫 페이지를 함께 채워요' : '기록할 아이를 등록해 주세요'}</Text><Text style={styles.body}>오늘 함께한 작은 순간부터 남겨 보세요.</Text><Pressable accessibilityRole="button" onPress={() => router.push(checkins.activePet ? '/checkin' : '/pets/new')} style={styles.add}><Text style={styles.addText}>{checkins.activePet ? '오늘 기록하기' : '우리 아이 등록하기'}</Text></Pressable></View>}
      {hasMore && <Pressable accessibilityRole="button" disabled={loadingMore} onPress={() => { if (checkins.observations.hasNextPage) void checkins.observations.fetchNextPage(); if (checkins.list.hasNextPage) void checkins.list.fetchNextPage(); }} style={styles.more}><Text style={styles.label}>{loadingMore ? '불러오는 중…' : '이전 기록 더 보기'}</Text></Pressable>}
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

