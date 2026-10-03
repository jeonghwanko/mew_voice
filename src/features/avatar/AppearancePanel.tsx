import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { defaultAppearance, studio as c, type Appearance } from './appearance';

type Props = { value: Appearance; onChange: (next: Appearance) => void; onSave: () => void; saving: boolean; ready: boolean; onClose: () => void; side: 'left' | 'right'; onSide: () => void; compact?: boolean };
export function AppearancePanel({ value, onChange, onSave, saving, ready, onClose, side, onSide, compact = false }: Props) {
  const stepper = (key: 'build' | 'ears' | 'turn', label: string, min: number, max: number, step: number) => <View style={styles.stepper}>
    <Text style={styles.stepLabel}>{label}</Text><View style={styles.stepActions}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} 줄이기`} disabled={!ready || saving || value[key] <= min} onPress={() => onChange({ ...value, [key]: Math.max(min, Number((value[key] - step).toFixed(2))) })} style={styles.step}><Ionicons name="remove" size={16} color={c.ink} /></Pressable>
      <Text style={styles.stepValue}>{key === 'turn' ? `${Math.round(value[key] * 180 / Math.PI)}°` : `${Math.round(value[key] * 100)}%`}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} 늘리기`} disabled={!ready || saving || value[key] >= max} onPress={() => onChange({ ...value, [key]: Math.min(max, Number((value[key] + step).toFixed(2))) })} style={styles.step}><Ionicons name="add" size={16} color={c.ink} /></Pressable>
    </View>
  </View>;
  return <View style={[styles.panel, compact && { width: 182 }]} accessibilityLabel="고양이 모습 설정">
    <View style={styles.header}><View><Text style={styles.title}>나만의 고양이</Text><Text style={styles.sub}>바라보는 방향을 골라요</Text></View><Pressable accessibilityRole="button" accessibilityLabel="꾸미기 닫기" onPress={onClose} style={styles.close}><Ionicons name="close" size={20} color={c.ink} /></Pressable></View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {stepper('turn', '바라보는 방향', -0.8, 0.8, 0.16)}
      <View style={styles.tools}><Pressable accessibilityRole="button" onPress={onSide} style={styles.tool}><Text style={styles.toolText}>{side === 'right' ? '왼쪽에 두기' : '오른쪽에 두기'}</Text></Pressable><Pressable accessibilityRole="button" disabled={!ready || saving} onPress={() => onChange({ ...defaultAppearance })} style={styles.tool}><Text style={styles.toolText}>초기화</Text></Pressable></View>
      <Text style={styles.hint}>고양이의 원래 털 무늬와 체형을 그대로 보여드려요.</Text>
    </ScrollView>
    <Pressable accessibilityRole="button" disabled={!ready || saving} onPress={onSave} style={[styles.save, (!ready || saving) && { opacity: 0.5 }]}><Text style={styles.saveText}>{saving ? '저장 중…' : '이 모습 저장'}</Text></Pressable>
  </View>;
}
const styles = StyleSheet.create({
  panel: { width: 250, maxWidth: '100%', height: '100%', backgroundColor: c.surface, borderRadius: 22, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderColor: c.border },
  title: { color: c.ink, fontSize: 16, fontWeight: '700' }, sub: { color: c.muted, fontSize: 12, marginTop: 3 }, close: { padding: 12 }, content: { padding: 14, gap: 10 },
  label: { fontSize: 13, color: c.ink, fontWeight: '600', marginTop: 4 }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  swatchButton: { alignItems: 'center', gap: 5, padding: 5, borderWidth: 1, borderColor: 'transparent', borderRadius: 12, minWidth: 47, minHeight: 58 }, selected: { backgroundColor: c.soft, borderColor: c.accent }, swatch: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#00000015' }, optionName: { color: c.ink, fontSize: 11 },
  stepper: { gap: 4, marginTop: 6 }, stepLabel: { color: c.ink, fontSize: 13 }, stepActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, step: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: c.soft, borderRadius: 12 }, stepValue: { fontSize: 13, color: c.muted, fontVariant: ['tabular-nums'] },
  tools: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }, tool: { minHeight: 44, justifyContent: 'center' }, toolText: { color: c.accent, fontSize: 12, fontWeight: '600' }, hint: { fontSize: 12, color: c.muted, lineHeight: 18 }, save: { margin: 12, padding: 15, backgroundColor: c.accent, borderRadius: 14, alignItems: 'center' }, saveText: { color: '#FFFDF8', fontWeight: '600', fontSize: 14 },
});
