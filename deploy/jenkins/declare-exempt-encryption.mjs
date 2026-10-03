// User confirmed 2026-09-10: only HTTPS/OS security; global distribution including France.
// Use only after the same facts have been confirmed for the target release.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createSign } from 'node:crypto';
const buildId=process.argv[2];
if(!/^[a-f0-9-]{36}$/i.test(buildId||''))throw new Error('A specific inspected build ID is required');
const config=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.mimi-seed/appstore.json'),'utf8'));
const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const now=Math.floor(Date.now()/1000);
const unsigned=`${b64({alg:'ES256',kid:config.keyId,typ:'JWT'})}.${b64({iss:config.issuerId,iat:now,exp:now+300,aud:'appstoreconnect-v1'})}`;
const sig=createSign('SHA256').update(unsigned).sign({key:config.privateKey,dsaEncoding:'ieee-p1363'},'base64url');
const headers={Authorization:`Bearer ${unsigned}.${sig}`,'Content-Type':'application/json'};
const base='https://api.appstoreconnect.apple.com/v1';
async function call(url,method='GET',body){
  const result=await fetch(url,{method,headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
  const data=await result.json();
  if(!result.ok)throw new Error(`Apple HTTP ${result.status}: ${data.errors?.map(e=>e.detail).join('; ')}`);
  return data;
}
const app=await call(`${base}/builds/${buildId}/app`);
if(app.data.id!=='6760902018'||app.data.attributes.bundleId!=='gg.pryzm.union')throw new Error('Unexpected app identity');
await call(`${base}/builds/${buildId}`,'PATCH',{data:{type:'builds',id:buildId,attributes:{usesNonExemptEncryption:false}}});
const verified=await call(`${base}/builds/${buildId}`);
process.stdout.write(JSON.stringify({id:buildId,version:verified.data.attributes.version,usesNonExemptEncryption:verified.data.attributes.usesNonExemptEncryption}));
