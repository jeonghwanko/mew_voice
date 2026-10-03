import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MewIcon, type MewIconName } from '../../src/ui/MewIcon';
import { studio as c } from '../../src/features/avatar/appearance';

const icons: Record<string, MewIconName> = { index: 'home', history: 'diary', shop: 'shop' };
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return <Tabs screenOptions={({ route }) => ({
    headerShown: false, tabBarHideOnKeyboard: true, tabBarActiveTintColor: c.accent, tabBarInactiveTintColor: c.muted,
    tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, height: 66 + Math.max(insets.bottom, 8), paddingTop: 9, paddingBottom: Math.max(insets.bottom, 8) },
    tabBarLabelStyle: { fontSize: 12, fontWeight: '600', marginTop: 3 },
    tabBarIcon: ({ color }) => <MewIcon name={icons[route.name] ?? 'cat'} size={25} color={color} />,
  })}>
    <Tabs.Screen name="index" options={{ title: '홈' }} />
    <Tabs.Screen name="history" options={{ title: '기록' }} />
    <Tabs.Screen name="shop" options={{ title: '상점' }} />
    <Tabs.Screen name="conversation" options={{ title: '대화', href: null }} />
    <Tabs.Screen name="pet" options={{ title: '우리 아이', href: null }} />
    <Tabs.Screen name="compose" options={{ href: null }} />
  </Tabs>;
}
