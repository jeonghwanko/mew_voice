// Capture the actual release UI on disposable simulators using the existing CI agent.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const native=path.join(root,'ios'),out=path.join(root,'artifacts');
process.env.NODE_ENV='production';
execFileSync('pod',['install'],{cwd:native,stdio:'inherit',timeout:180000});
const run=(cmd,args)=>execFileSync(cmd,args,{cwd:native,encoding:'utf8',maxBuffer:20*1024*1024});
const inventory=JSON.parse(run('xcrun',['simctl','list','--json']));
const runtime=inventory.runtimes.filter(r=>r.isAvailable&&r.identifier.includes('.iOS-')).sort((a,b)=>b.version.localeCompare(a.version,undefined,{numeric:true}))[0];
if(!runtime)throw new Error('No installed iOS Simulator runtime');
const workspace=fs.readdirSync(native).find(n=>n.endsWith('.xcworkspace'));
const scheme=fs.readdirSync(native).find(n=>n.endsWith('.xcodeproj'))?.replace(/\.xcodeproj$/,'');
if(!workspace||!scheme)throw new Error('Generated project missing');
const derived=path.join(native,'build/simulator');
execFileSync('xcodebuild',['-workspace',workspace,'-scheme',scheme,'-configuration','Release','-sdk','iphonesimulator','-destination','generic/platform=iOS Simulator','-derivedDataPath',derived,'-jobs','2',`ARCHS=${process.arch==='arm64'?'arm64':'x86_64'}`,'ONLY_ACTIVE_ARCH=YES','CODE_SIGNING_ALLOWED=NO','build'],{cwd:native,stdio:'inherit',timeout:600000});
const products=path.join(derived,'Build/Products/Release-iphonesimulator');
const app=fs.readdirSync(products).find(n=>n.endsWith('.app'));
if(!app)throw new Error('Simulator application missing');
const selected=[
  {kind:'iphone',type:inventory.devicetypes.find(d=>d.name==='iPhone 16 Pro Max')||inventory.devicetypes.find(d=>d.name==='iPhone 15 Pro Max')},
  {kind:'ipad',type:inventory.devicetypes.find(d=>d.name==='iPad Pro 13-inch (M4)')||inventory.devicetypes.find(d=>d.name.includes('iPad Pro (12.9-inch)'))},
];
const results=[];
for(const {kind,type} of selected){
  if(!type)throw new Error(`Simulator device type missing: ${kind}`);
  const id=run('xcrun',['simctl','create',`MewVoice CI ${process.env.BUILD_NUMBER}-${kind}`,type.identifier,runtime.identifier]).trim();
  try{
    run('xcrun',['simctl','boot',id]);run('xcrun',['simctl','bootstatus',id,'-b']);
    run('xcrun',['simctl','status_bar',id,'override','--time','9:41','--batteryState','charged','--batteryLevel','100']);
    run('xcrun',['simctl','install',id,path.join(products,app)]);
    run('xcrun',['simctl','launch',id,'gg.pryzm.union']);
    // Fresh iPad simulators show an Apple Intelligence welcome notification.
    // Let first-boot system banners expire before capturing the actual app.
    await new Promise(resolve=>setTimeout(resolve,45000));
    const file=`${kind}-welcome.png`;
    run('xcrun',['simctl','io',id,'screenshot',path.join(out,file)]);
    results.push({file,device:type.name,runtime:runtime.version,source:'native iOS Simulator release build'});
  }finally{try{run('xcrun',['simctl','shutdown',id]);}catch{}run('xcrun',['simctl','delete',id]);}
}
fs.writeFileSync(path.join(out,'screenshots.json'),JSON.stringify(results,null,2));
