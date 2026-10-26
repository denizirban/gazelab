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
let selectedEyeMode="left";
let galleryToken=0;
let calibrationTimer=0;
const realArtworks=[
 {title:"The Great Wave off Kanagawa",artist:"Katsushika Hokusai",file:"The_Great_Wave_off_Kanagawa.jpg",source:"https://commons.wikimedia.org/wiki/File:The_Great_Wave_off_Kanagawa.jpg"},
 {title:"Girl with a Pearl Earring",artist:"Johannes Vermeer",file:"Girl_with_a_Pearl_Earring.jpg",source:"https://commons.wikimedia.org/wiki/File:Girl_with_a_Pearl_Earring.jpg"},
 {title:"The Starry Night",artist:"Vincent van Gogh",file:"Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",source:"https://commons.wikimedia.org/wiki/File:Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg"},
 {title:"Mona Lisa",artist:"Leonardo da Vinci",file:"Mona_Lisa,_by_Leonardo_da_Vinci,_from_C2RMF_retouched.jpg",source:"https://commons.wikimedia.org/wiki/File:Mona_Lisa,_by_Leonardo_da_Vinci,_from_C2RMF_retouched.jpg"},
 {title:"The Birth of Venus",artist:"Sandro Botticelli",file:"Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg",source:"https://commons.wikimedia.org/wiki/File:Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg"},
 {title:"The Night Watch",artist:"Rembrandt",file:"The_Nightwatch_by_Rembrandt.jpg",source:"https://commons.wikimedia.org/wiki/File:The_Nightwatch_by_Rembrandt.jpg"},
 {title:"A Sunday Afternoon on the Island of La Grande Jatte",artist:"Georges Seurat",file:"A_Sunday_on_La_Grande_Jatte,_Georges_Seurat,_1884.jpg",source:"https://commons.wikimedia.org/wiki/File:A_Sunday_on_La_Grande_Jatte,_Georges_Seurat,_1884.jpg"}
];
function artworkUrl(art){return art.url||"https://commons.wikimedia.org/wiki/Special:FilePath/"+art.file+"?width=1000";}
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

function solveN(A,b){
 const n=b.length,m=A.map((r,i)=>[...r,b[i]]);
 for(let i=0;i<n;i++){
  let p=i;for(let j=i+1;j<n;j++)if(Math.abs(m[j][i])>Math.abs(m[p][i]))p=j;
  if(Math.abs(m[p][i])<1e-9)return null;
  [m[p],m[i]]=[m[i],m[p]];
  const v=m[i][i];for(let j=i;j<=n;j++)m[i][j]/=v;
  for(let k=0;k<n;k++)if(k!==i){const q=m[k][i];for(let j=i;j<=n;j++)m[k][j]-=q*m[i][j];}
 }
 return m.map(r=>r[n]);
}
function feature(frame,mode=selectedEyeMode){
 if(!frame?.head)return null;
 const v=mode==="left"?frame.left:mode==="right"?frame.right:{x:frame.x,y:frame.y};
 return v&&[v.x,v.y,frame.head.cx,frame.head.cy].every(Number.isFinite)?
 [v.x,v.y,frame.head.cx,frame.head.cy]:null;
}
function fitGaze(points){
 const n=5,A=Array.from({length:n},()=>Array(n).fill(0)),bx=Array(n).fill(0),by=Array(n).fill(0);
 if(points.length<n+2)return null;
 for(const p of points){const v=[1,...p.f];for(let i=0;i<n;i++){bx[i]+=v[i]*p.p[0];by[i]+=v[i]*p.p[1];for(let j=0;j<n;j++)A[i][j]+=v[i]*v[j];}}
 for(let i=1;i<n;i++)A[i][i]+=0.000001;
 const cx=solveN(A,bx),cy=solveN(A,by);return cx&&cy?{cx,cy,headCompensated:true}:null;
}
function predictGaze(model,f){
 if(!model||!f||f.length!==4)return null;
 const v=[1,...f],x=model.cx.reduce((a,b,i)=>a+b*v[i],0),y=model.cy.reduce((a,b,i)=>a+b*v[i],0);
 return Number.isFinite(x+y)?{x:Math.round(x*10000)/10000,y:Math.round(y*10000)/10000}:null;
}
function runCalibration(){
 clearInterval(calibrationTimer);
 if(!eye){startGame();return;}
 const training=[[.12,.15],[.88,.15],[.5,.5],[.12,.85],[.88,.85],[.5,.15],[.5,.85]];
 const validation=[[.28,.32],[.74,.3],[.47,.67]];
 const steps=[...training,...validation];
 const samples=[],errors=[];
 const calibrationMode=selectedEyeMode;
 let index=0;
 body.replaceChildren();
 const label=el("div","hd-kicker","EYE TRACKING / CALIBRATION");
 const title=el("h2","hd-title","Follow the dot.");
 const text=el("p","hd-description","Keep your phone steady and look directly at each dot until it moves. Seven quick training targets, then three independent validation targets.");
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
  label.textContent=validationMode?"INDEPENDENT VALIDATION":"QUICK ART CALIBRATION";
  progress.textContent=(validationMode?"Validation "+(index-training.length+1)+" / "+validation.length:"Calibration "+(index+1)+" / "+training.length);
  if(elapsed>250&&eye.latest&&now-eye.latest.t<450){const f=feature(eye.latest,calibrationMode);if(f)bucket.push(f);}
  if(elapsed>=1250){
   if(bucket.length>=5){
    const f=[0,1,2,3].map(j=>{const a=bucket.map(p=>p[j]).sort((a,b)=>a-b);return a[Math.floor(a.length/2)];});
    const bounds=area.getBoundingClientRect();const screenPoint=[(bounds.left+point[0]*bounds.width)/innerWidth,(bounds.top+point[1]*bounds.height)/innerHeight];
    if(validationMode)errors.push({p:screenPoint,f});else samples.push({p:screenPoint,f});
   }else if(validationMode)errors.push({p:point,f:null});
   index++;bucket=[];started=now;
  }
 }
 calibrationTimer=setInterval(step,110);step();
 function finish(){
  const model=samples.length>=7?fitGaze(samples):null;
  if(model)model.eyeMode=calibrationMode;
  const distances=errors.map(p=>{const q=p.f&&model?predictGaze(model,p.f):null;return q?Math.hypot(q.x-p.p[0],q.y-p.p[1])/Math.SQRT2*100:null;});
  const valid=distances.filter(Number.isFinite).sort((a,b)=>a-b);
  const median=valid.length?valid[Math.floor(valid.length/2)]:null;
  const max=valid.length?valid[valid.length-1]:null;
  const passed=!!model&&samples.length>=7&&valid.length>=3&&median<=12&&max<=22;
  eye.calibration=model?{...model,passed,validationMedianErrorPct:median===null?null:Math.round(median*10)/10,validationMaxErrorPct:max===null?null:Math.round(max*10)/10,trainingPoints:samples.length,validationPoints:valid.length}:null;
  body.replaceChildren();
  body.append(el("div","hd-kicker","VALIDATION RESULTS"),el("h2","hd-title",passed?"Gaze map ready.":"Calibration needs improvement."));
  body.append(el("p","hd-description",median===null?"Not enough valid samples.":("Median validation error: "+median.toFixed(1)+"% of screen diagonal. Maximum: "+max.toFixed(1)+"%. Acceptance requires median ≤12%, maximum ≤22%, and three valid validation points.")));
  body.append(el("p","hd-note",passed?"Experimental gaze coordinates will be saved in normalized screen space. This does not establish clinical-grade accuracy.":"No gaze coordinates will be exported from this attempt. You can retry or continue with iris signal and touch data."));
  body.append(button("Continue to gallery",startGame),button("Retry calibration",runCalibration,true),button("Touch only",()=>{stopEyes();startGame();},true));
 }
}

