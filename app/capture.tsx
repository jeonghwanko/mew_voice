import { useEffect, useRef, useState } from 'react';
import { Image, View, Platform, Linking, KeyboardAvoidingView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioPlayer, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { Screen, Badge, Body, Button, Card, Heading, Field, Chip, ErrorNote, s } from '../src/ui/components';
import { useCompanion, newRequestId } from '../src/features/companion/useCompanion';
import { sessionStorage } from '../src/core/storage';
import { useSession } from '../src/core/session';
import { errorMessage } from '../src/lib/api';
import { readCaptureDraft } from '../src/features/companion/captureDraft';

const contexts = ['식사 전', '식사 후', '놀이 중', '쉬는 중', '창가에서', '낯선 소리', '귀가 후'];
export default function Capture() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const requestedKind = mode === 'audio' ? 'AUDIO' : mode === 'photo' ? 'PHOTO' : undefined;
  const companion = useCompanion(); const { session } = useSession();
  const [uri, setUri] = useState(''); const [kind, setKind] = useState<'PHOTO' | 'AUDIO'>(requestedKind ?? 'PHOTO'); const [durationMs, setDurationMs] = useState<number>(); const [question, setQuestion] = useState(''); const [tags, setTags] = useState<string[]>([]);
  const [requestId, setRequestId] = useState(newRequestId); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [permissionDenied, setPermissionDenied] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY); const recording = useAudioRecorderState(recorder, 250); const player = useAudioPlayer(uri || null); const recordingSessionActive = useRef(false);
  const activePet = companion.activePet;
  const legacyDraftKey = `companion_pending_${session?.mode}_${session?.userId}_${activePet?.id ?? 'none'}`;
  const draftKey = `${legacyDraftKey}_${kind.toLowerCase()}`;
  useEffect(() => {
    let alive = true;
    setUri(''); setDurationMs(undefined); setQuestion(''); setTags([]); setRequestId(newRequestId());
    // Separate media drafts: opening the audio shortcut must not restore a photo.
    const restore = async () => {
      const raw = await sessionStorage.get(draftKey) ?? await sessionStorage.get(legacyDraftKey);
      if (!raw || !alive) return;
      const draft = readCaptureDraft(raw, kind);
      if (!draft) return;
      setUri(draft.uri); setDurationMs(draft.durationMs); setQuestion(draft.question); setTags(draft.tags); setRequestId(draft.requestId);
    };
    void restore().catch(() => undefined);
    return () => { alive = false; };
  }, [draftKey, legacyDraftKey, kind]);
  useEffect(() => { if (kind === 'AUDIO' && recordingSessionActive.current && !recording.isRecording && recording.url) { recordingSessionActive.current = false; setUri(recording.url); setDurationMs(Math.max(1_000, recording.durationMillis)); } }, [kind, recording.durationMillis, recording.isRecording, recording.url]);
  const pick = async (camera: boolean) => {
    setError(''); setPermissionDenied(false);
    try {
      if (camera) { const permission = await ImagePicker.requestCameraPermissionsAsync(); if (!permission.granted) { setPermissionDenied(true); return; } }
      const result = camera ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (result.canceled) return;
      const resized = await ImageManipulator.manipulateAsync(result.assets[0].uri, [{ resize: { width: 1400 } }], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: Platform.OS === 'web' });
      if (Platform.OS === 'web') setUri(`data:image/jpeg;base64,${resized.base64}`);
      else { const dir = `${FileSystem.documentDirectory}companion-photos/`; await FileSystem.makeDirectoryAsync(dir, { intermediates: true }); const path = `${dir}${newRequestId()}.jpg`; await FileSystem.copyAsync({ from: resized.uri, to: path }); setUri(path); }
      setKind('PHOTO'); setDurationMs(undefined); setRequestId(newRequestId());
    } catch (e) { setError(errorMessage(e)); }
  };
  const toggleRecording = async () => {
    setError(''); setPermissionDenied(false);
    try {
      if (recording.isRecording) {
        await recorder.stop();
        if (!recorder.uri) throw new Error('AUDIO_RECORDING_FAILED');
        recordingSessionActive.current = false; setUri(recorder.uri); setKind('AUDIO'); setDurationMs(Math.max(1_000, recording.durationMillis)); setRequestId(newRequestId()); return;
      }
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) { setPermissionDenied(true); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync(); recordingSessionActive.current = true; recorder.record({ forDuration: 45 });
    } catch (e) { setError(errorMessage(e)); }
  };
  const discardAudio = () => { if (recording.isRecording) void recorder.stop(); setUri(''); setDurationMs(undefined); setRequestId(newRequestId()); };
  const submit = async () => {
    if (!activePet || !uri) return; setBusy(true); setError('');
    try {
      if (Platform.OS !== 'web') await sessionStorage.set(draftKey, JSON.stringify({ uri, kind, durationMs, question, tags, requestId }));
      const observation = await companion.submitMedia({ uri, kind, durationMs, petId: activePet.id, question: question.trim(), contextTags: tags, idempotencyKey: requestId });
      await sessionStorage.remove(draftKey);
      const legacy = await sessionStorage.get(legacyDraftKey);
      if (legacy && readCaptureDraft(legacy, kind)?.requestId === requestId) await sessionStorage.remove(legacyDraftKey);
      router.replace(`/observations/${observation.id}`);
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  const changeQuestion = (value: string) => { setQuestion(value); setRequestId(newRequestId()); };
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Screen title="지금, 무엇을 남길까요?" subtitle="PHOTO OR CRY, A LITTLE UNDERSTANDING">
    <Badge>{companion.demo ? '체험 · 입력은 이 기기에만 저장' : '사진 · 울음 관찰'}</Badge><View style={[s.row, { marginVertical: 18 }]}>{companion.pets.data?.map(p => <Chip key={p.id} label={p.name} selected={activePet?.id === p.id} onPress={() => { void companion.selectPet(p.id); setRequestId(newRequestId()); }} />)}</View>
    {!activePet && <Button title="먼저 우리 아이 등록하기" onPress={() => router.replace('/pets/new')} />}
    <View style={s.row}><Chip label="사진" selected={kind === 'PHOTO'} onPress={() => { if (recording.isRecording) void recorder.stop(); setKind('PHOTO'); setUri(''); setDurationMs(undefined); setRequestId(newRequestId()); }} /><Chip label="울음 녹음" selected={kind === 'AUDIO'} onPress={() => { setKind('AUDIO'); setUri(''); setDurationMs(undefined); setRequestId(newRequestId()); }} /></View>
    {kind === 'PHOTO' ? <><>{uri && <Image accessibilityLabel="선택한 관찰 사진" source={{ uri }} style={{ width: '100%', height: 240, borderRadius: 22, marginBottom: 12 }} resizeMode="cover" />}</><Card><Heading>얼굴과 자세가 함께 보이게</Heading><Body muted>우리 아이가 편안한 거리에서 촬영해 주세요. 반응을 유도할 필요는 없어요.</Body></Card><Button title={uri ? '다른 사진 선택' : '사진첩에서 선택'} secondary icon="images-outline" disabled={busy} onPress={() => void pick(false)} /><Button title="카메라로 촬영" secondary icon="camera-outline" disabled={busy} onPress={() => void pick(true)} /></> : <Card accent={recording.isRecording}><Heading>{recording.isRecording ? `녹음 중 · ${Math.ceil(recording.durationMillis / 1000)}초` : uri ? `울음 녹음 · ${Math.max(1, Math.round((durationMs ?? 0) / 1000))}초` : '짧은 울음만 조용히 녹음해 주세요'}</Heading><Body muted>최대 45초예요. 사람 대화나 다른 동물의 소리가 들어가지 않게 해 주세요. 소리만으로 뜻을 확정하지 않아요.</Body>{uri && !recording.isRecording && <Button title="재생하기" secondary icon="play" onPress={() => { player.seekTo(0); player.play(); }} />}{uri && !recording.isRecording && <Button title="다시 녹음하기" secondary icon="refresh" onPress={discardAudio} />}<Button title={recording.isRecording ? '녹음 멈추기' : '녹음 시작'} icon={recording.isRecording ? 'stop' : 'mic'} disabled={busy} onPress={() => void toggleRecording()} /></Card>}
    {permissionDenied && <Card><Body>카메라 또는 마이크 권한이 꺼져 있어요. 사진을 선택하거나 설정에서 권한을 허용해 주세요.</Body>{Platform.OS !== 'web' && <Button title="기기 설정 열기" secondary onPress={() => void Linking.openSettings()} />}</Card>}
    <Field label="궁금한 점 · 선택" placeholder="예: 창가를 보며 자꾸 울어요" multiline value={question} onChangeText={changeQuestion} maxLength={1500} editable={!busy} />
    <Heading>어떤 상황이었나요?</Heading><View style={s.row}>{contexts.map(tag => <Chip key={tag} label={tag} selected={tags.includes(tag)} onPress={() => { setTags(old => old.includes(tag) ? old.filter(t => t !== tag) : [...old, tag]); setRequestId(newRequestId()); }} />)}</View>
    <View style={{ marginTop: 20 }}><Body muted>{kind === 'AUDIO' ? '발성 길이·반복·간격 같은 단서를 살펴봐요. 번역이나 건강 진단이 아니에요.' : '사진에서 보이는 자세와 맥락만 살펴봐요. 소리는 녹음으로 따로 남길 수 있어요.'}</Body></View>
    {!companion.consent.data?.serviceStorage && <Card><Heading>기록 보관 동의</Heading><Body muted>{companion.demo ? '체험 입력과 메모를 이 기기에 저장합니다.' : '사진·울음·질문·관찰 결과를 서버의 비공개 기록으로 보관하고, 선택한 입력과 질문을 AI 공급자에게 보내 분석합니다.'} 공통 모델 학습 참여는 별도이며 현재 꺼져 있어요.</Body><Button title="기록 보관에 동의하기" secondary busy={busy} onPress={() => { setBusy(true); void companion.saveConsent(true, false).catch(e => setError(errorMessage(e))).finally(() => setBusy(false)); }} /></Card>}
    <ErrorNote message={error} /><Button title={companion.demo ? '체험 기록 남기기' : kind === 'AUDIO' ? '울음 관찰 요청하기' : '사진 관찰 요청하기'} busy={busy} disabled={!uri || !activePet || !companion.consent.data?.serviceStorage || recording.isRecording} onPress={() => void submit()} /><Button title="닫기" secondary disabled={busy} onPress={() => router.back()} />
  </Screen></KeyboardAvoidingView>;
}
