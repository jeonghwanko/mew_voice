import { useEffect, useRef, useState } from 'react';
import { AppState, Image, Linking, Platform, View } from 'react-native';
import { router } from 'expo-router';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { Badge, Body, Button, Card, ErrorNote, Heading, Screen } from '../src/ui/components';
import { makeMeow, wavBase64, type VoiceFrame } from '../src/features/companion/meow';

async function remove(uri:string|null) {
  if(!uri)return;
  if(uri.startsWith('blob:'))URL.revokeObjectURL(uri);
  else if(Platform.OS!=='web')await FileSystem.deleteAsync(uri,{idempotent:true}).catch(()=>undefined);
}
async function webFrames(uri:string):Promise<VoiceFrame[]> {
  const context=new AudioContext();
  try {
    const response=await fetch(uri);
    const data=await context.decodeAudioData(await response.arrayBuffer());
    const samples=data.getChannelData(0),step=Math.round(data.sampleRate/10),result:VoiceFrame[]=[];
    for(let i=0;i<Math.min(samples.length,data.sampleRate*6.5);i+=step) {
      let energy=0;const end=Math.min(samples.length,i+step);
      for(let j=i;j<end;j++)energy+=samples[j]*samples[j];
      result.push({timeMs:i/data.sampleRate*1000,db:20*Math.log10(Math.max(1e-8,Math.sqrt(energy/(end-i))))});
    }
    return result;
  } finally { await context.close(); }
}
export default function Meow() {
  const recorder=useAudioRecorder({...RecordingPresets.HIGH_QUALITY,isMeteringEnabled:true});
  const state=useAudioRecorderState(recorder,100);
  const player=useAudioPlayer(null),playback=useAudioPlayerStatus(player);
  const [phase,setPhase]=useState<'idle'|'recording'|'working'|'ready'>('idle');
  const [error,setError]=useState<string|null>(null),[denied,setDenied]=useState(false);
  const frames=useRef<VoiceFrame[]>([]),alive=useRef(true),active=useRef(false),generation=useRef(0),busy=useRef(false),output=useRef<string|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>{if(state.isRecording&&typeof state.metering==='number')frames.current.push({timeMs:state.durationMillis,db:state.metering});},[state.durationMillis,state.isRecording,state.metering]);
  useEffect(()=>{
    alive.current=true;
    const cancel=()=>{
      generation.current++;active.current=false;if(timer.current)clearTimeout(timer.current);player.pause();
      void recorder.stop().catch(()=>undefined).finally(()=>{void remove(recorder.uri);void setAudioModeAsync({allowsRecording:false}).catch(()=>undefined);});
    };
    const sub=AppState.addEventListener('change',s=>{if(s!=='active'){cancel();if(alive.current){setPhase('idle');setError('녹음이 중단됐어요. 다시 말해 주세요.');}}});
    return()=>{alive.current=false;cancel();sub.remove();void remove(output.current);};
  },[player,recorder]);
  const stop=async()=>{
    if(!active.current)return;
    active.current=false;busy.current=true;if(timer.current)clearTimeout(timer.current);setPhase('working');const token=generation.current;
    let raw:string|null=null;
    try {
      await recorder.stop();raw=recorder.uri;await setAudioModeAsync({allowsRecording:false,playsInSilentMode:true});
      const input=Platform.OS==='web'&&raw?await webFrames(raw):[...frames.current];
      if(!alive.current||token!==generation.current)return;
      const wav=makeMeow(input);let uri:string;
      if(Platform.OS==='web')uri=URL.createObjectURL(new Blob([new Uint8Array(wav)],{type:'audio/wav'}));
      else {if(!FileSystem.cacheDirectory)throw new Error('NO_CACHE');uri=`${FileSystem.cacheDirectory}mewvoice-${Date.now()}.wav`;await FileSystem.writeAsStringAsync(uri,wavBase64(wav),{encoding:FileSystem.EncodingType.Base64});}
      if(!alive.current||token!==generation.current){await remove(uri);return;}
      player.pause();player.replace({uri});player.volume=.35;await remove(output.current);output.current=uri;setPhase('ready');
    } catch(e) {
      if(alive.current&&token===generation.current){setError(e instanceof Error&&e.message==='SILENT_INPUT'?'목소리가 잘 들리지 않았어요. 가까이에서 짧게 말해 주세요.':'소리를 만들지 못했어요. 마이크 권한을 확인하고 다시 시도해 주세요.');setPhase('idle');}
    } finally {busy.current=false;await remove(raw);if(token===generation.current)frames.current=[];}
  };
  const start=async()=>{
    if(busy.current||active.current)return;
    busy.current=true;const token=++generation.current;setError(null);setDenied(false);player.pause();
    try {
      const permission=await AudioModule.requestRecordingPermissionsAsync();
      if(!alive.current||token!==generation.current)return;
      if(!permission.granted){setDenied(true);return;}
      await setAudioModeAsync({allowsRecording:true,playsInSilentMode:true});await recorder.prepareToRecordAsync();
      if(!alive.current||token!==generation.current){await recorder.stop();return;}
      frames.current=[];active.current=true;recorder.record();setPhase('recording');timer.current=setTimeout(()=>void stop(),6000);
    } catch {if(alive.current){setError('마이크를 시작하지 못했어요. 다른 녹음 앱을 닫고 다시 시도해 주세요.');setPhase('idle');}}
    finally {busy.current=false;}
  };
  return <Screen title={'내 말이\n야옹이 되는 순간.'} subtitle="YOUR TURN, HUMAN">
    <View style={{alignItems:'center',marginBottom:22}}><Image source={require('../assets/mewvoice-icon.png')} style={{width:210,height:210,borderRadius:45}} accessibilityLabel="야옹하는 뮤 보이스 고양이" /></View>
    <Card><Badge>목소리로 만드는 야옹</Badge><Heading>{phase==='recording'?`말씀해 주세요 · ${(state.durationMillis/1000).toFixed(1)} / 6초`:phase==='ready'?'야옹이 준비됐어요!':'고양이에게 한마디 건네볼까요?'}</Heading>
      <Body>말의 길이와 강약, 쉼을 따라 놀이용 고양이 소리를 만들어요. 녹음은 이 기기에서만 처리하고 변환 후 지워요.</Body>
      {phase==='recording'?<Button title="녹음 끝내고 야옹 만들기" icon="stop" onPress={()=>void stop()} />:<Button title={phase==='ready'?'다시 말하기':'눌러서 말하기'} icon="mic" busy={phase==='working'} onPress={()=>void start()} />}
      {phase==='ready'&&<Button title={playback.playing?'재생 멈추기':'야옹 들어보기'} icon={playback.playing?'pause':'play'} onPress={()=>{if(playback.playing)player.pause();else void player.seekTo(0).then(()=>player.play()).catch(()=>setError('재생하지 못했어요. 다시 녹음해 주세요.'));}} />}
    </Card>
    {denied&&<Card><Body>녹음하려면 마이크 권한이 필요해요.</Body>{Platform.OS!=='web'&&<Button title="설정 열기" secondary onPress={()=>void Linking.openSettings()} />}</Card>}
    <ErrorNote message={error}/><Body muted>실제 고양이 언어 번역은 아니에요. 작은 소리로 짧게 들려주고, 고양이가 불편해하면 멈춰 주세요.</Body>
    <Button title="닫기" secondary onPress={()=>router.back()} />
  </Screen>;
}
