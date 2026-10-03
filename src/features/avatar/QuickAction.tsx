import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { studio as c } from './appearance';

/* Static requires let Metro package every icon for offline/native use. */
const assets = {
  talk: require('../../../assets/ui/quick-actions/talk-v1-app.png'),
  listen: require('../../../assets/ui/quick-actions/listen-v1-app.png'),
  camera: require('../../../assets/ui/quick-actions/camera-v1-app.png'),
};

export function QuickAction({ name, label, hint, onPress }: { name: keyof typeof assets; label: string; hint: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint} onPress={onPress} style={({ pressed }) => [styles.button, pressed && { opacity: 0.72, transform: [{ scale: 0.96 }] }]}>
    <View style={styles.circle}><Image source={assets[name]} style={styles.image} resizeMode="contain" accessible={false} /></View>
    <Text style={styles.label}>{label}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({ button: { alignItems: 'center', gap: 5, minWidth: 76, minHeight: 76 }, circle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFCF6ED', borderWidth: 1, borderColor: '#FFFFFF' }, image: { width: 46, height: 46 }, label: { fontSize: 11, lineHeight: 16, fontWeight: '600', color: c.ink } });
