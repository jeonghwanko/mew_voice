import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '../../../..');
const brand = JSON.parse(await fs.readFile(path.join(root, 'brands/mewvo/brand.json'), 'utf8'));
const campaign = JSON.parse(await fs.readFile(path.join(dir, 'campaign.json'), 'utf8'));
if (brand.revision !== campaign.brandRevision) throw new Error('Campaign needs review for the current brand revision');
const icon = pathToFileURL(path.join(root, brand.assets.icon.path)).href;
const font = pathToFileURL(path.join(root, 'apps/api/public/fonts/BlackHanSans-Regular.woff2')).href;
const esc = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const lines = s => esc(s).replaceAll('\n', '<br>');
const style = `@font-face{font-family:Black;src:url('${font}')}*{box-sizing:border-box}body{margin:0;font-family:Arial,'Malgun Gothic',sans-serif;color:#302016}.poster{width:1080px;height:1920px;position:relative;overflow:hidden;background:#ff8b25;padding:82px 78px}.brand{font-size:38px;font-weight:900;letter-spacing:-1px;display:flex;align-items:center;gap:18px}.brand img{width:65px;height:65px;border:3px solid #302016;border-radius:18px}.eyebrow{font-size:27px;font-weight:700;margin:58px 0 24px;letter-spacing:2px}h1{font-family:Black,Arial,sans-serif;font-weight:400;font-size:126px;line-height:1.12;letter-spacing:-5px;margin:0;position:relative;z-index:2}.body{font-size:33px;font-weight:600;line-height:1.6;margin-top:35px;position:relative;z-index:2}.mascot{position:absolute;width:850px;height:850px;left:115px;top:865px;border-radius:65px;transform:rotate(-5deg);box-shadow:14px 16px 0 #302016;border:5px solid #302016}.bubble{position:absolute;top:835px;right:65px;background:#fff8ec;border:4px solid #302016;border-radius:30px;padding:25px 31px;font-size:30px;font-weight:800;z-index:3;transform:rotate(4deg)}.footer{position:absolute;bottom:74px;left:78px;font-size:24px;font-weight:800;letter-spacing:1px}.num{position:absolute;right:78px;bottom:70px;font-size:25px;font-weight:800}.p2{background:#fff8ec}.p2 .mascot{top:880px;transform:rotate(5deg);width:800px;height:800px;left:138px}.p2 .bubble{background:#ff8b25;transform:rotate(-4deg)}.p3{background:#302016;color:#fff8ec}.p3 .mascot{box-shadow:14px 16px 0 #ff8b25;transform:rotate(-3deg)}.p3 .bubble{color:#302016;background:#fff8ec}.p3 h1{color:#ff9a40}.en h1{font-size:136px;letter-spacing:-4px}.en .bubble{font-size:27px}.en .body{font-size:31px}.en .bubble{top:925px}.en .mascot{top:1000px;width:750px;height:750px;left:160px}.feature{width:1024px;height:500px;background:#ff8b25;padding:45px;position:relative;overflow:hidden}.feature .brand{font-size:25px}.feature h1{font-size:65px;letter-spacing:-2px;line-height:1.15;margin-top:36px}.feature>img{position:absolute;width:425px;height:425px;right:32px;top:38px;border:4px solid #302016;border-radius:45px;transform:rotate(4deg)}.feature .desc{font-size:20px;margin-top:22px;font-weight:700}`;
const doc = (lang, html) => `<!doctype html><html lang="${lang}"><meta charset="utf-8"><style>${style}</style><body>${html}</body></html>`;
const browser = await chromium.launch({headless:true,channel:'chrome'});
const page = await browser.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
const outputs = [];
async function capture(name, html, width, height) {
  const file = path.join(dir, `${name}.html`);
  await fs.writeFile(file, html);
  await page.setViewportSize({width,height});
  await page.goto(pathToFileURL(file).href);
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
  await page.screenshot({path:path.join(dir,`${name}.png`)});
  outputs.push({file:`${name}.png`,width,height});
}
try {
  for (const [locale, slides] of Object.entries(campaign.locales)) {
    for (const [i,s] of slides.entries()) {
      const html=doc(locale,`<main class="poster p${i+1} ${locale}"><div class="brand"><img src="${icon}">${esc(brand.identity.names[locale])}</div><div class="eyebrow">${esc(s.eyebrow)}</div><h1>${lines(s.title)}</h1><div class="body">${lines(s.body)}</div><img class="mascot" src="${icon}"><div class="bubble">${esc(s.bubble)}</div><div class="footer">${esc(s.footer)}</div><div class="num">0${i+1} / 03</div></main>`);
      await capture(`${locale}-${s.id}`,html,1080,1920);
    }
    const title=locale==='ko'?'집사야, 이제<br>말이 통하냥?':'Human,<br>speak meow.';
    await capture(`${locale}-feature`,doc(locale,`<main class="feature"><div class="brand">${esc(brand.identity.names[locale])}</div><h1>${title}</h1><div class="desc">${esc(campaign.locales[locale][0].eyebrow)}</div><img src="${icon}"></main>`),1024,500);
  }
  for(const size of [512,1024]) await capture(`icon-${size}`,doc('en',`<img src="${icon}" style="display:block;width:${size}px;height:${size}px">`),size,size);
  const thumbs=outputs.filter(o=>/0[123]-/.test(o.file)).map(o=>`<figure><img src="${o.file}" style="width:300px;height:auto"><figcaption>${o.file}</figcaption></figure>`).join('');
  const gallery=`<!doctype html><meta charset="utf-8"><style>body{background:#ece8df;font-family:Arial,'Malgun Gothic';margin:40px;color:#302016}section{display:grid;grid-template-columns:repeat(3,300px);gap:22px}figure{margin:0}figcaption{padding:10px;font-size:13px}</style><h1>MewVoice · 마켓 이미지 시안</h1><p>브랜드 revision ${brand.revision} · 홍보 콘셉트 / 실제 앱 스크린샷 아님</p><section>${thumbs}</section>`;
  await fs.writeFile(path.join(dir,'index.html'),gallery);
  await page.setViewportSize({width:1024,height:1320});
  await page.goto(pathToFileURL(path.join(dir,'index.html')).href);
  await page.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode()));});
  await page.screenshot({path:path.join(dir,'contact-sheet.png'),fullPage:true});
  await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify({brandRevision:brand.revision,status:campaign.status,kind:campaign.kind,outputs},null,2));
  process.stdout.write(JSON.stringify({outputs:outputs.length,directory:dir}));
} finally { await browser.close(); }
