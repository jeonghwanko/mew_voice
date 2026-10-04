import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { CompanionCheckinKind } from '@findthem/shared';
import { Body, Button, Card, Chip, ErrorNote, Field, Heading, Loading, Screen, s } from '../src/ui/components';
import { colors as c } from '../src/ui/theme';
import { useCheckin, useCheckins, checkinLabels } from '../src/features/companion/useCheckins';
import { checkinContinueHref, checkinExitHref, checkinUnavailableHref } from '../src/features/companion/checkinNavigation';
import { checkinSave } from '../src/features/companion/checkinSave';
import { newRequestId } from '../src/features/companion/useCompanion';
import { sessionStorage } from '../src/core/storage';
import { useSession } from '../src/core/session';
import { ApiError, errorMessage } from '../src/lib/api';

const kinds: CompanionCheckinKind[] = ['PLAY', 'MEAL', 'NOTE', 'CHECKED'];
const validKind = (value: string | undefined): value is CompanionCheckinKind => !!value && kinds.includes(value as CompanionCheckinKind);
function kstInput(date = new Date()) { const kst = new Date(date.getTime() + 9 * 3600000); return kst.toISOString().slice(0, 16).replace('T', ' '); }
function parseKst(value: string) { if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) return null; const date = new Date(`${value.replace(' ', 'T')}:00+09:00`); return Number.isFinite(date.getTime()) && kstInput(date) === value ? date.toISOString() : null; }
type Draft = { kind: CompanionCheckinKind; note: string; occurredText: string; idempotencyKey: string };

