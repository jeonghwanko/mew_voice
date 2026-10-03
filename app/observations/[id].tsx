import { useEffect, useState } from 'react';
import { View, Image, Platform, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, Body, Heading, Button, Badge, Card, Field, Chip, ErrorNote, Loading, s } from '../../src/ui/components';
import { useCompanion, useObservation } from '../../src/features/companion/useCompanion';
import { API_BASE, authHeaders, errorMessage } from '../../src/lib/api';
import { displayDate } from '../../src/features/companion/RecordCard';
import { VideoPreview } from '../../src/features/companion/VideoPreview';
import { AudioPreview } from '../../src/features/companion/AudioPreview';
import { citedPriorObservationHref, observationExitHref, observationLeaveHref } from '../../src/features/companion/observationNavigation';

function PrivatePhoto({ id, localUri }: { id: string; localUri?: string }) {
  const [source, setSource] = useState<{ uri: string; headers?: Record<string, string> }>();
  useEffect(() => { let alive = true; let objectUrl: string | undefined; const controller = new AbortController();
    if (localUri) { setSource({ uri: localUri }); return; }
    void authHeaders().then(async headers => { const uri = `${API_BASE}/pet-companion/observations/${id}/media`; if (Platform.OS === 'web') { const response = await fetch(uri, { headers, signal: controller.signal }); if (!response.ok) return; const blob = await response.blob(); if (!alive) return; objectUrl = URL.createObjectURL(blob); setSource({ uri: objectUrl }); } else if (alive) setSource({ uri, headers }); }).catch(() => undefined);
    return () => { alive = false; controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [id, localUri]);
  return source ? <Image accessibilityLabel="이 관찰에 첨부한 사진" source={source} style={{ width: '100%', height: 230, borderRadius: 22, marginBottom: 18 }} /> : null;
}
export default function ObservationScreen() {
  const params = useLocalSearchParams<{ id: string; returnTo?: string | string[]; conversationId?: string | string[]; petId?: string | string[] }>(); const id = params.id; const observation = useObservation(id); const companion = useCompanion();
  const [action, setAction] = useState(''); const [reaction, setReaction] = useState(''); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const data = observation.data; const inference = data?.inference;
  const save = async () => { setBusy(true); setError(''); try { await companion.feedback(id, { action: action.trim(), reaction: reaction.trim(), note: note.trim(), happenedAt: new Date().toISOString() }); setAction(''); setReaction(''); setNote(''); const next = observationExitHref(params); if (next) router.replace(next); else await observation.refetch(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); } };
  return <Screen title={data?.question || '오늘의 관찰'} subtitle={data ? `${displayDate(data.createdAt)} · ${companion.pets.data?.find(p => p.id === data.petId)?.name ?? '우리 아이'}` : 'OBSERVATION'}>
    {observation.isLoading && <Loading />}<ErrorNote message={observation.error ? errorMessage(observation.error) : null} />
    {data && <>{data.kind === 'AUDIO' ? (data.localAudioUri ? <><AudioPreview uri={data.localAudioUri} />{Platform.OS === 'web' && <Body muted>{data.localMediaVolatile ? '브라우저 체험에서는 녹음을 서버로 보내지 않아요. 새로고침 뒤에는 재생 파일이 남지 않을 수 있어요.' : '브라우저 체험에서는 녹음을 서버로 보내지 않아요.'}</Body>}</> : <Card><Body muted>이 울음 파일은 이 화면에서 다시 들을 수 없어요. 체험 모드에서 기기에 남긴 녹음만 재생할 수 있어요.</Body></Card>) : data.kind === 'VIDEO' && data.localVideoUri ? <><VideoPreview uri={data.localVideoUri} />{Platform.OS === 'web' && data.localMediaVolatile && <Body muted>브라우저 체험에서는 영상을 서버로 보내지 않아요. 새로고침 뒤에는 재생 파일이 남지 않을 수 있어요.</Body>}</> : data.kind === 'VIDEO' ? <Card><Body muted>이 영상 파일은 이 화면에서 재생할 수 없어요. 체험 모드에서 남긴 영상만 기기에서 미리 볼 수 있어요.</Body></Card> : data.localPhotoUri || !companion.demo ? <PrivatePhoto id={id} localUri={data.localPhotoUri} /> : <Card><Body muted>이 사진 파일은 이 화면에서 다시 볼 수 없어요. 체험 모드에서 기기에 남긴 사진만 미리 볼 수 있어요.</Body></Card>}{data.kind === 'AUDIO' && <Body muted>이 녹음은 AI로 분석하지 않았어요. 소리의 뜻을 번역하지 않아요.</Body>}{data.kind === 'VIDEO' && <Body muted>이 영상은 AI로 분석하지 않았어요. 길이와 상황만 기록이에요.</Body>}<View style={{ marginBottom: 14 }}><Badge>{companion.demo ? '체험 기록 · 실제 AI 분석 아님' : data.status === 'ABSTAINED' ? '판단 어려움' : '추정 해석 · 관찰을 바탕으로'}</Badge></View>{companion.demo && <Body>이 기록은 이 기기에만 남아요. 실제 AI 분석이 아니에요.</Body>}
      {['QUEUED', 'PROCESSING'].includes(data.status) && <Card><Loading /><Body muted>화면을 나가도 서버의 분석은 이어져요. 기록 탭에서 다시 확인할 수 있어요.</Body></Card>}
      {data.status === 'CANCELLED' && <Card><Heading>관찰 요청이 취소되었어요</Heading><Body muted>보관 동의가 철회되어 분석을 중단했어요. 설정에서 동의를 확인한 뒤 새 기록을 만들 수 있어요.</Body><Button title="설정 열기" secondary onPress={() => router.push('/settings')} /></Card>}
      {data.status === 'FAILED' && <Card><Heading>관찰을 마치지 못했어요</Heading><Body muted>연결이나 분석 서비스 상태를 확인한 후 다시 시도할 수 있어요.</Body><Button title="분석 다시 요청" busy={busy} onPress={() => { setBusy(true); void companion.retry(id).then(() => observation.refetch()).catch(e => setError(errorMessage(e))).finally(() => setBusy(false)); }} /></Card>}
      {inference && <>
        {inference.utterance && <Card accent><Badge>우리 아이의 말 · 의인화한 추정</Badge><Heading>“{inference.utterance}”</Heading></Card>}
        <Card><Heading>관찰한 단서</Heading>{inference.observation.map((v, i) => <Body key={i}>{v}</Body>)}</Card>
        <Card><Heading>가능한 의미</Heading>{inference.possibilities.map((p, i) => <View key={i} style={{ gap: 5, marginBottom: 10 }}><Body>{i + 1}. {p.label}</Body><Body muted>{p.reason}</Body></View>)}</Card>
        <Card><Badge>{data.status === 'ABSTAINED' ? '판단 어려움' : inference.confidence === 'high' ? '단서 충분함' : '단서 제한적'}</Badge>{inference.reason && <Body>{inference.reason}</Body>}{inference.limitations.map((v, i) => <Body muted key={i}>{v}</Body>)}</Card>
        {inference.suggestedAction && <Card accent><Heading>이렇게 반응해 볼까요?</Heading><Body>{inference.suggestedAction}</Body></Card>}
        {!!inference.citedObservationIds.length && <><Heading>함께 참고한 이전 기록</Heading>{inference.citedObservationIds.map(ref => <Button key={ref} title="보호자가 남긴 반응 보기" secondary onPress={() => router.push(citedPriorObservationHref(ref, params))} />)}</>}
      </>}
      <Heading>그 뒤, 우리 아이는 어땠나요?</Heading><Body muted>실제로 해 본 행동과 그 뒤에 관찰한 반응을 남겨 주세요. 다음 대화에서 함께 참고할 수 있어요.</Body>
      {data.feedback?.map(f => <Card key={f.id}><Badge>보호자 기록</Badge><Body>{f.action} → {f.reaction}</Body>{f.note && <Body muted>{f.note}</Body>}</Card>)}
      <View style={[s.row, { marginTop: 16 }]}>{['놀아줬어요', '먹었어요', '쉬게 뒀어요', '지켜봤어요'].map(v => <Chip key={v} label={v} selected={action === v} onPress={() => setAction(v)} />)}<Chip label="기타" selected={!['놀아줬어요', '먹었어요', '쉬게 뒀어요', '지켜봤어요'].includes(action) && !!action} onPress={() => setAction('')} /></View>
      <Field label="해 본 행동" value={action} onChangeText={setAction} maxLength={500} placeholder="직접 쓴 행동 · 선택" />
      <Heading>그 뒤 반응은 어땠나요?</Heading><View style={s.row}>{['편안해 보였어요', '계속했어요', '피했어요', '잘 모르겠어요'].map(v => <Chip key={v} label={v} selected={reaction === v} onPress={() => setReaction(v)} />)}<Chip label="기타" selected={!['편안해 보였어요', '계속했어요', '피했어요', '잘 모르겠어요'].includes(reaction) && !!reaction} onPress={() => setReaction('')} /></View>
      <Field label="이후 관찰한 반응" value={reaction} onChangeText={setReaction} maxLength={500} placeholder="직접 쓴 반응 · 선택" multiline />
      <Field label="추가 메모 · 선택" value={note} onChangeText={setNote} maxLength={2000} />
      <ErrorNote message={error} /><Button title="반응을 기억해 두기" busy={busy} disabled={!action.trim() || !reaction.trim()} onPress={() => void save()} />
      <Button title="이 아이의 기록으로 대화하기" secondary onPress={() => router.push({ pathname: '/conversation', params: { petId: data.petId } })} />
    </>}
    <Pressable onPress={() => router.replace(observationLeaveHref(params))} style={{ padding: 20, alignItems: 'center' }}><Body muted>기록 목록으로</Body></Pressable>
  </Screen>;
}
