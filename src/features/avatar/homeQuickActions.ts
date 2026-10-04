/** Home has no single primary next step, so these three stay peer QuickActions. Labels differ by verb: talk, record this cat's cry now, photograph. Saved-cry playback remains "울음 다시 듣기" and is not this row. */
export const homeQuickActions = {
  talk: {
    label: '말 걸기',
    hint: '놀이용 야옹이에요. 말의 뜻을 번역하지 않아요.',
  },
  record: {
    label: '울음 녹음',
    hint: '지금 이 고양이의 울음을 녹음해요.',
  },
  photo: {
    label: '사진 찍기',
    hint: '지금 이 고양이의 사진을 찍어요.',
  },
} as const;
