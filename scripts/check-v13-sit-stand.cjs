const {chromium}=require('playwright');
const fs=require('node:fs/promises');
(async()=>{
 const out='apps/mobile/assets/avatar/v13-sit-stand';
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1100,height:950}});const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://localhost:8092/cat-v13-sit-stand/index.html?view=side');
 await page.waitForFunction(()=>window.catReview,{timeout:60000});
 const clips=await page.evaluate(()=>window.catReview.clips);
 if(!clips.length)throw Error('Missing exported animation');
 await page.screenshot({path:out+'/browser-sit.png'});
 await page.locator('[data-action="stand"]').click();
 await page.waitForFunction(()=>document.querySelector('#time').value==='2');
 await page.screenshot({path:out+'/browser-stand.png'});
 await page.locator('[data-action="sit"]').click();
 await page.waitForFunction(()=>document.querySelector('#time').value==='0');
 await page.locator('[data-action="cycle"]').click();
 await page.waitForFunction(()=>document.querySelector('#time').value==='4');
 await page.locator('[data-action="stand"]').click();
 await page.waitForFunction(()=>document.querySelector('#time').value==='2');
 await page.locator('[data-action="sit"]').click();
 await page.waitForFunction(()=>document.querySelector('#time').value==='0');
 for(const view of ['front','back','quarter']){
  await page.locator('[data-view="'+view+'"]').click();await page.screenshot({path:out+'/browser-'+view+'.png'});
 }
 const audit=await page.evaluate(()=>{
  let skins=0,morphs=0;window.catReview.scene.traverse(o=>{if(o.isSkinnedMesh)skins++;if(o.morphTargetInfluences?.length)morphs++});
  return {skins,morphs,finalTime:document.querySelector('#time').value};
 });
 if(errors.length||!audit.skins||!audit.morphs)throw Error(JSON.stringify({errors,audit}));
 await fs.writeFile(out+'/browser-audit.json',JSON.stringify({clips,...audit,errors,standSitCycleRepeat:true},null,2));
 await browser.close();
})().catch(e=>{process.stderr.write(String(e));process.exit(1)});
