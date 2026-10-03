import { useEffect, useRef, useState } from 'react';
import { sessionStorage } from '../../core/storage';
import { defaultAppearance, parseAppearance, appearanceStorageKey, type Appearance } from './appearance';

export function useAppearance(scope: string) {
  const key = appearanceStorageKey(scope);
  const [loadedKey, setLoadedKey] = useState('');
  const [value, setValue] = useState<Appearance>({ ...defaultAppearance });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const currentKey = useRef(key);
  currentKey.current = key;
  useEffect(() => {
    let alive = true;
    setLoadedKey(''); setError('');
    void sessionStorage.get(key).then(raw => {
      if (alive) setValue(parseAppearance(raw));
    }).catch(() => { if (alive) { setValue({ ...defaultAppearance }); setError('모습을 불러오지 못했어요. 기본 모습으로 시작해요.'); } })
      .finally(() => { if (alive) setLoadedKey(key); });
    return () => { alive = false; };
  }, [key]);
  const ready = loadedKey === key;
  const save = async () => {
    if (!ready || saving) return false;
    setSaving(true); setError('');
    try { await sessionStorage.set(key, JSON.stringify(value)); return currentKey.current === key; }
    catch { if (currentKey.current === key) setError('모습을 저장하지 못했어요. 다시 시도해 주세요.'); return false; }
    finally { setSaving(false); }
  };
  return { value: ready ? value : defaultAppearance, setValue, ready, saving, save, error };
}
