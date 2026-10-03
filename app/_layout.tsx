import { PetSelectionProvider } from '../src/core/petSelection';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SessionProvider, useSession } from '../src/core/session';
import { Loading, Screen } from '../src/ui/components';
import { colors } from '../src/ui/theme';
import { Welcome } from '../src/features/companion/Welcome';

const query = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15_000 }, mutations: { retry: false } } });
function AppStack() {
  const { ready, session } = useSession();
  if (!ready) return <Screen title="우리 아이"><Loading /></Screen>;
  if (!session) return <Welcome />;
  return <Stack screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, headerShadowVisible: false, contentStyle: { backgroundColor: colors.background }, headerBackTitle: '뒤로' }}>
    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    <Stack.Screen name="capture" options={{ headerShown: false, presentation: 'modal' }} />
    <Stack.Screen name="meow" options={{ headerShown: false, presentation: 'modal' }} />
    <Stack.Screen name="checkin" options={{ headerShown: false, presentation: 'modal' }} />
    <Stack.Screen name="pets/new" options={{ headerShown: false, presentation: 'modal' }} />
    <Stack.Screen name="observations/[id]" options={{ title: '관찰 기록' }} />
    <Stack.Screen name="reports/weekly" options={{ headerShown: false }} />
    <Stack.Screen name="settings" options={{ title: '설정' }} />
    <Stack.Screen name="+not-found" options={{ title: '새로운 우리 아이' }} />
  </Stack>;
}
export default function RootLayout() { return <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaProvider><QueryClientProvider client={query}><SessionProvider><PetSelectionProvider><StatusBar style="light" /><AppStack /></PetSelectionProvider></SessionProvider></QueryClientProvider></SafeAreaProvider></GestureHandlerRootView>; }
