import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from '@react-navigation/native';
import { MewIcon } from '../../src/ui/MewIcon';
import { studio as c } from '../../src/features/avatar/appearance';

export default function Shop() {
  const focused = useIsFocused();
  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}><ScrollView contentContainerStyle={styles.content}>
    {focused && <StatusBar style="dark" />}<Text style={styles.kicker}>작은 취향을 모아</Text><Text accessibilityRole="header" style={styles.title}>상점</Text>
    <View style={styles.hero}><View style={styles.symbol}><MewIcon name="shop" size={58} /></View><Text style={styles.heading}>우리 공간에 취향 한 조각</Text><Text style={styles.body}>고양이와 함께할 소품과 배경을 준비하고 있어요.</Text><Text style={styles.badge}>상품 구매 준비 중</Text></View>
    <Text style={styles.heading}>지금 해볼 수 있어요</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="무료 꾸미기 열기" onPress={() => router.navigate({ pathname: '/', params: { customize: '1' } })} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}><View style={styles.smallSymbol}><MewIcon name="palette" size={30} /></View><View style={{ flex: 1 }}><Text style={styles.rowTitle}>나만의 고양이 꾸미기</Text><Text style={styles.body}>바라보는 방향 조정</Text></View><Text style={styles.free}>무료</Text><MewIcon name="arrow" size={17} /></Pressable>
    <View style={styles.note}><MewIcon name="fish" size={22} /><Text style={[styles.body, { flex: 1 }]}>재화 지급과 결제는 아직 지원하지 않아요. 무료 꾸미기는 재화 없이 사용할 수 있어요.</Text></View>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: c.background }, content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: 24, paddingBottom: 40 }, kicker: { color: c.muted, fontSize: 12, marginBottom: 6 }, title: { fontSize: 30, fontWeight: '700', color: c.ink, marginBottom: 26 }, hero: { alignItems: 'center', gap: 14, backgroundColor: c.soft, borderRadius: 28, padding: 28, marginBottom: 30 }, symbol: { padding: 24, backgroundColor: c.surface, borderRadius: 34, marginBottom: 6 }, heading: { fontSize: 19, fontWeight: '600', color: c.ink, lineHeight: 28 }, body: { fontSize: 13, color: c.muted, lineHeight: 22 }, badge: { color: c.accent, fontSize: 12, fontWeight: '600', borderWidth: 1, borderColor: c.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 }, row: { marginTop: 14, padding: 18, borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', gap: 12 }, smallSymbol: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' }, rowTitle: { fontSize: 15, color: c.ink, fontWeight: '600', marginBottom: 5 }, free: { color: c.accent, fontSize: 12 }, note: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 24 } });
