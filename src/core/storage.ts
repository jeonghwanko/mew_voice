import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';

export const sessionStorage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return typeof window === 'undefined' ? null : window.sessionStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string) { if (Platform.OS === 'web') { window.sessionStorage.setItem(key, value); return; } await SecureStore.setItemAsync(key, value); },
  async remove(key: string) { if (Platform.OS === 'web') { window.sessionStorage.removeItem(key); return; } await SecureStore.deleteItemAsync(key); },
};
// Demo data stays on this device. Auth tokens never go in this file.
const demoFile = `${FileSystem.documentDirectory}companion-demo-v1.json`;
export async function readDemo(): Promise<string | null> {
  if (Platform.OS === 'web') return typeof window === 'undefined' ? null : window.localStorage.getItem('companion-demo-v1');
  if (!(await FileSystem.getInfoAsync(demoFile)).exists) return null;
  return FileSystem.readAsStringAsync(demoFile);
}
export async function writeDemo(value: string) {
  if (Platform.OS === 'web') { window.localStorage.setItem('companion-demo-v1', value); return; }
  await FileSystem.writeAsStringAsync(demoFile, value);
}
