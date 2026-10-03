import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet } from 'react-native';

/** Local preview only. Playback does not upload the file or start an analysis. */
export function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, item => { item.pause(); });
  return <VideoView player={player} nativeControls contentFit="contain" allowsFullscreen={false} style={styles.preview} accessibilityLabel="저장 전 영상 미리보기" />;
}
const styles = StyleSheet.create({ preview: { width: '100%', height: 240, borderRadius: 22, marginBottom: 12, backgroundColor: '#111' } });
