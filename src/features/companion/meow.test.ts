import { makeMeow, voicePhrases, wavBase64 } from './meow';
const phrase=(start:number,length:number)=>Array.from({length},(_,i)=>({timeMs:start+i*100,db:-20}));
test('silence and malformed measurements never produce a pretend response',()=>{
  for(const input of [[],[{timeMs:0,db:NaN}],[{timeMs:Infinity,db:0}],Array.from({length:20},(_,i)=>({timeMs:i*100,db:-70}))])expect(()=>makeMeow(input)).toThrow('SILENT_INPUT');
});
test('pauses separate phrases and long input stays bounded',()=>{
  expect(voicePhrases([...phrase(0,5),...phrase(1100,6)])).toHaveLength(2);
  const wav=makeMeow(phrase(0,10000));expect(wav.length).toBeLessThan(22050*2*8+44);
});
test('playable mono PCM is bounded, non-silent, and survives base64 transport',()=>{
  const bytes=makeMeow(phrase(0,15)),v=new DataView(bytes.buffer);
  expect(Buffer.from(bytes.slice(0,4)).toString()).toBe('RIFF');expect(v.getUint32(40,true)).toBe(bytes.length-44);expect(v.getUint16(22,true)).toBe(1);
  let max=0;for(let i=44;i<bytes.length;i+=2)max=Math.max(max,Math.abs(v.getInt16(i,true)));expect(max).toBeGreaterThan(100);expect(max).toBeLessThan(12000);
  expect(Buffer.from(wavBase64(bytes),'base64')).toEqual(Buffer.from(bytes));
});
