import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Speech from 'expo-speech';
import type { CompanionConversation } from '@findthem/shared';
import { useSession } from '../../core/session';
import { api, errorMessage } from '../../lib/api';
import { newRequestId, useCompanion } from '../companion/useCompanion';
import { loadSavedConversations } from '../companion/conversationPages';
import { conversationOpenPet, findDemoConversation } from '../companion/conversationStore';
import { checkinChoiceLabel, choicesForPet, firstChoiceOnPet, hasOtherChoice, initialCitationChoice, observationChoiceLabel, petsWithOtherChoice, recentChoices, type CheckinChoice, type ObservationChoice } from '../companion/citationChoices';
import { getDemo } from '../companion/demo';
import { homeConversationThread, homeQuestionTarget, latestHomeAnswer, type HomeConversationTurn } from '../companion/homeConversation';
import { citedCheckinHref } from '../companion/checkinNavigation';
import { homeCaptureHref } from '../companion/captureNavigation';
import { citedObservationHref } from '../companion/observationNavigation';
import { citedCaresForAnswer, citedReactionsForAnswer, homeCitedCheckinLink, presentConversationAnswer } from '../companion/daily';
import { useCitedCheckinMoments } from '../companion/useCheckins';
import { useCitedReactionMoments } from '../companion/citedReactions';
import { AppearancePanel } from './AppearancePanel';
import { CatStage } from './CatStage';
import { useAppearance } from './useAppearance';
import { studio as c, type CatMood } from './appearance';
import { MewIcon } from '../../ui/MewIcon';
import { HomeMenu, type HomeMenuPage } from './HomeMenu';
import { QuickAction } from './QuickAction';
import { homeQuickActions } from './homeQuickActions';
import { chatCaptureShortcut } from './chatCaptureShortcut';
import { chatCareShortcut } from './chatCareShortcut';
import { LatestObservation } from './LatestObservation';
import { TodayCare } from './TodayCare';

