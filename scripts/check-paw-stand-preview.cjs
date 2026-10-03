// Run after prepare-paw-stand-review.mjs against the local review server.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
async function main(){
 const out=path.resolve(process.argv[2]||'apps/mobile/assets/avatar/references/paw-stand-junction');
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1100,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8092/cat-paw-stand/index.html?view=back&review=junction3');
  await page.waitForFunction(()=>window.standReview);
  async function sample(t){return page.evaluate(async t=>{
   const THREE=await import('/cat-paw-stand/vendor/three.module.js');
   const {scene,seek}=window.standReview;seek(t);scene.updateWorldMatrix(true,true);
   const values=[];
   scene.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();const v=new THREE.Vector3();
    for(let i=0;i<o.geometry.attributes.position.count;i+=83){o.getVertexPosition(i,v);v.applyMatrix4(o.matrixWorld);values.push(v.x,v.y,v.z);}
   }});return values;
  },t);}
  const start=await sample(0),standing=await sample(2),end=await sample(4.3);
  await sample(2);await page.waitForTimeout(500);await page.screenshot({path:path.join(out,'browser-back.png')});
  await page.click('#compare');await page.waitForFunction(()=>window.standReview&&new URLSearchParams(location.search).get('model')==='previous');
  const retained=await page.locator('#time').inputValue(),previousStanding=await sample(2),previousStart=await sample(0);
  const diff=(a,b)=>Math.max(...a.map((x,i)=>Math.abs(x-b[i])));
  const audit={sampledVertices:start.length/3,returnError:diff(start,end),seatedChangeFromPrevious:diff(start,previousStart),standingChangeFromPrevious:diff(standing,previousStanding),compareRetainedTime:retained,errors};
  fs.writeFileSync(path.join(out,'browser-audit.json'),JSON.stringify(audit,null,2));
  process.stdout.write(JSON.stringify(audit));
  if(audit.returnError>1e-6||audit.seatedChangeFromPrevious>1e-6||errors.length)process.exitCode=1;
 } finally {await browser.close();}
}
main().catch(e=>{process.stderr.write(e.stack);process.exitCode=1;});