function runEyeMovementTest(){
 clearInterval(eyeCheckTimer);clearInterval(calibrationTimer);
 if(!eye){showIntro();return;}
 const steps=[
  {name:"CENTER",x:.5,y:.5},{name:"LEFT",x:.17,y:.5},{name:"RIGHT",x:.83,y:.5},
  {name:"CENTER",x:.5,y:.5},{name:"UP",x:.5,y:.17},{name:"DOWN",x:.5,y:.83},
  {name:"CENTER",x:.5,y:.5}
 ];
 const readings=[];let index=0,bucket=[],started=performance.now(),lastSampleT=0;const trace=[];const stepWindows=[];let previousHash=null,changedFrames=0,observedFrames=0;
 const label=el("div","hd-kicker","SINGLE EYE / SIGNAL DIAGNOSTIC");
 const title=el("h2","hd-title","Follow the moving target.");
 const note=el("p","hd-description","Follow each dot with your eyes, not your head. Live X/Y measurements below should change as you look around. If they stay flat, calibration cannot be trusted.");
 const area=el("div","hd-calibration-area"),dot=el("div","hd-calibration-dot");
 const status=el("p","hd-eye-status","Waiting for eye signal…");
 const live=el("div","hd-eye-status","Live iris movement: waiting…");
 const meter=el("div","hd-eye-status","Horizontal: — · Vertical: — · Head: —");
 const liveSamples=[];
 const chart=document.createElement("canvas");chart.width=640;chart.height=240;chart.style.cssText="display:block;width:100%;height:150px;border-radius:12px;background:#f2f2f2";
 const graphCtx=chart.getContext("2d");
 const drawGraph=()=>{graphCtx.clearRect(0,0,640,240);graphCtx.strokeStyle="#ccc";graphCtx.beginPath();graphCtx.moveTo(0,120);graphCtx.lineTo(640,120);graphCtx.stroke();for(const [axis,color] of [["x","#176b63"],["y","#b05d2c"]]){const vals=trace.slice(-90);if(vals.length<2)continue;const min=Math.min(...vals.map(v=>v[axis])),max=Math.max(...vals.map(v=>v[axis]));graphCtx.strokeStyle=color;graphCtx.lineWidth=3;graphCtx.beginPath();vals.forEach((v,i)=>{const px=i/89*640,py=220-(v[axis]-min)/Math.max(.015,max-min)*200;i?graphCtx.lineTo(px,py):graphCtx.moveTo(px,py);});graphCtx.stroke();}graphCtx.font="18px sans-serif";graphCtx.fillStyle="#176b63";graphCtx.fillText("X horizontal",12,22);graphCtx.fillStyle="#b05d2c";graphCtx.fillText("Y vertical",170,22);};
 area.append(dot);body.replaceChildren(label,title,note,area,chart,live,meter,status,button("Back to eye check",()=>{clearInterval(calibrationTimer);eyeCheck();},true));
 const mode=selectedEyeMode,token=galleryToken;
 calibrationTimer=setInterval(()=>{
  if(!eye||root.hidden||galleryToken!==token){clearInterval(calibrationTimer);return;}
  const step=steps[index],now=performance.now();
  if(!step){clearInterval(calibrationTimer);finish();return;}
  dot.style.left=step.x*100+"%";dot.style.top=step.y*100+"%";
  status.textContent="Target "+(index+1)+" / "+steps.length+" · "+step.name+" · "+bucket.length+" samples";
  const f=feature(eye.latest,mode);
  if(f&&now-eye.latest.t<400){
   liveSamples.push({x:f[0],y:f[1],hx:f[2],hy:f[3]});
   if(liveSamples.length>12)liveSamples.shift();
   const base=liveSamples[0],sx=f[0]-base.x,sy=f[1]-base.y;
   live.textContent="Live iris signal · X "+f[0].toFixed(3)+" · Y "+f[1].toFixed(3);
   meter.textContent="Change from recent baseline · horizontal "+sx.toFixed(3)+" · vertical "+sy.toFixed(3)+" · head "+Math.hypot(f[2]-base.hx,f[3]-base.hy).toFixed(3);
  }else{live.textContent="Eye signal lost — improve indirect lighting and keep eye visible.";}
  if(f&&now-started>350&&now-eye.latest.t<400&&eye.latest.t!==lastSampleT){lastSampleT=eye.latest.t;const sample={f,t:eye.latest.t,head:eye.latest.head,iris:mode==="right"?eye.latest.right:eye.latest.left};bucket.push(sample);const pix=eye.pixelSignal;if(pix&&Number.isFinite(pix.hash)){observedFrames++;if(previousHash!==null&&pix.hash!==previousHash)changedFrames++;previousHash=pix.hash;}trace.push({pixelHash:pix?.hash??null,pixelX:pix?.centerX??null,pixelY:pix?.centerY??null,pupilX:pix?.pupilCandidateX??null,pupilY:pix?.pupilCandidateY??null,videoTime:pix?.videoTime??null,pixelBrightness:pix?.brightness??null,t:sample.t,x:f[0],y:f[1],headX:f[2],headY:f[3],rawX:sample.iris?.rawX??null,rawY:sample.iris?.rawY??null,eyeWidth:sample.iris?.eyeWidth??null,eyeHeight:sample.iris?.eyeHeight??null,step:step.name});drawGraph();}
  if(now-started>=1600){
   stepWindows.push({name:step.name,start:started,end:now,count:bucket.length});
   const median=k=>{const values=bucket.map(p=>p.f[k]).sort((a,b)=>a-b);return values.length?values[Math.floor(values.length/2)]:null;};
   readings.push({name:step.name,x:median(0),y:median(1),headX:median(2),headY:median(3),samples:bucket.length,rawX:bucket.length?bucket[Math.floor(bucket.length/2)].iris?.rawX:null,rawY:bucket.length?bucket[Math.floor(bucket.length/2)].iris?.rawY:null,eyeHeight:bucket.length?bucket[Math.floor(bucket.length/2)].iris?.eyeHeight:null});
   index++;bucket=[];started=now;
  }
 },100);
 function finish(){
  const [center,left,right,center2,up,down,center3]=readings;
  const dx=left&&right&&left.x!==null&&right.x!==null?right.x-left.x:null;
  const dy=up&&down&&up.y!==null&&down.y!==null?down.y-up.y:null;
  const horizontal=dx===null?"unavailable":Math.abs(dx)<.04?"weak":dx>0?"positive":"negative";
  const vertical=dy===null?"unavailable":Math.abs(dy)<.06?"weak":dy>0?"positive":"negative";
  const centers=[center,center2,center3].filter(p=>p.x!==null&&p.y!==null);
  const drift=centers.length>=2?Math.hypot(centers[centers.length-1].x-centers[0].x,centers[centers.length-1].y-centers[0].y):null;
  const headDrift=centers.length>=2?Math.hypot(centers[centers.length-1].headX-centers[0].headX,centers[centers.length-1].headY-centers[0].headY):null;
  const coverage=readings.reduce((a,p)=>a+p.samples,0);
  eye.diagnostic={version:"single-eye-v6-high-resolution-pixel",eyeMode:mode,readings,horizontal,vertical,horizontalDelta:dx,verticalDelta:dy,centerDrift:drift,headDrift,sampleCount:coverage,trace,stepWindows,pixelChangedFrames:changedFrames,pixelObservedFrames:observedFrames,processingFps:eye.actualFps,uniqueSampleRateHz:trace.length>1?1000*(trace.length-1)/Math.max(1,trace[trace.length-1].t-trace[0].t):null};
  body.replaceChildren(el("div","hd-kicker","EYE SIGNAL / RESULTS"),el("h2","hd-title","Movement signal report."));
  const lines=[
   "Horizontal iris signal: "+horizontal+(dx===null?"":" (Δ "+dx.toFixed(3)+")"),
   "Vertical iris signal: "+vertical+(dy===null?"":" (Δ "+dy.toFixed(3)+")"),
   "Center repeatability: "+(drift===null?"unavailable":drift.toFixed(3)),
   "Head position change: "+(headDrift===null?"unavailable":headDrift.toFixed(3)),
   "Usable samples: "+coverage,
   "Iris opening (center): "+(center?.eyeHeight==null?"unavailable":center.eyeHeight.toFixed(4))
  ];
  lines.push("Eye image changed between frames: "+changedFrames+" / "+Math.max(0,observedFrames-1));
  lines.push("Unique camera samples per second: "+(eye.diagnostic.uniqueSampleRateHz?.toFixed(1)??"—"));
  lines.push("MediaPipe processing rate: "+(eye.actualFps?.toFixed(1)??"—")+" fps");
  lines.forEach(line=>body.append(el("p","hd-eye-status",line)));
  const positions=el("div","hd-eye-report");
  positions.append(el("strong","","Target-synchronized signal breakdown"));
  const fmt=v=>Number.isFinite(v)?v.toFixed(4):"—";
  readings.forEach((p,i)=>positions.append(el("p","",String(i+1).padStart(2,"0")+" · "+p.name+" · X "+fmt(p.x)+" · Y "+fmt(p.y)+" · raw X "+fmt(p.rawX)+" · raw Y "+fmt(p.rawY)+" · "+p.samples+" unique frames")));
  const horizontalRaw=Number.isFinite(left?.rawX)&&Number.isFinite(right?.rawX)?right.rawX-left.rawX:null;
  const verticalRaw=Number.isFinite(up?.rawY)&&Number.isFinite(down?.rawY)?down.rawY-up.rawY:null;
  const pixelMedian=(name,key)=>{const vals=trace.filter(p=>p.step===name&&Number.isFinite(p[key])).map(p=>p[key]).sort((a,b)=>a-b);return vals.length?vals[Math.floor(vals.length/2)]:null;};
  const pixelRows=el("div","hd-eye-report");
  pixelRows.append(el("strong","","V6 · High-resolution eye-image motion estimate"));
  for(const name of ["LEFT","RIGHT","UP","DOWN"]){
   const samples=trace.filter(p=>p.step===name&&Number.isFinite(p.pupilX));
   const med=k=>{const a=samples.map(p=>p[k]).filter(Number.isFinite).sort((a,b)=>a-b);return a.length?a[Math.floor(a.length/2)]:null;};
   pixelRows.append(el("p","",name+" · pixel X "+fmt(med("pupilX"))+" · pixel Y "+fmt(med("pupilY"))+" · "+samples.length+" frames"));
  }
  const pixelDx=Number.isFinite(pixelMedian("RIGHT","pupilX"))&&Number.isFinite(pixelMedian("LEFT","pupilX"))?pixelMedian("RIGHT","pupilX")-pixelMedian("LEFT","pupilX"):null;
  const pixelDy=Number.isFinite(pixelMedian("DOWN","pupilY"))&&Number.isFinite(pixelMedian("UP","pupilY"))?pixelMedian("DOWN","pupilY")-pixelMedian("UP","pupilY"):null;
  pixelRows.append(el("p","hd-note","Independent horizontal Δ "+fmt(pixelDx)+" · vertical Δ "+fmt(pixelDy)+". This higher-resolution dark-region estimate remains sensitive to shadows and eyelashes; it is not a validated pupil detector."));
  if(Math.abs(dx??0)<.004&&Number.isFinite(pixelDx)&&Math.abs(pixelDx)>.015)pixelRows.append(el("p","hd-note","Disagreement: image-based horizontal estimate changes while MediaPipe stays nearly fixed. Review landmark mapping and camera orientation."));
  else if(Math.abs(dx??0)<.004&&Math.abs(pixelDx??0)<.015)pixelRows.append(el("p","hd-note","Both methods show little horizontal separation. Verify target-following, eye crop and lighting before calibrating."));
  eye.diagnostic.independentPixel={horizontalDelta:pixelDx,verticalDelta:pixelDy,method:"high-resolution circular darkness search; unvalidated"};
  positions.append(pixelRows);
  positions.append(el("p","hd-note","Raw iris camera displacement · horizontal Δ "+fmt(horizontalRaw)+" · vertical Δ "+fmt(verticalRaw)+". Raw coordinates also include head motion; these are diagnostics, not gaze coordinates."));
  const px=trace.filter(p=>Number.isFinite(p.pixelX));const range=k=>px.length?Math.max(...px.map(p=>p[k]))-Math.min(...px.map(p=>p[k])):null;
  positions.append(el("p","hd-note","Independent eye-image dark-region range · X "+fmt(range("pixelX"))+" · Y "+fmt(range("pixelY"))+". This is an illumination-sensitive diagnostic, not a pupil measurement."));
  const diagnostic=changedFrames===0?"No changing eye-image pixels detected: check camera frame delivery.":Math.abs(dx||0)<.004&&Math.abs(dy||0)<.004?"Eye image changes but iris landmarks remain almost fixed: inspect landmark tracking or test timing.":"Eye image and landmarks both change; inspect target alignment and calibration.";
  positions.append(el("p","hd-note","Signal diagnostic: "+diagnostic));
  body.append(positions);
  body.append(chart,el("p","hd-note","Live signal trace: teal = horizontal iris X; orange = vertical iris Y. Each axis is scaled separately for visibility; graph shape alone does not prove tracking accuracy."));
  body.append(el("p","hd-note","Positive/negative describes camera coordinate direction, not whether screen gaze is accurate. Weak signals, head movement and center drift can explain failed calibration. This test does not validate gaze position."));
  body.append(button("Try quick calibration",runCalibration),button("Repeat movement test",runEyeMovementTest,true),button("Continue with touch only",()=>{stopEyes();startGame();},true));
  const download=button("Export diagnostic JSON",()=>{
   const blob=new Blob([JSON.stringify(eye?.diagnostic||{},null,2)],{type:"application/json"});
   const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="gazelab-eye-signal-test.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  },true);body.append(download);
 }
}
function eyeCameraMicroscope(){
 clearInterval(eyeCheckTimer);clearInterval(calibrationTimer);
 if(!eye){eyeCheck();return;}
 const label=el("div","hd-kicker","IRISPECTRA / EYE CAMERA MICROSCOPE");
 const title=el("h2","hd-title","See what the camera sees.");
 const note=el("p","hd-description","Live enlarged eye crop with MediaPipe landmarks. Move your eyes slowly left, right, up and down. The green dot should follow the iris. This is a diagnostic preview, not a validated gaze estimate.");
 const canvas=document.createElement("canvas");canvas.width=720;canvas.height=360;
 canvas.style.cssText="display:block;width:100%;max-width:720px;aspect-ratio:2/1;border-radius:14px;background:#111;object-fit:contain";
 const info=el("p","hd-eye-status","Waiting for landmarks…");
 const quality=el("p","hd-note","Use diffuse light facing your face. Never shine a flashlight directly into your eyes.");
 const switcher=button("Switch eye",()=>{selectedEyeMode=selectedEyeMode==="left"?"right":"left";if(eye)eye.mode=selectedEyeMode;},true);
 const back=button("Back to signal check",()=>{cancelAnimationFrame(microscopeFrame);eyeCheck();},true);
 const test=button("Run movement test",()=>{cancelAnimationFrame(microscopeFrame);runEyeMovementTest();});
 body.replaceChildren(label,title,note,canvas,info,quality,switcher,test,back);
 const ctx=canvas.getContext("2d");let microscopeFrame=0,prevX=null,prevY=null;
 const draw=()=>{
  if(!eye||root.hidden||!canvas.isConnected)return;
  const video=eye.video,lm=eye.lastLandmarks;
  ctx.fillStyle="#111";ctx.fillRect(0,0,720,360);
  const left=selectedEyeMode!=="right";
  const ids=left?[33,133,159,145,468]:[362,263,386,374,473];
  const pts=lm&&ids.every(i=>lm[i])?ids.map(i=>lm[i]):null;
  if(video.readyState>=2&&video.videoWidth&&video.videoHeight){
   const w=video.videoWidth,h=video.videoHeight;
   let cx=w*.5,cy=h*.43,sw=w*.48,sh=h*.24;
   if(pts){cx=(pts[0].x+pts[1].x)*w/2;cy=(pts[0].y+pts[1].y)*h/2;sw=Math.max(55,Math.hypot((pts[1].x-pts[0].x)*w,(pts[1].y-pts[0].y)*h)*2.7);sh=sw/2;}
   const sx=Math.max(0,Math.min(w-sw,cx-sw/2)),sy=Math.max(0,Math.min(h-sh,cy-sh/2));
   try{ctx.drawImage(video,sx,sy,sw,sh,0,0,720,360);}catch(_){}
   if(pts){
    pts.forEach((p,i)=>{const px=(p.x*w-sx)/sw*720,py=(p.y*h-sy)/sh*360;ctx.beginPath();ctx.arc(px,py,i===4?8:4,0,Math.PI*2);ctx.fillStyle=i===4?"#52edb2":"#ffd66e";ctx.fill();});
    const iris=left?eye.latest?.left:eye.latest?.right;
    const detected=!!iris&&performance.now()-(eye.latest?.t||0)<550;
    info.textContent=(left?"LEFT":"RIGHT")+" EYE · "+(detected?"IRIS DETECTED":"NO IRIS SIGNAL")+" · processing "+(eye.actualFps||0).toFixed(1)+" fps";
    quality.textContent=detected?"Iris X "+iris.x.toFixed(3)+" · Y "+iris.y.toFixed(3)+" · eye opening "+iris.eyeHeight.toFixed(3)+" · watch the green marker as your eye moves.":"Eye landmarks missing or stale. Try more even front lighting, a stable phone position, and moving slightly farther from the camera.";
    if(detected){prevX=iris.x;prevY=iris.y;}
   }else{info.textContent="FACE / EYE LANDMARKS NOT DETECTED · processing "+(eye.actualFps||0).toFixed(1)+" fps";quality.textContent="Make sure your full face is visible and softly lit. The camera crop cannot be positioned until landmarks are found.";}
  }
  microscopeFrame=requestAnimationFrame(draw);
 };
 microscopeFrame=requestAnimationFrame(draw);
}
function eyeCheck(){
 clearInterval(eyeCheckTimer);
 if(!eye){startGame();return;}
 body.replaceChildren();
 const kicker=el("div","hd-kicker","CAMERA / SIGNAL CHECK");
 const title=el("h2","hd-title","First, find your eyes.");
 const desc=el("p","hd-description","Keep both eyes open. The camera checks one iris signal, not the entire face as a target. Use soft indirect lighting; do not aim a flashlight into your eye.");
 const frame=el("div","hd-camera-check");
 const preview=eye.video;preview.className="hd-check-video";frame.append(preview);
 const oval=el("div","hd-check-oval");frame.append(oval);
 const status=el("div","hd-eye-status","Checking face and iris landmarks…");
 const picker=el("div","hd-eye-mode");
 const heading=el("p","hd-note","Single-eye focus uses the left iris by default. Keep both eyes open and use soft, indirect lighting.");
 const options=[["left","Left eye"],["right","Right eye"],["both","Both eyes"]];
 options.forEach(([value,label])=>{
  const b=button(label,()=>{selectedEyeMode=value;eye.mode=value;picker.querySelectorAll("button").forEach(n=>n.classList.toggle("hd-mode-selected",n===b));valid=0;next.disabled=true;});
  b.classList.toggle("hd-mode-selected",selectedEyeMode===value);picker.append(b);
 });
 eye.mode=selectedEyeMode;
 const next=button("Quick gaze calibration",()=>{clearInterval(eyeCheckTimer);runCalibration();});next.disabled=true;
 const retry=button("Continue without eye data",()=>{clearInterval(eyeCheckTimer);stopEyes();startGame();},true);
 const microscope=button("Open Eye Camera Microscope",()=>{clearInterval(eyeCheckTimer);eyeCameraMicroscope();});
 const diagnostic=button("Test eye movement first",()=>{clearInterval(eyeCheckTimer);runEyeMovementTest();},true);
 body.append(kicker,title,desc,frame,heading,status,microscope,diagnostic,next,retry);
 let valid=0,attempts=0;
 eyeCheckTimer=setInterval(()=>{
  if(!eye){clearInterval(eyeCheckTimer);return;}
  attempts++;
  const good=eye.lastDetected&&performance.now()-eye.lastDetected<750&&!!feature(eye.latest,selectedEyeMode);
  valid=good?valid+1:0;
  oval.classList.toggle("good",!!good);
  status.textContent=good?"Selected eye signal detected · "+Math.min(100,Math.round(valid/6*100))+"% signal check":"Face or iris landmarks not detected. Improve lighting and face the camera.";
  if(valid>=6){next.disabled=false;status.textContent="Eye signal detected. Ready for the gallery.";clearInterval(eyeCheckTimer);}
  if(attempts>90){clearInterval(eyeCheckTimer);status.textContent="Signal check timed out. You can continue without eye tracking.";}
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
  eye={stream,video,model,timer:0,start:0,samples:[],lastLandmarks:null,frames:0,lastFrameAt:0,actualFps:0};
  // iOS in-app browsers can expose requestVideoFrameCallback without ever
  // invoking it. Keep a timer watchdog, even when frame callbacks exist.
  eye.lastProcessedAt=0;
  eye.timer=setInterval(()=>{
   if(!eye||eye.video!==video||eye.processing)return;
   if(performance.now()-eye.lastProcessedAt<110)return;
   eye.processing=true;
   try{collectEyes();}finally{eye.processing=false;}
  },140);
  if(typeof video.requestVideoFrameCallback==="function"){
   const onFrame=()=>{
    if(!eye||eye.video!==video)return;
    eye.frameCallbackId=video.requestVideoFrameCallback(onFrame);
    if(eye.processing||performance.now()-eye.lastProcessedAt<110)return;
    eye.processing=true;
    try{collectEyes();}finally{eye.processing=false;}
   };
   try{eye.frameCallbackId=video.requestVideoFrameCallback(onFrame);}catch(_){}
  }
  return true;
 }catch(_){if(model)model.close();if(stream)stream.getTracks().forEach(t=>t.stop());return false;}
}
function stopEyes(){
 if(!eye)return;
 clearInterval(eye.timer);
 if(eye.frameCallbackId!=null&&eye.video.cancelVideoFrameCallback)eye.video.cancelVideoFrameCallback(eye.frameCallbackId);
 eye.stream.getTracks().forEach(t=>t.stop());
 try{eye.model.close();}catch(_){}
 eye.video.srcObject=null;eye=null;
}
function collectEyes(frameTime){
 if(!eye||eye.video.readyState<2)return;
 // video.currentTime can remain unchanged in some iOS embedded browsers.
 // A live video element is sampled by the watchdog regardless of that value.
 const now=performance.now();
 eye.lastProcessedAt=now;
 try{
  const lm=eye.model.detectForVideo(eye.video,now).faceLandmarks?.[0];
  eye.lastLandmarks=lm||null;
  // V6: high-resolution, eye-aligned image diagnostic independent of iris landmarks.
  // Eye corners position the crop; the iris landmark does not position the search ROI.
  if(!eye.pixelCanvas){eye.pixelCanvas=document.createElement("canvas");eye.pixelCanvas.width=128;eye.pixelCanvas.height=64;eye.pixelCtx=eye.pixelCanvas.getContext("2d",{willReadFrequently:true});}
  try{
   const v=eye.video,ctx=eye.pixelCtx,w=v.videoWidth,h=v.videoHeight;
   const ids=selectedEyeMode==="right"?[362,263,386,374]:[33,133,159,145];
   const pts=lm&&ids.every(i=>lm[i])?ids.map(i=>lm[i]):null;
   if(w&&h&&ctx&&pts){
    const cx=(pts[0].x+pts[1].x)*w/2,cy=(pts[2].y+pts[3].y)*h/2;
    const ew=Math.hypot((pts[1].x-pts[0].x)*w,(pts[1].y-pts[0].y)*h);
    const cw=Math.max(38,ew*1.45),ch=cw*.5;
    const sx=Math.max(0,Math.min(w-cw,cx-cw/2)),sy=Math.max(0,Math.min(h-ch,cy-ch/2));
    ctx.drawImage(v,sx,sy,Math.min(cw,w),Math.min(ch,h),0,0,128,64);
    const rgba=ctx.getImageData(0,0,128,64).data;
    const gray=new Float32Array(128*64);let hash=2166136261,lumSum=0;
    for(let y=0;y<64;y++)for(let x=0;x<128;x++){
     const i=(y*128+x)*4,l=.299*rgba[i]+.587*rgba[i+1]+.114*rgba[i+2];
     gray[y*128+x]=l;lumSum+=l;
     if(x%4===0&&y%4===0)hash=Math.imul(hash^(l/8|0),16777619)>>>0;
    }
    // Evaluate circular darkness in the central eye opening. Spatially smooth each
    // candidate to suppress eyelashes, reflections and single dark pixels.
    let best=Infinity,bestX=null,bestY=null,second=Infinity;
    for(let y=20;y<=44;y+=2)for(let x=31;x<=97;x+=2){
     let sum=0,count=0;
     for(let dy=-5;dy<=5;dy+=2)for(let dx=-5;dx<=5;dx+=2){
      if(dx*dx+dy*dy>30)continue;
      sum+=gray[(y+dy)*128+x+dx];count++;
     }
     const score=sum/count;
     if(score<best){second=best;best=score;bestX=x;bestY=y;}
     else if(score<second)second=score;
    }
    const brightness=lumSum/(128*64);
    const confidence=Number.isFinite(best)?Math.max(0,Math.min(1,(brightness-best)/Math.max(15,brightness)*1.7)):0;
    const previous=eye.pixelSignal;
    eye.pixelSignal={t:now,hash,changed:!!previous&&previous.hash!==hash,
      videoTime:v.currentTime,centerX:bestX/128,centerY:bestY/64,
      pupilCandidateX:confidence>.12?bestX/128:null,pupilCandidateY:confidence>.12?bestY/64:null,
      confidence,brightness,contrast:brightness-best,landmarksAvailable:true,
      method:"V6 high-resolution circular dark-region search; not validated pupil tracking"};
   }else eye.pixelSignal={t:now,landmarksAvailable:false};
  }catch(err){eye.pixelSignal={t:now,error:String(err)};}

  if(eye.lastFrameAt&&now>eye.lastFrameAt)eye.actualFps=eye.actualFps*.8+(.2*1000/(now-eye.lastFrameAt));
  eye.lastFrameAt=now;eye.frames++;
  let x=null,y=null,head=null,left=null,right=null;
  if(lm&&lm.length>=478){
   const iris=(p,outer,inner,upper,lower)=>{
    const A=lm[outer],B=lm[inner],P=lm[p],U=lm[upper],D=lm[lower];
    if(![A,B,P,U,D].every(Boolean))return null;
    const dx=B.x-A.x,dy=B.y-A.y,w=Math.hypot(dx,dy);
    if(w<.025)return null;
    const ux=dx/w,uy=dy/w,vx=-uy,vy=ux;
    const midX=(A.x+B.x)/2,midY=(A.y+B.y)/2;
    const eyeHeight=Math.abs((D.x-U.x)*vx+(D.y-U.y)*vy);
    const irisX=((P.x-midX)*ux+(P.y-midY)*uy)/w;
    const irisY=((P.x-midX)*vx+(P.y-midY)*vy)/Math.max(eyeHeight,.008);
    return Number.isFinite(irisX+irisY)?{x:irisX,y:irisY,rawX:P.x,rawY:P.y,eyeWidth:w,eyeHeight}:null;
   };
   // MediaPipe iris centers: 468 (eye with corners 33/133), 473 (362/263).
   const a=iris(468,33,133,159,145),b=iris(473,362,263,386,374);
   left=a;right=b;
   if(a&&b&&Number.isFinite(a.x+b.x)&&Number.isFinite(a.y+b.y)){x=(a.x+b.x)/2;y=(a.y+b.y)/2;}
   if((a&&Number.isFinite(a.x+a.y))||(b&&Number.isFinite(b.x+b.y)))eye.lastDetected=now;
   head={cx:(lm[33].x+lm[263].x)/2,cy:(lm[33].y+lm[263].y)/2,width:Math.hypot(lm[263].x-lm[33].x,lm[263].y-lm[33].y),roll:Math.atan2(lm[263].y-lm[33].y,lm[263].x-lm[33].x)};
  }
  eye.latest=left||right?{x,y,left,right,head,t:now}:null;if(eye.start)eye.samples.push({t:Math.round(now-eye.start),x,y,left,right,head});
 }catch(_){}
}
function beginEyeRound(){if(eye){eye.samples=[];eye.start=performance.now();}}
function endEyeRound(record){
 if(!eye){record.eyeTracking={status:"off"};return;}
 const data=eye.samples;eye.samples=[];eye.start=0;
 const valid=data.filter(p=>!!feature(p,eye.mode||selectedEyeMode));
 const gaps=[];for(let i=1;i<valid.length;i++)gaps.push(valid[i].t-valid[i-1].t);
 const xs=valid.map(p=>feature(p,eye.mode||selectedEyeMode)[0]),hs=valid.map(p=>p.head?.cx).filter(Number.isFinite);
 record.eyeTracking={
  status:valid.length>=10?"exploratory":"insufficient",eyeMode:eye.mode||selectedEyeMode,
  sampleCount:data.length,validCount:valid.length,
  coveragePercent:data.length?Math.round(100*valid.length/data.length):0,
 approximateSampleRateHz:data.length>1?Math.round(1000*(data.length-1)/Math.max(1,data[data.length-1].t-data[0].t)*10)/10:null,
 longestValidSampleGapMs:gaps.length?Math.max(...gaps):null,
  horizontalSignalRange:xs.length?Math.max(...xs)-Math.min(...xs):null,
  headMovementRange:hs.length?Math.max(...hs)-Math.min(...hs):null,
  samples:data.map(p=>{const gaze=eye.calibration?.passed&&feature(p,eye.calibration.eyeMode)?predictGaze(eye.calibration,feature(p,eye.calibration.eyeMode)):null;const bounds=record.artworkBounds;const artwork=gaze&&bounds?{x:(gaze.x*innerWidth-bounds.left)/bounds.width,y:(gaze.y*innerHeight-bounds.top)/bounds.height}:null;return {t:p.t,x:p.x,y:p.y,gaze,artwork:artwork&&Number.isFinite(artwork.x+artwork.y)?{x:Math.round(artwork.x*10000)/10000,y:Math.round(artwork.y*10000)/10000}:null};}),
  calibration:eye.calibration?{eyeMode:eye.calibration.eyeMode,passed:eye.calibration.passed,validationMedianErrorPct:eye.calibration.validationMedianErrorPct,validationMaxErrorPct:eye.calibration.validationMaxErrorPct}:null,
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
const galleryThemes=[
 {label:"Impressionism",query:"impressionist painting oil canvas"},
 {label:"Japanese prints",query:"ukiyo-e landscape woodblock print"},
 {label:"Dutch Golden Age",query:"Dutch Golden Age painting still life"},
 {label:"Renaissance",query:"Renaissance painting artwork"},
 {label:"Landscapes",query:"19th century landscape painting"},
 {label:"Botanical art",query:"botanical illustration painting"},
 {label:"Portraits",query:"portrait painting 18th century"},
 {label:"Modern color",query:"post impressionist painting"}
];
const recentlySeen=new Set();
async function discoverArtworks(seed){
 const random=rand(seed^0x2e9f0a17),themes=[...galleryThemes];
 for(let i=themes.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[themes[i],themes[j]]=[themes[j],themes[i]];}
 const discovered=[];
 for(const theme of themes.slice(0,4)){
  try{
   const url="https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch="+encodeURIComponent('filetype:bitmap '+theme.query)+"&gsrnamespace=6&gsrlimit=30&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=1200&format=json&origin=*";
   const response=await fetch(url,{signal:AbortSignal.timeout(4500)});
   if(!response.ok)continue;
   const data=await response.json();
   const pages=Object.values(data.query?.pages||{});
   for(const page of pages){
    const info=page.imageinfo?.[0],meta=info?.extmetadata||{},license=(meta.LicenseShortName?.value||"").toLowerCase();
    const publicDomain=/public domain|^cc0|^pd-/.test(license);
    const imageUrl=info?.thumburl||info?.url;
    if(!publicDomain||!imageUrl||!/\.(jpg|jpeg|png)(\?|$)/i.test(imageUrl)||recentlySeen.has(page.title))continue;
    const title=page.title.replace(/^File:/,"").replace(/\.[^.]+$/,"").replaceAll("_"," ").replace(/\s*\(.*?\)/g,"").slice(0,85);
    if(!title||/scan|signature|stamp|map|coat of arms|flag|logo|poster|photo|photograph/i.test(title))continue;
    discovered.push({title,artist:"Public-domain collection",url:imageUrl,source:info.descriptionurl||"https://commons.wikimedia.org/wiki/"+encodeURIComponent(page.title),theme:theme.label,id:page.title});
   }
  }catch(_){}
 }
 for(let i=discovered.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[discovered[i],discovered[j]]=[discovered[j],discovered[i]];}
 return discovered;
}
function startGame(){clearInterval(calibrationTimer);
 const seed=(globalThis.crypto?.getRandomValues?crypto.getRandomValues(new Uint32Array(1))[0]:Date.now()>>>0);
 const random=rand(seed);
 const order=[...targets];for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
 const artOrder=[...realArtworks];for(let i=artOrder.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[artOrder[i],artOrder[j]]=[artOrder[j],artOrder[i]];}session={id:Date.now().toString(36),round:0,results:[],started:Date.now(),seed,order,artOrder,discovery:discoverArtworks(seed)};nextRound();
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
 body.replaceChildren(el("p","hd-note","Curating your next artwork…"));
 if(round===0&&session.discovery){const dynamic=await session.discovery;if(!session||token!==galleryToken)return;if(dynamic.length>=4){session.artOrder=dynamic.concat(session.artOrder);}session.discovery=null;}
 let loaded=await loadRealArtwork(round);
 if(!loaded){for(let offset=1;offset<session.artOrder.length&&!loaded;offset++){const idx=(round+offset)%session.artOrder.length;const backup=session.artOrder[idx];session.artOrder[idx]=session.artOrder[round];session.artOrder[round]=backup;loaded=await loadRealArtwork(round);}}
 if(!session||session.round!==round||root.hidden||token!==galleryToken)return;
 const scene=loaded?buildRealScene(round,loaded):buildArtwork(round,item.id);
 if(scene.real)recentlySeen.add(scene.art.id||scene.art.file);
 const record={round:round+1,target:scene.real?"painting fragment":item.id,artwork:scene.real?{title:scene.art.title,artist:scene.art.artist,source:scene.art.source}:null,distractorCount:scene.real?null:scene.count-1,seed:scene.seed,correct:false,misses:0,searchTimeMs:null,attempts:[]};
 session.active={record,scene,start:0,paused:false};
 body.replaceChildren();
 const head=el("div","hd-round-head");
 const label=el("div","hd-kicker","GALLERY "+String(round+1).padStart(2,"0")+" / 04");
 const time=el("div","hd-timer","0.0s");
 head.append(label,time);
 const prompts=["Find the missing fragment.","Where does this detail belong?","Study the composition. Locate this crop.","Can you spot this tiny detail?"];
 const title=el("h2","hd-round-title",scene.real?prompts[round]:"Find "+item.label+".");
 const help=el("p","hd-help",scene.real?(scene.art.theme?scene.art.theme+" · ":"")+scene.art.artist+" · "+scene.art.title:"Explore the artwork. Tap the detail when you find it.");
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
 if(eye?.calibration?.passed){record.gazeCoordinateSystem="normalized-viewport";record.artworkBounds={left:svg.getBoundingClientRect().left,top:svg.getBoundingClientRect().top,width:svg.getBoundingClientRect().width,height:svg.getBoundingClientRect().height};}
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
 const touchReport=el("div","hd-eye-report");
 touchReport.append(el("strong","","Your Visual Search Report"));
 if(success.length){
  const times=success.map(r=>r.searchTimeMs/1000).sort((a,b)=>a-b);
  const median=times.length%2?times[(times.length-1)/2]:(times[times.length/2-1]+times[times.length/2])/2;
  const fastest=success.reduce((a,b)=>a.searchTimeMs<=b.searchTimeMs?a:b);
  const slowest=success.reduce((a,b)=>a.searchTimeMs>=b.searchTimeMs?a:b);
  const misses=rows.reduce((n,r)=>n+r.misses,0);
  const total=rows.reduce((n,r)=>n+r.searchTimeMs,0)/1000;
  touchReport.append(el("p","", "Median discovery time: "+median.toFixed(1)+"s · Total gallery time: "+total.toFixed(1)+"s · Missed taps per completed artwork: "+(misses/success.length).toFixed(1)+"."));
  touchReport.append(el("p","", "Quickest discovery: "+(fastest.artwork?.title||"Artwork "+fastest.round)+" ("+(fastest.searchTimeMs/1000).toFixed(1)+"s). Longest successful search: "+(slowest.artwork?.title||"Artwork "+slowest.round)+" ("+(slowest.searchTimeMs/1000).toFixed(1)+"s)."));
  const summary=el("div","hd-results-list");
  rows.forEach(r=>{
   const row=el("div","hd-result-line");
   const name=r.artwork?.title||"Artwork "+r.round;
   const secs=(r.searchTimeMs/1000).toFixed(1);
   row.append(el("span","",name+" · "+r.misses+" missed taps"),el("strong","",secs+"s"+(r.correct?"":" · skipped")));
   summary.append(row);
  });
  touchReport.append(el("strong","","Artwork-by-artwork exploration"),summary);
  touchReport.append(el("p","hd-note","These metrics describe taps and task completion, not where you looked or how long you fixated. Artwork difficulty varies, so times are not directly comparable across different paintings."));
 }else touchReport.append(el("p","","No completed searches yet. Finish an artwork to unlock timing and touch insights."));
 const explain=el("p","hd-note","Measured: touch responses and experimental eye signal. Regional gaze summaries appear only when independent validation passes; they are approximate sample distributions, not proven fixations or psychological diagnoses.");
 const actions=el("div","hd-result-actions");
 actions.append(button("Play another gallery",startGame),button("Export session JSON",exportData,true));
 const good=rows.filter(r=>r.eyeTracking?.status==="exploratory");
 const avgCoverage=good.length?Math.round(good.reduce((sum,r)=>sum+r.eyeTracking.coveragePercent,0)/good.length):null;
 const eyeInfo=el("div","hd-eye-report");
 if(calibrationSummary)eyeInfo.append(el("p","",calibrationSummary.passed?"Independent validation passed · median "+calibrationSummary.medianErrorPct+"% of viewport diagonal.":"Independent validation failed · gaze coordinates excluded."));
 eyeInfo.append(el("strong","","Eye signal quality"),el("p","",good.length?good.length+" / 4 rounds recorded · "+avgCoverage+"% mean valid sample coverage.":"Eye data unavailable or below the minimum sample count."));
 const regionReport=el("div","hd-eye-report");
 const validated=rows.filter(r=>r.eyeTracking?.calibration?.passed);
 const bins=Array(9).fill(0);let inArt=0,allGaze=0;
 validated.forEach(r=>(r.eyeTracking.samples||[]).forEach(p=>{if(!p.artwork)return;allGaze++;const {x,y}=p.artwork;if(x>=0&&x<=1&&y>=0&&y<=1){bins[Math.min(2,Math.floor(y*3))*3+Math.min(2,Math.floor(x*3))]++;inArt++;}}));
 regionReport.append(el("strong","","Where did your attention go?"));
 if(inArt>=20){
  const labels=["top left","top center","top right","middle left","center","middle right","bottom left","bottom center","bottom right"];
  const ranked=bins.map((count,i)=>({count,label:labels[i]})).sort((a,b)=>b.count-a.count);
  regionReport.append(el("p","", "Most sampled region: "+ranked[0].label+" ("+Math.round(ranked[0].count/inArt*100)+"% of in-art gaze samples). Second: "+ranked[1].label+". "+inArt+" in-art samples; "+(allGaze-inArt)+" outside artwork. These percentages represent samples, not verified dwell time."));
  regionReport.append(el("p","",ranked[0].count>ranked[1].count*1.5?"Your estimated gaze was concentrated in one region. This may reflect visual search strategy or artwork composition; it does not establish distraction.":"Your estimated gaze was distributed across several regions. This may reflect exploration rather than distraction."));
 }else regionReport.append(el("p","","Not enough independently validated artwork gaze coordinates to describe attention by region. Iris motion was recorded separately; no attention map is inferred."));
 eyeInfo.append(regionReport);
 const caveat=el("p","hd-note","Camera gaze estimates are experimental, and independent screen validation does not make them clinical or reference-grade measurements.");
 eyeInfo.append(caveat);
 const sources=el("div","hd-art-credits");
 sources.append(el("strong","","Artworks & credits"));
 rows.forEach(r=>{if(!r.artwork)return;const a=document.createElement("a");a.href=r.artwork.source;a.target="_blank";a.rel="noopener noreferrer";a.textContent=r.artwork.artist+" · "+r.artwork.title;sources.append(a);});
 body.append(kicker,title,note,stats,detail,touchReport,eyeInfo,sources,explain,actions);
}
function exportData(){
 if(!session)return;
 const payload={experiment:"The Hidden Detail",version:"2.4-curated-random-gallery",sessionId:session.id,startedAt:new Date(session.started).toISOString(),mode:"touch-visual-search",results:session.results,disclaimer:"Non-clinical visual-search game. Not a validated diagnostic measure. Screen-position estimates are exported only after independent validation; no diagnostic interpretation."};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="irispectra-hidden-detail-"+session.id+".json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
openButton.addEventListener("click",()=>{root.hidden=false;document.body.classList.add("hd-lock");showIntro();});
close.addEventListener("click",shutdown);
root.addEventListener("click",e=>{if(e.target===root)shutdown();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!root.hidden)shutdown();});
})();