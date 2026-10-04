import { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MewIcon, type MewIconName } from '../../ui/MewIcon';
import { studio as c } from './appearance';
import { homeQuickActions } from './homeQuickActions';

export type HomeMenuPage = 'menu' | 'wallet' | 'notices' | 'mail' | 'faq' | 'invite';
const titles: Record<HomeMenuPage, string> = { menu: '우리의 작은 공간', wallet: '나의 재화', notices: '공지사항', mail: '우편함', faq: '자주 묻는 질문', invite: '친구 초대' };
const faqs = [
  [`${homeQuickActions.talk.label}와 ${homeQuickActions.record.label}은 어떻게 다른가요?`, `${homeQuickActions.talk.label}는 놀이예요. 목소리의 길이와 리듬으로 야옹 소리를 만들 뿐, 말의 뜻을 번역하지 않아요. ${homeQuickActions.record.label}은 지금 이 고양이의 울음을 이 기기에 녹음하는 기능이고, 체험에서는 그 소리를 AI로 분석하지 않아요.`],
  ['사진으로 무엇을 알 수 있나요?', '사진에 보이는 자세와 주변 상황을 단서로 가능한 의미를 살펴봐요. 고양이의 마음을 확정하거나 건강을 진단하지는 않아요.'],
  ['체험 기록은 어디에 저장되나요?', '체험 기록은 이 기기에만 남아요. 실제 AI 분석이 아니에요. 처음 들어 있는 모모는 지어낸 프로필이에요. 계정 모드는 보관에 동의한 기록을 비공개로 저장해요.'],
  ['이전 대화와 우리 아이 정보는 어디에 있나요?', '홈의 글로 대화하기에서 선택한 아이의 이전 대화를 이어서 읽을 수 있어요. 기록의 대화 기록과 전체 메뉴에서도 볼 수 있어요. 전체 메뉴의 우리 아이에서 고양이를 등록하고 관리할 수 있어요.'],
  ['재화와 상점은 어떻게 사용하나요?', '재화 지급과 상품 구매는 준비 중이에요. 지금은 상점에서 무료 꾸미기로 이동해 고양이가 바라보는 방향을 조정할 수 있어요.'],
];

