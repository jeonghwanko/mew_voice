import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet } from 'react-native';

/** Local preview only. Playback does not upload the file or start an analysis. */
export function VideoPreview({ uri, compact = false }: { uri: string; compact?: boolean }) {
  const player = useVideoPlayer(uri, item => { item.pause(); });
  return <VideoView player={player} nativeControls={!compact} contentFit="contain" allowsFullscreen={false} style={compact ? styles.compact : styles.preview} accessibilityLabel={compact ? '최근 영상 미리보기' : '영상 미리보기'} />;
}
const styles = StyleSheet.create({
  preview: { width: '100%', height: 240, borderRadius: 22, marginBottom: 12, backgroundColor: '#111' },
  compact: { width: 72, height: 48, borderRadius: 12, backgroundColor: '#111' },
});
