import { useEffect, useState } from 'react';
import { View, Image, Platform, Pressable, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, Body, Heading, Button, Badge, Card, Field, Chip, ErrorNote, Loading, s } from '../../src/ui/components';
import { useCompanion, useObservation } from '../../src/features/companion/useCompanion';
import { API_BASE, ApiError, authHeaders, errorMessage } from '../../src/lib/api';
import { displayDate } from '../../src/features/companion/RecordCard';
import { VideoPreview } from '../../src/features/companion/VideoPreview';
import { AudioPreview } from '../../src/features/companion/AudioPreview';
import { latestSavedFeedback, observationCitedReactions } from '../../src/features/companion/daily';
import { useCitedReactionMoments } from '../../src/features/companion/citedReactions';
import { citedPriorObservationHref, observationExitHref, observationLeaveHref } from '../../src/features/companion/observationNavigation';
import { feedbackVersion } from '../../src/features/companion/reactionStore';
import { OBSERVATION_CONTEXT_TAGS } from '../../src/features/companion/observationStore';

function PrivatePhoto({ id, localUri }: { id: string; localUri?: string }) {
  const [source, setSource] = useState<{ uri: string; headers?: Record<string, string> }>();
  useEffect(() => { let alive = true; let objectUrl: string | undefined; const controller = new AbortController();
    if (localUri) { setSource({ uri: localUri }); return; }
    void authHeaders().then(async headers => { const uri = `${API_BASE}/pet-companion/observations/${id}/media`; if (Platform.OS === 'web') { const response = await fetch(uri, { headers, signal: controller.signal }); if (!response.ok) return; const blob = await response.blob(); if (!alive) return; objectUrl = URL.createObjectURL(blob); setSource({ uri: objectUrl }); } else if (alive) setSource({ uri, headers }); }).catch(() => undefined);
    return () => { alive = false; controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [id, localUri]);
  return source ? <Image accessibilityLabel="이 관찰에 첨부한 사진" source={source} style={{ width: '100%', height: 230, borderRadius: 22, marginBottom: 18 }} /> : null;
}
const actions = ['놀아줬어요', '먹었어요', '쉬게 뒀어요', '지켜봤어요'];
const reactions = ['편안해 보였어요', '계속했어요', '피했어요', '잘 모르겠어요'];
function conflicted(cause: unknown) { return (cause instanceof ApiError && cause.status === 409) || (cause instanceof Error && cause.message === 'EDIT_CONFLICT'); }

export default function ObservationScreen() {
  const params = useLocalSearchParams<{ id: string; returnTo?: string | string[]; conversationId?: string | string[]; petId?: string | string[] }>(); const id = params.id; const observation = useObservation(id); const companion = useCompanion();
  const [action, setAction] = useState(''); const [reaction, setReaction] = useState(''); const [note, setNote] = useState(''); const [editing, setEditing] = useState<{ id: string; version: number } | null>(null); const [captionEditing, setCaptionEditing] = useState(false); const [captionQuestion, setCaptionQuestion] = useState(''); const [captionTags, setCaptionTags] = useState<string[]>([]); const [movingPet, setMovingPet] = useState(false); const [movePetId, setMovePetId] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [conflict, setConflict] = useState(false);
  const data = observation.data; const inference = data?.inference;
  const reactionMoments = useCitedReactionMoments(inference?.citedObservationIds ?? []);
  const citedReactions = observationCitedReactions(inference?.citedObservationIds, reactionMoments);
  const latest = latestSavedFeedback(data?.feedback);
  const finish = async () => {
    setEditing(null); setAction(''); setReaction(''); setNote(''); setConflict(false);
    const next = observationExitHref(params);
    if (next) router.replace(next); else await observation.refetch();
  };
  const save = async () => {
    setBusy(true); setError(''); setConflict(false);
    try {
      if (editing) await companion.updateFeedback(id, editing.id, { version: editing.version, action: action.trim(), reaction: reaction.trim(), note: note.trim() || null });
      else await companion.feedback(id, { action: action.trim(), reaction: reaction.trim(), note: note.trim(), happenedAt: new Date().toISOString() });
      await finish();
    } catch (cause) {
      if (conflicted(cause)) { setConflict(true); setError(editing ? '다른 곳에서 이 반응이 수정되었어요. 작성 중인 내용은 그대로 남아 있어요.' : errorMessage(cause)); }
      else setError(errorMessage(cause));
    } finally { setBusy(false); }
  };
  const startEdit = (item: { id: string; action?: string | null; reaction?: string | null; note?: string | null }) => {
    if (!companion.demo) { setError(errorMessage(new Error('REACTION_ACCOUNT_READONLY'))); return; }
    setEditing({ id: item.id, version: feedbackVersion(item) });
    setAction(item.action ?? ''); setReaction(item.reaction ?? ''); setNote(item.note ?? '');
    setError(''); setConflict(false);
  };
  const cancelEdit = () => { setEditing(null); setAction(''); setReaction(''); setNote(''); setError(''); setConflict(false); };
  const reload = () => {
    setConflict(false);
    void observation.refetch().then(result => {
      setEditing(current => {
        if (!current) return current;
        const next = result.data?.feedback?.find(row => row.id === current.id);
        return next ? { id: next.id, version: feedbackVersion(next) } : current;
      });
    });
  };
  const removeReaction = (item: { id: string }) => {
    if (!companion.demo) { setError(errorMessage(new Error('REACTION_ACCOUNT_READONLY'))); return; }
    const feedbackId = item.id; const version = feedbackVersion(item);
    const execute = () => { setBusy(true); setError(''); setConflict(false); void companion.removeFeedback(id, feedbackId, version).then(finish).catch(cause => { if (conflicted(cause)) { setConflict(true); setError('다른 곳에서 이 반응이 수정되었어요. 최신 내용을 다시 불러온 뒤 삭제할 수 있어요.'); } else setError(errorMessage(cause)); }).finally(() => setBusy(false)); };
    const copy = '이 반응 기록을 삭제할까요? 삭제한 기록은 되돌릴 수 없어요.';
    if (Platform.OS === 'web') { if (globalThis.confirm?.(copy)) execute(); return; }
    Alert.alert('반응을 삭제할까요?', copy, [{ text: '취소', style: 'cancel' }, { text: '삭제', style: 'destructive', onPress: execute }]);
  };
  const knownTags = OBSERVATION_CONTEXT_TAGS as readonly string[];
  const startCaption = () => {
    if (!data) return;
    if (!companion.demo) { setError(errorMessage(new Error('OBSERVATION_CAPTION_ACCOUNT_READONLY'))); return; }
    setCaptionEditing(true); setCaptionQuestion(data.question ?? ''); setCaptionTags([...data.contextTags]); setError('');
  };
  const cancelCaption = () => { setCaptionEditing(false); setCaptionQuestion(''); setCaptionTags([]); setError(''); };
  const saveCaption = async () => {
    setBusy(true); setError('');
    try {
      await companion.updateObservationCaption(id, { question: captionQuestion, contextTags: captionTags });
      setCaptionEditing(false); setCaptionQuestion(''); setCaptionTags([]);
      await observation.refetch();
    } catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); }
  };
  const captionChoices = [...knownTags, ...(data?.contextTags ?? []).filter(tag => !knownTags.includes(tag))];
  const removeThis = () => {
    if (!data) return;
    if (!companion.demo) { setError(errorMessage(new Error('OBSERVATION_ACCOUNT_READONLY'))); return; }
    const execute = () => { setBusy(true); setError(''); setConflict(false); void companion.removeObservation(id).then(() => { router.replace(observationLeaveHref(params)); }).catch(cause => setError(errorMessage(cause))).finally(() => setBusy(false)); };
    const copy = '이 관찰 기록을 삭제할까요? 삭제한 기록은 되돌릴 수 없어요.';
    if (Platform.OS === 'web') { if (globalThis.confirm?.(copy)) execute(); return; }
    Alert.alert('관찰을 삭제할까요?', copy, [{ text: '취소', style: 'cancel' }, { text: '삭제', style: 'destructive', onPress: execute }]);
  };
  const mediaLabel = data?.kind === 'AUDIO' ? '울음' : data?.kind === 'VIDEO' ? '영상' : '사진';
  const openMediaReplace = () => {
    if (!data) return;
    if (!companion.demo) { setError(errorMessage(new Error('OBSERVATION_MEDIA_ACCOUNT_READONLY'))); return; }
    setError('');
    const mode = data.kind === 'AUDIO' ? 'audio' : data.kind === 'VIDEO' ? 'video' : 'photo';
    const next: Record<string, string> = { mode, replaceId: id };
    const returnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
    const conversationId = Array.isArray(params.conversationId) ? params.conversationId[0] : params.conversationId;
    const petId = Array.isArray(params.petId) ? params.petId[0] : params.petId;
    if (returnTo) next.returnTo = returnTo;
    if (conversationId) next.conversationId = conversationId;
    if (petId) next.petId = petId;
    router.push({ pathname: '/capture', params: next });
  };
  const otherPets = (companion.pets.data ?? []).filter(pet => pet.id !== data?.petId);
  const startMove = () => {
    if (!data) return;
    if (!companion.demo) { setError(errorMessage(new Error('OBSERVATION_PET_ACCOUNT_READONLY'))); return; }
    const choices = (companion.pets.data ?? []).filter(pet => pet.id !== data.petId);
    if (!choices.length) return;
    setMovingPet(true); setMovePetId(choices[0].id); setError('');
  };
  const cancelMove = () => { setMovingPet(false); setMovePetId(''); setError(''); };
  const saveMove = async () => {
    if (!otherPets.some(pet => pet.id === movePetId)) { setError(errorMessage(new Error('INVALID_OBSERVATION_PET'))); return; }
    setBusy(true); setError('');
    try {
      await companion.moveObservation(id, movePetId);
      setMovingPet(false); setMovePetId('');
      await observation.refetch();
    } catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); }
  };
  return <Screen title={data?.question || '오늘의 관찰'} subtitle={data ? `${displayDate(data.createdAt)} · ${companion.pets.data?.find(p => p.id === data.petId)?.name ?? '우리 아이'}` : 'OBSERVATION'}>
    {observation.isLoading && <Loading />}<ErrorNote message={observation.error ? errorMessage(observation.error) : null} />
    {data && <>{data.kind === 'AUDIO' ? (data.localAudioUri ? <><AudioPreview uri={data.localAudioUri} />{Platform.OS === 'web' && <Body muted>{data.localMediaVolatile ? '브라우저 체험에서는 녹음을 서버로 보내지 않아요. 새로고침 뒤에는 재생 파일이 남지 않을 수 있어요.' : '브라우저 체험에서는 녹음을 서버로 보내지 않아요.'}</Body>}</> : <Card><Body muted>이 울음 파일은 이 화면에서 다시 들을 수 없어요. 체험 모드에서 기기에 남긴 녹음만 재생할 수 있어요.</Body></Card>) : data.kind === 'VIDEO' && data.localVideoUri ? <><VideoPreview uri={data.localVideoUri} />{Platform.OS === 'web' && data.localMediaVolatile && <Body muted>브라우저 체험에서는 영상을 서버로 보내지 않아요. 새로고침 뒤에는 재생 파일이 남지 않을 수 있어요.</Body>}</> : data.kind === 'VIDEO' ? <Card><Body muted>이 영상 파일은 이 화면에서 재생할 수 없어요. 체험 모드에서 남긴 영상만 기기에서 미리 볼 수 있어요.</Body></Card> : data.localPhotoUri || !companion.demo ? <PrivatePhoto id={id} localUri={data.localPhotoUri} /> : <Card><Body muted>이 사진 파일은 이 화면에서 다시 볼 수 없어요. 체험 모드에서 기기에 남긴 사진만 미리 볼 수 있어요.</Body></Card>}{data.kind === 'AUDIO' && <Body muted>이 녹음은 AI로 분석하지 않았어요. 소리의 뜻을 번역하지 않아요.</Body>}{data.kind === 'VIDEO' && <Body muted>이 영상은 AI로 분석하지 않았어요. 길이와 상황만 기록이에요.</Body>}<View style={{ marginBottom: 14 }}><Badge>{companion.demo ? '체험 기록 · 실제 AI 분석 아님' : data.status === 'ABSTAINED' ? '판단 어려움' : '추정 해석 · 관찰을 바탕으로'}</Badge></View>{companion.demo && <Body>이 기록은 이 기기에만 남아요. 실제 AI 분석이 아니에요.</Body>}
      <Card>
        <Heading>첨부한 {mediaLabel}</Heading>
        <Body muted>같은 종류의 {mediaLabel}만 바꿔요. 질문, 상황 태그, 반응 기록은 그대로 두어요. 새 파일은 AI로 분석하지 않아요.</Body>
        {companion.demo ? <Button title={`${mediaLabel} 바꾸기`} secondary disabled={busy} onPress={openMediaReplace} /> : <Body muted>이 계정에 남긴 사진·울음·영상은 여기서 바꿀 수 없어요. 이 기기의 체험 기록만 수정할 수 있어요.</Body>}
      </Card>
      <Card>
        <Heading>남긴 질문과 상황</Heading>
        {captionEditing ? <>
          <Body muted>질문과 상황 태그만 고쳐요. 사진·울음·영상, 고양이, 반응 기록은 그대로 두어요. 실제 AI 분석이 아니에요.</Body>
          <Field label="궁금한 점 · 선택" placeholder="예: 창가를 보며 자꾸 울어요" multiline value={captionQuestion} onChangeText={setCaptionQuestion} maxLength={1500} editable={!busy} />
          <View style={s.row}>{captionChoices.map(tag => <Chip key={tag} label={tag} selected={captionTags.includes(tag)} onPress={() => { if (!busy) setCaptionTags(old => old.includes(tag) ? old.filter(item => item !== tag) : [...old, tag]); }} />)}</View>
          {!captionEditing && <ErrorNote message={error} />}
          <Button title="질문과 상황 저장" busy={busy} disabled={busy} onPress={() => void saveCaption()} />
          <Button title="질문 수정 취소" secondary disabled={busy} onPress={cancelCaption} />
        </> : <>
          <Body>{data.question || '질문을 남기지 않았어요'}</Body>
          <Body muted>{data.contextTags.length ? data.contextTags.join(' · ') : '상황 태그를 남기지 않았어요'}</Body>
          {companion.demo ? <Button title="질문과 상황 수정" secondary disabled={busy} onPress={startCaption} /> : <Body muted>이 계정에 남긴 질문과 상황 태그는 여기서 고칠 수 없어요. 이 기기의 체험 기록만 수정할 수 있어요.</Body>}
        </>}
      </Card>
      <Card>
        <Heading>어느 아이의 기록인가요</Heading>
        <Body muted>이미 등록한 다른 아이에게만 옮겨요. 같은 관찰의 사진·울음·영상, 질문, 상황 태그, 반응 기록은 그대로 두어요. 새 아이를 만들거나 AI로 분석하지 않아요.</Body>
        {companion.demo ? !companion.pets.data ? null : otherPets.length === 0 ? <Body muted>등록된 다른 아이가 없어서 옮길 수 없어요.</Body> : movingPet ? <>
          <View style={s.row}>{otherPets.map(pet => <Chip key={pet.id} label={pet.name} selected={movePetId === pet.id} onPress={() => { if (!busy) setMovePetId(pet.id); }} />)}</View>
          <Button title="이 아이에게 옮기기" busy={busy} disabled={busy || !otherPets.some(pet => pet.id === movePetId)} onPress={() => void saveMove()} />
          <Button title="옮기기 취소" secondary disabled={busy} onPress={cancelMove} />
        </> : <Button title="다른 아이에게 옮기기" secondary disabled={busy} onPress={startMove} /> : <Body muted>이 계정에 남긴 관찰은 여기서 다른 아이에게 옮길 수 없어요. 이 기기의 체험 기록만 수정할 수 있어요.</Body>}
      </Card>
      {['QUEUED', 'PROCESSING'].includes(data.status) && <Card><Loading /><Body muted>화면을 나가도 서버의 분석은 이어져요. 기록 탭에서 다시 확인할 수 있어요.</Body></Card>}
      {data.status === 'CANCELLED' && <Card><Heading>관찰 요청이 취소되었어요</Heading><Body muted>보관 동의가 철회되어 분석을 중단했어요. 설정에서 동의를 확인한 뒤 새 기록을 만들 수 있어요.</Body><Button title="설정 열기" secondary onPress={() => router.push('/settings')} /></Card>}
      {data.status === 'FAILED' && <Card><Heading>관찰을 마치지 못했어요</Heading><Body muted>연결이나 분석 서비스 상태를 확인한 후 다시 시도할 수 있어요.</Body><Button title="분석 다시 요청" busy={busy} onPress={() => { setBusy(true); void companion.retry(id).then(() => observation.refetch()).catch(e => setError(errorMessage(e))).finally(() => setBusy(false)); }} /></Card>}
      {inference && <>
        {inference.utterance && <Card accent><Badge>우리 아이의 말 · 의인화한 추정</Badge><Heading>“{inference.utterance}”</Heading></Card>}
        <Card><Heading>관찰한 단서</Heading>{inference.observation.map((v, i) => <Body key={i}>{v}</Body>)}</Card>
        <Card><Heading>가능한 의미</Heading>{inference.possibilities.map((p, i) => <View key={i} style={{ gap: 5, marginBottom: 10 }}><Body>{i + 1}. {p.label}</Body><Body muted>{p.reason}</Body></View>)}</Card>
        <Card><Badge>{data.status === 'ABSTAINED' ? '판단 어려움' : inference.confidence === 'high' ? '단서 충분함' : '단서 제한적'}</Badge>{inference.reason && <Body>{inference.reason}</Body>}{inference.limitations.map((v, i) => <Body muted key={i}>{v}</Body>)}</Card>
        {inference.suggestedAction && <Card accent><Heading>이렇게 반응해 볼까요?</Heading><Body>{inference.suggestedAction}</Body></Card>}
        {!!citedReactions.length && <><Heading>함께 참고한 이전 기록</Heading>{citedReactions.map(item => <View key={item.id}>{item.line ? <Body>{item.line}</Body> : null}{item.open ? <Button title="보호자가 남긴 반응 보기" secondary onPress={() => router.push(citedPriorObservationHref(item.id, params))} /> : null}</View>)}</>}
      </>}
      <Heading>그 뒤, 우리 아이는 어땠나요?</Heading><Body muted>{editing ? (editing.id === latest?.id ? '저장한 최근 반응을 고치고 있어요. 새 반응을 추가하지 않아요.' : '저장한 이전 반응을 고치고 있어요. 새 반응을 추가하지 않아요.') : '실제로 해 본 행동과 그 뒤에 관찰한 반응을 남겨 주세요. 다음 대화에서 함께 참고할 수 있어요.'}</Body>
      {data.feedback?.map(item => <Card key={item.id}><Badge>{item.id === latest?.id ? '최근 보호자 기록' : '보호자 기록'}</Badge><Body>{item.action} → {item.reaction}</Body>{item.note ? <Body muted>{item.note}</Body> : null}{item.id && <><Button title={editing?.id === item.id ? '이 반응을 고치는 중' : '이 반응 수정'} secondary disabled={busy || editing?.id === item.id} onPress={() => startEdit(item)} /><Button title="이 반응 삭제" danger disabled={busy} onPress={() => removeReaction(item)} /></>}</Card>)}
      <View style={[s.row, { marginTop: 16 }]}>{actions.map(v => <Chip key={v} label={v} selected={action === v} onPress={() => { if (!busy) setAction(v); }} />)}<Chip label="기타" selected={!actions.includes(action) && !!action} onPress={() => { if (!busy) setAction(''); }} /></View>
      <Field label="해 본 행동" value={action} editable={!busy} onChangeText={setAction} maxLength={500} placeholder="직접 쓴 행동 · 선택" />
      <Heading>그 뒤 반응은 어땠나요?</Heading><View style={s.row}>{reactions.map(v => <Chip key={v} label={v} selected={reaction === v} onPress={() => { if (!busy) setReaction(v); }} />)}<Chip label="기타" selected={!reactions.includes(reaction) && !!reaction} onPress={() => { if (!busy) setReaction(''); }} /></View>
      <Field label="이후 관찰한 반응" value={reaction} editable={!busy} onChangeText={setReaction} maxLength={500} placeholder="직접 쓴 반응 · 선택" multiline />
      <Field label="추가 메모 · 선택" value={note} editable={!busy} onChangeText={setNote} maxLength={2000} />
      <ErrorNote message={error} />
      {conflict && <Button title="최신 기록 다시 불러오기" secondary disabled={busy} onPress={reload} />}
      <Button title={editing ? '수정 저장하기' : '반응을 기억해 두기'} busy={busy} disabled={busy || !action.trim() || !reaction.trim()} onPress={() => void save()} />
      {editing && <Button title="수정 취소" secondary disabled={busy} onPress={cancelEdit} />}
      <Button title="이 아이의 기록으로 대화하기" secondary onPress={() => router.push({ pathname: '/conversation', params: { petId: data.petId } })} />
      {companion.demo ? <Button title="이 관찰 삭제" danger disabled={busy} onPress={removeThis} /> : <Body muted>이 계정에 남긴 관찰은 여기서 지울 수 없어요. 이 기기의 체험 기록만 삭제할 수 있어요.</Body>}
    </>}
    <Pressable onPress={() => router.replace(observationLeaveHref(params))} style={{ padding: 20, alignItems: 'center' }}><Body muted>기록 목록으로</Body></Pressable>
  </Screen>;
}