export function HomeMenu({ page, onPage, onClose }: { page: HomeMenuPage | null; onPage: (page: HomeMenuPage) => void; onClose: () => void }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareNote, setShareNote] = useState('');
  // Existing Android applicationId; no invented referral token or reward promise.
  const inviteUrl = 'https://play.google.com/store/apps/details?id=gg.pryzm.union';
  const share = async () => {
    if (sharing) return;
    setSharing(true); setShareNote('');
    const message = `뮤 보이스에서 고양이와 조금 더 가까워져요. 사진과 울음을 살펴보고 내 목소리로 야옹을 만들어 보세요.\n${inviteUrl}`;
    try {
      if (Platform.OS === 'web') {
        if (globalThis.navigator?.share) await globalThis.navigator.share({ title: '뮤 보이스', text: message });
        else { setShareNote('아래 링크를 복사해서 친구에게 보내 주세요.'); return; }
      } else await Share.share({ title: '뮤 보이스', message });
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) setShareNote('공유 창을 열지 못했어요. 아래 링크를 복사해 주세요.');
    } finally { setSharing(false); }
  };
  const go = (path: '/(tabs)/pet' | '/(tabs)/conversation' | '/settings') => { onClose(); router.push(path); };
  const row = (label: string, icon: MewIconName, action: () => void, detail?: string) => <Pressable key={label} accessibilityRole="button" onPress={action} style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.soft }]}><View style={styles.icon}><MewIcon name={icon} /></View><View style={{ flex: 1 }}><Text style={styles.label}>{label}</Text>{detail && <Text style={styles.hint}>{detail}</Text>}</View><MewIcon name="arrow" size={17} color={c.muted} /></Pressable>;
  return <Modal transparent visible={page !== null} animationType="fade" onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <Pressable accessibilityRole="button" accessibilityLabel="메뉴 바깥 영역 닫기" onPress={onClose} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.panel} edges={['top', 'bottom', 'right']} accessibilityViewIsModal>
        <View style={styles.header}>
          {page !== 'menu' && <Pressable accessibilityRole="button" accessibilityLabel="전체 메뉴로 돌아가기" onPress={() => onPage('menu')} style={styles.back}><View style={{ transform: [{ rotate: '180deg' }] }}><MewIcon name="arrow" /></View></Pressable>}
          <Text accessibilityRole="header" style={styles.title}>{titles[page ?? 'menu']}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="메뉴 닫기" onPress={onClose} style={styles.back}><MewIcon name="close" /></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          {page === 'menu' && <>
            <Text style={styles.kicker}>뮤 보이스</Text>
            {row('공지사항', 'notice', () => onPage('notices'))}
            {row('우편함', 'mail', () => onPage('mail'))}
            {row('자주 묻는 질문', 'help', () => onPage('faq'))}
            {row('친구 초대', 'invite', () => onPage('invite'))}
            <View style={styles.divider} />
            {row('우리 아이', 'cat', () => go('/(tabs)/pet'), '아이 선택 · 등록 정보')}
            {row('대화 기록', 'talk', () => go('/(tabs)/conversation'))}
            {row('설정', 'settings', () => go('/settings'), '보관 동의 · 개인정보 · 계정')}
            <Text selectable style={styles.body}>고양이 모델: Bicolor Cat — kenchoo, 원작 Fripouille — guillaume bolis. CC BY 4.0. 외형·리그·피부 가중치·앉기/서기 동작 수정.</Text>
            <Text selectable style={styles.link}>https://sketchfab.com/3d-models/bicolor-cat-e623a618ca344a8393d7ba4d63ec23cf{'\n'}https://sketchfab.com/3d-models/3d-modelling-my-cat-fripouille-0ab14bf98e754f8d90fe1bf1c84ca66c{'\n'}https://creativecommons.org/licenses/by/4.0/</Text>
          </>}
          {page === 'wallet' && <Empty icon="fish" title="재화를 준비하고 있어요" body="재화 지급과 사용 기능은 아직 열리지 않았어요. 준비되면 이곳에서 보유 수량을 확인할 수 있어요." />}
          {page === 'notices' && <Empty icon="notice" title="소식을 전할 공간이에요" body="공지 서비스를 준비하고 있어요. 지금 궁금한 내용은 자주 묻는 질문에서 확인해 주세요." />}
          {page === 'mail' && <Empty icon="mail" title="반가운 소식이 도착할 곳" body="우편 서비스를 준비하고 있어요. 아직 우편 수신이나 선물 받기는 지원하지 않아요." />}
          {page === 'faq' && faqs.map(([question, answer], index) => <View key={question} style={styles.faq}><Pressable accessibilityRole="button" accessibilityLabel={question} accessibilityState={{ expanded: expanded === index }} onPress={() => setExpanded(expanded === index ? null : index)} style={styles.question}><Text style={[styles.label, { flex: 1, lineHeight: 23 }]}>{question}</Text><Text style={styles.label}>{expanded === index ? '−' : '+'}</Text></Pressable>{expanded === index && <Text style={styles.body}>{answer}</Text>}</View>)}
          {page === 'invite' && <><Empty icon="invite" title="고양이 집사 친구에게" body="Google Play 앱 링크를 공유해 보세요. 뮤 보이스 업데이트 공개 전에는 이전 앱 이름과 버전이 표시될 수 있어요. 초대 보상과 가족 계정 연결은 아직 지원하지 않아요." /><Pressable accessibilityRole="button" disabled={sharing} onPress={() => void share()} style={styles.primary}><Text style={styles.primaryText}>{sharing ? '공유 창 여는 중…' : '초대 링크 공유하기'}</Text></Pressable><Text selectable style={styles.link}>{inviteUrl}</Text>{shareNote ? <Text accessibilityLiveRegion="polite" style={styles.body}>{shareNote}</Text> : null}</>}
        </ScrollView>
      </SafeAreaView>
    </View>
  </Modal>;
}
function Empty({ icon, title, body }: { icon: MewIconName; title: string; body: string }) { return <View style={styles.empty}><View style={styles.emptyIcon}><MewIcon name={icon} size={34} /></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.body}>{body}</Text></View>; }
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#1B281E66', alignItems: 'flex-end' }, panel: { width: '88%', maxWidth: 420, height: '100%', backgroundColor: c.surface, borderTopLeftRadius: 28, borderBottomLeftRadius: 28 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 72 }, title: { flex: 1, fontSize: 19, fontWeight: '700', color: c.ink, paddingLeft: 8 }, back: { minWidth: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' }, content: { padding: 20, paddingTop: 8, paddingBottom: 32 },
  kicker: { fontSize: 12, color: c.muted, marginBottom: 18 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderRadius: 14 }, icon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.soft }, label: { color: c.ink, fontSize: 15, fontWeight: '600' }, hint: { color: c.muted, fontSize: 11, marginTop: 4 }, divider: { height: 1, backgroundColor: c.border, marginVertical: 16 },
  empty: { paddingVertical: 28, gap: 16 }, emptyIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }, emptyTitle: { fontSize: 22, lineHeight: 31, fontWeight: '600', color: c.ink }, body: { color: c.muted, fontSize: 14, lineHeight: 23 }, faq: { borderBottomWidth: 1, borderColor: c.border, paddingBottom: 16, marginBottom: 8 }, question: { flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 56 }, primary: { padding: 17, backgroundColor: c.accent, borderRadius: 17, alignItems: 'center' }, primaryText: { color: c.surface, fontWeight: '600', fontSize: 15 }, link: { color: c.accent, fontSize: 12, lineHeight: 20, marginVertical: 20 },
});
