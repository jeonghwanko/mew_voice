import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { CompanionConversation } from '@findthem/shared';
import { Body, Button, Card, Chip, Empty, ErrorNote, Field, Heading, Loading, Screen, s } from '../../src/ui/components';
import { colors as c } from '../../src/ui/theme';
import { newRequestId, useCompanion } from '../../src/features/companion/useCompanion';
import { loadSavedConversations } from '../../src/features/companion/conversationPages';
import { citedCaresForAnswer, citedReactionsForAnswer, conversationCitedCheckinLink, presentConversationAnswer } from '../../src/features/companion/daily';
import { citedCheckinHref } from '../../src/features/companion/checkinNavigation';
import { citedObservationHref } from '../../src/features/companion/observationNavigation';
import { useCitedCheckinMoments } from '../../src/features/companion/useCheckins';
import { useCitedReactionMoments } from '../../src/features/companion/citedReactions';
import { api, errorMessage } from '../../src/lib/api';

type ConversationList = { items: CompanionConversation[]; nextCursor: string | null };

export default function Conversation() {
  const { petId: requestedPetId, conversationId } = useLocalSearchParams<{ petId?: string; conversationId?: string }>();
  const requestedConversationId = Array.isArray(conversationId) ? conversationId[0] : conversationId;
  const companion = useCompanion();
  const [message, setMessage] = useState('');
  const [active, setActive] = useState<CompanionConversation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [requestId, setRequestId] = useState(newRequestId);
  const appliedConversation = useRef<string | null>(null);
  const selectedPet = companion.activePet;
  const { selectPet, pets } = companion;

  useEffect(() => {
    if (requestedPetId && pets.data?.some(pet => pet.id === requestedPetId)) void selectPet(requestedPetId);
  }, [requestedPetId, pets.data, selectPet]);
  useEffect(() => {
    appliedConversation.current = null;
    setActive(null); setMessage(''); setRequestId(newRequestId()); setError('');
  }, [selectedPet?.id]);

  const history = useQuery({
    queryKey: [...companion.key, 'conversations', selectedPet?.id],
    enabled: !!selectedPet,
    queryFn: (): Promise<ConversationList> => loadSavedConversations(companion.demo, selectedPet!.id),
  });
  const petId = selectedPet?.id;
  const refetchHistory = history.refetch;
  useFocusEffect(useCallback(() => {
    if (petId) void refetchHistory();
  }, [petId, refetchHistory]));
  useEffect(() => {
    if (!requestedConversationId || !history.data) return;
    if (appliedConversation.current === requestedConversationId) return;
    const found = history.data.items.find(item => item.id === requestedConversationId);
    if (!found) return;
    appliedConversation.current = requestedConversationId;
    setActive(found);
  }, [requestedConversationId, history.data]);
  const pending = useQuery({
    queryKey: [...companion.key, 'conversation', active?.id],
    enabled: !!active?.id && !companion.demo && (active.status === 'QUEUED'),
    queryFn: () => api.get<CompanionConversation>(`/pet-companion/conversations/${active!.id}`),
    refetchInterval: query => query.state.data?.status === 'QUEUED' ? 2500 : false,
  });
  const current = pending.data ?? active;
  const citations = useMemo(() => current?.citedObservationIds ?? [], [current]);
  const citedCheckinIds = useMemo(() => {
    const ids = [...(current?.citedCheckinIds ?? [])];
    for (const item of history.data?.items ?? []) ids.push(...(item.citedCheckinIds ?? []));
    return ids;
  }, [current, history.data]);
  const citedObservationIds = useMemo(() => {
    const ids = [...(current?.citedObservationIds ?? [])];
    for (const item of history.data?.items ?? []) ids.push(...(item.citedObservationIds ?? []));
    return ids;
  }, [current, history.data]);
  const careMoments = useCitedCheckinMoments(citedCheckinIds);
  const reactionMoments = useCitedReactionMoments(citedObservationIds);
  const careAt = (id: string) => {
    const care = careMoments.get(id);
    return care?.status === 'saved' ? care.occurredAt : undefined;
  };
  const shownAnswer = (answer: string | null | undefined, checkinIds?: readonly string[], observationIds?: readonly string[]) => presentConversationAnswer(answer, citedCaresForAnswer(checkinIds, careMoments), citedReactionsForAnswer(observationIds, reactionMoments));
  const answerText = shownAnswer(current?.answer, current?.citedCheckinIds, current?.citedObservationIds);

  const removeThis = () => {
    if (!current) return;
    if (!companion.demo) { setError(errorMessage(new Error('CONVERSATION_ACCOUNT_READONLY'))); return; }
    const id = current.id;
    const execute = () => {
      setBusy(true); setError('');
      void companion.removeConversation(id).then(async () => {
        setActive(prev => prev?.id === id ? null : prev);
        await history.refetch();
      }).catch(cause => setError(errorMessage(cause))).finally(() => setBusy(false));
    };
    const copy = '이 질문과 답변을 삭제할까요? 삭제한 기록은 되돌릴 수 없어요.';
    if (Platform.OS === 'web') { if (globalThis.confirm?.(copy)) execute(); return; }
    Alert.alert('대화를 삭제할까요?', copy, [{ text: '취소', style: 'cancel' }, { text: '삭제', style: 'destructive', onPress: execute }]);
  };

  const send = async () => {
    if (!selectedPet || !message.trim()) return;
    setBusy(true); setError('');
    try {
      const conversation = await companion.ask(selectedPet.id, message.trim(), requestId);
      setActive(conversation); setMessage(''); setRequestId(newRequestId());
      await history.refetch();
    } catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); }
  };

  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Screen title="우리 아이에게 물어보기" subtitle="MEMORIES, HELD GENTLY">
    {companion.demo && <Card accent><Heading>기기 내 체험</Heading><Body muted>관찰 기록과 대화는 이 기기에만 남아요. 실제 AI 분석이 아니에요. 저장한 기록과 보호자 반응만 찾아 보여드려요.</Body></Card>}
    <View style={[s.row, { marginBottom: 14 }]}>{companion.pets.data?.map(pet => <Chip key={pet.id} label={pet.name} selected={selectedPet?.id === pet.id} onPress={() => void companion.selectPet(pet.id)} />)}</View>
    {!selectedPet && <Empty title="먼저 우리 아이를 등록해 주세요" detail="아이별 기록을 바탕으로 대화를 이어가요."><Button title="우리 아이 등록하기" onPress={() => router.push('/pets/new')} /></Empty>}
    {selectedPet && <>
      <Card><Text style={styles.prompt}>오늘 {selectedPet.name}에게 궁금한 점을 적어 주세요.</Text><Body muted>사진 기록, 오늘 돌봄, 보호자가 남긴 반응을 근거로, 확정하지 않는 말로 답해요.</Body></Card>
      <Field label="궁금한 점" value={message} onChangeText={value => { setMessage(value); setRequestId(newRequestId()); }} placeholder="예: 오늘 창가에서 오래 울었던 이유가 궁금해" multiline maxLength={1500} editable={!busy} />
      <ErrorNote message={error || (pending.error ? errorMessage(pending.error) : null)} />
      <Button title={companion.demo ? '기록에서 찾아보기' : '기록을 바탕으로 물어보기'} busy={busy} disabled={!message.trim()} icon="send-outline" onPress={() => void send()} />
      {current && <Card accent><Text style={styles.question}>“{current.question}”</Text>{current.status === 'QUEUED' ? <View style={{ gap: 8 }}><Loading /><Body muted>기록을 안전하게 살펴보고 있어요.</Body></View> : current.status === 'FAILED' ? <Body>답변을 준비하지 못했어요. 잠시 후 다시 질문해 주세요.</Body> : <Body>{answerText ?? '아직 답변이 준비되지 않았어요.'}</Body>}
        {citations.map((id, index) => <Pressable key={id} accessibilityRole="link" onPress={() => current && router.push(citedObservationHref(id, current.id, selectedPet.id))}><Text style={styles.link}>근거가 된 관찰 기록 {index + 1} 보기 →</Text></Pressable>)}
        {(current?.citedCheckinIds ?? []).map((id, index) => <Pressable key={`checkin-${id}`} accessibilityRole="link" onPress={() => current && router.push(citedCheckinHref(id, current.id, selectedPet.id))}><Text style={styles.link}>{conversationCitedCheckinLink(careAt(id), index)}</Text></Pressable>)}
        {companion.demo ? <Button title="이 대화 삭제" danger disabled={busy} onPress={removeThis} /> : <Body muted>이 계정에 남긴 대화는 여기서 지울 수 없어요. 이 기기의 체험 기록만 삭제할 수 있어요.</Body>}
      </Card>}
      <Heading>이전 대화</Heading>
      {history.isLoading ? <Loading /> : <ErrorNote message={history.error ? errorMessage(history.error) : null} />}
      {history.data?.items.map(item => { const preview = shownAnswer(item.answer, item.citedCheckinIds, item.citedObservationIds); return <Pressable key={item.id} accessibilityRole="button" onPress={() => setActive(item)} style={styles.history}><Text numberOfLines={1} style={styles.historyQuestion}>{item.question}</Text>{preview ? <Text numberOfLines={2} style={styles.historyAnswer}>{preview}</Text> : null}<Text style={styles.historyMeta}>{item.status === 'COMPLETED' ? '답변 완료' : item.status === 'FAILED' ? '답변 실패' : '답변 준비 중'} · {new Date(item.createdAt).toLocaleDateString('ko-KR')}</Text></Pressable>; })}
      {!history.isLoading && !history.data?.items.length && (companion.demo
        ? <Empty title="아직 나눈 이야기가 없어요" detail="질문을 남기면 이 기기에만 기억돼요. 나갔다가 다시 들어와도 같은 질문과 답변을 읽을 수 있어요. 실제 AI 답변은 아니에요." />
        : <Empty title="아직 대화가 없어요" detail="첫 질문을 남기면 이곳에 기억돼요." />)}
    </>}
  </Screen></KeyboardAvoidingView>;
}

const styles = StyleSheet.create({ prompt: { color: c.text, fontSize: 17, fontWeight: '600', lineHeight: 25 }, question: { color: c.primary, fontSize: 14, lineHeight: 22 }, link: { color: c.mint, fontWeight: '600', marginTop: 5 }, history: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: c.border, gap: 5 }, historyQuestion: { color: c.text, fontSize: 15, fontWeight: '600' }, historyAnswer: { color: c.muted, fontSize: 13, lineHeight: 20 }, historyMeta: { color: c.muted, fontSize: 12 } });
