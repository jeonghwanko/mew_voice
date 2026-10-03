import { readCaptureDraft } from './captureDraft';
const photo = { uri: 'file://cat.jpg', question: '창가에 있어요', tags: ['창가에서'], requestId: 'request-1' };
test('legacy photo draft never takes over the audio shortcut', () => {
  expect(readCaptureDraft(JSON.stringify(photo), 'AUDIO')).toBeNull();
  expect(readCaptureDraft(JSON.stringify(photo), 'PHOTO')?.uri).toBe(photo.uri);
});
test('audio draft restores only to audio and keeps its duration', () => {
  const raw = JSON.stringify({ ...photo, kind: 'AUDIO', durationMs: 2500, uri: 'file://meow.m4a' });
  expect(readCaptureDraft(raw, 'PHOTO')).toBeNull();
  expect(readCaptureDraft(raw, 'AUDIO')?.durationMs).toBe(2500);
});
test('corrupt or incomplete device data is ignored', () => {
  for (const raw of ['broken', 'null', '{}', JSON.stringify({ ...photo, tags: [12] }), JSON.stringify({ ...photo, kind: 'AUDIO', durationMs: -1 })]) {
    expect(readCaptureDraft(raw, 'AUDIO')).toBeNull();
  }
});
