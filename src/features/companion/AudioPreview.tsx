import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { StyleSheet, View } from 'react-native';
import { Body, Button } from '../../ui/components';

/** On-device playback of a saved cry. This does not analyze or translate the sound. */
export function AudioPreview({ uri }: { uri: string }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const toggle = () => {
    if (status.playing) { player.pause(); return; }
    void player.seekTo(0);
    player.play();
  };
  return <View style={styles.box}>
    <Body muted>이 기기에 남긴 울음이에요. 소리를 분석하거나 의미로 번역하지 않아요.</Body>
    <Button title={status.playing ? '재생 멈추기' : '울음 다시 듣기'} secondary icon={status.playing ? 'stop' : 'play'} onPress={toggle} />
  </View>;
}
const styles = StyleSheet.create({ box: { marginBottom: 8, gap: 4 } });
