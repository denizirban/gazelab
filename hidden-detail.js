"use strict";
(() => {
const openButton=document.getElementById("hiddenDetailStart");
if(!openButton)return;
const root=document.getElementById("hiddenDetailModal");
const body=root.querySelector(".hd-body");
const close=root.querySelector(".hd-close");
const targets=[
 {id:"owl",label:"the little owl",emoji:"◉"},
 {id:"key",label:"the golden key",emoji:"⚿"},
 {id:"fish",label:"the tiny fish",emoji:"◇"},
 {id:"moon",label:"the crescent moon",emoji:"☾"}
];
const motifs={
 owl:'<path d="M-9 -8 L-9 -17 L-2 -12 L2 -12 L9 -17 L9 -8 Q15 2 8 12 Q0 18 -8 12 Q-15 2 -9 -8Z" fill="currentColor"/><circle cx="-4" cy="-2" r="3.5" fill="#fff"/><circle cx="4" cy="-2" r="3.5" fill="#fff"/><circle cx="-4" cy="-2" r="1.5" fill="#1b2633"/><circle cx="4" cy="-2" r="1.5" fill="#1b2633"/><path d="M-2 4 L2 4 L0 8Z" fill="#e7b45a"/>',
 key:'<circle cx="-6" cy="-8" r="6" fill="none" stroke="currentColor" stroke-width="4"/><path d="M-2 -4 L12 11 M6 5 L10 1 M9 8 L13 4" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>',
 fish:'<path d="M-11 0 Q0 -14 12 0 Q0 14 -11 0 L-18 -8 L-18 8Z" fill="currentColor"/><circle cx="6" cy="-2" r="1.8" fill="#fff"/>',
 moon:'<path d="M8 -16 A16 16 0 1 0 8 16 A13 13 0 1 1 8 -16Z" fill="currentColor"/>',
 leaf:'<path d="M-12 12 Q-19 -13 12 -15 Q15 11 -12 12Z" fill="currentColor"/><path d="M-12 12 L8 -10" stroke="#fff" stroke-width="1.4" fill="none"/>',
 flower:'<g fill="currentColor"><ellipse cy="-9" rx="5" ry="9"/><ellipse cy="9" rx="5" ry="9"/><ellipse cx="-9" rx="9" ry="5"/><ellipse cx="9" rx="9" ry="5"/></g><circle r="5" fill="#f6d18c"/>',
 spiral:'<path d="M0 0 C-15 -12 -17 14 0 14 C23 14 22 -19 0 -19" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>',
 star:'<path d="M0 -17 L5 -5 L17 -5 L8 3 L11 16 L0 9 L-11 16 L-8 3 L-17 -5 L-5 -5Z" fill="currentColor"/>'
};
const palette=["#171717","#343434","#5b5b5b","#7c7c7c","#9d9d9d","#b6b6b6","#484848","#d1d1d1"];
let session=null,raf=0;
let eye=null;
let eyeCheckTimer=0;
let galleryToken=0;
let calibrationTimer=0;
const realArtworks=[
 {title:"The Great Wave off Kanagawa",artist:"Katsushika Hokusai",file:"The_Great_Wave_off_Kanagawa.jpg",source:"https://commons.wikimedia.org/wiki/File:The_Great_Wave_off_Kanagawa.jpg"},
 {title:"Girl with a Pearl Earring",artist:"Johannes Vermeer",file:"Girl_with_a_Pearl_Earring.jpg",source:"https://commons.wikimedia.org/wiki/File:Girl_with_a_Pearl_Earring.jpg"},
 {title:"The Starry Night",artist:"Vincent van Gogh",file:"Starry_Night.webp",source:"https://commons.wikimedia.org/wiki/File:Starry_Night.webp"}
];
function artworkUrl(art){return "https://commons.wikimedia.org/wiki/Special:FilePath/"+art.file+"?width=1000";}
async function loadRealArtwork(round){
 const art=session.artOrder[round%session.artOrder.length],url=artworkUrl(art);
 return await new Promise(resolve=>{
  const img=new Image();let done=false;
  const finish=ok=>{if(done)return;done=true;clearTimeout(timeout);resolve(ok?{art,img,url}:null);};
  const timeout=setTimeout(()=>finish(false),9000);
  img.onload=()=>finish(true);img.onerror=()=>finish(false);img.src=url;
 });
}
function buildRealScene(round,loaded){
 const {art,img,url}=loaded,random=rand((session.seed+round*2027)>>>0);
 const width=700,height=480;
 const ratio=Math.max(width/img.naturalWidth,height/img.naturalHeight);
 const dw=img.naturalWidth*ratio,dh=img.naturalHeight*ratio;
 const ox=(width-dw)/2,oy=(height-dh)/2;
 const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext("2d");ctx.drawImage(img,ox,oy,dw,dh);
 const size=[85,68,55,43][round],x=60+random()*(width-120),y=60+random()*(height-120);
 const patch=document.createElement("canvas");patch.width=120;patch.height=120;
 patch.getContext("2d").drawImage(canvas,x-size/2,y-size/2,size,size,0,0,120,120);
 const svg='<svg class="hd-artwork" viewBox="0 0 700 480" role="img" aria-label="Public domain painting with a hidden detail" preserveAspectRatio="xMidYMid meet"><image href="'+url.replaceAll("&","&amp;")+'" x="'+ox+'" y="'+oy+'" width="'+dw+'" height="'+dh+'"/></svg>';
 return {svg,target:{x,y,r:size*.48},count:0,seed:session.seed,real:true,art,patch,canvas,size};
}

function solve3(a,b){
 const m=a.map((row,i)=>[...row,b[i]]);
 for(let c=0;c<3;c++){let pivot=c;for(let r=c+1;r<3;r++)if(Math.abs(m[r][c])>Math.abs(m[pivot][c]))pivot=r;
 if(Math.abs(m[pivot][c])<1e-10)return null;
 [m[c],m[pivot]]=[m[pivot],m[c]];
 const scale=m[c][c];for(let j=c;j<4;j++)m[c][j]/=scale;
 for(let r=0;r<3;r++)if(r!==c){const k=m[r][c];for(let j=c;j<4;j++)m[r][j]-=k*m[c][j];}
 }
 return m.map(row=>row[3]);
}
function fitGaze(points){
 const A=[[0,0,0],[0,0,0],[0,0,0]],bx=[0,0,0],by=[0,0,0];
 for(const p of points){const v=[1,p.f[0],p.f[1]];for(let i=0;i<3;i++){bx[i]+=v[i]*p.p[0];by[i]+=v[i]*p.p[1];for(let j=0;j<3;j++)A[i][j]+=v[i]*v[j];}}
 for(let i=0;i<3;i++)A[i][i]+=0.00001;
 const cx=solve3(A,bx),cy=solve3(A,by);
 return cx&&cy?{cx,cy}:null;
}
function predictGaze(model,f){
 if(!model||!f||!f.every(Number.isFinite))return null;
 const x=model.cx[0]+model.cx[1]*f[0]+model.cx[2]*f[1],y=model.cy[0]+model.cy[1]*f[0]+model.cy[2]*f[1];
 if(!Number.isFinite(x+y))return null;
 return {x:Math.round(x*10000)/10000,y:Math.round(y*10000)/10000};
}
function runCalibration(){
 clearInterval(calibrationTimer);
 if(!eye){startGame();return;}
 const training=[[.12,.15],[.5,.15],[.88,.15],[.12,.5],[.5,.5],[.88,.5],[.12,.85],[.5,.85],[.88,.85]];
 const validation=[[.28,.32],[.74,.3],[.47,.67],[.26,.73],[.75,.74]];
 const steps=[...training,...validation];
 const samples=[],errors=[];
 let index=0;
 body.replaceChildren();
 const label=el("div","hd-kicker","EYE TRACKING / CALIBRATION");
 const title=el("h2","hd-title","Follow the dot.");
 const text=el("p","hd-description","Keep your phone steady and look directly at each dot until it moves. Nine training targets, then five new validation targets.");
 const area=el("div","hd-calibration-area");
 const dot=el("div","hd-calibration-dot");area.append(dot);
 const progress=el("div","hd-eye-status","");
 const skip=button("Use touch only",()=>{clearInterval(calibrationTimer);stopEyes();startGame();},true);
 body.append(label,title,text,area,progress,skip);
 const token=galleryToken;
 let started=performance.now(),bucket=[];
 function step(){
  if(!eye||root.hidden||token!==galleryToken){clearInterval(calibrationTimer);return;}
  if(index>=steps.length){clearInterval(calibrationTimer);finish();return;}
  const point=steps[index],now=performance.now(),elapsed=now-started;
  dot.style.left=(point[0]*100)+"%";dot.style.top=(point[1]*100)+"%";
  const validationMode=index>=training.length;
  label.textContent=validationMode?"INDEPENDENT VALIDATION":"9-POINT CALIBRATION";
  progress.textContent=(validationMode?"Validation "+(index-8)+" / 5":"Calibration "+(index+1)+" / 9");
  if(elapsed>420&&eye.latest&&now-eye.latest.t<450)bucket.push([eye.latest.x,eye.latest.y]);
  if(elapsed>=1900){
   if(bucket.length>=5){
    const sortedX=bucket.map(p=>p[0]).sort((a,b)=>a-b),sortedY=bucket.map(p=>p[1]).sort((a,b)=>a-b);
    const f=[sortedX[Math.floor(sortedX.length/2)],sortedY[Math.floor(sortedY.length/2)]];
    if(validationMode)errors.push({p:point,f});else samples.push({p:point,f});
   }else if(validationMode)errors.push({p:point,f:null});
   index++;bucket=[];started=now;
  }
 }
 calibrationTimer=setInterval(step,110);step();
 function finish(){
  const model=samples.length>=7?fitGaze(samples):null;
  const distances=errors.map(p=>{const q=p.f&&model?predictGaze(model,p.f):null;return q?Math.hypot(q.x-p.p[0],q.y-p.p[1])/Math.SQRT2*100:null;});
  const valid=distances.filter(Number.isFinite).sort((a,b)=>a-b);
  const median=valid.length?valid[Math.floor(valid.length/2)]:null;
  const max=valid.length?valid[valid.length-1]:null;
  const passed=!!model&&samples.length>=7&&valid.length>=4&&median<=12&&max<=22;
  eye.calibration=model?{...model,passed,validationMedianErrorPct:median===null?null:Math.round(median*10)/10,validationMaxErrorPct:max===null?null:Math.round(max*10)/10,trainingPoints:samples.length,validationPoints:valid.length}:null;
  body.replaceChildren();
  body.append(el("div","hd-kicker","VALIDATION RESULTS"),el("h2","hd-title",passed?"Gaze map ready.":"Calibration needs improvement."));
  body.append(el("p","hd-description",median===null?"Not enough valid samples.":("Median validation error: "+median.toFixed(1)+"% of screen diagonal. Maximum: "+max.toFixed(1)+"%. Acceptance requires median ≤12%, maximum ≤22%, and four valid validation points.")));
  body.append(el("p","hd-note",passed?"Experimental gaze coordinates will be saved in normalized screen space. This does not establish clinical-grade accuracy.":"No gaze coordinates will be exported from this attempt. You can retry or continue with iris signal and touch data."));
  body.append(button("Continue to gallery",startGame),button("Retry calibration",runCalibration,true),button("Touch only",()=>{stopEyes();startGame();},true));
 }
}

function eyeCheck(){
 clearInterval(eyeCheckTimer);
 if(!eye){startGame();return;}
 body.replaceChildren();
 const kicker=el("div","hd-kicker","CAMERA / SIGNAL CHECK");
 const title=el("h2","hd-title","First, find your eyes.");
 const desc=el("p","hd-description","Position your face inside the frame. The indicator shows whether both irises are detected. This checks tracking availability, not gaze accuracy.");
 const frame=el("div","hd-camera-check");
 const preview=eye.video;preview.className="hd-check-video";frame.append(preview);
 const oval=el("div","hd-check-oval");frame.append(oval);
 const status=el("div","hd-eye-status","Checking face and iris landmarks…");
 const next=button("Calibrate gaze (9 points)",()=>{clearInterval(eyeCheckTimer);runCalibration();});next.disabled=true;
 const retry=button("Continue without eye data",()=>{clearInterval(eyeCheckTimer);stopEyes();startGame();},true);
 body.append(kicker,title,desc,frame,status,next,retry);
 let valid=0,attempts=0;
 eyeCheckTimer=setInterval(()=>{
  if(!eye){clearInterval(checkTimer);return;}
  attempts++;
  const good=eye.lastDetected&&performance.now()-eye.lastDetected<750;
  valid=good?valid+1:0;
  oval.classList.toggle("good",!!good);
  status.textContent=good?"Both irises detected · "+Math.min(100,Math.round(valid/6*100))+"% signal check":"Face or iris landmarks not detected. Improve lighting and face the camera.";
  if(valid>=6){next.disabled=false;status.textContent="Eye signal detected. Ready for the gallery.";clearInterval(checkTimer);}
  if(attempts>90){clearInterval(checkTimer);status.textContent="Signal check timed out. You can continue without eye tracking.";}
 },180);
}

async function enableEyes(){
 if(eye)return true;
 let stream,model;
 try{
  stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:"user",width:{ideal:640},height:{ideal:480}}});
  const video=document.createElement("video");video.muted=true;video.playsInline=true;video.srcObject=stream;await video.play();
  const base="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304";
  const mp=await import(base+"/vision_bundle.mjs");
  const vision=await mp.FilesetResolver.forVisionTasks(base+"/wasm");
  const opts={baseOptions:{modelAssetPath:"https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",delegate:"GPU"},runningMode:"VIDEO",numFaces:1};
  try{model=await mp.FaceLandmarker.createFromOptions(vision,opts);}
  catch(_){opts.baseOptions.delegate="CPU";model=await mp.FaceLandmarker.createFromOptions(vision,opts);}
  eye={stream,video,model,timer:0,start:0,samples:[]};
  eye.timer=setInterval(collectEyes,125);
  return true;
 }catch(_){if(model)model.close();if(stream)stream.getTracks().forEach(t=>t.stop());return false;}
}
function stopEyes(){
 if(!eye)return;
 clearInterval(eye.timer);
 eye.stream.getTracks().forEach(t=>t.stop());
 try{eye.model.close();}catch(_){}
 eye.video.srcObject=null;eye=null;
}
function collectEyes(){
 if(!eye||eye.video.readyState<2)return;
 const now=performance.now();
 try{
  const lm=eye.model.detectForVideo(eye.video,now).faceLandmarks?.[0];
  let x=null,y=null,head=null;
  if(lm&&lm.length>=478){
   const iris=(p,a,b)=>{
    const A=lm[a],B=lm[b],P=lm[p],dx=B.x-A.x,dy=B.y-A.y,d=dx*dx+dy*dy;
    return d>.0002?{x:((P.x-(A.x+B.x)/2)*dx+(P.y-(A.y+B.y)/2)*dy)/d,y:((P.y-(A.y+B.y)/2)*dx-(P.x-(A.x+B.x)/2)*dy)/d}:null;
   };
   const a=iris(468,33,133),b=iris(473,362,263);
   if(a!==null&&b!==null&&Number.isFinite(a+b)){x=Math.round((a.x+b.x)*5000)/10000;y=Math.round((a.y+b.y)*5000)/10000;eye.lastDetected=now;}
   head=Math.round((lm[33].x+lm[263].x)*5000)/10000;
  }
  eye.latest=x===null?null:{x,y,t:now};if(eye.start)eye.samples.push({t:Math.round(now-eye.start),x,y,head});
 }catch(_){}
}
function beginEyeRound(){if(eye){eye.samples=[];eye.start=performance.now();}}
function endEyeRound(record){
 if(!eye){record.eyeTracking={status:"off"};return;}
 const data=eye.samples;eye.samples=[];eye.start=0;
 const valid=data.filter(p=>p.x!==null);
 const gaps=[];for(let i=1;i<valid.length;i++)gaps.push(valid[i].t-valid[i-1].t);
 const xs=valid.map(p=>p.x),hs=valid.map(p=>p.head).filter(Number.isFinite);
 record.eyeTracking={
  status:valid.length>=10?"exploratory":"insufficient",
  sampleCount:data.length,validCount:valid.length,
  coveragePercent:data.length?Math.round(100*valid.length/data.length):0,
 approximateSampleRateHz:data.length>1?Math.round(1000*(data.length-1)/Math.max(1,data[data.length-1].t-data[0].t)*10)/10:null,
 longestValidSampleGapMs:gaps.length?Math.max(...gaps):null,
  horizontalSignalRange:xs.length?Math.max(...xs)-Math.min(...xs):null,
  headMovementRange:hs.length?Math.max(...hs)-Math.min(...hs):null,
  samples:data.map(p=>({t:p.t,x:p.x,y:p.y,gaze:eye.calibration?.passed&&p.x!==null&&p.y!==null?predictGaze(eye.calibration,[p.x,p.y]):null})),
  calibration:eye.calibration?{passed:eye.calibration.passed,validationMedianErrorPct:eye.calibration.validationMedianErrorPct,validationMaxErrorPct:eye.calibration.validationMaxErrorPct}:null,
  note:"Exploratory camera gaze estimate only when independently validated; not a clinical or reference-grade measurement."
 };
}

