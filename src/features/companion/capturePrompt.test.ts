import { capturePrompt } from './capturePrompt';

it('asks for a photo and points at the camera before anything is saved', () => {
  expect(capturePrompt({ replacing: false, kind: 'PHOTO', hasUri: false, recording: false })).toEqual({
    title: '사진을 남겨 볼까요?',
    primary: 'camera',
  });
});

it('asks to record a cry before a file exists, and does not offer save as the next step', () => {
  expect(capturePrompt({ replacing: false, kind: 'AUDIO', hasUri: false, recording: false })).toEqual({
    title: '울음을 녹음해 볼까요?',
    primary: 'record',
  });
  expect(capturePrompt({ replacing: false, kind: 'AUDIO', hasUri: false, recording: true })).toEqual({
    title: '울음을 녹음하고 있어요',
    primary: 'record',
  });
});

it('asks for a short video and points at the camera before a file exists', () => {
  expect(capturePrompt({ replacing: false, kind: 'VIDEO', hasUri: false, recording: false })).toEqual({
    title: '짧은 영상을 남겨 볼까요?',
    primary: 'video-camera',
  });
});

it('moves the filled action to save once a file is already chosen', () => {
  expect(capturePrompt({ replacing: false, kind: 'PHOTO', hasUri: true, recording: false })).toEqual({
    title: '이 사진을 남길까요?',
    primary: 'save',
  });
  expect(capturePrompt({ replacing: false, kind: 'AUDIO', hasUri: true, recording: false })).toEqual({
    title: '이 울음을 남길까요?',
    primary: 'save',
  });
  expect(capturePrompt({ replacing: false, kind: 'VIDEO', hasUri: true, recording: false })).toEqual({
    title: '이 영상을 남길까요?',
    primary: 'save',
  });
});

it('keeps replace on the existing save step', () => {
  expect(capturePrompt({ replacing: true, kind: 'PHOTO', hasUri: false, recording: false })).toEqual({
    title: '사진만 바꿔요',
    primary: 'save',
  });
  expect(capturePrompt({ replacing: true, kind: 'AUDIO', hasUri: true, recording: false }).title).toBe('울음만 바꿔요');
  expect(capturePrompt({ replacing: true, kind: 'VIDEO', hasUri: false, recording: false }).title).toBe('영상만 바꿔요');
});

it('does not claim a diagnosis, a translation, or a score', () => {
  const titles = [
    capturePrompt({ replacing: false, kind: 'PHOTO', hasUri: false, recording: false }).title,
    capturePrompt({ replacing: false, kind: 'AUDIO', hasUri: false, recording: false }).title,
    capturePrompt({ replacing: false, kind: 'VIDEO', hasUri: false, recording: false }).title,
    capturePrompt({ replacing: false, kind: 'PHOTO', hasUri: true, recording: false }).title,
  ];
  for (const title of titles) expect(title).not.toMatch(/진단|번역|%|의미/);
});