export default function Checkin() {
  const params = useLocalSearchParams<{ id?: string; kind?: string; returnTo?: string; conversationId?: string; petId?: string }>(); const { session } = useSession(); const checkins = useCheckins(); const existing = useCheckin(params.id);
  const [draft, setDraft] = useState<Draft>({ kind: validKind(params.kind) ? params.kind : 'PLAY', note: '', occurredText: kstInput(), idempotencyKey: newRequestId() });
  const [loadedKey, setLoadedKey] = useState<string | null>(null); const [movingPet, setMovingPet] = useState(false); const [movePetId, setMovePetId] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [conflict, setConflict] = useState(false);
  const pet = checkins.activePet; const key = `companion_checkin_draft_${session?.mode}_${session?.userId}_${pet?.id ?? 'none'}_${params.id ?? 'new'}`;
  const editMode = !!params.id;
  const initializedScope = useRef<string | null>(null);
  useEffect(() => { if (initializedScope.current !== key) setLoadedKey(null); }, [key]);
  useEffect(() => {
    if (initializedScope.current === key) return;
    // An edit must never create or persist a blank draft before its real row is known.
    if (editMode && (!existing.data || existing.data.petId !== pet?.id)) return;
    initializedScope.current = key;
    let live = true;
    const initial = existing.data ? { kind: existing.data.kind, note: existing.data.note ?? '', occurredText: kstInput(new Date(existing.data.occurredAt)), idempotencyKey: newRequestId() } : { kind: validKind(params.kind) ? params.kind : 'PLAY', note: '', occurredText: kstInput(), idempotencyKey: newRequestId() };
    setDraft(initial);
    void sessionStorage.get(key).then(raw => {
      if (!live || !raw) return;
      const saved = JSON.parse(raw) as Draft;
      if (validKind(saved.kind) && typeof saved.note === 'string' && typeof saved.occurredText === 'string' && typeof saved.idempotencyKey === 'string') setDraft(saved);
    }).catch(() => undefined).finally(() => { if (live) setLoadedKey(key); });
    return () => { live = false; };
  }, [key, editMode, existing.data, pet?.id, params.kind]);
  useEffect(() => { if (loadedKey === key) void sessionStorage.set(key, JSON.stringify(draft)).catch(() => undefined); }, [draft, key, loadedKey]);
  const leave = () => { router.replace(checkinExitHref(params)); };
  const resumeLater = () => { const next = checkinContinueHref(params); if (next) router.replace(next); else router.back(); };
  const leaveUnavailable = () => { router.replace(checkinUnavailableHref(params)); };
  const save = async () => {
    if (!pet) return; if (editMode && (!existing.data || existing.data.petId !== pet.id)) { setError('수정할 기록을 다시 불러온 뒤 저장해 주세요.'); return; } const occurredAt = parseKst(draft.occurredText); if (!occurredAt) { setError('발생 시각을 2026-09-10 19:20 형식으로 입력해 주세요.'); return; }
    if (draft.kind === 'NOTE' && !draft.note.trim()) { setError('메모 남기기에는 내용을 적어 주세요.'); return; }
    setBusy(true); setError(''); setConflict(false);
    try { if (editMode) await checkins.update(params.id!, { version: existing.data!.version, kind: draft.kind, note: draft.note.trim() || null, occurredAt }); else await checkins.create({ petId: pet.id, kind: draft.kind, note: draft.note.trim() || undefined, occurredAt, idempotencyKey: draft.idempotencyKey }); await sessionStorage.remove(key); leave(); }
    catch (cause) { if (cause instanceof ApiError && cause.status === 409) { setConflict(true); setError('다른 곳에서 이 기록이 수정되었어요. 작성 중인 내용은 그대로 남아 있어요.'); } else setError(errorMessage(cause)); } finally { setBusy(false); }
  };
  const remove = () => { if (!params.id || !existing.data) return; const execute = () => { setBusy(true); setError(''); void checkins.remove(params.id!, existing.data!.version).then(async () => { await sessionStorage.remove(key); leave(); }).catch(cause => { if (cause instanceof ApiError && cause.status === 409) { setConflict(true); setError('다른 곳에서 이 기록이 수정되었어요. 최신 내용을 다시 불러온 뒤 삭제할 수 있어요.'); } else setError(errorMessage(cause)); }).finally(() => setBusy(false)); };
    const copy = '이 보호자 기록을 삭제할까요? 삭제한 기록은 되돌릴 수 없어요.'; if (Platform.OS === 'web') { if (globalThis.confirm?.(copy)) execute(); return; } Alert.alert('기록을 삭제할까요?', copy, [{ text: '취소', style: 'cancel' }, { text: '삭제', style: 'destructive', onPress: execute }]);
  };
  const reload = () => { setConflict(false); void existing.refetch(); };
  const otherPets = (checkins.pets.data ?? []).filter(item => item.id !== existing.data?.petId);
  const recordOwner = checkins.pets.data?.find(item => item.id === existing.data?.petId);
  const startMove = () => {
    if (!existing.data) return;
    if (!checkins.demo) { setError(errorMessage(new Error('CHECKIN_PET_ACCOUNT_READONLY'))); return; }
    const choices = (checkins.pets.data ?? []).filter(item => item.id !== existing.data?.petId);
    if (!choices.length) return;
    setMovingPet(true); setMovePetId(choices[0].id); setError('');
  };
  const cancelMove = () => { setMovingPet(false); setMovePetId(''); setError(''); };
  const saveMove = async () => {
    if (!params.id || !existing.data) return;
    if (!otherPets.some(item => item.id === movePetId)) { setError(errorMessage(new Error('INVALID_CHECKIN_PET'))); return; }
    setBusy(true); setError(''); setConflict(false);
    try {
      await checkins.move(params.id, movePetId);
      const nextPetId = movePetId;
      setMovingPet(false); setMovePetId('');
      await checkins.selectPet(nextPetId);
      await existing.refetch();
    } catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); }
  };
  const wrongPet = !!existing.data && !!pet && existing.data.petId !== pet.id;
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Screen title={pet ? `${pet.name}와\n어떤 시간을 보냈나요?` : '오늘의 기록'} subtitle={params.id ? 'EDIT CHECK-IN' : '10-SECOND CHECK-IN'}>
    {!pet ? <Card><Heading>먼저 우리 아이를 선택해 주세요</Heading><Button title="우리 아이 화면으로" onPress={() => router.replace('/')} /></Card> : editMode && existing.isLoading ? <Loading /> : editMode && existing.isError ? <Card><Heading>기록을 불러오지 못했어요</Heading><ErrorNote message={errorMessage(existing.error)} /><Button title="다시 불러오기" secondary onPress={() => void existing.refetch()} /></Card> : editMode && !existing.data ? <Card><Heading>수정할 기록을 찾을 수 없어요</Heading><Body muted>새 기록을 만들지 않았어요. 목록에서 다시 선택해 주세요.</Body><Button title="기록 목록으로" secondary onPress={leaveUnavailable} /></Card> : wrongPet ? <Card><Heading>{recordOwner ? `${recordOwner.name}의 돌봄 기록이에요` : '다른 아이의 기록이에요'}</Heading><Body muted>{recordOwner ? `이 기록은 ${recordOwner.name}에게 있어요. 메모와 시각, 기록 번호는 그대로예요.` : '현재 선택한 아이의 기록만 수정할 수 있어요.'}</Body>{recordOwner ? <Button title={`${recordOwner.name}의 기록 보기`} onPress={() => void checkins.selectPet(recordOwner.id)} /> : null}<Button title="기록 목록으로" secondary onPress={leaveUnavailable} /></Card> : <>
      <Body muted>사진 없이도 괜찮아요. 직접 보고 해 본 일을 저장할 수 있어요. AI 분석 없이 보호자 기록으로만 남습니다.</Body>
      {existing.isLoading && !!params.id ? <Loading /> : <><Heading>무엇을 했나요?</Heading><View style={s.row}>{kinds.map(kind => <Chip key={kind} label={checkinLabels[kind]} selected={draft.kind === kind} onPress={() => !busy && setDraft(current => ({ ...current, kind }))} />)}</View>
      {draft.kind === 'CHECKED' && <Card accent><Body>‘특이사항 없어요’는 이 시점에 보호자가 확인한 기록이에요. 하루 전체의 건강이나 기분 판정은 아니에요.</Body></Card>}
      <Field label="발생 시각 · 한국 시간(KST)" value={draft.occurredText} editable={!busy} onChangeText={occurredText => setDraft(current => ({ ...current, occurredText }))} placeholder="2026-09-10 19:20" />
      <Field label={draft.kind === 'NOTE' ? '메모 *' : '메모 · 선택'} value={draft.note} editable={!busy} onChangeText={note => setDraft(current => ({ ...current, note }))} placeholder={draft.kind === 'NOTE' ? '직접 관찰한 내용을 적어 주세요' : '예: 낚싯대 장난감을 따라왔어요'} multiline maxLength={500} />
      <Text style={styles.counter}>{draft.note.length}/500</Text>
      {editMode && existing.data ? <Card>
        <Heading>어느 아이의 기록인가요</Heading>
        <Body muted>이미 등록한 다른 아이에게만 옮겨요. 같은 돌봄의 메모와 시각, 기록 번호는 그대로 두어요. 새 아이를 만들거나 AI로 분석하지 않아요.</Body>
        {checkins.demo ? !checkins.pets.data ? null : otherPets.length === 0 ? <Body muted>등록된 다른 아이가 없어서 옮길 수 없어요.</Body> : movingPet ? <>
          <View style={s.row}>{otherPets.map(item => <Chip key={item.id} label={item.name} selected={movePetId === item.id} onPress={() => { if (!busy) setMovePetId(item.id); }} />)}</View>
          <Button title="이 아이에게 옮기기" busy={busy} disabled={busy || !otherPets.some(item => item.id === movePetId)} onPress={() => void saveMove()} />
          <Button title="옮기기 취소" secondary disabled={busy} onPress={cancelMove} />
        </> : <Button title="다른 아이에게 옮기기" secondary disabled={busy} onPress={startMove} /> : <Body muted>이 계정에 남긴 돌봄 기록은 여기서 다른 아이에게 옮길 수 없어요. 이 기기의 체험 기록만 수정할 수 있어요.</Body>}
      </Card> : null}
      <ErrorNote message={error} />
      {conflict && <Button title="최신 기록 다시 불러오기" secondary disabled={busy} onPress={reload} />}
      <Button title={params.id ? '수정 저장하기' : checkinSave.label} busy={busy} disabled={busy || loadedKey !== key || (draft.kind === 'NOTE' && !draft.note.trim())} onPress={() => void save()} />
      <Button title="나중에 이어 쓰기" secondary disabled={busy} onPress={resumeLater} />
      {!!params.id && <Button title="이 기록 삭제" danger disabled={busy} onPress={remove} />}</>}
    </>}
  </Screen></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ counter: { color: c.muted, textAlign: 'right', fontSize: 11, marginTop: -5 } });
