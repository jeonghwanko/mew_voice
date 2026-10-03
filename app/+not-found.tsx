import { router } from 'expo-router';
import { Body, Button, Screen } from '../src/ui/components';
export default function NotFound() { return <Screen title="새로운 우리 아이"><Body>이전 앱의 링크이거나 더 이상 존재하지 않는 화면이에요. 홈에서 새 관찰 기록을 시작할 수 있어요.</Body><Button title="홈으로" onPress={() => router.replace('/')} /></Screen>; }