export default function CatStudio() {
  const { customize, conversationId: requestedConversationId, petId: requestedPetId } = useLocalSearchParams<{ customize?: string; conversationId?: string | string[]; petId?: string | string[] }>();
  const companion = useCompanion();
  const focused = useIsFocused();
  const { session } = useSession();
  const pet = companion.activePet;
  const pets = companion.pets.data;
  const selectSavedPet = companion.selectPet;
  const { width, height } = useWindowDimensions();
  const wide = width >= 760;
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => { const show = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true)); const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false)); return () => { show.remove(); hide.remove(); }; }, []);
  const appearance = useAppearance(`${session?.mode}:${session?.userId}:${pet?.id ?? 'virtual'}`);
  const [editing, setEditing] = useState(false), [side, setSide] = useState<'left' | 'right'>('right');
  const [menuPage, setMenuPage] = useState<HomeMenuPage | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [focusThread, setFocusThread] = useState<string | null>(null);
  const appliedHomeQuestion = useRef<string | null>(null);
  useEffect(() => { if (focused && customize === '1') { setEditing(true); router.setParams({ customize: '' }); } }, [customize, focused]);
  useEffect(() => {
    if (!focused) return;
    const target = homeQuestionTarget({ conversationId: requestedConversationId, petId: requestedPetId });
    if (!target) { appliedHomeQuestion.current = null; return; }
    const token = `${target.conversationId}\0${target.petId ?? ''}`;
    if (appliedHomeQuestion.current === token) return;
    let live = true;
    void (async () => {
      let petToOpen = target.petId;
      if (companion.demo && pets) {
        const found = await findDemoConversation(target.conversationId);
        if (!live) return;
        const resolved = conversationOpenPet({ conversationPetId: found?.petId, requestedPetId: target.petId, knownPetIds: pets.map(item => item.id) });
        if (resolved) petToOpen = resolved;
      }
      if (!live) return;
      if (petToOpen) {
        if (!pets) return;
        if (pets.some(item => item.id === petToOpen) && pet?.id !== petToOpen) { void selectSavedPet(petToOpen); return; }
      }
      appliedHomeQuestion.current = token;
      setFocusThread(target.conversationId);
      setChatOpen(true);
      router.setParams({ conversationId: '', petId: '' });
    })();
    return () => { live = false; };
  }, [focused, requestedConversationId, requestedPetId, pet?.id, pets, selectSavedPet, companion.demo]);
  const [picker, setPicker] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), [removing, setRemoving] = useState(false), [movingId, setMovingId] = useState<string | null>(null), [movePetId, setMovePetId] = useState(''), [editingQuestionId, setEditingQuestionId] = useState<string | null>(null), [questionDraft, setQuestionDraft] = useState(''), [editingAnswerId, setEditingAnswerId] = useState<string | null>(null), [answerDraft, setAnswerDraft] = useState(''), [timeEditingId, setTimeEditingId] = useState<string | null>(null), [timeDraft, setTimeDraft] = useState(''), [citationEdit, setCitationEdit] = useState<{ turnId: string; kind: 'observation' | 'checkin'; index: number; petId: string; targetId: string } | null>(null), [speaking, setSpeaking] = useState(false), [petting, setPetting] = useState(false);
  const [active, setActive] = useState<CompanionConversation | null>(null);
  const generation = useRef(0), requestId = useRef(newRequestId()), speechGeneration = useRef(0), mounted = useRef(true), threadRef = useRef<ScrollView>(null);
  const pending = useQuery({
    queryKey: [...companion.key, 'studio-conversation', active?.id],
    enabled: !!active?.id && active.status === 'QUEUED' && !companion.demo,
    queryFn: () => api.get<CompanionConversation>(`/pet-companion/conversations/${active!.id}`),
    refetchInterval: query => query.state.data?.status === 'QUEUED' ? 2500 : false,
  });
  const current = pending.data ?? active;
  const savedThreads = useQuery({
    queryKey: [...companion.key, 'conversations', pet?.id],
    enabled: !!pet,
    queryFn: () => loadSavedConversations(companion.demo, pet!.id),
  });
  const citationCatalog = useQuery({
    queryKey: [...companion.key, 'citation-catalog'],
    enabled: companion.demo && !!pet,
    queryFn: async () => {
      const stored = await getDemo();
      const observations: ObservationChoice[] = stored.observations.map(item => ({ id: item.id, petId: item.petId, question: item.question, kind: item.kind, createdAt: item.createdAt }));
      const checkins: CheckinChoice[] = stored.checkins.map(item => ({ id: item.id, petId: item.petId, kind: item.kind, note: item.note, occurredAt: item.occurredAt }));
      return { observations, checkins };
    },
  });
  const turns = useMemo(() => homeConversationThread(savedThreads.data?.items ?? [], pet?.id, current), [savedThreads.data, pet?.id, current]);
  const citedCheckinIds = useMemo(() => turns.flatMap(turn => turn.citedCheckinIds ?? []), [turns]);
  const citedObservationIds = useMemo(() => turns.flatMap(turn => turn.citedObservationIds ?? []), [turns]);
  const careMoments = useCitedCheckinMoments(citedCheckinIds);
  const reactionMoments = useCitedReactionMoments(citedObservationIds);
  const visibleTurns = useMemo(() => turns.map(turn => ({
    ...turn,
    answer: presentConversationAnswer(turn.answer, citedCaresForAnswer(turn.citedCheckinIds, careMoments), citedReactionsForAnswer(turn.citedObservationIds, reactionMoments)),
  })), [turns, careMoments, reactionMoments]);
  const thinking = busy || current?.status === 'QUEUED';
  const answer = thinking ? null : latestHomeAnswer(visibleTurns);
  const mood: CatMood = speaking ? 'speaking' : thinking ? 'thinking' : petting ? 'happy' : message ? 'listening' : 'idle';
  const stopSpeech = useCallback(() => { speechGeneration.current++; void Speech.stop(); setSpeaking(false); }, []);
  useEffect(() => {
    generation.current++; setActive(null); setMessage(''); setError(''); setNotice(''); setBusy(false); setRemoving(false); setMovingId(null); setMovePetId(''); setEditingQuestionId(null); setQuestionDraft(''); setEditingAnswerId(null); setAnswerDraft(''); setTimeEditingId(null); setTimeDraft(''); setCitationEdit(null); stopSpeech(); requestId.current = newRequestId();
  }, [pet?.id, stopSpeech]);
  useEffect(() => {
    mounted.current = true; const requests = generation, voice = speechGeneration;
    const sub = AppState.addEventListener('change', state => { if (state !== 'active') stopSpeech(); });
    return () => { mounted.current = false; requests.current++; voice.current++; sub.remove(); void Speech.stop(); };
  }, [stopSpeech]);
  const petId = pet?.id;
  const refetchThreads = savedThreads.refetch;
  useFocusEffect(useCallback(() => { if (petId) void refetchThreads(); return () => stopSpeech(); }, [petId, refetchThreads, stopSpeech]));
  useEffect(() => { if (!petting) return; const timer = setTimeout(() => setPetting(false), 1600); return () => clearTimeout(timer); }, [petting]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 3500); return () => clearTimeout(timer); }, [notice]);
  const send = async () => {
    if (!pet || !message.trim() || thinking) return;
    const token = ++generation.current;
    stopSpeech(); setError(''); setBusy(true); setActive(null); setEditingAnswerId(null); setAnswerDraft('');
    try {
      const result = await companion.ask(pet.id, message.trim(), requestId.current);
      if (token !== generation.current || !mounted.current) return;
      setActive(result); setMessage(''); requestId.current = newRequestId();
      void refetchThreads();
    } catch (cause) { if (token === generation.current && mounted.current) setError(errorMessage(cause)); }
    finally { if (token === generation.current && mounted.current) setBusy(false); }
  };
  const readAnswer = async () => {
    if (speaking) { stopSpeech(); return; }
    if (!answer) return;
    setError('');
    const token = ++speechGeneration.current;
    try {
      await Speech.stop();
      if (token !== speechGeneration.current || !mounted.current) return;
      const voices = await Speech.getAvailableVoicesAsync();
      if (token !== speechGeneration.current || !mounted.current) return;
      if (!voices.length) { setError('이 기기에 사용할 수 있는 목소리가 없어요. 글로 답변을 확인해 주세요.'); return; }
      Speech.speak(answer, {
        language: 'ko-KR', rate: 0.95,
        onStart: () => { if (token === speechGeneration.current && mounted.current) setSpeaking(true); },
        onDone: () => { if (token === speechGeneration.current && mounted.current) setSpeaking(false); },
        onStopped: () => { if (token === speechGeneration.current && mounted.current) setSpeaking(false); },
        onError: () => { if (token === speechGeneration.current && mounted.current) { setSpeaking(false); setError('목소리를 재생하지 못했어요. 글로 답변을 확인해 주세요.'); } },
      });
    } catch { if (token === speechGeneration.current && mounted.current) setError('이 기기에서 답변을 읽지 못했어요.'); }
  };
  const selectPet = async (id: string) => { try { await companion.selectPet(id); setPicker(false); } catch { setError('아이를 바꾸지 못했어요. 다시 선택해 주세요.'); } };
  const closeChat = useCallback(() => { setChatOpen(false); setFocusThread(null); stopSpeech(); }, [stopSpeech]);
  const navigateFromChat = (path: Href) => { closeChat(); router.push(path); };
  const otherPets = (pets ?? []).filter(item => item.id !== pet?.id);
  const startMove = (id: string) => {
    if (!companion.demo) { setError(errorMessage(new Error('CONVERSATION_PET_ACCOUNT_READONLY'))); return; }
    if (!otherPets.length) return;
    setEditingQuestionId(null); setQuestionDraft(''); setEditingAnswerId(null); setAnswerDraft(''); setTimeEditingId(null); setTimeDraft(''); setCitationEdit(null); setMovingId(id); setMovePetId(otherPets[0].id); setError('');
  };
  const startQuestion = (id: string) => {
    if (!companion.demo) { setError(errorMessage(new Error('CONVERSATION_QUESTION_ACCOUNT_READONLY'))); return; }
    const turn = turns.find(item => item.id === id);
    if (!turn) return;
    setMovingId(null); setMovePetId(''); setTimeEditingId(null); setTimeDraft(''); setCitationEdit(null); setEditingAnswerId(null); setAnswerDraft(''); setEditingQuestionId(id); setQuestionDraft(turn.question); setError('');
  };
  const cancelQuestion = () => { setEditingQuestionId(null); setQuestionDraft(''); setError(''); };
  const saveQuestion = async (id: string) => {
    const text = questionDraft.trim();
    if (!text) return;
    setRemoving(true); setError('');
    try {
      const updated = await companion.updateConversationQuestion(id, text);
      setActive(prev => prev?.id === id ? updated : prev);
      setEditingQuestionId(null); setQuestionDraft('');
      await refetchThreads();
    } catch (cause) { setError(errorMessage(cause)); } finally { setRemoving(false); }
  };
  const startAnswer = (id: string) => {
    if (!companion.demo) { setError(errorMessage(new Error('CONVERSATION_ANSWER_ACCOUNT_READONLY'))); return; }
    const turn = turns.find(item => item.id === id);
    if (!turn?.answer?.trim() || turn.status !== 'COMPLETED') return;
    stopSpeech();
    setMovingId(null); setMovePetId(''); setEditingQuestionId(null); setQuestionDraft(''); setTimeEditingId(null); setTimeDraft(''); setCitationEdit(null); setEditingAnswerId(id); setAnswerDraft(turn.answer ?? ''); setError('');
  };
  const cancelAnswer = () => { setEditingAnswerId(null); setAnswerDraft(''); setError(''); };
  const saveAnswer = async (id: string) => {
    const text = answerDraft.trim();
    if (!text) return;
    stopSpeech();
    setRemoving(true); setError('');
    try {
      const updated = await companion.updateConversationAnswer(id, text);
      setActive(prev => prev?.id === id ? updated : prev);
      setEditingAnswerId(null); setAnswerDraft('');
      await refetchThreads();
    } catch (cause) { setError(errorMessage(cause)); } finally { setRemoving(false); }
  };
  const startTime = (id: string) => {
    if (!companion.demo) { setError(errorMessage(new Error('CONVERSATION_TIME_ACCOUNT_READONLY'))); return; }
    const turn = turns.find(item => item.id === id);
    if (!turn) return;
    setMovingId(null); setMovePetId(''); setEditingQuestionId(null); setQuestionDraft(''); setEditingAnswerId(null); setAnswerDraft(''); setCitationEdit(null); setTimeEditingId(id); setTimeDraft(recordedTimeText(turn.createdAt)); setError('');
  };
  const cancelTime = () => { setTimeEditingId(null); setTimeDraft(''); setError(''); };
  const saveTime = async (id: string) => {
    const trimmed = timeDraft.trim();
    if (!trimmed) { setError('대화 시각을 입력해 주세요.'); return; }
    const createdAt = parseKst(trimmed);
    if (!createdAt) { setError('대화 시각을 2026-09-10 19:20 형식으로 입력해 주세요.'); return; }
    if (new Date(createdAt).getTime() > Date.now()) { setError(errorMessage(new Error('CONVERSATION_TIME_FUTURE'))); return; }
    setRemoving(true); setError('');
    try {
      const updated = await companion.updateConversationTime(id, createdAt);
      setActive(prev => prev?.id === id ? updated : prev);
      setTimeEditingId(null); setTimeDraft('');
      await refetchThreads();
    } catch (cause) { setError(errorMessage(cause)); } finally { setRemoving(false); }
  };
  const startCitation = (turnId: string, kind: 'observation' | 'checkin', index: number) => {
    if (!companion.demo) { setError(errorMessage(new Error('CONVERSATION_CITATION_ACCOUNT_READONLY'))); return; }
    const turn = turns.find(item => item.id === turnId);
    const records = kind === 'observation' ? citationCatalog.data?.observations : citationCatalog.data?.checkins;
    const cited = kind === 'observation' ? (turn?.citedObservationIds ?? []) : (turn?.citedCheckinIds ?? []);
    const currentId = cited[index];
    if (!turn || !records || currentId == null || !pets) return;
    const picked = kind === 'observation'
      ? initialCitationChoice(records as ObservationChoice[], currentId, pets, item => item.createdAt)
      : initialCitationChoice(records as CheckinChoice[], currentId, pets, item => item.occurredAt);
    if (!picked) return;
    setMovingId(null); setMovePetId(''); setEditingQuestionId(null); setQuestionDraft(''); setEditingAnswerId(null); setAnswerDraft(''); setTimeEditingId(null); setTimeDraft('');
    setCitationEdit({ turnId, kind, index, ...picked }); setError('');
  };
  const chooseCitationPet = (petId: string) => {
    if (removing || !citationEdit || !citationCatalog.data) return;
    const turn = turns.find(item => item.id === citationEdit.turnId);
    const cited = citationEdit.kind === 'observation' ? (turn?.citedObservationIds ?? []) : (turn?.citedCheckinIds ?? []);
    const currentId = cited[citationEdit.index];
    if (currentId == null) return;
    const targetId = citationEdit.kind === 'observation'
      ? firstChoiceOnPet(citationCatalog.data.observations, currentId, petId, item => item.createdAt)
      : firstChoiceOnPet(citationCatalog.data.checkins, currentId, petId, item => item.occurredAt);
    setCitationEdit({ ...citationEdit, petId, targetId });
  };
  const saveCitation = async (turnId: string) => {
    if (!citationEdit || citationEdit.turnId !== turnId || !citationCatalog.data) return;
    const turn = turns.find(item => item.id === turnId);
    const cited = citationEdit.kind === 'observation' ? (turn?.citedObservationIds ?? []) : (turn?.citedCheckinIds ?? []);
    const currentId = cited[citationEdit.index];
    const choices = currentId == null ? [] : citationEdit.kind === 'observation'
      ? choicesForPet(citationCatalog.data.observations, citationEdit.petId, currentId)
      : choicesForPet(citationCatalog.data.checkins, citationEdit.petId, currentId);
    if (!choices.some(item => item.id === citationEdit.targetId)) { setError(errorMessage(new Error('INVALID_CONVERSATION_CITATION'))); return; }
    const edit = citationEdit;
    setRemoving(true); setError('');
    try {
      const updated = edit.kind === 'observation'
        ? await companion.retargetConversationObservation(turnId, edit.index, edit.targetId)
        : await companion.retargetConversationCheckin(turnId, edit.index, edit.targetId);
      setActive(prev => prev?.id === turnId ? updated : prev);
      setCitationEdit(null);
      await refetchThreads();
    } catch (cause) { setError(errorMessage(cause)); } finally { setRemoving(false); }
  };
  const cancelCitation = () => { setCitationEdit(null); setError(''); };
  const cancelMove = () => { setMovingId(null); setMovePetId(''); setError(''); };
  const saveMove = async (id: string) => {
    if (!otherPets.some(item => item.id === movePetId)) { setError(errorMessage(new Error('INVALID_CONVERSATION_PET'))); return; }
    const nextPetId = movePetId;
    setRemoving(true); setError('');
    try {
      await companion.moveConversation(id, nextPetId);
      setMovingId(null); setMovePetId('');
      setActive(prev => prev?.id === id ? null : prev);
      setFocusThread(id);
      await selectSavedPet(nextPetId);
    } catch (cause) { setError(errorMessage(cause)); } finally { setRemoving(false); }
  };
  const removeTurn = (id: string) => {
    if (!companion.demo) { setError(errorMessage(new Error('CONVERSATION_ACCOUNT_READONLY'))); return; }
    const execute = () => {
      setRemoving(true); setError('');
      void companion.removeConversation(id).then(() => {
        setActive(prev => prev?.id === id ? null : prev);
        setFocusThread(prev => prev === id ? null : prev);
        void refetchThreads();
      }).catch(cause => setError(errorMessage(cause))).finally(() => setRemoving(false));
    };
    const copy = '이 질문과 답변을 삭제할까요? 삭제한 기록은 되돌릴 수 없어요.';
    if (Platform.OS === 'web') { if (globalThis.confirm?.(copy)) execute(); return; }
    Alert.alert('대화를 삭제할까요?', copy, [{ text: '취소', style: 'cancel' }, { text: '삭제', style: 'destructive', onPress: execute }]);
  };
  const panel = <AppearancePanel compact={!wide} value={appearance.value} onChange={appearance.setValue} onSave={() => { void appearance.save().then(saved => { if (saved) { setNotice('이 모습을 저장했어요'); if (!wide) setEditing(false); } }); }} saving={appearance.saving} ready={appearance.ready} onClose={() => setEditing(false)} side={side} onSide={() => setSide(side === 'left' ? 'right' : 'left')} />;
  const chatEntry = thinking ? '답변을 준비하고 있어요…' : turns.length ? '이전 대화 이어 읽기' : pet ? `${pet.name}에게 궁금한 이야기` : '우리 아이와 대화하기';
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
    {focused && <StatusBar style="dark" />}
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.page}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="재화 안내, 서비스 준비 중" onPress={() => setMenuPage('wallet')} style={styles.wallet}><MewIcon name="fish" color={c.orange} /><Text style={styles.balance}>—</Text><Text style={styles.walletHint}>준비 중</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="전체 메뉴" accessibilityState={{ expanded: menuPage !== null }} onPress={() => setMenuPage('menu')} style={styles.menuButton}><MewIcon name="menu" color={c.ink} /></Pressable>
        </View>
        <View style={[styles.sceneRow, keyboard && { minHeight: 100, maxHeight: 120 }]}>
          {editing && wide && side === 'left' && <View style={styles.desktopPanel}>{panel}</View>}
          <View style={[styles.scene, keyboard && { minHeight: 100 }]}>
            <View style={styles.sceneHeading}>
              <Pressable accessibilityRole="button" accessibilityLabel="함께할 고양이 선택" onPress={() => setPicker(true)} style={styles.petSelector}><Text style={styles.headerTitle}>{pet?.name ?? '나의 고양이'}</Text><Ionicons name="chevron-down" size={14} color={c.muted} /></Pressable>
              <Text style={styles.eyebrow}>{pet?.id === 'demo-momo' ? '모모는 지어낸 체험 프로필이에요' : companion.demo ? '체험 · 기록은 이 기기에만 남아요' : '오늘도 너와 함께'}</Text>
            </View>
            <View style={[styles.stage, !editing && !keyboard && (pet ? styles.stageWithRecords : styles.stageWithCare), editing && !wide && (side === 'left' ? { marginLeft: 186 } : { marginRight: 186 })]}><CatStage focused={focused && !menuPage && !picker && !chatOpen} appearance={appearance.value} mood={mood} onPet={() => setPetting(true)} /></View>
            {!editing && <View style={[styles.quickActions, height < 700 && { gap: 8, top: 100 }]}>
              <QuickAction name="talk" label={homeQuickActions.talk.label} hint={homeQuickActions.talk.hint} onPress={() => router.push('/meow')} />
              <QuickAction name="listen" label={homeQuickActions.record.label} hint={homeQuickActions.record.hint} onPress={() => router.push(homeCaptureHref('audio'))} />
              <QuickAction name="camera" label={homeQuickActions.photo.label} hint={homeQuickActions.photo.hint} onPress={() => router.push(homeCaptureHref('photo'))} />
            </View>}
            <View style={styles.sceneTools}>
              <Pressable accessibilityRole="button" accessibilityLabel="고양이 꾸미기" accessibilityState={{ expanded: editing }} onPress={() => setEditing(!editing)} style={[styles.roundTool, editing && styles.activeTool]}><MewIcon name="palette" size={22} color={editing ? c.surface : c.ink} /></Pressable>
            </View>
            {!editing && <View style={styles.sceneFoot}>
              {!keyboard && <LatestObservation />}
              {!keyboard && <TodayCare />}
              <Pressable accessibilityRole="button" accessibilityLabel="고양이 쓰다듬기" onPress={() => setPetting(true)} style={styles.greeting}><View style={styles.dot} /><Text style={styles.sceneNote}>{petting ? '가상 고양이가 인사해요' : '터치해서 인사해요'}</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="글로 대화하기" onPress={() => setChatOpen(true)} style={styles.chatEntry}><MewIcon name="talk" size={21} /><Text style={styles.chatEntryText}>{chatEntry}</Text><MewIcon name="arrow" size={16} /></Pressable>
              {(appearance.error || companion.pets.error) ? <Text accessibilityRole="alert" style={styles.error}>{appearance.error || errorMessage(companion.pets.error)}</Text> : null}
              {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
            </View>}
            {editing && !wide && <View style={[styles.mobilePanel, side === 'left' ? { left: 8 } : { right: 8 }, { maxHeight: Math.max(230, height - 275) }]}>{panel}</View>}
          </View>
          {editing && wide && side === 'right' && <View style={styles.desktopPanel}>{panel}</View>}
        </View>
        <Modal transparent visible={chatOpen} animationType="slide" onRequestClose={closeChat}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.chatBackdrop}>
        <Pressable accessibilityRole="button" accessibilityLabel="대화 바깥 영역 닫기" onPress={closeChat} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.conversation, { maxHeight: height * 0.85 }]} accessibilityViewIsModal>
          <View style={styles.pickerHeader}><Text style={styles.headerTitle}>글로 대화하기</Text><Pressable accessibilityRole="button" accessibilityLabel="대화 접기" onPress={closeChat} style={styles.iconButton}><MewIcon name="close" /></Pressable></View>
          <View style={styles.bubbleHeader}><Text style={styles.bubbleLabel}>{companion.demo ? '기기 내 체험 · 실제 AI 답변 아님' : answer ? '기록을 바탕으로 한 AI 답변' : '오늘의 대화'}</Text>{thinking && <ActivityIndicator size="small" color={c.accent} />}{answer && <Pressable accessibilityRole="button" accessibilityLabel={speaking ? '최근 답변 읽기 정지' : '최근 답변 소리로 듣기'} onPress={() => void readAnswer()} style={styles.audioButton}><Ionicons name={speaking ? 'stop-circle-outline' : 'volume-medium-outline'} size={20} color={c.accent} /></Pressable>}</View>
          <ScrollView ref={threadRef} style={{ maxHeight: keyboard ? 140 : Math.min(420, Math.max(180, Math.round(height * 0.46))) }} contentContainerStyle={{ paddingBottom: 8, gap: 16 }} accessibilityLiveRegion="polite" onContentSizeChange={() => { if (!focusThread) threadRef.current?.scrollToEnd({ animated: false }); }}>
            <ChatThread turns={visibleTurns} thinking={thinking} loading={!!pet && savedThreads.isLoading && turns.length === 0} failed={savedThreads.isError && turns.length === 0} petName={pet?.name} focusId={focusThread} onFocusOffset={y => threadRef.current?.scrollTo({ y, animated: false })} careAt={id => { const care = careMoments.get(id); return care?.status === 'saved' ? care.occurredAt : undefined; }} onObservation={(id, turnId) => navigateFromChat(citedObservationHref(id, turnId, pet?.id, 'home'))} onCheckin={(id, turnId) => navigateFromChat(citedCheckinHref(id, turnId, pet?.id, 'home'))} demo={companion.demo} petsKnown={!!pets} otherPets={otherPets} movingId={movingId} movePetId={movePetId} deleting={removing} editingId={editingQuestionId} questionDraft={questionDraft} onQuestionDraft={setQuestionDraft} onDelete={removeTurn} onStartMove={startMove} onMovePet={id => { if (!removing) setMovePetId(id); }} onSaveMove={id => void saveMove(id)} onCancelMove={cancelMove} onStartQuestion={startQuestion} onSaveQuestion={id => void saveQuestion(id)} onCancelQuestion={cancelQuestion} editingAnswerId={editingAnswerId} answerDraft={answerDraft} onAnswerDraft={setAnswerDraft} onStartAnswer={startAnswer} onSaveAnswer={id => void saveAnswer(id)} onCancelAnswer={cancelAnswer} timeEditingId={timeEditingId} timeDraft={timeDraft} onTimeDraft={setTimeDraft} onStartTime={startTime} onSaveTime={id => void saveTime(id)} onCancelTime={cancelTime} citationEditing={citationEdit} observations={citationCatalog.data?.observations ?? null} checkins={citationCatalog.data?.checkins ?? null} citationPets={pets ?? []} onStartCitation={startCitation} onCitationPet={chooseCitationPet} onCitationTarget={id => { if (!removing && citationEdit) setCitationEdit({ ...citationEdit, targetId: id }); }} onSaveCitation={id => void saveCitation(id)} onCancelCitation={cancelCitation} />
          </ScrollView>
          {(error || appearance.error || pending.error || savedThreads.error || companion.pets.error) ? <Text accessibilityRole="alert" style={styles.error}>{error || appearance.error || errorMessage(pending.error ?? savedThreads.error ?? companion.pets.error)}</Text> : null}
          {pending.isError && <Pressable accessibilityRole="button" onPress={() => void pending.refetch()} style={styles.citation}><Text style={styles.citationText}>답변 다시 확인</Text></Pressable>}
          {savedThreads.isError && <Pressable accessibilityRole="button" onPress={() => void savedThreads.refetch()} style={styles.citation}><Text style={styles.citationText}>이전 대화 다시 불러오기</Text></Pressable>}
          {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
          {!pet ? <Pressable accessibilityRole="button" onPress={() => navigateFromChat('/pets/new')} style={styles.register}><Text style={styles.registerText}>우리 아이 등록하기</Text></Pressable> : <View style={styles.inputRow}><TextInput accessibilityLabel="고양이에게 물어볼 내용" placeholder="오늘 궁금했던 이야기를 적어 주세요" placeholderTextColor={c.muted} style={styles.input} value={message} editable={!thinking} maxLength={1500} onChangeText={value => { setMessage(value); requestId.current = newRequestId(); }} onSubmitEditing={() => void send()} returnKeyType="send" /><Pressable accessibilityRole="button" accessibilityLabel="질문 보내기" disabled={!message.trim() || thinking} onPress={() => void send()} style={[styles.send, (!message.trim() || thinking) && { opacity: 0.45 }]}><Ionicons name="arrow-up" size={22} color="#FFFDF8" /></Pressable></View>}
          <View style={[styles.shortcuts, keyboard && { display: 'none' }]}><Pressable accessibilityRole="button" onPress={() => navigateFromChat('/meow')} style={styles.shortcut}><Ionicons name="mic-outline" size={16} color={c.accent} /><Text style={styles.shortcutText}>야옹 놀이</Text></Pressable><Pressable accessibilityRole="button" onPress={() => navigateFromChat(homeCaptureHref())} style={styles.shortcut}><Ionicons name="camera-outline" size={16} color={c.muted} /><Text style={styles.shortcutText}>{chatCaptureShortcut.label}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => navigateFromChat('/checkin')} style={styles.shortcut}><Ionicons name="add-outline" size={16} color={c.muted} /><Text style={styles.shortcutText}>{chatCareShortcut.label}</Text></Pressable></View>
        </SafeAreaView>
        </KeyboardAvoidingView>
        </Modal>
      </View>
    </KeyboardAvoidingView>
    <HomeMenu page={menuPage} onPage={setMenuPage} onClose={() => setMenuPage(null)} />
    <Modal transparent visible={picker} onRequestClose={() => setPicker(false)} animationType="fade"><View style={styles.modalBackdrop}><View style={styles.picker}><View style={styles.pickerHeader}><Text style={styles.headerTitle}>함께할 아이</Text><Pressable accessibilityRole="button" accessibilityLabel="고양이 선택 닫기" onPress={() => setPicker(false)} style={styles.iconButton}><Ionicons name="close" size={22} color={c.ink} /></Pressable></View><ScrollView style={{ maxHeight: 300 }}>{companion.pets.data?.map(item => <Pressable accessibilityRole="button" accessibilityState={{ selected: pet?.id === item.id }} key={item.id} style={styles.petRow} onPress={() => void selectPet(item.id)}><Text style={styles.petName}>{item.name}</Text>{pet?.id === item.id && <Ionicons name="checkmark" color={c.accent} size={20} />}</Pressable>)}</ScrollView><Pressable accessibilityRole="button" style={styles.petRow} onPress={() => { setPicker(false); router.push('/pets/new'); }}><Text style={styles.citationText}>새로운 아이 등록</Text></Pressable></View></View></Modal>
  </SafeAreaView>;
}

