import { Component, useEffect, useState, type PropsWithChildren } from 'react';
import { AccessibilityInfo, AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import StageCanvas from './StageCanvas';
import { clearCatAsset } from './CatModel';
import { studio as c, type Appearance, type CatMood } from './appearance';

class RendererBoundary extends Component<PropsWithChildren, { failed: boolean; attempt: number }> {
  state = { failed: false, attempt: 0 };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <View style={styles.fallback}>
      <Text style={styles.title}>3D 화면을 열지 못했어요</Text><Text style={styles.note}>대화와 기록은 계속 사용할 수 있어요.</Text>
      <Pressable accessibilityRole="button" style={styles.retry} onPress={() => { clearCatAsset(); this.setState(s => ({ failed: false, attempt: s.attempt + 1 })); }}><Text>다시 불러오기</Text></Pressable>
    </View>;
    return <View key={this.state.attempt} style={styles.fill}>{this.props.children}</View>;
  }
}

export function CatStage({ appearance, mood = 'idle', onPet, focused = true }: { appearance: Appearance; mood?: CatMood; onPet?: () => void; focused?: boolean }) {

  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [standing, setStanding] = useState(false);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setReducedMotion(value); });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    const app = AppState.addEventListener('change', value => setForeground(value === 'active'));
    return () => { alive = false; motion.remove(); app.remove(); };
  }, []);
  return <View style={styles.fill} accessibilityLabel="꾸밀 수 있는 가상의 3D 고양이">
    <RendererBoundary><StageCanvas appearance={appearance} mood={mood} onPet={onPet} standing={standing} reducedMotion={reducedMotion} active={focused && foreground} /></RendererBoundary>
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
      {([false, true] as const).map(value => <Pressable key={String(value)} accessibilityRole="button" accessibilityState={{ selected: standing === value }} onPress={() => setStanding(value)} style={[styles.retry, { minHeight: 44, backgroundColor: standing === value ? c.accent : c.surface }]}><Text style={{ color: standing === value ? c.surface : c.ink }}>{value ? '일어서기' : '앉기'}</Text></Pressable>)}
    </View>
  </View>;
}
const styles = StyleSheet.create({ fill: { flex: 1, width: '100%' }, fallback: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, gap: 12 }, title: { color: c.ink, fontSize: 17, fontWeight: '600' }, note: { color: c.muted, fontSize: 14 }, retry: { padding: 14, borderRadius: 14, backgroundColor: c.soft } });
