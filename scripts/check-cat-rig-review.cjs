const {chromium}=require('playwright');
const fs=require('node:fs/promises');
const path=require('node:path');
(async()=>{
 const dir=path.resolve('apps/mobile/assets/avatar/references/quadruped');
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.goto('http://localhost:8092/cat-rig-review/index.html');
  for(const model of ['milo','free']) {
   if(model==='free')await page.selectOption('#model','free');
   await page.waitForFunction(()=>!document.getElementById('controls').disabled,null,{timeout:60000});
   const inventory=JSON.parse(await page.locator('#inventory').textContent());
   await fs.writeFile(path.join(dir,model+'-public-animations.json'),JSON.stringify(inventory,null,2));
   const clip=inventory.animations.find(a=>/walk_forward|run/i.test(a[1]))||inventory.animations[0];
   await page.selectOption('#clips',clip[0]);
   await page.selectOption('#speed','0.25');
   await page.click('#play');await page.waitForTimeout(1500);await page.click('#pause');
   await page.screenshot({path:path.join(dir,model+'-review.png'),fullPage:true});
   process.stdout.write(JSON.stringify({model,clips:inventory.animations.map(a=>a[1])})+'\n');
  }
 } finally {await browser.close();}
})().catch(e=>{process.stderr.write(e.stack);process.exitCode=1;});
