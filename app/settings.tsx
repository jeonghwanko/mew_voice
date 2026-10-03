import { useState } from 'react';
import { Alert, Platform, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Body, Button, Card, ErrorNote, Heading, Screen } from '../src/ui/components';
import { colors as c } from '../src/ui/theme';
import { useCompanion } from '../src/features/companion/useCompanion';
import { getDemo } from '../src/features/companion/demo';
import { API_BASE, api, errorMessage } from '../src/lib/api';
import { useSession } from '../src/core/session';

export default function Settings() {
  const { session, logout } = useSession();
  const companion = useCompanion();
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [exportPreview, setExportPreview] = useState('');
  const saveStorage = async (value: boolean) => { setBusy(true); setError(''); try { await companion.saveConsent(value, false); } catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); } };
  const exportData = async () => {
    setBusy(true); setError('');
    try { const data = companion.demo ? await getDemo() : await api.get<unknown>('/pet-companion/data-export'); const json = JSON.stringify(data, (key, value) => key === 'localPhotoUri' ? undefined : value, 2); setExportPreview(json); if (Platform.OS !== 'web') await Share.share({ title: '우리 아이 기록 내보내기', message: json }); }
    catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); }
  };
  const signOut = () => {
    const leave = () => { void logout().catch(e => setError(errorMessage(e))); };
    const copy = '로그아웃하면 게스트 계정은 다시 접근하지 못할 수 있어요. 계속할까요?';
    if (Platform.OS === 'web') { if (globalThis.confirm?.(copy)) leave(); return; }
    Alert.alert('로그아웃할까요?', copy, [{ text: '취소', style: 'cancel' }, { text: '로그아웃', style: 'destructive', onPress: leave }]);
  };
  const deleteAccount = () => {
    if (busy || session?.mode !== 'api') return;
    const remove = async () => {
      setBusy(true); setError('');
      try {
        await api.delete('/auth/me');
        await logout();
        router.replace('/');
      } catch (cause) { setError(errorMessage(cause)); }
      finally { setBusy(false); }
    };
    const message = '현재 계정과 연결된 기록을 영구 삭제합니다. 삭제 후에는 복구하거나 같은 게스트 계정으로 다시 로그인할 수 없습니다.';
    if (Platform.OS === 'web') { if (globalThis.confirm?.(message)) void remove(); return; }
    Alert.alert('계정을 영구 삭제할까요?', message, [
      { text: '취소', style: 'cancel' },
      { text: '계정 영구 삭제', style: 'destructive', onPress: () => void remove() },
    ]);
  };
  return <Screen title="설정" subtitle="PRIVATE BY DEFAULT">
    <Card accent><Heading>{session?.mode === 'demo' ? '기기 내 체험 모드' : '계정 연결됨'}</Heading><Body>{session?.name ?? '보호자'}</Body><Body muted>{session?.mode === 'demo' ? '기록은 이 기기에만 저장되며 실제 AI를 호출하지 않아요.' : '개발 API에 연결된 비공개 기록이에요.'}</Body></Card>
    <Heading>기록과 동의</Heading><Card><View style={styles.row}><View style={{ flex: 1 }}><Text style={styles.label}>기록 보관</Text><Body muted>새 사진, 질문, 관찰 결과의 저장을 허용해요. 끄더라도 기존 기록은 삭제되지 않아요.</Body></View><Switch value={!!companion.consent.data?.serviceStorage} disabled={busy} onValueChange={value => void saveStorage(value)} trackColor={{ false: c.border, true: c.primaryDark }} thumbColor={companion.consent.data?.serviceStorage ? c.primary : c.muted} /></View>
      <View style={styles.disabled}><Text style={styles.label}>연구용 학습 참여</Text><Body muted>현재는 지원하지 않아요. 이 앱은 연구 학습에 기록을 사용하지 않습니다.</Body><Switch value={false} disabled trackColor={{ false: c.border, true: c.border }} thumbColor={c.muted} /></View></Card>
    <Heading>내 기록</Heading><Card><Body muted>보관 중인 정보를 JSON 형식으로 확인하거나 공유할 수 있어요. 사진 원본은 포함하지 않아요.</Body><Button title="내 기록 내보내기" secondary busy={busy} icon="download-outline" onPress={() => void exportData()} />{exportPreview ? <Text selectable style={styles.preview}>{exportPreview.slice(0, 1800)}{exportPreview.length > 1800 ? '\n… 일부만 표시했어요.' : ''}</Text> : null}</Card>
    <Heading>연결 정보</Heading><Card><Text style={styles.label}>개발 API</Text><Text selectable style={styles.api}>{API_BASE}</Text><Body muted>이 주소는 개발 환경 연결 정보입니다.</Body></Card>
    <ErrorNote message={error} />
    {session?.mode === 'api' ? <Card><Heading>계정 삭제</Heading><Body muted>계정과 연결된 기록을 영구 삭제할 수 있어요. 삭제 전 필요한 기록을 내보내 주세요.</Body><Button title="계정 삭제" danger busy={busy} onPress={deleteAccount} /></Card> : null}
    <Button title="로그아웃" danger disabled={busy} onPress={signOut} />
    <Button title="닫기" secondary onPress={() => router.back()} />
  </Screen>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 16 }, disabled: { opacity: 0.58, marginTop: 12, paddingTop: 15, borderTopWidth: 1, borderTopColor: c.border, gap: 6 }, label: { color: c.text, fontSize: 15, fontWeight: '700', marginBottom: 4 }, api: { color: c.primary, fontSize: 12, lineHeight: 19 }, preview: { color: c.muted, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 11, lineHeight: 16, backgroundColor: c.background, borderRadius: 10, padding: 12, marginTop: 8 } });
