import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
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
import { homeConversationThread, latestHomeAnswer, type HomeConversationTurn } from '../companion/homeConversation';
import { homeCitedCheckinLink, presentConversationAnswer } from '../companion/daily';
import { useCitedCheckinMoments } from '../companion/useCheckins';
import { useCitedReactionMoments } from '../companion/citedReactions';
import { AppearancePanel } from './AppearancePanel';
import { CatStage } from './CatStage';
import { useAppearance } from './useAppearance';
import { studio as c, type CatMood } from './appearance';
import { MewIcon } from '../../ui/MewIcon';
import { HomeMenu, type HomeMenuPage } from './HomeMenu';
import { QuickAction } from './QuickAction';
import { LatestObservation } from './LatestObservation';
import { TodayCare } from './TodayCare';

export default function CatStudio() {
  const { customize } = useLocalSearchParams<{ customize?: string }>();
  const companion = useCompanion();
  const focused = useIsFocused();
  const { session } = useSession();
  const pet = companion.activePet;
  const { width, height } = useWindowDimensions();
  const wide = width >= 760;
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => { const show = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true)); const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false)); return () => { show.remove(); hide.remove(); }; }, []);
  const appearance = useAppearance(`${session?.mode}:${session?.userId}:${pet?.id ?? 'virtual'}`);
  const [editing, setEditing] = useState(false), [side, setSide] = useState<'left' | 'right'>('right');
  const [menuPage, setMenuPage] = useState<HomeMenuPage | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  useEffect(() => { if (focused && customize === '1') { setEditing(true); router.setParams({ customize: '' }); } }, [customize, focused]);
  const [picker, setPicker] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), [speaking, setSpeaking] = useState(false), [petting, setPetting] = useState(false);
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
  const turns = useMemo(() => homeConversationThread(savedThreads.data?.items ?? [], pet?.id, current), [savedThreads.data, pet?.id, current]);
  const citedCheckinIds = useMemo(() => turns.flatMap(turn => turn.citedCheckinIds ?? []), [turns]);
  const citedObservationIds = useMemo(() => turns.flatMap(turn => turn.citedObservationIds ?? []), [turns]);
  const careMoments = useCitedCheckinMoments(citedCheckinIds);
  const reactionMoments = useCitedReactionMoments(citedObservationIds);
  const visibleTurns = useMemo(() => turns.map(turn => ({
    ...turn,
    answer: presentConversationAnswer(turn.answer, careMoments.get(turn.citedCheckinIds?.[0] ?? ''), reactionMoments.get(turn.citedObservationIds?.[0] ?? '')),
  })), [turns, careMoments, reactionMoments]);
  const thinking = busy || current?.status === 'QUEUED';
  const answer = thinking ? null : latestHomeAnswer(visibleTurns);
  const mood: CatMood = speaking ? 'speaking' : thinking ? 'thinking' : petting ? 'happy' : message ? 'listening' : 'idle';
  const stopSpeech = useCallback(() => { speechGeneration.current++; void Speech.stop(); setSpeaking(false); }, []);
  useEffect(() => {
    generation.current++; setActive(null); setMessage(''); setError(''); setNotice(''); setBusy(false); stopSpeech(); requestId.current = newRequestId();
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
    stopSpeech(); setError(''); setBusy(true); setActive(null);
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
  const navigateFromChat = (path: Href) => { setChatOpen(false); stopSpeech(); router.push(path); };
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
              <QuickAction name="talk" label="말 걸기" hint="놀이용 야옹이에요. 말의 뜻을 번역하지 않아요." onPress={() => router.push('/meow')} />
              <QuickAction name="listen" label="울음 듣기" hint="고양이 울음 녹음하고 살펴보기" onPress={() => router.push({ pathname: '/capture', params: { mode: 'audio' } })} />
              <QuickAction name="camera" label="사진 살피기" hint="사진으로 자세와 상황 살펴보기" onPress={() => router.push({ pathname: '/capture', params: { mode: 'photo' } })} />
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
        <Modal transparent visible={chatOpen} animationType="slide" onRequestClose={() => { setChatOpen(false); stopSpeech(); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.chatBackdrop}>
        <Pressable accessibilityRole="button" accessibilityLabel="대화 바깥 영역 닫기" onPress={() => { setChatOpen(false); stopSpeech(); }} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.conversation, { maxHeight: height * 0.85 }]} accessibilityViewIsModal>
          <View style={styles.pickerHeader}><Text style={styles.headerTitle}>글로 대화하기</Text><Pressable accessibilityRole="button" accessibilityLabel="대화 접기" onPress={() => { setChatOpen(false); stopSpeech(); }} style={styles.iconButton}><MewIcon name="close" /></Pressable></View>
          <View style={styles.bubbleHeader}><Text style={styles.bubbleLabel}>{companion.demo ? '기기 내 체험 · 실제 AI 답변 아님' : answer ? '기록을 바탕으로 한 AI 답변' : '오늘의 대화'}</Text>{thinking && <ActivityIndicator size="small" color={c.accent} />}{answer && <Pressable accessibilityRole="button" accessibilityLabel={speaking ? '최근 답변 읽기 정지' : '최근 답변 소리로 듣기'} onPress={() => void readAnswer()} style={styles.audioButton}><Ionicons name={speaking ? 'stop-circle-outline' : 'volume-medium-outline'} size={20} color={c.accent} /></Pressable>}</View>
          <ScrollView ref={threadRef} style={{ maxHeight: keyboard ? 140 : Math.min(420, Math.max(180, Math.round(height * 0.46))) }} contentContainerStyle={{ paddingBottom: 8, gap: 16 }} accessibilityLiveRegion="polite" onContentSizeChange={() => threadRef.current?.scrollToEnd({ animated: false })}>
            <ChatThread turns={visibleTurns} thinking={thinking} loading={!!pet && savedThreads.isLoading && turns.length === 0} failed={savedThreads.isError && turns.length === 0} petName={pet?.name} careAt={id => { const care = careMoments.get(id); return care?.status === 'saved' ? care.occurredAt : undefined; }} onObservation={id => navigateFromChat(`/observations/${id}`)} onCheckin={id => navigateFromChat(`/checkin?id=${id}`)} />
          </ScrollView>
          {(error || appearance.error || pending.error || savedThreads.error || companion.pets.error) ? <Text accessibilityRole="alert" style={styles.error}>{error || appearance.error || errorMessage(pending.error ?? savedThreads.error ?? companion.pets.error)}</Text> : null}
          {pending.isError && <Pressable accessibilityRole="button" onPress={() => void pending.refetch()} style={styles.citation}><Text style={styles.citationText}>답변 다시 확인</Text></Pressable>}
          {savedThreads.isError && <Pressable accessibilityRole="button" onPress={() => void savedThreads.refetch()} style={styles.citation}><Text style={styles.citationText}>이전 대화 다시 불러오기</Text></Pressable>}
          {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
          {!pet ? <Pressable accessibilityRole="button" onPress={() => navigateFromChat('/pets/new')} style={styles.register}><Text style={styles.registerText}>우리 아이 등록하기</Text></Pressable> : <View style={styles.inputRow}><TextInput accessibilityLabel="고양이에게 물어볼 내용" placeholder="오늘 궁금했던 이야기를 적어 주세요" placeholderTextColor={c.muted} style={styles.input} value={message} editable={!thinking} maxLength={1500} onChangeText={value => { setMessage(value); requestId.current = newRequestId(); }} onSubmitEditing={() => void send()} returnKeyType="send" /><Pressable accessibilityRole="button" accessibilityLabel="질문 보내기" disabled={!message.trim() || thinking} onPress={() => void send()} style={[styles.send, (!message.trim() || thinking) && { opacity: 0.45 }]}><Ionicons name="arrow-up" size={22} color="#FFFDF8" /></Pressable></View>}
          <View style={[styles.shortcuts, keyboard && { display: 'none' }]}><Pressable accessibilityRole="button" onPress={() => navigateFromChat('/meow')} style={styles.shortcut}><Ionicons name="mic-outline" size={16} color={c.accent} /><Text style={styles.shortcutText}>야옹 놀이</Text></Pressable><Pressable accessibilityRole="button" onPress={() => navigateFromChat('/capture')} style={styles.shortcut}><Ionicons name="camera-outline" size={16} color={c.muted} /><Text style={styles.shortcutText}>사진·울음</Text></Pressable><Pressable accessibilityRole="button" onPress={() => navigateFromChat('/checkin')} style={styles.shortcut}><Ionicons name="add-outline" size={16} color={c.muted} /><Text style={styles.shortcutText}>기록</Text></Pressable></View>
        </SafeAreaView>
        </KeyboardAvoidingView>
        </Modal>
      </View>
    </KeyboardAvoidingView>
    <HomeMenu page={menuPage} onPage={setMenuPage} onClose={() => setMenuPage(null)} />
    <Modal transparent visible={picker} onRequestClose={() => setPicker(false)} animationType="fade"><View style={styles.modalBackdrop}><View style={styles.picker}><View style={styles.pickerHeader}><Text style={styles.headerTitle}>함께할 아이</Text><Pressable accessibilityRole="button" accessibilityLabel="고양이 선택 닫기" onPress={() => setPicker(false)} style={styles.iconButton}><Ionicons name="close" size={22} color={c.ink} /></Pressable></View><ScrollView style={{ maxHeight: 300 }}>{companion.pets.data?.map(item => <Pressable accessibilityRole="button" accessibilityState={{ selected: pet?.id === item.id }} key={item.id} style={styles.petRow} onPress={() => void selectPet(item.id)}><Text style={styles.petName}>{item.name}</Text>{pet?.id === item.id && <Ionicons name="checkmark" color={c.accent} size={20} />}</Pressable>)}</ScrollView><Pressable accessibilityRole="button" style={styles.petRow} onPress={() => { setPicker(false); router.push('/pets/new'); }}><Text style={styles.citationText}>새로운 아이 등록</Text></Pressable></View></View></Modal>
  </SafeAreaView>;
}

function turnText(turn: HomeConversationTurn) {
  if (turn.status === 'QUEUED') return '남겨 준 기록을 살펴보고 있어요.';
  if (turn.status === 'FAILED') return '답변을 준비하지 못했어요. 다시 질문해 주세요.';
  return turn.answer?.trim() || '아직 답변이 준비되지 않았어요.';
}
function ChatThread({ turns, thinking, loading, failed, petName, careAt, onObservation, onCheckin }: { turns: HomeConversationTurn[]; thinking: boolean; loading: boolean; failed: boolean; petName?: string; careAt: (id: string) => string | undefined; onObservation: (id: string) => void; onCheckin: (id: string) => void }) {
  if (loading) return <Text style={styles.bubbleText}>이전 대화를 확인하고 있어요.</Text>;
  if (failed) return <Text style={styles.bubbleText}>이전 대화를 불러오지 못했어요.</Text>;
  if (!turns.length && !thinking) return <Text style={styles.bubbleText}>{petName ? `${petName}와 어떤 이야기를 나눠 볼까요?` : '반가워요. 나만의 고양이를 만나 보세요.'}</Text>;
  return <View style={{ gap: 16 }}>
    {turns.map(turn => <View key={turn.id}>
      <Text style={styles.turnQuestion}>“{turn.question}”</Text>
      <Text style={styles.bubbleText}>{turnText(turn)}</Text>
      {(turn.citedObservationIds ?? []).map((id, index) => <Pressable accessibilityRole="link" key={id} onPress={() => onObservation(id)} style={styles.citation}><Text style={styles.citationText}>참고한 기록 {index + 1} 보기 →</Text></Pressable>)}
      {(turn.citedCheckinIds ?? []).map((id, index) => <Pressable accessibilityRole="link" key={`checkin-${id}`} onPress={() => onCheckin(id)} style={styles.citation}><Text style={styles.citationText}>{homeCitedCheckinLink(careAt(id), index)}</Text></Pressable>)}
    </View>)}
    {thinking && !turns.some(turn => turn.status === 'QUEUED') ? <Text style={styles.bubbleText}>남겨 준 기록을 살펴보고 있어요.</Text> : null}
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
  audioButton: { padding: 12, minWidth: 44, minHeight: 44 }, citation: { paddingVertical: 12, minHeight: 44 }, citationText: { fontSize: 13, color: c.accent, fontWeight: '600' },
  error: { fontSize: 12, color: c.error, lineHeight: 18, marginBottom: 6 }, notice: { color: c.accent, fontSize: 12, marginTop: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 6, paddingLeft: 14, backgroundColor: c.background, borderRadius: 20, borderWidth: 1, borderColor: c.border, marginTop: 10 },
  input: { flex: 1, minHeight: 40, color: c.ink, fontSize: 14, paddingVertical: 8 }, send: { width: 44, height: 44, borderRadius: 15, backgroundColor: c.accent, justifyContent: 'center', alignItems: 'center' },
  shortcuts: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 }, shortcut: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 44 }, shortcutText: { fontSize: 11, color: c.muted },
  register: { padding: 12, marginTop: 10, backgroundColor: c.accent, borderRadius: 14, alignItems: 'center' }, registerText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  modalBackdrop: { flex: 1, backgroundColor: '#17251C55', alignItems: 'center', justifyContent: 'center', padding: 24 }, picker: { width: '100%', maxWidth: 380, backgroundColor: c.surface, borderRadius: 24, padding: 18 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, petRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 17, borderBottomWidth: 1, borderBottomColor: c.border }, petName: { fontSize: 16, color: c.ink },
});
