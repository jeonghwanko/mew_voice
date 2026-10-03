import type { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors as c } from './theme';

export function Screen({ children, title, subtitle, action, scroll = true }: PropsWithChildren<{ title: string; subtitle?: string; action?: ReactNode; scroll?: boolean }>) {
  const content = <><View style={s.heading}><View style={{ flex: 1 }}>{subtitle && <Text style={s.eyebrow}>{subtitle}</Text>}<Text accessibilityRole="header" style={s.title}>{title}</Text></View>{action}</View>{children}</>;
  return <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>{scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>{content}</ScrollView> : <View style={[s.content, { flex: 1 }]}>{content}</View>}</SafeAreaView>;
}
export function Card({ children, accent = false }: PropsWithChildren<{ accent?: boolean }>) { return <View style={[s.card, accent && { backgroundColor: c.primaryDark, borderColor: '#20516A' }]}>{children}</View>; }
export function Heading({ children }: PropsWithChildren) { return <Text accessibilityRole="header" style={s.section}>{children}</Text>; }
export function Body({ children, muted = false }: PropsWithChildren<{ muted?: boolean }>) { return <Text style={[s.body, muted && { color: c.muted }]}>{children}</Text>; }
export function Badge({ children }: PropsWithChildren) { return <View style={s.badge}><Text style={s.badgeText}>{children}</Text></View>; }
export function Button({ title, onPress, busy, secondary, danger, disabled, icon }: { title: string; onPress: () => void; busy?: boolean; secondary?: boolean; danger?: boolean; disabled?: boolean; icon?: keyof typeof Ionicons.glyphMap }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled || !!busy, busy: !!busy }} onPress={onPress} disabled={disabled || busy} style={({ pressed }) => [s.button, secondary && s.secondary, danger && { backgroundColor: '#422B30' }, (disabled || busy || pressed) && { opacity: 0.55 }]}>{busy ? <ActivityIndicator color={c.text} /> : icon && <Ionicons name={icon} size={19} color={secondary ? c.text : c.background} />}<Text style={[s.buttonText, (secondary || danger) && { color: danger ? c.danger : c.text }]}>{title}</Text></Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) { return <View style={{ gap: 8, marginVertical: 9 }}><Text style={s.fieldLabel}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor="#6E8596" selectionColor={c.primary} {...props} style={[s.input, props.multiline && { minHeight: 94, textAlignVertical: 'top' }, props.style]} /></View>; }
export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) { return <Pressable accessibilityRole="button" accessibilityState={{ selected: !!selected }} onPress={onPress} style={[s.chip, selected && { backgroundColor: c.primaryDark, borderColor: c.primary }]}><Text style={{ color: selected ? c.primary : c.muted, fontSize: 13 }}>{selected ? '✓ ' : ''}{label}</Text></Pressable>; }
export function Empty({ title, detail, children }: PropsWithChildren<{ title: string; detail: string }>) { return <View style={s.empty}><Ionicons name="leaf-outline" size={32} color={c.mint} /><Heading>{title}</Heading><Body muted>{detail}</Body>{children}</View>; }
export function ErrorNote({ message }: { message?: string | null }) { return message ? <View accessibilityRole="alert" style={s.error}><Text style={{ color: c.danger, lineHeight: 21 }}>{message}</Text></View> : null; }
export function Loading() { return <View style={s.empty}><ActivityIndicator color={c.primary} /><Body muted>기록을 불러오고 있어요</Body></View>; }
export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background }, content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40, width: '100%', maxWidth: 640, alignSelf: 'center' },
  heading: { flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 24 }, eyebrow: { fontSize: 11, letterSpacing: 2.1, color: c.mint, marginBottom: 9, fontWeight: '600' }, title: { color: c.text, fontSize: 29, lineHeight: 39, letterSpacing: -1, fontWeight: '700' },
  card: { backgroundColor: c.surface, borderRadius: 23, borderWidth: 1, borderColor: c.border, padding: 21, gap: 10, marginBottom: 14 }, section: { fontSize: 18, lineHeight: 26, fontWeight: '600', color: c.text, marginTop: 10, marginBottom: 10 }, body: { fontSize: 14, lineHeight: 23, color: c.text },
  badge: { alignSelf: 'flex-start', backgroundColor: '#193749', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }, badgeText: { fontSize: 11, color: c.primary, fontWeight: '600' },
  button: { minHeight: 52, backgroundColor: c.primary, borderRadius: 15, padding: 15, alignItems: 'center', justifyContent: 'center', gap: 8, flexDirection: 'row', marginTop: 9 }, secondary: { backgroundColor: c.elevated }, buttonText: { color: c.background, fontSize: 15, fontWeight: '700' },
  fieldLabel: { color: c.muted, fontSize: 12, fontWeight: '600' }, input: { borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, borderRadius: 14, padding: 15, color: c.text, fontSize: 15, minHeight: 52 },
  chip: { paddingHorizontal: 13, paddingVertical: 11, borderWidth: 1, borderColor: c.border, borderRadius: 13 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  empty: { paddingVertical: 35, gap: 8, alignItems: 'center' }, error: { backgroundColor: '#36242A', padding: 14, borderRadius: 13, marginVertical: 10 },
});
