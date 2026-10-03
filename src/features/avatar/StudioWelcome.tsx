import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CatStage } from './CatStage';
import { defaultAppearance, studio as c } from './appearance';

export function StudioWelcome({ busy, error, onDemo, onLogin }: { busy: boolean; error: string; onDemo: () => void; onLogin: () => void }) {
  const [happy, setHappy] = useState(false);
  return <SafeAreaView style={styles.page}>
    <StatusBar style="dark" />
    <View style={styles.heading}><Text style={styles.name}>뮤 보이스</Text><Text style={styles.title}>우리 사이에,{ '\n' }새로운 대화.</Text><Text style={styles.subtitle}>나만의 가상 고양이와 만나는 작은 공간</Text></View>
    <View style={styles.stage}><CatStage appearance={defaultAppearance} mood={happy ? 'happy' : 'idle'} onPet={() => setHappy(!happy)} /></View>
    <View style={styles.actions}>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={busy} onPress={onDemo} style={styles.primary}>{busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>체험으로 살펴보기</Text>}</Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={onLogin} style={styles.secondary}><Text style={styles.secondaryText}>계정으로 시작하기</Text></Pressable>
      <Text style={styles.note}>체험 기록은 이 기기에만 남아요.{ '\n' }실제 AI 분석이 아니에요.</Text>
    </View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.background }, heading: { paddingHorizontal: 28, paddingTop: 22 }, name: { fontSize: 15, fontWeight: '700', color: c.accent, marginBottom: 24 }, title: { fontSize: 34, lineHeight: 43, color: c.ink, letterSpacing: -1.2, fontWeight: '600' }, subtitle: { fontSize: 14, color: c.muted, marginTop: 12 }, stage: { flex: 1, minHeight: 150, backgroundColor: c.stage, margin: 16, borderRadius: 28, overflow: 'hidden' }, actions: { paddingHorizontal: 24, paddingBottom: 16, gap: 6 }, primary: { height: 54, backgroundColor: c.accent, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, primaryText: { fontSize: 16, fontWeight: '600', color: '#FFF' }, secondary: { minHeight: 48, alignItems: 'center', justifyContent: 'center' }, secondaryText: { color: c.ink, fontSize: 14 }, note: { fontSize: 12, lineHeight: 18, color: c.muted, textAlign: 'center' }, error: { fontSize: 13, color: c.error },
});
