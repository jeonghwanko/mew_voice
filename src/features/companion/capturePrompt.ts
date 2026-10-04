/** Which control is the next step on the capture screen. Not a new capture mode. */

export type CapturePromptKind = 'PHOTO' | 'AUDIO' | 'VIDEO';

export type CapturePrimary = 'camera' | 'library' | 'record' | 'video-camera' | 'video-library' | 'save';

export type CapturePrompt = {
  title: string;
  primary: CapturePrimary;
};

/**
 * Before a file exists, saving is not the next step.
 * The filled action is taking, recording, or choosing the file the caregiver already came to leave.
 * After a file exists, saving that file is the filled action.
 * Replacing media keeps the existing replace title and save action.
 */
export function capturePrompt(input: {
  replacing: boolean;
  kind: CapturePromptKind;
  hasUri: boolean;
  recording: boolean;
}): CapturePrompt {
  if (input.replacing) {
    const media = input.kind === 'AUDIO' ? '울음' : input.kind === 'VIDEO' ? '영상' : '사진';
    return { title: `${media}만 바꿔요`, primary: 'save' };
  }
  if (input.recording) return { title: '울음을 녹음하고 있어요', primary: 'record' };
  if (!input.hasUri) {
    if (input.kind === 'AUDIO') return { title: '울음을 녹음해 볼까요?', primary: 'record' };
    if (input.kind === 'VIDEO') return { title: '짧은 영상을 남겨 볼까요?', primary: 'video-camera' };
    return { title: '사진을 남겨 볼까요?', primary: 'camera' };
  }
  if (input.kind === 'AUDIO') return { title: '이 울음을 남길까요?', primary: 'save' };
  if (input.kind === 'VIDEO') return { title: '이 영상을 남길까요?', primary: 'save' };
  return { title: '이 사진을 남길까요?', primary: 'save' };
}
