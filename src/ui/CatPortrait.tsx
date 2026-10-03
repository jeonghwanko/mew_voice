import { Image, StyleSheet, View } from 'react-native';

export const companionArt = {
  portrait: require('../../assets/companion/welcome-cat-app.jpg'),
  memories: require('../../assets/companion/quiet-memories-app.jpg'),
  today: require('../../assets/companion/today-cat-app.jpg'),
};

/** Decorative generated art, never a user's pet photograph or inferred identity. */
export function CatPortrait({ size = 180 }: { size?: number }) {
  return <Image source={companionArt.portrait} style={{ width: size, height: size, borderRadius: 28 }} resizeMode="contain" accessibilityLabel="고양이 브랜드 일러스트" />;
}

export function QuietMemories() {
  return <View style={styles.frame}><Image source={companionArt.memories} style={styles.image} resizeMode="contain" accessibilityLabel="바구니에서 쉬는 고양이와 기록장 일러스트" /></View>;
}
const styles = StyleSheet.create({ frame: { alignSelf: 'center', width: '100%', maxWidth: 260, height: 260, borderRadius: 28, overflow: 'hidden', backgroundColor: '#122C39' }, image: { width: '100%', height: '100%' } });

