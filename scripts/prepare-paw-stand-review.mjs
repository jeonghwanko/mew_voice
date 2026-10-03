import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('.'),out=path.join(root,'dist/web/cat-paw-stand');
await fs.mkdir(out,{recursive:true});
await fs.cp(path.join(root,'dist/web/cat-motion/vendor'),path.join(out,'vendor'),{recursive:true});
await fs.copyFile(path.join(root,'assets/avatar/references/paw-stand-junction/paw-stand-finished.glb'),path.join(out,'stand-junction3.glb'));
await fs.copyFile(path.join(root,'assets/avatar/references/paw-stand-weights-finished/paw-stand-finished.glb'),path.join(out,'stand-weights4.glb'));
await fs.writeFile(path.join(out,'index.html'),`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>뒷다리 · 앉기와 서기</title>
<style>body{margin:0;background:#eeeae3;color:#293b37;font:16px system-ui}header{padding:18px;max-width:1100px;margin:auto}h1{font-size:24px;margin:0}p{line-height:1.6;margin:10px 0}canvas{display:block;width:100%;height:64vh}button{padding:10px 16px;margin:3px;border:1px solid #bbc6be;border-radius:9px;background:white;font:inherit}input{width:min(60vw,400px)}small{display:block;line-height:1.7;color:#57665f}</style>
<header><h1>앉기 → 서기 → 다시 앉기</h1><button id="compare">이전 조형과 비교</button><span id="revision"></span><p>발끝을 고정한 채 뒤꿈치를 들고, 발목·하퇴·허벅지를 펴는 뒷다리 작업본입니다.</p>
<button id="play">동작 재생</button><button data-time="0">앉기</button><button data-time="1.27">중간</button><button data-time="2">서기</button><button data-time="4.2">다시 앉기</button><br>
<button data-view="side">옆</button><button data-view="back">뒤</button><button data-view="quarter">사선</button><button id="bones">관절 보기</button>
<label>진행 <input id="time" type="range" min="0" max="4.6667" step="0.01" value="0"></label><span id="phase">앉은 자세</span><small id="status">모델 로딩 중…</small></header>
<canvas id="view"></canvas><header><small>현재는 뒷몸통 연구 모델입니다. 전체 V13 고양이·앞다리·머리와 연결하지 않았습니다. 하퇴 단면을 줄이고 발목 윤곽을 다듬었습니다. 허벅지 접합부와 전신 연결은 추가 작업이 필요합니다.</small><a href="/cat-paw-rig/index.html?review=fit2">발가락 마감 기준 보기</a></header>
<script type="importmap">{"imports":{"three":"./vendor/three.module.js"}}</script><script type="module" src="review.js?v=weights4"></script></html>`);
await fs.writeFile(path.join(out,'review.js'),`import * as THREE from 'three';
import {GLTFLoader} from './vendor/loaders/GLTFLoader.js';
import {OrbitControls} from './vendor/controls/OrbitControls.js';
const params=new URLSearchParams(location.search),previous=params.get('model')==='previous';document.querySelector('#revision').textContent=previous?'이전: junction3':'수정: 관절 거리 기반 가중치';
const canvas=document.querySelector('canvas'),renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;
const scene=new THREE.Scene();scene.background=new THREE.Color('#eeeae3');const camera=new THREE.PerspectiveCamera(34,1,.01,100);camera.up.set(0,0,1);
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.minDistance=.5;controls.maxDistance=4;
function view(name){controls.target.set(0,-.06,.45);camera.position.set(...({side:[2.05,0,.52],back:[0,2.05,.52],quarter:[1.4,-1.8,1.0]}[name]));}view(params.get('view')||'quarter');if(params.has('camera'))camera.position.fromArray(params.get('camera').split(',').map(Number));if(params.has('target'))controls.target.fromArray(params.get('target').split(',').map(Number));
scene.add(new THREE.HemisphereLight(0xffffff,0x888888,2));for(const pos of [[1,-2,3],[-2,1,2]]){const l=new THREE.DirectionalLight(0xffffff,2);l.position.set(...pos);l.castShadow=true;l.shadow.mapSize.set(1024,1024);l.shadow.camera.left=-1.5;l.shadow.camera.right=1.5;l.shadow.camera.top=1.5;l.shadow.camera.bottom=-1.5;l.shadow.camera.near=.1;l.shadow.camera.far=10;l.shadow.normalBias=.003;scene.add(l);}
const ground=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshStandardMaterial({color:0xe4e2d9,roughness:1}));ground.position.z=.008;ground.receiveShadow=true;scene.add(ground);
let mixer,helper,playing=false,time=0,duration=140/30;const clock=new THREE.Clock();
function seek(t){time=Math.min(duration,Math.max(0,t));mixer?.setTime(time);document.querySelector('#time').value=time;document.querySelector('#phase').textContent=time<.5?'앉은 자세':time<2?'일어서기':time<2.67?'서 있는 자세':time<4.17?'다시 앉기':'최초 자세';}
new GLTFLoader().load(previous?'./stand-junction3.glb':'./stand-weights4.glb',g=>{for(const c of g.animations){const start=Math.min(...c.tracks.map(t=>t.times[0]));for(const track of c.tracks)track.times=Float32Array.from(track.times,t=>t-start);c.resetDuration();}
const wrapper=new THREE.Group();wrapper.rotation.x=Math.PI/2;wrapper.add(g.scene);scene.add(wrapper);g.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.material.roughness=.85;o.material.metalness=0;}});
mixer=new THREE.AnimationMixer(g.scene);g.animations.forEach(c=>mixer.clipAction(c).play());duration=g.animations[0].duration;document.querySelector('#time').max=duration;
helper=new THREE.SkeletonHelper(g.scene);helper.visible=false;helper.material.depthTest=false;helper.renderOrder=10;scene.add(helper);seek(Number(params.get("time")||0));
document.querySelector('#status').textContent='로드 완료 · 17개 뼈 · 약 4.7초 · 드래그 회전 / 스크롤 확대';window.standReview={mixer,scene:g.scene,clips:g.animations,seek};},undefined,e=>document.querySelector('#status').textContent='모델 로드 실패');
document.querySelector('#compare').onclick=()=>{const q=new URLSearchParams({model:previous?'current':'previous',time:String(time),camera:camera.position.toArray().join(','),target:controls.target.toArray().join(','),review:'weights4'});location.search=q.toString();};
document.querySelector('#play').onclick=()=>{playing=!playing;document.querySelector('#play').textContent=playing?'정지':'동작 재생';};
document.querySelector('#time').oninput=e=>{playing=false;seek(Number(e.target.value));document.querySelector('#play').textContent='동작 재생';};
document.querySelectorAll('[data-time]').forEach(b=>b.onclick=()=>{playing=false;seek(Number(b.dataset.time));document.querySelector('#play').textContent='동작 재생';});
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));document.querySelector('#bones').onclick=()=>{if(helper)helper.visible=!helper.visible;};
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}window.addEventListener('resize',resize);resize();
renderer.setAnimationLoop(()=>{const dt=clock.getDelta();if(playing&&mixer)seek((time+dt)%duration);controls.update();renderer.render(scene,camera);});
`);
process.stdout.write('http://localhost:8092/cat-paw-stand/index.html\n');
