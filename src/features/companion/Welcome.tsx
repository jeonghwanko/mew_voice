import { useState } from 'react';
import { StudioWelcome } from '../avatar/StudioWelcome';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSession } from '../../core/session';
import { API_BASE, errorMessage } from '../../lib/api';
import { Screen, Body, Button, Field, Badge, ErrorNote } from '../../ui/components';
import { CatPortrait } from '../../ui/CatPortrait';
import { colors as c } from '../../ui/theme';

export function Welcome() {
  const session = useSession();
  const [form, setForm] = useState<'intro' | 'login' | 'guest'>('intro');
  const [phone, setPhone] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<void>) => { setError(''); setBusy(true); try { await action(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); } };
  if (form === 'intro') return <StudioWelcome busy={busy} error={error} onDemo={() => void run(session.demo)} onLogin={() => setForm('login')} />;
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Screen title={"말보다 먼저,\n마음을 알아가는 시간."} subtitle="A LITTLE CLOSER, EVERY DAY">
    <View style={styles.art}><CatPortrait size={280} /></View><Badge>고양이와 함께하는 관찰 일기</Badge>
    <Text style={styles.description}>오늘의 작은 순간에서 시작해요.{'\n'}함께 보낸 순간과 반응을 기억하며{'\n'}우리 아이를 조금 더 이해해 보세요.</Text>
    <>
      {form === 'login' ? <><Field label="휴대폰 번호" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" /><Field label="비밀번호" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" /><Button title="로그인" busy={busy} disabled={!phone.trim() || !password} onPress={() => void run(() => session.login(phone.replace(/\D/g, ''), password))} /><Button title="처음이에요 · 개발용 게스트 계정" secondary onPress={() => setForm('guest')} /></> : <><Field label="보호자 이름 · 2~20자" value={name} onChangeText={setName} maxLength={20} /><Body muted>게스트 계정은 이 기기의 로그인 정보에 연결됩니다. 로그아웃하거나 앱을 지우면 다시 접근하지 못할 수 있어요.</Body><Button title="게스트 계정 만들기" busy={busy} disabled={name.trim().length < 2} onPress={() => void run(() => session.guest(name.trim()))} /></>}
      <Body muted>개발 서버: {API_BASE}</Body><Button title="체험 선택으로 돌아가기" secondary onPress={() => setForm('intro')} />
    </>
    <ErrorNote message={error} /><View style={styles.foot}><Body muted>감정을 단정하는 번역 대신, 관찰한 단서와 가능한 의미를 함께 살펴봅니다.</Body></View>
  </Screen></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ art: { alignItems: 'center', marginVertical: 13 }, description: { color: c.muted, fontSize: 15, lineHeight: 26, marginVertical: 20 }, foot: { borderTopWidth: 1, borderTopColor: c.border, marginTop: 28, paddingTop: 20 } });
