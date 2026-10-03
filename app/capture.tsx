import { useEffect, useRef, useState } from 'react';
import { Image, View, Platform, Linking, KeyboardAvoidingView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioPlayer, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { Screen, Badge, Body, Button, Card, Heading, Field, Chip, ErrorNote, s } from '../src/ui/components';
import { useCompanion, useObservation, newRequestId } from '../src/features/companion/useCompanion';
import { sessionStorage } from '../src/core/storage';
import { useSession } from '../src/core/session';
import { errorMessage } from '../src/lib/api';
import { readCaptureDraft } from '../src/features/companion/captureDraft';
import { VideoPreview } from '../src/features/companion/VideoPreview';

const contexts = ['식사 전', '식사 후', '놀이 중', '쉬는 중', '창가에서', '낯선 소리', '귀가 후'];
type CaptureKind = 'PHOTO' | 'AUDIO' | 'VIDEO';
const requestedKind = (mode?: string): CaptureKind | undefined => mode === 'audio' ? 'AUDIO' : mode === 'video' ? 'VIDEO' : mode === 'photo' ? 'PHOTO' : undefined;
const VIDEO_ACCEPT_MS = 11_000;

async function keepRecording(source: string) {
  if (Platform.OS === 'web' || !FileSystem.documentDirectory) return source;
  const dir = `${FileSystem.documentDirectory}companion-audio/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const ext = /\.(caf|wav|webm|mp3|m4a)(\?|$)/i.exec(source)?.[1]?.toLowerCase() ?? 'm4a';
  const path = `${dir}${newRequestId()}.${ext}`;
  await FileSystem.copyAsync({ from: source, to: path });
  return path;
}
function dropKeptAudio(current: string) {
  if (current && FileSystem.documentDirectory && current.startsWith(`${FileSystem.documentDirectory}companion-audio/`)) void FileSystem.deleteAsync(current, { idempotent: true });
}

export default function Capture() {
  const params = useLocalSearchParams<{ mode?: string; replaceId?: string; returnTo?: string; conversationId?: string; petId?: string }>();
  const mode = params.mode;
  const replaceId = typeof params.replaceId === 'string' ? params.replaceId : Array.isArray(params.replaceId) ? params.replaceId[0] : undefined;
  const replacing = !!replaceId?.trim();
  const initialKind = requestedKind(mode);
  const companion = useCompanion(); const { session } = useSession();
  const replacingObservation = useObservation(replacing ? replaceId!.trim() : '');
  const [uri, setUri] = useState(''); const [kind, setKind] = useState<CaptureKind>(initialKind ?? 'PHOTO'); const [durationMs, setDurationMs] = useState<number>(); const [question, setQuestion] = useState(''); const [tags, setTags] = useState<string[]>([]);
  const [requestId, setRequestId] = useState(newRequestId); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [permissionIssue, setPermissionIssue] = useState<'camera' | 'library' | 'generic' | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY); const recording = useAudioRecorderState(recorder, 250); const player = useAudioPlayer(kind === 'AUDIO' && uri ? uri : null); const recordingSessionActive = useRef(false);
  const activePet = companion.activePet;
  const legacyDraftKey = `companion_pending_${session?.mode}_${session?.userId}_${activePet?.id ?? 'none'}`;
  const draftKey = `${legacyDraftKey}_${kind.toLowerCase()}`;
  useEffect(() => {
    if (!replacing || !replacingObservation.data) return;
    if (replacingObservation.data.kind !== kind) setKind(replacingObservation.data.kind);
  }, [replacing, replacingObservation.data, kind]);
  useEffect(() => {
    let alive = true;
    setUri(''); setDurationMs(undefined); setQuestion(''); setTags([]); setRequestId(newRequestId());
    if (replacing) return () => { alive = false; };
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
  }, [draftKey, legacyDraftKey, kind, replacing]);
  useEffect(() => {
    if (!(kind === 'AUDIO' && recordingSessionActive.current && !recording.isRecording && recording.url)) return;
    recordingSessionActive.current = false;
    const source = recording.url;
    const duration = recording.durationMillis;
    let alive = true;
    setBusy(true);
    void keepRecording(source).then(saved => {
      if (!alive) { dropKeptAudio(saved); return; }
      setUri(saved); setKind('AUDIO'); setDurationMs(Math.max(1_000, duration)); setRequestId(newRequestId());
    }).catch(e => { if (alive) setError(errorMessage(e)); }).finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [kind, recording.durationMillis, recording.isRecording, recording.url]);
  const pick = async (camera: boolean) => {
    setError(''); setPermissionIssue(null);
    try {
      if (camera) { const permission = await ImagePicker.requestCameraPermissionsAsync(); if (!permission.granted) { setPermissionIssue('generic'); return; } }
      const result = camera ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (result.canceled) return;
      const resized = await ImageManipulator.manipulateAsync(result.assets[0].uri, [{ resize: { width: 1400 } }], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: Platform.OS === 'web' });
      if (Platform.OS === 'web') setUri(`data:image/jpeg;base64,${resized.base64}`);
      else { const dir = `${FileSystem.documentDirectory}companion-photos/`; await FileSystem.makeDirectoryAsync(dir, { intermediates: true }); const path = `${dir}${newRequestId()}.jpg`; await FileSystem.copyAsync({ from: resized.uri, to: path }); setUri(path); }
      setKind('PHOTO'); setDurationMs(undefined); setRequestId(newRequestId());
    } catch (e) { setError(errorMessage(e)); }
  };
  const toggleRecording = async () => {
    setError(''); setPermissionIssue(null);
    try {
      if (recording.isRecording) {
        setBusy(true);
        try {
          await recorder.stop();
          if (!recorder.uri) throw new Error('AUDIO_RECORDING_FAILED');
          recordingSessionActive.current = false;
          const saved = await keepRecording(recorder.uri);
          setUri(saved); setKind('AUDIO'); setDurationMs(Math.max(1_000, recording.durationMillis)); setRequestId(newRequestId());
        } finally { setBusy(false); }
        return;
      }
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) { setPermissionIssue('generic'); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync(); recordingSessionActive.current = true; recorder.record({ forDuration: 45 });
    } catch (e) { setError(errorMessage(e)); }
  };
  const discardAudio = () => { if (recording.isRecording) void recorder.stop(); dropKeptAudio(uri); setUri(''); setDurationMs(undefined); setRequestId(newRequestId()); };
  const selectKind = (next: CaptureKind) => {
    if (replacing) return;
    if (recording.isRecording) void recorder.stop();
    if (kind === 'AUDIO') dropKeptAudio(uri);
    setKind(next); setUri(''); setDurationMs(undefined); setError(''); setPermissionIssue(null); setRequestId(newRequestId());
  };
  const acceptVideo = async (asset: ImagePicker.ImagePickerAsset) => {
    if (asset.type && asset.type !== 'video') { setError('영상 파일만 남길 수 있어요.'); return; }
    const duration = asset.duration;
    if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) { setError('영상 길이를 확인하지 못했어요. 약 10초 이내의 영상을 다시 선택해 주세요.'); return; }
    if (duration > VIDEO_ACCEPT_MS) { setError('영상은 약 10초까지 남길 수 있어요. 더 짧은 영상을 선택해 주세요.'); return; }
    let saved = asset.uri;
    if (Platform.OS !== 'web' && FileSystem.documentDirectory) {
      const dir = `${FileSystem.documentDirectory}companion-videos/`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const ext = /\.mov(\?|$)/i.test(asset.uri) ? 'mov' : 'mp4';
      const path = `${dir}${newRequestId()}.${ext}`;
      await FileSystem.copyAsync({ from: asset.uri, to: path });
      saved = path;
    }
    setUri(saved); setKind('VIDEO'); setDurationMs(Math.round(duration)); setRequestId(newRequestId());
  };
  const takeVideo = async () => {
    setError(''); setPermissionIssue(null);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) { setPermissionIssue('camera'); return; }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['videos'], videoMaxDuration: 10, videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium });
      if (result.canceled) return;
      await acceptVideo(result.assets[0]);
    } catch (e) { setError(errorMessage(e)); }
  };
  const pickVideo = async () => {
    setError(''); setPermissionIssue(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { setPermissionIssue('library'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], videoMaxDuration: 10 });
      if (result.canceled) return;
      await acceptVideo(result.assets[0]);
    } catch (e) { setError(errorMessage(e)); }
  };
  const discardVideo = () => {
    const current = uri;
    setUri(''); setDurationMs(undefined); setRequestId(newRequestId());
    if (current && FileSystem.documentDirectory && current.startsWith(`${FileSystem.documentDirectory}companion-videos/`)) void FileSystem.deleteAsync(current, { idempotent: true });
  };
  const observationReturnHref = () => {
    const id = replaceId?.trim();
    if (!id) return '/history';
    const query: string[] = [];
    const returnTo = typeof params.returnTo === 'string' ? params.returnTo : Array.isArray(params.returnTo) ? params.returnTo[0] : undefined;
    const conversationId = typeof params.conversationId === 'string' ? params.conversationId : Array.isArray(params.conversationId) ? params.conversationId[0] : undefined;
    const petId = typeof params.petId === 'string' ? params.petId : Array.isArray(params.petId) ? params.petId[0] : undefined;
    if (returnTo) query.push(`returnTo=${encodeURIComponent(returnTo)}`);
    if (conversationId) query.push(`conversationId=${encodeURIComponent(conversationId)}`);
    if (petId) query.push(`petId=${encodeURIComponent(petId)}`);
    return query.length ? `/observations/${encodeURIComponent(id)}?${query.join('&')}` : `/observations/${encodeURIComponent(id)}`;
  };
  const submit = async () => {
    if (!uri) return;
    if (replacing) {
      const target = replacingObservation.data;
      if (!target) { setError(errorMessage(new Error('NOT_FOUND'))); return; }
      if (!companion.demo) { setError(errorMessage(new Error('OBSERVATION_MEDIA_ACCOUNT_READONLY'))); return; }
      setBusy(true); setError('');
      try {
        await companion.replaceObservationMedia(target.id, { uri, kind: target.kind, durationMs, mimeType: kind === 'PHOTO' ? 'image/jpeg' : undefined });
        router.replace(observationReturnHref());
      } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
      return;
    }
    if (!activePet) return; setBusy(true); setError('');
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
  const videoBlocked = kind === 'VIDEO' && !companion.demo;
  const mediaLabel = kind === 'AUDIO' ? '울음' : kind === 'VIDEO' ? '영상' : '사진';
  const replaceBlocked = replacing && !companion.demo;
  const replaceMissing = replacing && !replacingObservation.isLoading && !replacingObservation.data;
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Screen title={replacing ? `${mediaLabel}만 바꿔요` : '지금, 무엇을 남길까요?'} subtitle={replacing ? '질문 · 상황 · 반응은 그대로' : '사진 · 울음 · 약 10초 영상'}>
    <Badge>{replacing ? '체험 · 같은 기록의 파일만 교체' : companion.demo ? '체험 · 입력은 이 기기에만 저장' : '사진 · 울음 관찰'}</Badge>
    {replacing ? <Body muted>같은 종류의 {mediaLabel}만 바꿔요. 질문, 상황 태그, 반응 기록은 그대로 두어요. 새 파일은 AI로 분석하지 않아요.</Body> : null}
    {replaceMissing ? <Card><Body muted>바꿀 관찰을 찾지 못했어요. 기록 화면에서 다시 열어 주세요.</Body></Card> : null}
    {replaceBlocked ? <Body muted>이 계정에 남긴 사진·울음·영상은 여기서 바꿀 수 없어요. 이 기기의 체험 기록만 수정할 수 있어요.</Body> : null}
    {!replacing && <View style={[s.row, { marginVertical: 18 }]}>{companion.pets.data?.map(p => <Chip key={p.id} label={p.name} selected={activePet?.id === p.id} onPress={() => { void companion.selectPet(p.id); setRequestId(newRequestId()); }} />)}</View>}
    {!replacing && !activePet && <Button title="먼저 우리 아이 등록하기" onPress={() => router.replace('/pets/new')} />}
    {!replacing && <View style={s.row}><Chip label="사진" selected={kind === 'PHOTO'} onPress={() => selectKind('PHOTO')} /><Chip label="울음 녹음" selected={kind === 'AUDIO'} onPress={() => selectKind('AUDIO')} /><Chip label="짧은 영상" selected={kind === 'VIDEO'} onPress={() => selectKind('VIDEO')} /></View>}
    {kind === 'PHOTO' ? <><>{uri && <Image accessibilityLabel="선택한 관찰 사진" source={{ uri }} style={{ width: '100%', height: 240, borderRadius: 22, marginBottom: 12 }} resizeMode="cover" />}</><Card><Heading>얼굴과 자세가 함께 보이게</Heading><Body muted>우리 아이가 편안한 거리에서 촬영해 주세요. 반응을 유도할 필요는 없어요.</Body></Card><Button title={uri ? '다른 사진 선택' : '사진첩에서 선택'} secondary icon="images-outline" disabled={busy} onPress={() => void pick(false)} /><Button title="카메라로 촬영" secondary icon="camera-outline" disabled={busy} onPress={() => void pick(true)} /></> : null}
    {kind === 'AUDIO' ? <Card accent={recording.isRecording}><Heading>{recording.isRecording ? `녹음 중 · ${Math.ceil(recording.durationMillis / 1000)}초` : uri ? `울음 녹음 · ${Math.max(1, Math.round((durationMs ?? 0) / 1000))}초` : '짧은 울음만 조용히 녹음해 주세요'}</Heading><Body muted>최대 45초예요. 사람 대화나 다른 동물의 소리가 들어가지 않게 해 주세요. 소리만으로 뜻을 확정하지 않아요.</Body>{uri && !recording.isRecording && <Button title="재생하기" secondary icon="play" onPress={() => { player.seekTo(0); player.play(); }} />}{Platform.OS === 'web' && uri && !recording.isRecording ? <Body muted>브라우저 체험에서는 녹음을 서버로 보내지 않아요. 새로고침 뒤에는 재생 파일이 남지 않을 수 있어요.</Body> : null}{uri && !recording.isRecording && <Button title="다시 녹음하기" secondary icon="refresh" onPress={discardAudio} />}<Button title={recording.isRecording ? '녹음 멈추기' : '녹음 시작'} icon={recording.isRecording ? 'stop' : 'mic'} disabled={busy} onPress={() => void toggleRecording()} /></Card> : null}
    {kind === 'VIDEO' ? <Card><Heading>{uri ? `짧은 영상 · ${Math.max(1, Math.round((durationMs ?? 0) / 1000))}초` : '약 10초 영상을 남겨 주세요'}</Heading><Body muted>선택한 아이의 기기 기록으로만 남아요. 영상 속 행동이나 소리를 분석하지 않고, 감정으로 번역하지도 않아요.</Body>{uri ? <VideoPreview uri={uri} /> : null}{Platform.OS === 'web' && uri ? <Body muted>브라우저 체험에서는 영상을 서버로 보내지 않아요. 새로고침 뒤에는 재생 파일이 남지 않을 수 있어요.</Body> : null}{uri ? <Button title="영상 버리기" secondary icon="trash-outline" disabled={busy} onPress={discardVideo} /> : null}<Button title={uri ? '다른 영상 촬영' : '영상 촬영'} secondary icon="videocam-outline" disabled={busy} onPress={() => void takeVideo()} /><Button title="보관함에서 약 10초 영상 선택" secondary icon="film-outline" disabled={busy} onPress={() => void pickVideo()} />{videoBlocked && <Body muted>로그인한 계정에는 영상 업로드 계약이 없어요. 체험 모드에서 이 기기에만 저장할 수 있어요.</Body>}</Card> : null}
    {permissionIssue && <Card><Body>{permissionIssue === 'library' ? '영상 보관함 권한이 꺼져 있어요. 설정에서 사진과 동영상 접근을 허용하거나, 카메라로 약 10초를 촬영해 주세요.' : permissionIssue === 'camera' ? '영상 촬영에 필요한 카메라 권한이 꺼져 있어요. 설정에서 카메라를 허용하거나, 이미 찍은 약 10초 영상을 보관함에서 선택할 수 있어요.' : '카메라 또는 마이크 권한이 꺼져 있어요. 사진을 선택하거나 설정에서 권한을 허용해 주세요.'}</Body>{permissionIssue === 'camera' && <Button title="영상 보관함에서 선택" secondary icon="film-outline" disabled={busy} onPress={() => void pickVideo()} />}{Platform.OS !== 'web' && <Button title="기기 설정 열기" secondary onPress={() => void Linking.openSettings()} />}</Card>}
    {!replacing && <Field label="궁금한 점 · 선택" placeholder="예: 창가를 보며 자꾸 울어요" multiline value={question} onChangeText={changeQuestion} maxLength={1500} editable={!busy} />}
    {!replacing && <Heading>어떤 상황이었나요?</Heading>}
    {!replacing && <View style={s.row}>{contexts.map(tag => <Chip key={tag} label={tag} selected={tags.includes(tag)} onPress={() => { setTags(old => old.includes(tag) ? old.filter(t => t !== tag) : [...old, tag]); setRequestId(newRequestId()); }} />)}</View>}
    <View style={{ marginTop: 20 }}><Body muted>{replacing ? '바꾼 파일도 이 기기에만 남아요. 실제 AI 분석이 아니에요.' : companion.demo ? '기록은 이 기기에만 남아요. 실제 AI 분석이 아니에요.' : kind === 'AUDIO' ? '발성 길이·반복·간격 같은 단서를 살펴봐요. 번역이나 건강 진단이 아니에요.' : kind === 'VIDEO' ? '영상은 길이만 기록해요. 분석 결과나 감정 번역처럼 보이지 않아요.' : '사진에서 보이는 자세와 맥락만 살펴봐요. 소리는 녹음으로 따로 남길 수 있어요.'}</Body></View>
    {!replacing && !companion.consent.data?.serviceStorage && <Card><Heading>기록 보관 동의</Heading><Body muted>{companion.demo ? '체험 입력과 메모를 이 기기에 저장합니다.' : '사진·울음·질문·관찰 결과를 서버의 비공개 기록으로 보관하고, 선택한 입력과 질문을 AI 공급자에게 보내 분석합니다.'} 공통 모델 학습 참여는 별도이며 현재 꺼져 있어요.</Body><Button title="기록 보관에 동의하기" secondary busy={busy} onPress={() => { setBusy(true); void companion.saveConsent(true, false).catch(e => setError(errorMessage(e))).finally(() => setBusy(false)); }} /></Card>}
    <ErrorNote message={error} />
    <Button title={replacing ? `${mediaLabel} 저장하기` : companion.demo ? (kind === 'VIDEO' ? '체험 영상 기록 남기기' : '체험 기록 남기기') : kind === 'AUDIO' ? '울음 관찰 요청하기' : kind === 'VIDEO' ? '영상은 체험 모드에서만 저장' : '사진 관찰 요청하기'} busy={busy} disabled={!uri || recording.isRecording || replaceBlocked || replaceMissing || (replacing ? false : (!activePet || !companion.consent.data?.serviceStorage || videoBlocked))} onPress={() => void submit()} />
    <Button title="닫기" secondary disabled={busy} onPress={() => replacing ? router.replace(observationReturnHref()) : router.back()} />
  </Screen></KeyboardAvoidingView>;
}
