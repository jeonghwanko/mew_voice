/** Local playful sound synthesis; never a semantic translation. */
export type VoiceFrame = { timeMs: number; db: number };
const RATE = 22050;
export function voicePhrases(frames: VoiceFrame[]) {
  const active = frames.filter(f => Number.isFinite(f.timeMs) && Number.isFinite(f.db) && f.timeMs >= 0 && f.timeMs <= 6500 && f.db > -43).sort((a,b) => a.timeMs-b.timeMs);
  if (active.length < 3) throw new Error('SILENT_INPUT');
  const phrases: { start: number; end: number; strength: number }[] = [];
  for (const f of active) {
    const last = phrases.at(-1);
    if (last && f.timeMs-last.end < 320) { last.end=f.timeMs; last.strength=Math.max(last.strength,f.db); }
    else phrases.push({ start:f.timeMs,end:f.timeMs,strength:f.db });
  }
  return phrases.filter(p=>p.end-p.start>=100).slice(0,6);
}
export function makeMeow(frames: VoiceFrame[]): Uint8Array {
  const phrases=voicePhrases(frames);
  if (!phrases.length) throw new Error('SILENT_INPUT');
  const chunks: Float32Array[]=[];
  for (const [index,p] of phrases.entries()) {
    const duration=Math.min(1.15,Math.max(.35,(p.end-p.start)/1500));
    const samples=new Float32Array(Math.ceil((duration+.18)*RATE));
    let phase=0;
    for(let i=0;i<duration*RATE;i++) {
      const t=i/RATE,u=t/duration;
      const pitch=(440+index%3*45)*(1+.7*Math.sin(Math.PI*u)*Math.exp(-u))*(1-.32*u);
      phase+=2*Math.PI*pitch/RATE;
      const f1=550+700*Math.sin(Math.PI*u),f2=2100-1000*u;
      let value=0,weight=0;
      for(let h=1;h<=9;h++) {
        const hz=pitch*h;
        const gain=(.12+Math.exp(-Math.pow((hz-f1)/350,2))+.55*Math.exp(-Math.pow((hz-f2)/500,2)))/Math.sqrt(h);
        value+=Math.sin(h*phase+.09*Math.sin(2*Math.PI*27*t))*gain;weight+=gain;
      }
      const attack=Math.min(1,t/.04),release=Math.min(1,(duration-t)/.09),strength=.65+.35*Math.min(1,Math.max(0,(p.strength+43)/35));
      samples[i]=.3*strength*attack*release*Math.pow(Math.sin(Math.PI*u),.4)*value/weight;
    }
    chunks.push(samples);
  }
  const count=chunks.reduce((n,c)=>n+c.length,0),bytes=new Uint8Array(44+count*2),view=new DataView(bytes.buffer);
  const ascii=(offset:number,value:string)=>{for(let i=0;i<value.length;i++)bytes[offset+i]=value.charCodeAt(i);};
  ascii(0,'RIFF');view.setUint32(4,36+count*2,true);ascii(8,'WAVE');ascii(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,RATE,true);view.setUint32(28,RATE*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);ascii(36,'data');view.setUint32(40,count*2,true);
  let offset=44;for(const chunk of chunks)for(const sample of chunk){view.setInt16(offset,Math.round(sample*32767),true);offset+=2;}
  return bytes;
}
export function wavBase64(bytes:Uint8Array) {
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let output='';
  for(let i=0;i<bytes.length;i+=3){const v=(bytes[i]<<16)|((bytes[i+1]??0)<<8)|(bytes[i+2]??0);output+=alphabet[v>>>18]+alphabet[(v>>>12)&63]+(i+1<bytes.length?alphabet[(v>>>6)&63]:'=')+(i+2<bytes.length?alphabet[v&63]:'=');}
  return output;
}
