import { createMemoryMediaStore, readDemoMedia, restoreDemoMediaUris, saveDemoMedia, webMediaUri, type StoredDemoMedia } from './webMediaStore';

const record = (observationId: string, kind: StoredDemoMedia['kind'], bytes: number[], mimeType: string, petId = 'cat-a'): StoredDemoMedia => ({
  observationId, petId, kind, mimeType, bytes: Uint8Array.from(bytes),
});

it('saves photo, audio, and video bytes and reads the same bytes after a reload', async () => {
  const backing = new Map<string, StoredDemoMedia>();
  const session = createMemoryMediaStore(backing);
  const photo = Uint8Array.from([1, 2, 3, 255]);
  const audio = Uint8Array.from([9, 8, 7, 6]);
  const video = Uint8Array.from([4, 5, 4, 5, 6]);
  await saveDemoMedia(session, { observationId: 'photo-1', petId: 'cat-a', kind: 'PHOTO', mimeType: 'image/jpeg', bytes: photo });
  await saveDemoMedia(session, { observationId: 'audio-1', petId: 'cat-a', kind: 'AUDIO', mimeType: 'audio/webm', bytes: audio });
  await saveDemoMedia(session, { observationId: 'video-1', petId: 'cat-b', kind: 'VIDEO', mimeType: 'video/mp4', bytes: video });
  photo[0] = 0;
  const raw = JSON.stringify([...backing.values()].map(item => ({ ...item, bytes: Array.from(item.bytes) })));
  const revived = new Map<string, StoredDemoMedia>(JSON.parse(raw).map((item: StoredDemoMedia & { bytes: number[] }) => [item.observationId, { ...item, bytes: Uint8Array.from(item.bytes) }]));
  const reloaded = createMemoryMediaStore(revived);
  expect(await readDemoMedia(reloaded, 'photo-1')).toEqual(record('photo-1', 'PHOTO', [1, 2, 3, 255], 'image/jpeg'));
  expect(await readDemoMedia(reloaded, 'audio-1')).toEqual(record('audio-1', 'AUDIO', [9, 8, 7, 6], 'audio/webm'));
  expect(await readDemoMedia(reloaded, 'video-1')).toEqual(record('video-1', 'VIDEO', [4, 5, 4, 5, 6], 'video/mp4', 'cat-b'));
  expect(await readDemoMedia(reloaded, 'missing')).toBeNull();
  const restored = await restoreDemoMediaUris([
    { id: 'photo-1', localPhotoUri: webMediaUri('photo-1') },
    { id: 'audio-1', localAudioUri: webMediaUri('audio-1') },
    { id: 'video-1', localVideoUri: webMediaUri('video-1') },
    { id: 'gone', localAudioUri: webMediaUri('gone'), localPhotoUri: 'data:image/jpeg;base64,AA==' },
  ], reloaded, item => `blob:restored/${item.observationId}/${item.mimeType}/${item.bytes.byteLength}`);
  expect(restored[0].localPhotoUri).toBe('blob:restored/photo-1/image/jpeg/4');
  expect(restored[1].localAudioUri).toBe('blob:restored/audio-1/audio/webm/4');
  expect(restored[2].localVideoUri).toBe('blob:restored/video-1/video/mp4/5');
  expect(restored[3].localPhotoUri).toBe('data:image/jpeg;base64,AA==');
  expect(restored[3].localAudioUri).toBeUndefined();
  await reloaded.deletePet('cat-a');
  expect(await readDemoMedia(reloaded, 'photo-1')).toBeNull();
  expect(await readDemoMedia(reloaded, 'audio-1')).toBeNull();
  expect((await readDemoMedia(reloaded, 'video-1'))?.bytes).toEqual(video);
  await expect(saveDemoMedia(reloaded, record('empty', 'AUDIO', [], 'audio/webm'))).rejects.toThrow('MEDIA_UNREADABLE');
});
