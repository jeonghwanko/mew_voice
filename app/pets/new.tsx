import { useState } from 'react';
import { router } from 'expo-router';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { Screen, Field, Body, Button, Chip, ErrorNote, s } from '../../src/ui/components';
import { CatPortrait } from '../../src/ui/CatPortrait';
import { useCompanion } from '../../src/features/companion/useCompanion';
import { errorMessage } from '../../src/lib/api';
export default function NewPet() {
  const companion = useCompanion(); const [name, setName] = useState(''); const [age, setAge] = useState(''); const [breed, setBreed] = useState(''); const [sex, setSex] = useState('모름');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async () => { setBusy(true); setError(''); try { const pet = await companion.createPet({ name: name.trim(), confirmedTraits: { age: age.trim() || '모름', breed: breed.trim() || '모름', sex, source: 'guardian' } }); await companion.selectPet(pet.id); router.replace('/'); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); } };
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Screen title="우리 아이를 소개해 주세요" subtitle="NICE TO MEET YOU"><View style={{ alignItems: 'center' }}><CatPortrait size={145} /></View><Body muted>지금은 고양이부터 함께해요. 알고 있는 정보만 입력해 주세요. 모르는 것은 비워둬도 괜찮아요.</Body><Field label="이름 *" placeholder="우리 아이는 어떤 이름인가요?" value={name} onChangeText={setName} maxLength={50} /><Field label="알고 있는 나이 · 선택" placeholder="예: 3살 / 2023년생" value={age} onChangeText={setAge} maxLength={40} /><Field label="알고 있는 품종 · 선택" placeholder="모르면 비워두세요" value={breed} onChangeText={setBreed} maxLength={50} /><Body muted>성별</Body><View style={[s.row, { marginVertical: 12 }]}>{['모름', '암컷', '수컷'].map(v => <Chip key={v} label={v} selected={sex === v} onPress={() => setSex(v)} />)}</View><ErrorNote message={error} /><Button title="우리 아이와 시작하기" onPress={() => void submit()} disabled={!name.trim()} busy={busy} /><Button title="닫기" secondary disabled={busy} onPress={() => router.back()} /></Screen></KeyboardAvoidingView>;
}
