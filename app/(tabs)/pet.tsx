import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { CompanionPet } from '@findthem/shared';
import { Body, Button, Card, Chip, Empty, ErrorNote, Field, Loading, Screen, s } from '../../src/ui/components';
import { colors as c } from '../../src/ui/theme';
import { useCompanion } from '../../src/features/companion/useCompanion';
import { PET_SEX_VALUES } from '../../src/features/companion/petStore';
import { errorMessage } from '../../src/lib/api';

function traitText(value: unknown) { return typeof value === 'string' && value.trim() ? value : '알려지지 않음'; }
function knownSex(value: unknown) { return typeof value === 'string' && PET_SEX_VALUES.includes(value as typeof PET_SEX_VALUES[number]) ? value : '모름'; }
function knownText(value: unknown) { return typeof value === 'string' ? value : ''; }

export default function Pet() {
  const companion = useCompanion();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [breed, setBreed] = useState('');
  const [sex, setSex] = useState('모름');
  const requestRemoval = (id: string, petName: string) => {
    const remove = () => { setError(''); setBusy(true); void companion.removePet(id).then(async () => { if (companion.activePet?.id === id) { const next = companion.pets.data?.find(pet => pet.id !== id); if (next) await companion.selectPet(next.id); } if (editingId === id) setEditingId(null); setNotice(companion.demo ? '등록 정보와 관찰 기록을 삭제했어요.' : '삭제를 요청했어요. 아래에서 처리 상태를 확인할 수 있어요.'); }).catch(e => setError(errorMessage(e))).finally(() => setBusy(false)); };
    const copy = `${petName}의 관찰 기록과 사진도 함께 삭제 요청됩니다. 이 작업은 되돌릴 수 없어요.`;
    if (Platform.OS === 'web') { if (globalThis.confirm?.(copy)) remove(); return; }
    Alert.alert(`${petName}를 삭제할까요?`, copy, [{ text: '취소', style: 'cancel' }, { text: '삭제', style: 'destructive', onPress: remove }]);
  };
  const startEdit = (pet: CompanionPet) => {
    if (!companion.demo) { setError(errorMessage(new Error('PET_PROFILE_ACCOUNT_READONLY'))); return; }
    setEditingId(pet.id);
    setName(pet.name);
    setAge(knownText(pet.confirmedTraits.age));
    setBreed(knownText(pet.confirmedTraits.breed));
    setSex(knownSex(pet.confirmedTraits.sex));
    setError('');
    setNotice('');
  };
  const cancelEdit = () => { setEditingId(null); setError(''); };
  const saveProfile = async () => {
    if (!editingId) return;
    setBusy(true); setError('');
    try {
      await companion.updatePetProfile(editingId, { name, age, breed, sex });
      setEditingId(null);
      setNotice('이름과 알고 있는 정보를 고쳤어요. 관찰, 반응, 돌봄, 대화는 그대로예요.');
    } catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); }
  };
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Screen title="우리 아이" subtitle="KNOWN, NEVER ASSUMED" action={<Pressable accessibilityRole="button" accessibilityLabel="설정" onPress={() => router.push('/settings')}><Ionicons name="options-outline" size={24} color={c.muted} /></Pressable>}>
    <Body muted>보호자가 확인한 정보만 보여드려요. 사진이나 AI 해석으로 추정한 특성은 프로필에 저장하지 않아요.</Body>
    {!companion.demo && !!companion.pets.data?.length && <Body muted>이 계정에 등록한 아이 정보는 여기서 고칠 수 없어요. 이 기기의 체험 기록만 수정할 수 있어요.</Body>}
    <View style={[s.row, { marginTop: 14 }]}>{companion.pets.data?.map(pet => <Chip key={pet.id} label={pet.name} selected={companion.activePet?.id === pet.id} onPress={() => void companion.selectPet(pet.id)} />)}</View>
    {companion.pets.isLoading ? <Loading /> : <ErrorNote message={companion.pets.error ? errorMessage(companion.pets.error) : null} />}
    {companion.pets.data?.map(pet => {
      const editing = editingId === pet.id;
      const fictional = companion.demo && pet.id === 'demo-momo';
      return <Card key={pet.id}><View style={styles.nameRow}><View style={styles.paw}><Ionicons name="paw" color={c.primary} size={22} /></View><View style={{ flex: 1 }}><Text style={styles.name}>{pet.name}</Text><Text style={styles.species}>{fictional ? '체험용 가상 프로필 · 실존하는 고양이가 아니에요' : '고양이 · 등록 정보'}</Text></View></View>
        {fictional && <Body>모모는 지어낸 체험 프로필이에요. 실존하는 고양이가 아니에요. 이름이나 품종을 고쳐도 건강·품종 진단이 아니에요.</Body>}
        {editing ? <>
          <Body muted>이름, 알고 있는 나이·품종·성별만 고쳐요. 관찰, 반응, 돌봄, 대화는 이 아이에 그대로 남아요. 품종이나 나이를 진단하지 않아요. 이 기기의 체험 기록이에요.</Body>
          <Field label="이름 *" placeholder="우리 아이는 어떤 이름인가요?" value={name} onChangeText={setName} maxLength={50} editable={!busy} />
          <Field label="알고 있는 나이 · 선택" placeholder="예: 3살 / 2023년생" value={age} onChangeText={setAge} maxLength={40} editable={!busy} />
          <Field label="알고 있는 품종 · 선택" placeholder="모르면 비워두세요" value={breed} onChangeText={setBreed} maxLength={50} editable={!busy} />
          <Body muted>성별</Body>
          <View style={s.row}>{PET_SEX_VALUES.map(value => <Chip key={value} label={value} selected={sex === value} onPress={() => { if (!busy) setSex(value); }} />)}</View>
          <Button title="등록 정보 저장" busy={busy} disabled={busy || !name.trim()} onPress={() => void saveProfile()} />
          <Button title="수정 취소" secondary disabled={busy} onPress={cancelEdit} />
        </> : <>
          <View style={styles.traits}><Trait label="나이" value={traitText(pet.confirmedTraits.age)} /><Trait label="품종" value={traitText(pet.confirmedTraits.breed)} /><Trait label="성별" value={traitText(pet.confirmedTraits.sex)} /></View>
          {companion.demo && <Button title="등록 정보 수정" secondary disabled={busy} onPress={() => startEdit(pet)} />}
        </>}
        <Button title={`${pet.name} 삭제`} secondary danger busy={busy} onPress={() => requestRemoval(pet.id, pet.name)} />
      </Card>;
    })}
    {!companion.pets.isLoading && !companion.pets.data?.length && <Empty title="등록된 아이가 없어요" detail="이름과 알고 있는 정보부터 천천히 알려 주세요." />}
    <ErrorNote message={companion.deletions.error ? errorMessage(companion.deletions.error) : null} />
    {companion.deletions.data?.map(item => <Card key={item.petId}><Body>{item.name} · {item.status === 'PENDING' ? '기록과 사진을 삭제하고 있어요' : '삭제를 완료하지 못했어요'}</Body><Body muted>삭제 중인 정보는 앱에서 사용할 수 없어요. 처리가 완료되면 이 안내가 사라져요.</Body>{item.status === 'FAILED' && <Button title="삭제 다시 요청" secondary busy={busy} onPress={() => requestRemoval(item.petId, item.name)} />}</Card>)}
    <ErrorNote message={error} />{notice ? <Body muted>{notice}</Body> : null}<Button title="우리 아이 등록하기" icon="add-outline" onPress={() => router.push('/pets/new')} />
    <Button title="설정과 개인정보" secondary icon="settings-outline" onPress={() => router.push('/settings')} />
  </Screen></KeyboardAvoidingView>;
}
function Trait({ label, value }: { label: string; value: string }) { return <View style={styles.trait}><Text style={styles.traitLabel}>{label}</Text><Text style={styles.traitValue}>{value}</Text></View>; }
const styles = StyleSheet.create({ nameRow: { flexDirection: 'row', gap: 12, alignItems: 'center' }, paw: { width: 48, height: 48, borderRadius: 16, backgroundColor: c.primaryDark, justifyContent: 'center', alignItems: 'center' }, name: { color: c.text, fontSize: 21, fontWeight: '700' }, species: { color: c.muted, fontSize: 12, marginTop: 3 }, traits: { flexDirection: 'row', gap: 8, marginTop: 8 }, trait: { flex: 1, minHeight: 62, backgroundColor: c.elevated, borderRadius: 13, padding: 10 }, traitLabel: { color: c.muted, fontSize: 11, marginBottom: 5 }, traitValue: { color: c.text, fontSize: 13, fontWeight: '600' } });