const rand=(seed)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
function stopClock(){if(raf)cancelAnimationFrame(raf);raf=0;}
function shutdown(){clearInterval(calibrationTimer);galleryToken++;clearInterval(eyeCheckTimer);stopClock();stopEyes();root.hidden=true;document.body.classList.remove("hd-lock");session=null;openButton.focus();}
function button(text,fn,secondary=false){const b=el("button",secondary?"hd-button hd-secondary":"hd-button",text);b.type="button";b.addEventListener("click",fn);return b;}
function showIntro(){
 body.replaceChildren();
 const kicker=el("div","hd-kicker","IRISPECTRA / ART × ATTENTION");
 const title=el("h2","hd-title","The Hidden Detail");
 const desc=el("p","hd-description","A visual search experiment disguised as an art mystery. Discover how efficiently you find a detail inside increasingly complex scenes.");
 const sample=el("div","hd-intro-art");
 sample.innerHTML='<svg viewBox="0 0 560 140" aria-hidden="true"><rect width="560" height="140" rx="16" fill="#171717"/><circle cx="96" cy="70" r="45" fill="#ededed"/><path d="M210 30 Q260 90 210 120 Q160 90 210 30" fill="#999999"/><path d="M320 30 Q400 65 320 110 Q270 65 320 30" fill="#555555"/><circle cx="466" cy="70" r="43" fill="#343434"/><path d="M466 43 A27 27 0 1 0 466 97 A20 20 0 1 1 466 43Z" fill="#ffffff"/></svg>';
 const note=el("p","hd-note","Discover hidden fragments inside real, public-domain masterpieces. Artwork order and target fragments change between sessions. Camera is optional.");
 const opt=el("label","hd-eye-toggle");const check=document.createElement("input");check.type="checkbox";opt.append(check,document.createTextNode(" Include experimental eye movement data"));
 const caution=el("p","hd-note","Optional camera-based iris signal, processed on-device. No camera frames are saved. This is not precise gaze localization.");
 const launch=button("Enter the gallery",async()=>{launch.disabled=true;if(check.checked&&!await enableEyes()){caution.textContent="Camera unavailable. Uncheck eye tracking to continue.";launch.disabled=false;return;}if(check.checked)eyeCheck();else startGame();});
 body.append(kicker,title,desc,sample,note,opt,caution,launch);
}
function startGame(){
 const seed=(globalThis.crypto?.getRandomValues?crypto.getRandomValues(new Uint32Array(1))[0]:Date.now()>>>0);
 const random=rand(seed);
 const order=[...targets];for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
 const artOrder=[...realArtworks];for(let i=artOrder.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[artOrder[i],artOrder[j]]=[artOrder[j],artOrder[i]];}session={id:Date.now().toString(36),round:0,results:[],started:Date.now(),seed,order,artOrder};nextRound();
}
function buildArtwork(round,targetId){
 const seed=((session.seed+round*8171+Math.floor(Math.random()*0xffffffff))>>>0);
 const random=rand(seed);
 const count=[38,62,88,118][round]+Math.floor(random()*9);
 const targetIndex=Math.floor(random()*count);
 const kinds=Object.keys(motifs).filter(k=>k!==targetId);
 const target={x:0,y:0,r:0};
 let svg='<svg class="hd-artwork" viewBox="0 0 700 480" role="img" aria-label="Decorative artwork containing the hidden target" preserveAspectRatio="xMidYMid meet"><defs><radialGradient id="hdsky"><stop stop-color="#3c3c3c"/><stop offset="1" stop-color="#111111"/></radialGradient><pattern id="hdgrain" width="39" height="37" patternUnits="userSpaceOnUse"><circle cx="5" cy="8" r="1" fill="#fff" opacity=".12"/><circle cx="26" cy="28" r=".7" fill="#fff" opacity=".12"/></pattern></defs><rect width="700" height="480" fill="url(#hdsky)"/><circle cx="350" cy="220" r="170" fill="none" stroke="#9d9d9d" stroke-width="1.5" opacity=".35"/><circle cx="350" cy="220" r="210" fill="none" stroke="#cba66f" stroke-width="1" opacity=".2"/>';
 for(let i=0;i<18;i++){
 const x=Math.floor(random()*700),y=Math.floor(random()*480),radius=10+random()*65;
 svg+='<circle cx="'+x+'" cy="'+y+'" r="'+radius.toFixed(1)+'" fill="none" stroke="'+palette[Math.floor(random()*palette.length)]+'" opacity=".14" stroke-width="2"/>';
 }
 const cells=[];for(let y=0;y<8;y++)for(let x=0;x<12;x++)cells.push({x:35+x*58,y:32+y*59});
 for(let i=cells.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}
 for(let i=0;i<count;i++){
 const p=cells[i%cells.length];
 const x=p.x+(random()-.5)*22,y=p.y+(random()-.5)*19;
 const isTarget=i===targetIndex;
 const kind=isTarget?targetId:kinds[Math.floor(random()*kinds.length)];
 const scale=(isTarget?.78:.65+random()*.55)*(round>=2?.85:1);
 const color=isTarget?"#dcdcdc":palette[Math.floor(random()*palette.length)];
 const rot=Math.floor(random()*360);
 svg+='<g transform="translate('+x.toFixed(1)+' '+y.toFixed(1)+') rotate('+rot+') scale('+scale.toFixed(2)+')" style="color:'+color+'">'+motifs[kind]+'</g>';
 if(isTarget){target.x=x;target.y=y;target.r=22*scale+9;}
 }
 svg+='<rect width="700" height="480" fill="url(#hdgrain)" pointer-events="none"/><rect x="10" y="10" width="680" height="460" rx="7" fill="none" stroke="#aaaaaa" opacity=".6" stroke-width="2"/></svg>';
 return {svg,target,seed,count};
}
async function nextRound(){
 stopClock();if(!session)return;
 const round=session.round;
 const token=++galleryToken;
 if(round>=4){showResults();return;}
 const item=session.order[round];
 body.replaceChildren(el("p","hd-note","Preparing your artwork…"));
 const loaded=await loadRealArtwork(round);
 if(!session||session.round!==round||root.hidden||token!==galleryToken)return;
 const scene=loaded?buildRealScene(round,loaded):buildArtwork(round,item.id);
 const record={round:round+1,target:scene.real?"painting fragment":item.id,artwork:scene.real?{title:scene.art.title,artist:scene.art.artist,source:scene.art.source}:null,distractorCount:scene.real?null:scene.count-1,seed:scene.seed,correct:false,misses:0,searchTimeMs:null,attempts:[]};
 session.active={record,scene,start:0,paused:false};
 body.replaceChildren();
 const head=el("div","hd-round-head");
 const label=el("div","hd-kicker","GALLERY "+String(round+1).padStart(2,"0")+" / 04");
 const time=el("div","hd-timer","0.0s");
 head.append(label,time);
 const title=el("h2","hd-round-title",scene.real?"Find this detail.":"Find "+item.label+".");
 const help=el("p","hd-help",scene.real?scene.art.artist+" · "+scene.art.title:"Explore the artwork. Tap the detail when you find it.");
 const art=el("div","hd-art-shell");
 art.innerHTML=scene.svg;
 const svg=art.querySelector("svg");
 const feedback=el("div","hd-feedback","Tap the artwork to select a detail.");
 const signal=el("div","hd-live-signal",eye?"● Eye signal: checking":"Touch-only mode");
 const bottom=el("div","hd-round-actions");
 const skip=button("Skip artwork",()=>finishRound(false,true),true);
 bottom.append(skip);if(eye)bottom.append(signal);
 if(scene.real){const targetCard=el("div","hd-fragment");targetCard.append(el("span","","FIND THIS FRAGMENT"),scene.patch);body.append(head,title,help,targetCard,art,feedback,bottom);}else body.append(head,title,help,art,feedback,bottom);
 const start=performance.now();session.active.start=start;beginEyeRound();
 function clock(now){
  if(!session||session.active?.record!==record)return;
  time.textContent=((now-start)/1000).toFixed(1)+"s";
  if(eye){
   const seen=eye.lastDetected&&now-eye.lastDetected<900;
   signal.textContent=seen?"● Eye signal active":"○ Eye signal lost";
   signal.classList.toggle("hd-signal-ok",!!seen);
  }
  raf=requestAnimationFrame(clock);
 }
 raf=requestAnimationFrame(clock);
 svg.addEventListener("click",e=>{
  if(!session||session.active?.record!==record||record.correct)return;
  const matrix=svg.getScreenCTM();if(!matrix)return;
  const point=svg.createSVGPoint();point.x=e.clientX;point.y=e.clientY;
  const local=point.matrixTransform(matrix.inverse());
  const x=local.x,y=local.y;
  const distance=Math.hypot(x-scene.target.x,y-scene.target.y);
  const correct=scene.real?(Math.abs(x-scene.target.x)<=scene.size*.55&&Math.abs(y-scene.target.y)<=scene.size*.55):distance<=Math.max(scene.target.r,17);
  record.attempts.push({x:Math.round(x),y:Math.round(y),elapsedMs:Math.round(performance.now()-start),correct});
  if(correct){record.correct=true;record.searchTimeMs=Math.round(performance.now()-start);finishRound(true,false);}
  else{record.misses++;feedback.textContent="Not quite. Keep looking — "+record.misses+" missed "+(record.misses===1?"tap":"taps")+".";
   const flash=el("div","hd-miss");flash.style.left=(x/7)+"%";flash.style.top=(y/4.8)+"%";art.append(flash);setTimeout(()=>flash.remove(),450);
  }
 });
}
function finishRound(found,skipped){
 if(!session)return;stopClock();
 const {record,scene}=session.active;
 record.skipped=!!skipped;record.correct=found;endEyeRound(record);
 if(record.searchTimeMs===null)record.searchTimeMs=Math.round(performance.now()-session.active.start);
 session.results.push(record);
 body.replaceChildren();
 const kicker=el("div","hd-kicker","ARTWORK "+record.round+" / 4");
 const title=el("h2","hd-title",found?"Detail discovered.":"The detail was here.");
 const subtitle=el("p","hd-description",found?"Found in "+(record.searchTimeMs/1000).toFixed(1)+" seconds · "+record.misses+" missed taps.":"This artwork was skipped. Skipped rounds are not scored as successful searches.");
 const reveal=el("div","hd-reveal");
 reveal.innerHTML=scene.svg;
 const svg=reveal.querySelector("svg");
 const ns="http://www.w3.org/2000/svg";
 const ring=document.createElementNS(ns,"circle");ring.setAttribute("cx",scene.target.x);ring.setAttribute("cy",scene.target.y);ring.setAttribute("r",scene.real?scene.size*.7:29);ring.setAttribute("fill","none");ring.setAttribute("stroke","#f5d783");ring.setAttribute("stroke-width","5");ring.setAttribute("class","hd-target-ring");svg.append(ring);
 if(scene.real)subtitle.textContent+=(found?" ":" ")+" "+scene.art.artist+" · "+scene.art.title;body.append(kicker,title,subtitle,reveal,button(session.round===3?"See my results":"Next artwork",()=>{session.round++;nextRound();}));
}
function showResults(){
 if(!session)return;clearInterval(eyeCheckTimer);const calibrationSummary=eye?.calibration?{passed:eye.calibration.passed,medianErrorPct:eye.calibration.validationMedianErrorPct}:null;stopEyes();body.replaceChildren();
 const rows=session.results,success=rows.filter(r=>r.correct),mean=success.length?success.reduce((a,r)=>a+r.searchTimeMs,0)/success.length/1000:null;
 const kicker=el("div","hd-kicker","YOUR VISUAL SEARCH PROFILE");
 const title=el("h2","hd-title","The gallery, through your eyes.");
 const note=el("p","hd-description","A snapshot of how you searched, not a test of neurological health.");
 const stats=el("div","hd-stats");
 [["Found",success.length+" / 4"],["Average find time",mean===null?"—":mean.toFixed(1)+"s"],["Missed taps",rows.reduce((a,r)=>a+r.misses,0)]].forEach(([label,value])=>{const card=el("div","hd-stat");card.append(el("strong","",value),el("span","",label));stats.append(card);});
 const detail=el("div","hd-results-list");
 rows.forEach(r=>{const line=el("div","hd-result-line");line.append(el("span","",String(r.round).padStart(2,"0")+" · "+(r.artwork?r.artwork.title:session.order[r.round-1].label)),el("strong","",r.correct?(r.searchTimeMs/1000).toFixed(1)+"s":"Skipped"));detail.append(line);});
 const explain=el("p","hd-note","Measured: touch-based target localization, response time and missed taps. Not measured: precise eye fixation, saccades, or Alzheimer's/Parkinson's risk. Repeated play introduces learning effects.");
 const actions=el("div","hd-result-actions");
 actions.append(button("Play another gallery",startGame),button("Export session JSON",exportData,true));
 const good=rows.filter(r=>r.eyeTracking?.status==="exploratory");
 const avgCoverage=good.length?Math.round(good.reduce((sum,r)=>sum+r.eyeTracking.coveragePercent,0)/good.length):null;
 const eyeInfo=el("div","hd-eye-report");
 if(calibrationSummary)eyeInfo.append(el("p","",calibrationSummary.passed?"Independent validation passed · median "+calibrationSummary.medianErrorPct+"% of viewport diagonal.":"Independent validation failed · gaze coordinates excluded."));
 eyeInfo.append(el("strong","","Eye signal quality"),el("p","",good.length?good.length+" / 4 rounds recorded · "+avgCoverage+"% mean valid sample coverage.":"Eye data unavailable or below the minimum sample count."));
 const caveat=el("p","hd-note","Camera gaze estimates are experimental, and independent screen validation does not make them clinical or reference-grade measurements.");
 eyeInfo.append(caveat);
 const sources=el("div","hd-art-credits");
 sources.append(el("strong","","Artworks & credits"));
 rows.forEach(r=>{if(!r.artwork)return;const a=document.createElement("a");a.href=r.artwork.source;a.target="_blank";a.rel="noopener noreferrer";a.textContent=r.artwork.artist+" · "+r.artwork.title;sources.append(a);});
 body.append(kicker,title,note,stats,detail,eyeInfo,sources,explain,actions);
}
function exportData(){
 if(!session)return;
 const payload={experiment:"The Hidden Detail",version:"2.0-calibrated-gaze",sessionId:session.id,startedAt:new Date(session.started).toISOString(),mode:"touch-visual-search",results:session.results,disclaimer:"Non-clinical visual-search game. Not a validated diagnostic measure. Screen-position estimates are exported only after independent validation; no diagnostic interpretation."};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="irispectra-hidden-detail-"+session.id+".json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
openButton.addEventListener("click",()=>{root.hidden=false;document.body.classList.add("hd-lock");showIntro();});
close.addEventListener("click",shutdown);
root.addEventListener("click",e=>{if(e.target===root)shutdown();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!root.hidden)shutdown();});
})();