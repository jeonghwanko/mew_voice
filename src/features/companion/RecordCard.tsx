import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Body, Badge } from '../../ui/components';
import { colors as c } from '../../ui/theme';
import type { Observation } from './useCompanion';
export const displayDate = (value: string) => new Date(value).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
export function RecordCard({ observation }: { observation: Observation }) {
  const waiting = ['QUEUED', 'PROCESSING'].includes(observation.status);
  return <Pressable accessibilityRole="button" accessibilityLabel={`${displayDate(observation.createdAt)} ${observation.question ?? '관찰 기록'} 열기`} onPress={() => router.push(`/observations/${observation.id}`)}><Card>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: c.muted, fontSize: 12 }}>{displayDate(observation.createdAt)} · 사진</Text><Ionicons name="arrow-forward" size={17} color={c.muted} /></View>
    <Text style={{ fontSize: 17, fontWeight: '600', color: c.text, lineHeight: 25 }}>{observation.question || '오늘 함께한 순간'}</Text>
    <Body muted>{observation.contextTags.length ? observation.contextTags.join(' · ') : '상황을 기록했어요'}</Body>
    <Badge>{waiting ? '관찰을 정리하고 있어요' : observation.status === 'FAILED' ? '다시 시도할 수 있어요' : observation.feedback?.length ? '반응까지 기록했어요' : '그 뒤의 반응도 남겨주세요'}</Badge>
  </Card></Pressable>;
}