function kstInput(date = new Date()) { const kst = new Date(date.getTime() + 9 * 3600000); return kst.toISOString().slice(0, 16).replace('T', ' '); }
function parseKst(value: string) { if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) return null; const date = new Date(`${value.replace(' ', 'T')}:00+09:00`); return Number.isFinite(date.getTime()) && kstInput(date) === value ? date.toISOString() : null; }
function recordedTimeText(value: string) { const date = new Date(value); return Number.isFinite(date.getTime()) ? kstInput(date) : value; }
function turnText(turn: HomeConversationTurn) {
  if (turn.status === 'QUEUED') return '남겨 준 기록을 살펴보고 있어요.';
  if (turn.status === 'FAILED') return '답변을 준비하지 못했어요. 다시 질문해 주세요.';
  return turn.answer?.trim() || '아직 답변이 준비되지 않았어요.';
}
function ChatThread({ turns, thinking, loading, failed, petName, focusId, onFocusOffset, careAt, onObservation, onCheckin, demo, petsKnown, otherPets, movingId, movePetId, deleting, editingId, questionDraft, onQuestionDraft, onDelete, onStartMove, onMovePet, onSaveMove, onCancelMove, onStartQuestion, onSaveQuestion, onCancelQuestion, editingAnswerId, answerDraft, onAnswerDraft, onStartAnswer, onSaveAnswer, onCancelAnswer, timeEditingId, timeDraft, onTimeDraft, onStartTime, onSaveTime, onCancelTime, citationEditing, observations, checkins, citationPets, onStartCitation, onCitationPet, onCitationTarget, onSaveCitation, onCancelCitation }: { turns: HomeConversationTurn[]; thinking: boolean; loading: boolean; failed: boolean; petName?: string; focusId: string | null; onFocusOffset: (y: number) => void; careAt: (id: string) => string | undefined; onObservation: (id: string, turnId: string) => void; onCheckin: (id: string, turnId: string) => void; demo: boolean; petsKnown: boolean; otherPets: { id: string; name: string }[]; movingId: string | null; movePetId: string; deleting: boolean; editingId: string | null; questionDraft: string; onQuestionDraft: (value: string) => void; onDelete: (id: string) => void; onStartMove: (id: string) => void; onMovePet: (id: string) => void; onSaveMove: (id: string) => void; onCancelMove: () => void; onStartQuestion: (id: string) => void; onSaveQuestion: (id: string) => void; onCancelQuestion: () => void; editingAnswerId: string | null; answerDraft: string; onAnswerDraft: (value: string) => void; onStartAnswer: (id: string) => void; onSaveAnswer: (id: string) => void; onCancelAnswer: () => void; timeEditingId: string | null; timeDraft: string; onTimeDraft: (value: string) => void; onStartTime: (id: string) => void; onSaveTime: (id: string) => void; onCancelTime: () => void; citationEditing: { turnId: string; kind: 'observation' | 'checkin'; index: number; petId: string; targetId: string } | null; observations: ObservationChoice[] | null; checkins: CheckinChoice[] | null; citationPets: { id: string; name: string }[]; onStartCitation: (turnId: string, kind: 'observation' | 'checkin', index: number) => void; onCitationPet: (petId: string) => void; onCitationTarget: (id: string) => void; onSaveCitation: (turnId: string) => void; onCancelCitation: () => void }) {
  if (loading) return <Text style={styles.bubbleText}>이전 대화를 확인하고 있어요.</Text>;
  if (failed) return <Text style={styles.bubbleText}>이전 대화를 불러오지 못했어요.</Text>;
  if (!turns.length && !thinking) return <Text style={styles.bubbleText}>{petName ? `${petName}와 어떤 이야기를 나눠 볼까요?` : '반가워요. 나만의 고양이를 만나 보세요.'}</Text>;
  return <View style={{ gap: 16 }}>
    {turns.map(turn => <View key={turn.id} onLayout={event => { if (turn.id === focusId) onFocusOffset(event.nativeEvent.layout.y); }}>
      {editingId === turn.id ? <View>
        <Text style={styles.accountNote}>질문 문장만 고쳐요. 같은 대화의 답변과 인용은 그대로 두어요. 답을 다시 만들지 않아요.</Text>
        <TextInput accessibilityLabel="질문 문장" value={questionDraft} editable={!deleting} maxLength={1500} multiline onChangeText={onQuestionDraft} style={styles.questionInput} />
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: deleting || !questionDraft.trim() }} disabled={deleting || !questionDraft.trim()} onPress={() => onSaveQuestion(turn.id)} style={styles.citation}><Text style={styles.citationText}>질문 저장</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: deleting }} disabled={deleting} onPress={onCancelQuestion} style={styles.citation}><Text style={styles.citationText}>질문 수정 취소</Text></Pressable>
      </View> : <>
        <Text style={styles.turnQuestion}>“{turn.question}”</Text>
        {demo ? <Pressable accessibilityRole="button" accessibilityState={{ disabled: deleting }} disabled={deleting} onPress={() => onStartQuestion(turn.id)} style={styles.citation}><Text style={styles.citationText}>질문 수정</Text></Pressable> : null}
      </>}
      {editingAnswerId === turn.id ? <View>
        <Text style={styles.accountNote}>저장된 답 문장만 고쳐요. 같은 대화의 질문과 인용은 그대로 두어요. 답을 다시 만들지 않아요. 고양이가 다시 답한 것이 아니에요.</Text>
        <TextInput accessibilityLabel="저장된 답" value={answerDraft} editable={!deleting} maxLength={4000} multiline onChangeText={onAnswerDraft} style={styles.questionInput} />
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: deleting || !answerDraft.trim() }} disabled={deleting || !answerDraft.trim()} onPress={() => onSaveAnswer(turn.id)} style={styles.citation}><Text style={styles.citationText}>답변 저장</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: deleting }} disabled={deleting} onPress={onCancelAnswer} style={styles.citation}><Text style={styles.citationText}>답변 수정 취소</Text></Pressable>
      </View> : <>
        <Text style={styles.bubbleText}>{turnText(turn)}</Text>
        {demo && turn.status === 'COMPLETED' && turn.answer?.trim() ? <Pressable accessibilityRole="button" accessibilityState={{ disabled: deleting }} disabled={deleting} onPress={() => onStartAnswer(turn.id)} style={styles.citation}><Text style={styles.citationText}>답변 수정</Text></Pressable> : null}
      </>}
      {(turn.citedObservationIds ?? []).map((id, index) => <View key={`${index}-${id}`}>
        <Pressable accessibilityRole="link" onPress={() => onObservation(id, turn.id)} style={styles.citation}><Text style={styles.citationText}>참고한 기록 {index + 1} 보기 →</Text></Pressable>
        {demo && hasOtherChoice(observations, id) ? <InlineCitationSwitch open={citationEditing?.turnId === turn.id && citationEditing.kind === 'observation' && citationEditing.index === index} busy={deleting} note="이미 있는 다른 관찰로만 바꿉니다. 같은 대화의 질문과 답변 본문은 그대로 두고, 이 인용만 그 기록으로 바꿉니다. 다른 인용은 그대로 두어요. 답을 다시 만들지 않아요." closedTitle={`관찰 인용 ${index + 1}을 다른 기록으로 바꾸기`} saveTitle="이 관찰로 바꾸기" pets={petsWithOtherChoice(observations ?? [], id, citationPets)} records={recentChoices(choicesForPet(observations ?? [], citationEditing?.petId ?? '', id), item => item.createdAt)} petId={citationEditing?.petId ?? ''} targetId={citationEditing?.targetId ?? ''} label={item => observationChoiceLabel(item, recentChoices(choicesForPet(observations ?? [], citationEditing?.petId ?? '', id), row => row.createdAt))} onStart={() => onStartCitation(turn.id, 'observation', index)} onPet={onCitationPet} onTarget={onCitationTarget} onSave={() => onSaveCitation(turn.id)} onCancel={onCancelCitation} /> : null}
      </View>)}
      {(turn.citedCheckinIds ?? []).map((id, index) => <View key={`checkin-${index}-${id}`}>
        <Pressable accessibilityRole="link" onPress={() => onCheckin(id, turn.id)} style={styles.citation}><Text style={styles.citationText}>{homeCitedCheckinLink(careAt(id), index)}</Text></Pressable>
        {demo && hasOtherChoice(checkins, id) ? <InlineCitationSwitch open={citationEditing?.turnId === turn.id && citationEditing.kind === 'checkin' && citationEditing.index === index} busy={deleting} note="이미 있는 다른 돌봄으로만 바꿉니다. 같은 대화의 질문과 답변 본문은 그대로 두고, 이 인용만 그 기록으로 바꿉니다. 다른 인용은 그대로 두어요. 답을 다시 만들지 않아요." closedTitle={`돌봄 인용 ${index + 1}을 다른 기록으로 바꾸기`} saveTitle="이 돌봄으로 바꾸기" pets={petsWithOtherChoice(checkins ?? [], id, citationPets)} records={recentChoices(choicesForPet(checkins ?? [], citationEditing?.petId ?? '', id), item => item.occurredAt)} petId={citationEditing?.petId ?? ''} targetId={citationEditing?.targetId ?? ''} label={item => checkinChoiceLabel(item, recentChoices(choicesForPet(checkins ?? [], citationEditing?.petId ?? '', id), row => row.occurredAt))} onStart={() => onStartCitation(turn.id, 'checkin', index)} onPet={onCitationPet} onTarget={onCitationTarget} onSave={() => onSaveCitation(turn.id)} onCancel={onCancelCitation} /> : null}
      </View>)}
      {timeEditingId === turn.id ? <View>
        <Text style={styles.accountNote}>이 대화의 시각만 고쳐요. 질문, 답변, 인용은 그대로 두어요. 답을 다시 만들지 않아요.</Text>
        <TextInput accessibilityLabel="대화 시각 · 한국 시간" placeholder="2026-09-10 19:20" placeholderTextColor={c.muted} value={timeDraft} editable={!deleting} onChangeText={onTimeDraft} style={styles.questionInput} />
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: deleting || !timeDraft.trim() }} disabled={deleting || !timeDraft.trim()} onPress={() => onSaveTime(turn.id)} style={styles.citation}><Text style={styles.citationText}>시각 저장</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: deleting }} disabled={deleting} onPress={onCancelTime} style={styles.citation}><Text style={styles.citationText}>시각 수정 취소</Text></Pressable>
      </View> : <>
        <Text style={styles.accountNote}>{recordedTimeText(turn.createdAt)} · 한국 시간</Text>
        <Text style={styles.accountNote}>일기에는 이 시각의 한국 날짜로 이 대화를 놓아요.</Text>
        {demo ? <Pressable accessibilityRole="button" accessibilityState={{ disabled: deleting }} disabled={deleting} onPress={() => onStartTime(turn.id)} style={styles.citation}><Text style={styles.citationText}>시각 수정</Text></Pressable> : null}
      </>}
      {demo ? <Pressable accessibilityRole="button" accessibilityState={{ disabled: deleting }} disabled={deleting} onPress={() => onDelete(turn.id)} style={styles.citation}><Text style={styles.deleteText}>이 대화 삭제</Text></Pressable> : null}
      {demo && otherPets.length > 0 ? movingId === turn.id ? <View>
        <Text style={styles.turnQuestion}>어느 아이의 기록인가요</Text>
        <Text style={styles.accountNote}>이미 등록한 다른 아이에게만 옮겨요. 같은 대화의 질문과 답변, 답 안의 인용은 그대로 두어요. 새 아이를 만들거나 AI로 분석하지 않아요.</Text>
        <View style={styles.moveRow}>{otherPets.map(item => <Pressable accessibilityRole="button" accessibilityState={{ selected: movePetId === item.id, disabled: deleting }} disabled={deleting} key={item.id} onPress={() => onMovePet(item.id)} style={styles.citation}><Text style={styles.citationText}>{movePetId === item.id ? `✓ ${item.name}` : item.name}</Text></Pressable>)}</View>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: deleting || !otherPets.some(item => item.id === movePetId) }} disabled={deleting || !otherPets.some(item => item.id === movePetId)} onPress={() => onSaveMove(turn.id)} style={styles.citation}><Text style={styles.citationText}>이 아이에게 옮기기</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: deleting }} disabled={deleting} onPress={onCancelMove} style={styles.citation}><Text style={styles.citationText}>옮기기 취소</Text></Pressable>
      </View> : <Pressable accessibilityRole="button" accessibilityState={{ disabled: deleting }} disabled={deleting} onPress={() => onStartMove(turn.id)} style={styles.citation}><Text style={styles.citationText}>다른 아이에게 옮기기</Text></Pressable> : null}
    </View>)}
    {demo && petsKnown && otherPets.length === 0 && turns.length ? <View><Text style={styles.turnQuestion}>어느 아이의 기록인가요</Text><Text style={styles.accountNote}>이미 등록한 다른 아이에게만 옮겨요. 같은 대화의 질문과 답변, 답 안의 인용은 그대로 두어요. 새 아이를 만들거나 AI로 분석하지 않아요.</Text><Text style={styles.accountNote}>등록된 다른 아이가 없어서 옮길 수 없어요.</Text></View> : null}
    {!demo && turns.some(turn => (turn.citedObservationIds?.length ?? 0) > 0 || (turn.citedCheckinIds?.length ?? 0) > 0) ? <Text style={styles.accountNote}>이 계정에 남긴 대화의 인용은 여기서 바꿀 수 없어요. 이 기기의 체험 기록만 수정할 수 있어요.</Text> : null}
    {!demo && turns.length ? <Text style={styles.accountNote}>이 계정에 남긴 대화의 질문은 여기서 고칠 수 없어요. 이 기기의 체험 기록만 수정할 수 있어요.</Text> : null}
    {!demo && turns.length ? <Text style={styles.accountNote}>이 계정에 남긴 대화의 답변은 여기서 고칠 수 없어요. 이 기기의 체험 기록만 수정할 수 있어요.</Text> : null}
    {!demo && turns.length ? <Text style={styles.accountNote}>이 계정에 남긴 대화 시각은 여기서 고칠 수 없어요. 이 기기의 체험 기록만 수정할 수 있어요.</Text> : null}
    {!demo && turns.length ? <Text style={styles.accountNote}>이 계정에 남긴 대화는 여기서 지울 수 없어요. 이 기기의 체험 기록만 삭제할 수 있어요.</Text> : null}
    {!demo && turns.length ? <View><Text style={styles.turnQuestion}>어느 아이의 기록인가요</Text><Text style={styles.accountNote}>이미 등록한 다른 아이에게만 옮겨요. 같은 대화의 질문과 답변, 답 안의 인용은 그대로 두어요. 새 아이를 만들거나 AI로 분석하지 않아요.</Text><Text style={styles.accountNote}>이 계정에 남긴 대화는 여기서 다른 아이에게 옮길 수 없어요. 이 기기의 체험 기록만 수정할 수 있어요.</Text></View> : null}
    {thinking && !turns.some(turn => turn.status === 'QUEUED') ? <Text style={styles.bubbleText}>남겨 준 기록을 살펴보고 있어요.</Text> : null}
  </View>;
}
function InlineCitationSwitch<T extends { id: string }>({ open, busy, note, closedTitle, saveTitle, pets, records, petId, targetId, label, onStart, onPet, onTarget, onSave, onCancel }: { open: boolean; busy: boolean; note: string; closedTitle: string; saveTitle: string; pets: { id: string; name: string }[]; records: readonly T[]; petId: string; targetId: string; label: (item: T) => string; onStart: () => void; onPet: (id: string) => void; onTarget: (id: string) => void; onSave: () => void; onCancel: () => void }) {
  if (!open) return <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={onStart} style={styles.citation}><Text style={styles.citationText}>{closedTitle}</Text></Pressable>;
  return <View>
    <Text style={styles.accountNote}>{note}</Text>
    <View style={styles.moveRow}>{pets.map(item => <Pressable accessibilityRole="button" accessibilityState={{ selected: petId === item.id, disabled: busy }} disabled={busy} key={item.id} onPress={() => onPet(item.id)} style={styles.citation}><Text style={styles.citationText}>{petId === item.id ? `✓ ${item.name}` : item.name}</Text></Pressable>)}</View>
    <View style={styles.moveRow}>{records.map(item => <Pressable accessibilityRole="button" accessibilityState={{ selected: targetId === item.id, disabled: busy }} disabled={busy} key={item.id} onPress={() => onTarget(item.id)} style={styles.citation}><Text style={styles.citationText}>{targetId === item.id ? `✓ ${label(item)}` : label(item)}</Text></Pressable>)}</View>
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || !records.some(item => item.id === targetId) }} disabled={busy || !records.some(item => item.id === targetId)} onPress={onSave} style={styles.citation}><Text style={styles.citationText}>{saveTitle}</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={onCancel} style={styles.citation}><Text style={styles.citationText}>바꾸기 취소</Text></Pressable>
  </View>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.stage }, fill: { flex: 1 }, page: { flex: 1, width: '100%', maxWidth: 1220, alignSelf: 'center' },
  header: { minHeight: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, minHeight: 44, borderRadius: 24, backgroundColor: c.surface },
  balance: { color: c.ink, fontSize: 18, fontWeight: '700' }, walletHint: { color: c.muted, fontSize: 10 },
  menuButton: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 23, backgroundColor: c.surface },
  petSelector: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: c.ink }, eyebrow: { fontSize: 11, color: c.muted },
  iconButton: { padding: 12, minWidth: 44, minHeight: 44 },
  sceneRow: { flex: 1, flexDirection: 'row', gap: 12, minHeight: 230 },
  scene: { flex: 1, backgroundColor: c.stage, overflow: 'hidden', minHeight: 230 },
  sceneHeading: { position: 'absolute', top: 0, left: 24, zIndex: 1 },
  stage: { flex: 1, marginTop: 60, marginBottom: 104, marginLeft: 52 },
  stageWithCare: { marginBottom: 196 },
  stageWithRecords: { marginBottom: 292 },
  quickActions: { position: 'absolute', left: 12, top: '24%', gap: 18, zIndex: 2 },
  sceneTools: { position: 'absolute', top: 5, right: 20, zIndex: 2 },
  roundTool: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFCF6E8', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF' },
  activeTool: { backgroundColor: c.accent, borderColor: c.accent },
  sceneFoot: { position: 'absolute', bottom: 18, left: 24, right: 24, alignItems: 'center' },
  greeting: { minHeight: 44, flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.accent }, sceneNote: { color: c.muted, fontSize: 11 },
  chatEntry: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', maxWidth: 560, padding: 16, backgroundColor: '#FFFCF6F0', borderRadius: 24, borderWidth: 1, borderColor: '#FFFFFF' },
  chatEntryText: { flex: 1, color: c.ink, fontSize: 13 },
  desktopPanel: { width: 250, paddingBottom: 12 }, mobilePanel: { position: 'absolute', top: 8, bottom: 8, zIndex: 4, width: 182 },
  chatBackdrop: { flex: 1, backgroundColor: '#17251C55', justifyContent: 'flex-end', alignItems: 'center' },
  conversation: { width: '100%', maxWidth: 640, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 12, backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  bubbleHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 }, bubbleLabel: { fontSize: 11, fontWeight: '600', color: c.accent, flex: 1 }, bubbleText: { fontSize: 16, lineHeight: 24, color: c.ink }, turnQuestion: { color: c.accent, fontSize: 14, lineHeight: 22, marginBottom: 4 },
  audioButton: { padding: 12, minWidth: 44, minHeight: 44 }, citation: { paddingVertical: 12, minHeight: 44 }, citationText: { fontSize: 13, color: c.accent, fontWeight: '600' }, deleteText: { fontSize: 13, color: c.error, fontWeight: '600' }, accountNote: { fontSize: 12, color: c.muted, lineHeight: 18, marginTop: 4 }, moveRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  error: { fontSize: 12, color: c.error, lineHeight: 18, marginBottom: 6 }, notice: { color: c.accent, fontSize: 12, marginTop: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 6, paddingLeft: 14, backgroundColor: c.background, borderRadius: 20, borderWidth: 1, borderColor: c.border, marginTop: 10 },
  input: { flex: 1, minHeight: 40, color: c.ink, fontSize: 14, paddingVertical: 8 }, questionInput: { minHeight: 44, color: c.ink, fontSize: 14, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: c.background, borderRadius: 16, borderWidth: 1, borderColor: c.border, marginTop: 8 }, send: { width: 44, height: 44, borderRadius: 15, backgroundColor: c.accent, justifyContent: 'center', alignItems: 'center' },
  shortcuts: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 }, shortcut: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 44 }, shortcutText: { fontSize: 11, color: c.muted },
  register: { padding: 12, marginTop: 10, backgroundColor: c.accent, borderRadius: 14, alignItems: 'center' }, registerText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  modalBackdrop: { flex: 1, backgroundColor: '#17251C55', alignItems: 'center', justifyContent: 'center', padding: 24 }, picker: { width: '100%', maxWidth: 380, backgroundColor: c.surface, borderRadius: 24, padding: 18 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, petRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 17, borderBottomWidth: 1, borderBottomColor: c.border }, petName: { fontSize: 16, color: c.ink },
});
