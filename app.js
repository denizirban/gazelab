"use strict";
// Gaze Lab V0.1 — coarse experimental gaze estimate. No image upload.
const $ = (id) => document.getElementById(id);
const els = Object.fromEntries(["board","centerInfo","target","estimate","start","calibrate","restart","stop","export","stateText","led","counter","message","video","lighting","metrics","median","percent","alignment","faceOval","alignmentText","play","endGame","gameHoop","gameBall","metricExtra","horizontal","vertical","repeatability","instantPaint","calibratedPaint","paintCanvas","paintCursor","clearPaint","endPaint"].map(id => [id,$(id)]));
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const MP_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304";
const calibration = [
  [0.14,0.16],[0.5,0.16],[0.86,0.16],
  [0.14,0.50],[0.5,0.50],[0.86,0.50],
  [0.14,0.84],[0.5,0.84],[0.86,0.84]
];
const validation = [
  [0.27,0.30],[0.73,0.30],[0.5,0.68],[0.27,0.73],[0.73,0.73]
];
const S = { phase:"idle", stream:null, landmarker:null, raf:0, lastVideoTime:-1,
            feature:null, lastSeen:0, phaseStart:0, stepStart:0, step:0, samples:[],
            train:[], test:[], model:null, result:null, lastInfer:0, issue:"",alignmentOK:false,alignedSince:0,headBaseline:null,headNow:null,game:null,gameLast:0,gameGaze:null,gameLastSeen:0,paintMode:null,paintPrev:null,paintSmooth:null,paintCenter:null,paintRange:null,paintHue:0,paintLastSeen:0,choice:null };
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
function setMessage(message){els.message.textContent=message;}
function setIndicator(ok,message,warn=false){els.led.className="led"+(ok?(warn?" warn":" on"):"");els.stateText.textContent=message;}
function setVisible(el,show){el.hidden=!show;}
function controls(){
  setVisible(els.start,S.phase==="idle" || S.phase==="error");
  setVisible(els.calibrate,S.phase==="ready");
  setVisible(els.restart,S.phase==="results" || S.phase==="ready");
  setVisible(els.export,S.phase==="results"||S.phase==="game");
  setVisible(els.play,S.phase==="results");
  if(els.choiceStart)setVisible(els.choiceStart,S.phase==="results");
  if(els.choiceEnd)setVisible(els.choiceEnd,S.phase==="choice");
  setVisible(els.endGame,S.phase==="game");
  setVisible(els.instantPaint,S.phase==="ready"||S.phase==="results");
  setVisible(els.calibratedPaint,S.phase==="results");
  setVisible(els.clearPaint,S.phase==="paint");
  setVisible(els.endPaint,S.phase==="paint");
  setVisible(els.stop,S.phase!=="idle" && S.phase!=="error");
  els.start.disabled=S.phase==="loading";
  els.calibrate.disabled=S.phase!=="ready" || !S.alignmentOK;
  els.stop.disabled=S.phase==="idle";
}
function place(el,x,y){el.style.left=(x*100)+"%";el.style.top=(y*100)+"%";}
function announce(heading,detail){
  els.centerInfo.innerHTML="<div class='introIcon' aria-hidden='true'>◎</div><h2></h2><p></p>";
  els.centerInfo.querySelector("h2").textContent=heading;
  els.centerInfo.querySelector("p").textContent=detail;
  setVisible(els.centerInfo,true);
}
const cameraPreview=els.video.parentElement;
const previewHome=cameraPreview.parentElement;
function stage(phase){
 S.phase=phase;
 // iOS Safari can stall the video when its DOM node is reparented.
 // Keep the live video mounted in one place for the entire camera session.
 if(phase==="idle"||phase==="error"){
  if(cameraPreview.parentElement!==previewHome)previewHome.append(cameraPreview);
 }else{
  if(cameraPreview.parentElement!==els.board)els.board.prepend(cameraPreview);
 }
 if(phase==="ready")setVisible(els.centerInfo,false);
 setVisible(els.alignment,phase==="ready");
 controls();
}
function alignFace(lm,now){
 let message="Position your face",ok=false,head=null;
 if(lm&&lm.length>=478){
  const a=lm[33],b=lm[263],n=lm[1],top=lm[10],chin=lm[152];
  const x=(a.x+b.x)/2,y=(a.y+b.y)/2,w=Math.hypot(a.x-b.x,a.y-b.y);
  const roll=Math.abs(Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI);
  const h=Math.hypot(chin.x-top.x,chin.y-top.y);
  head={x,y,w,roll};
  if(w<.19||h<.30)message="Move closer";
  else if(w>.46||h>.78)message="Move farther away";
  else if(Math.abs(x-.5)>.13||y<.26||y>.55)message="Center your face";
  else if(roll>12)message="Level your head";
  else if(Math.abs(n.x-x)>w*.21)message="Face the camera";
  else{ok=true;message="Hold still";}
 }
 if(ok){if(!S.alignedSince)S.alignedSince=now;}else S.alignedSince=0;
 S.alignmentOK=ok&&now-S.alignedSince>=1600;
 S.headNow=head;
 els.alignmentText.textContent=S.alignmentOK?"Aligned · ready":message;
 els.faceOval.classList.toggle("good",S.alignmentOK);
 if(S.phase==="ready"){setIndicator(S.alignmentOK,S.alignmentOK?"Aligned":"Align your face");controls();}
}
function moved(){const a=S.headBaseline,b=S.headNow;return !a||!b||Math.abs(a.x-b.x)>.035||Math.abs(a.y-b.y)>.035||Math.abs(a.w-b.w)>.035||Math.abs(a.roll-b.roll)>7;}
function releaseCamera(){
  if(S.raf) cancelAnimationFrame(S.raf);
  S.raf=0;
  if(S.stream){S.stream.getTracks().forEach(track=>track.stop());S.stream=null;}
  els.video.srcObject=null;
  if(S.landmarker){try{S.landmarker.close();}catch(_){/* ignored */}S.landmarker=null;}
}
async function startCamera(){
  if(!navigator.mediaDevices?.getUserMedia){setMessage("Camera unavailable. Use a modern browser over HTTPS.");return;}
  stage("loading");setIndicator(false,"Preparing camera");els.start.hidden=true;
  announce("Preparing camera","Loading camera and eye tracking model.");
  try {
    // Request permission immediately from the user gesture on iOS.
    const stream=await navigator.mediaDevices.getUserMedia({
      audio:false,video:{facingMode:"user",width:{ideal:640},height:{ideal:480},frameRate:{ideal:24,max:30}}
    });
    S.stream=stream;els.video.srcObject=stream;
    await els.video.play();
    const mp=await import(MP_BASE+"/vision_bundle.mjs");
    const vision=await mp.FilesetResolver.forVisionTasks(MP_BASE+"/wasm");
    try{
      S.landmarker=await mp.FaceLandmarker.createFromOptions(vision,{
        baseOptions:{modelAssetPath:MODEL_URL,delegate:"GPU"},runningMode:"VIDEO",
        numFaces:1,minFaceDetectionConfidence:0.55,minFacePresenceConfidence:0.55,
        minTrackingConfidence:0.55
      });
    }catch(e){
      S.landmarker=await mp.FaceLandmarker.createFromOptions(vision,{
        baseOptions:{modelAssetPath:MODEL_URL,delegate:"CPU"},runningMode:"VIDEO",numFaces:1
      });
    }
    S.lastVideoTime=-1;S.lastInfer=0;
    stage("ready");setIndicator(false,"Align your face");
    announce("Ready to calibrate.","Keep your face in frame, then begin the nine-point calibration.");
    els.counter.textContent="0 / 9";
    setMessage("Model ready. Start calibration when your face is detected.");
    S.raf=requestAnimationFrame(loop);
  }catch(err){
    releaseCamera();stage("error");
    setIndicator(false,"Camera unavailable");
    announce("Could not open camera","Check camera permissions in your browser and reload.");
    setMessage("Camera or model could not load: "+(err?.message||"Unknown error")+". Check HTTPS and your internet connection.");
  }
}
function getGazeFeature(lm){
  if(!lm || lm.length<478) return null;
  function eye(iris,cornerA,cornerB){
    const a=lm[cornerA],b=lm[cornerB],p=lm[iris];
    const dx=b.x-a.x,dy=b.y-a.y;
    const w=Math.hypot(dx,dy);
    if(w<0.015) return null;
    // Eye-relative iris offset; scale by eye width, compensate image-plane head roll.
    const vx=p.x-(a.x+b.x)/2,vy=p.y-(a.y+b.y)/2;
    return {x:(vx*dx+vy*dy)/(w*w),y:(-vx*dy+vy*dx)/(w*w)};
  }
  const a=eye(468,33,133),b=eye(473,362,263);
  if(!a||!b) return null;
  const x=(a.x+b.x)/2,y=(a.y+b.y)/2;
  if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>.85||Math.abs(y)>.8)return null;
  const eyeSpan=Math.hypot(lm[33].x-lm[263].x,lm[33].y-lm[263].y);
  if(eyeSpan<0.13)return null; // too far / unreliable
  return [x,y];
}
function avgFeatures(samples){
  const orderedX=samples.map(p=>p[0]).sort((a,b)=>a-b);
  const orderedY=samples.map(p=>p[1]).sort((a,b)=>a-b);
  const median=(s)=>s.length%2?s[Math.floor(s.length/2)]:(s[s.length/2-1]+s[s.length/2])/2;
  return [median(orderedX),median(orderedY)];
}
function solve(A,B){
  const M=A.map((row,i)=>[...row,B[i]]);
  for(let c=0;c<3;c++){
    let pivot=c;for(let r=c+1;r<3;r++)if(Math.abs(M[r][c])>Math.abs(M[pivot][c]))pivot=r;
    if(Math.abs(M[pivot][c])<1e-10)throw new Error("Calibration matrisi çözülemedi");
    [M[c],M[pivot]]=[M[pivot],M[c]];
    const scale=M[c][c];for(let k=c;k<4;k++)M[c][k]/=scale;
    for(let r=0;r<3;r++)if(r!==c){const q=M[r][c];for(let k=c;k<4;k++)M[r][k]-=q*M[c][k];}
  }
  return M.map(row=>row[3]);
}
function fit(points){
  const center=[0,1].map(j=>points.reduce((s,p)=>s+p.feature[j],0)/points.length);
  const spread=[0,1].map(j=>Math.max(.012,Math.sqrt(points.reduce((s,p)=>s+(p.feature[j]-center[j])**2,0)/points.length)));
  const row=(p)=>[1,(p.feature[0]-center[0])/spread[0],(p.feature[1]-center[1])/spread[1]];
  const rows=points.map(row),T=[[0,0,0],[0,0,0],[0,0,0]];
  for(const v of rows)for(let i=0;i<3;i++)for(let j=0;j<3;j++)T[i][j]+=v[i]*v[j];
  for(let i=1;i<3;i++)T[i][i]+=.025; // small ridge regularization
  const coeff=[];
  for(let out=0;out<2;out++){
    const rhs=[0,0,0];rows.forEach((v,k)=>{for(let i=0;i<3;i++)rhs[i]+=v[i]*points[k].target[out];});
    coeff.push(solve(T,rhs));
  }
  const predict=(feature)=>{
    const v=[1,(feature[0]-center[0])/spread[0],(feature[1]-center[1])/spread[1]];
    return coeff.map(c=>c[0]*v[0]+c[1]*v[1]+c[2]*v[2]);
  };
  const trainError=points.reduce((sum,p)=>{
    const q=predict(p.feature);return sum+Math.hypot(q[0]-p.target[0],q[1]-p.target[1]);
  },0)/points.length;
  if(!Number.isFinite(trainError)||trainError>.50)throw new Error("Gaze signal is too unstable for calibration");
  return {center,spread,coeff,predict,trainError};
}
function launchCalibrate(){
  if(S.phase!=="ready"||!S.alignmentOK)return;
  if(!S.feature || performance.now()-S.lastSeen>2000){
    setMessage("Make sure your face is visible, with even lighting and minimal movement.");return;
  }
  S.headBaseline={...S.headNow};S.step=0;S.train=[];S.test=[];S.result=null;S.model=null;S.samples=[];
  setVisible(els.metrics,false);setVisible(els.estimate,false);setVisible(els.centerInfo,false);
  stage("calibration");beginPoint();
}
function beginPoint(){
  S.stepStart=performance.now();S.samples=[];
  const isCalib=S.phase==="calibration";
  const list=isCalib?calibration:validation;
  const target=list[S.step];
  place(els.target,target[0],target[1]);setVisible(els.target,true);
  els.counter.textContent=(S.step+1)+" / "+list.length;
  setIndicator(true,isCalib?"Calibration":"Accuracy check");
  setMessage(isCalib?"Look at the blue dot. Do not tap.":"Look at each new dot. These targets were not used for calibration.");
}
function completePoint(){
  const target=(S.phase==="calibration"?calibration:validation)[S.step];
  const entry={target:[...target],feature:avgFeatures(S.samples),sampleCount:S.samples.length};
  if(S.phase==="calibration")S.train.push(entry);else S.test.push(entry);
  S.step++;
  const total=S.phase==="calibration"?calibration.length:validation.length;
  if(S.step<total){beginPoint();return;}
  if(S.phase==="calibration"){
    try{S.model=fit(S.train);}catch(err){
      stage("ready");setVisible(els.target,false);
      announce("Calibration tekrarlanmalı.","Adjust your lighting and camera angle, then try again.");
      setMessage(err.message);return;
    }
    stage("validation");S.step=0;beginPoint();
  }else finishResults();
}
function finishResults(){
  const board=els.board.getBoundingClientRect();
  const diag=Math.hypot(board.width,board.height);
  const entries=S.test.map(p=>{
    const q=S.model.predict(p.feature);
    const px=Math.hypot((q[0]-p.target[0])*board.width,(q[1]-p.target[1])*board.height);
    return {target:p.target,estimate:q,errorPx:px,errorScreenPercent:px/diag*100,errorXPx:Math.abs(q[0]-p.target[0])*board.width,errorYPx:Math.abs(q[1]-p.target[1])*board.height,sampleCount:p.sampleCount};
  });
  const sort=entries.map(p=>p.errorPx).sort((a,b)=>a-b);
  const median=sort[Math.floor(sort.length/2)];
  const percent=median/diag*100;
  const mean=key=>entries.reduce((total,e)=>total+e[key],0)/entries.length;
  const horizontal=mean("errorXPx"),vertical=mean("errorYPx");
  const repeatability=null; // Requires multiple complete runs in controlled conditions.
  S.result={version:"0.6",horizontalMAECssPx:horizontal,verticalMAECssPx:vertical,repeatabilityAcrossSessions:repeatability,method:"MediaPipe FaceLandmarker, iris-offset affine fit",capturedAt:new Date().toISOString(),
    lighting:els.lighting.value,calibration:S.train,validation:entries,
    boardCssPx:{width:board.width,height:board.height},
    medianErrorCssPx:median,medianErrorScreenDiagonalPercent:percent,
    disclaimer:"Experimental relative gaze estimate, not a clinical measurement. 5 holdout points."};
  stage("results");setVisible(els.target,false);setVisible(els.estimate,true);
  setVisible(els.metrics,true);setVisible(els.metricExtra,true);
  els.horizontal.textContent=Math.round(horizontal)+" px";
  els.vertical.textContent=Math.round(vertical)+" px";
  els.repeatability.textContent="Not tested";
  els.median.textContent=Math.round(median)+" px";els.percent.textContent=percent.toFixed(1)+"%";
  els.counter.textContent="9 calibration + 5 checks";
  setIndicator(true,"Measurement complete");
  announce("Measurement complete.","The outlined circle shows estimated gaze. Keep your head steady and look around the screen.");
  setMessage("Five held-out points. Horizontal and vertical MAE are separate. Play Eye Hoops using gaze dwell.");
}
function loop(now){
  if(!S.landmarker || !S.stream)return;
  try{
    let fresh=false;
    // 15 FPS upper cap to reduce battery and UI blocking on iPhones.
    if(els.video.paused && S.stream && els.video.readyState>=2){els.video.play().catch(()=>{});}
    if(els.video.readyState>=2 && now-S.lastInfer>=110){
      const result=S.landmarker.detectForVideo(els.video,now);
      S.lastVideoTime=els.video.currentTime;S.lastInfer=now;
      alignFace(result.faceLandmarks?.[0],now);
      const feature=getGazeFeature(result.faceLandmarks?.[0]);
      S.feature=feature;
      fresh=!!feature;
      if(feature)S.lastSeen=now;
    }
    const found=!!S.feature && now-S.lastSeen<1000;
    if(S.phase==="ready"){
      if(!found)setIndicator(false,"Looking for face");
    }
    if(S.phase==="calibration"||S.phase==="validation"){
      if(fresh&&moved()){stage("ready");setVisible(els.target,false);S.samples=[];S.headBaseline=null;S.alignedSince=0;S.alignmentOK=false;announce("Position changed","Realign your face and restart the test.");setMessage("Head movement detected. Calibration stopped to protect measurement quality.");}
      const elapsed=now-S.stepStart;
      if(found && fresh && elapsed>=750 && S.samples.length<130)S.samples.push([...S.feature]);
      if((S.phase==="calibration"||S.phase==="validation") && elapsed>=2250 && S.samples.length>=5){completePoint();}
      else if((S.phase==="calibration"||S.phase==="validation") && elapsed>8500){
        stage("ready");setVisible(els.target,false);
        announce("Face tracking interrupted.","Hold the phone steady, improve lighting and recalibrate.");
        setMessage("Not enough camera samples for this point.");S.samples=[];
      }else if(elapsed>3000 && S.samples.length<5){
        setMessage("Eyes not detected. Move closer and avoid shadows.");
        setIndicator(true,"Looking for signal",true);
      }
    }
    if(S.phase==="paint"){tickPaint(fresh);}
    if(S.phase==="choice"){tickChoice(now,fresh);}
    if(S.phase==="game"){tickGame(now,fresh);}
    if(S.phase==="results" && found && S.model){
      const q=S.model.predict(S.feature);place(els.estimate,clamp(q[0],.025,.975),clamp(q[1],.025,.975));
    }
  }catch(e){
    S.issue=e?.message||String(e);
    stage("ready");setVisible(els.target,false);setVisible(els.estimate,false);
    announce("Tracking stopped.","Try restarting the camera.");
    setMessage("Tracking error: "+S.issue);
    releaseCamera();stage("error");return;
  }
  S.raf=requestAnimationFrame(loop);
}
const hoops=[[.22,.24],[.76,.28],[.48,.67],[.19,.75],[.78,.76],[.5,.22],[.28,.5],[.72,.55]];
function startGame(){
 if(S.phase!=="results"||!S.model)return;
 S.game={score:0,shots:0,index:0,hold:0,started:performance.now(),duration:30000,wasInside:false};
 S.gameLast=performance.now();S.gameGaze=null;S.gameLastSeen=0;
 stage("game");setVisible(els.metrics,false);setVisible(els.metricExtra,false);
 setVisible(els.centerInfo,false);setVisible(els.estimate,false);
 setVisible(els.gameHoop,true);setVisible(els.gameBall,true);
 place(els.gameHoop,...hoops[0]);place(els.gameBall,.5,.9);
 setMessage("Blue dot = estimated gaze. Hold it inside the green ring for 0.55 seconds. Tracking may pause if eyes are lost.");
}
function endGame(){
 if(S.phase!=="game")return;
 const g=S.game;
 S.result.game={name:"Eye Hoops",score:g.score,attempts:g.shots,durationSeconds:30,completedAt:new Date().toISOString()};
 setVisible(els.gameHoop,false);setVisible(els.gameBall,false);
 stage("results");setVisible(els.metrics,true);setVisible(els.metricExtra,true);
 announce("Eye Hoops complete",g.score+" hoops scored in 30 seconds. Play again after recalibrating.");
 setMessage("Game performance depends on gaze tracking error. Not a clinical measure.");
 els.counter.textContent=g.score+" hoops";
}
function tickGame(now,fresh){
 const g=S.game;if(!g)return;
 const remaining=Math.max(0,Math.ceil((g.duration-(now-g.started))/1000));
 if(remaining===0){endGame();return;}
 els.counter.textContent=g.score+" hoops · "+remaining+"s";
 if(!fresh || !S.feature){
  if(now-S.gameLastSeen>800){g.hold=0;g.wasInside=false;setIndicator(false,"Tracking paused · face camera");}
  return;
 }
 const raw=S.model.predict(S.feature);
 if(!raw.every(Number.isFinite))return;
 S.gameLastSeen=now;
 // Temporal low-pass filter prevents noisy single-frame jumps.
 const alpha=.24;
 S.gameGaze=S.gameGaze?S.gameGaze.map((v,i)=>v*(1-alpha)+raw[i]*alpha):raw;
 const q=S.gameGaze,target=hoops[g.index%hoops.length];
 const board=els.board.getBoundingClientRect();
 place(els.gameBall,clamp(q[0],.035,.965),clamp(q[1],.035,.965));
 const distance=Math.hypot((q[0]-target[0])*board.width,(q[1]-target[1])*board.height);
 const inside=distance<Math.max(50,Math.min(board.width,board.height)*.18);
 if(inside){
  if(!g.wasInside)g.hold=now;
  const held=now-g.hold;
  setIndicator(true,"On target · "+Math.min(100,Math.round(held/550*100))+"%");
  if(held>=550){
   g.score++;g.shots++;g.index++;
   place(els.gameHoop,...hoops[g.index%hoops.length]);
   els.gameBall.classList.add("hit");
   setTimeout(()=>els.gameBall.classList.remove("hit"),200);
   g.wasInside=false;g.hold=0;
   setIndicator(true,"Scored!");
  }
 }else{
  g.hold=0;g.wasInside=false;
  setIndicator(true,"Tracking · look at the ring");
 }
}
function beginPaint(mode){
 if(!S.landmarker||!S.stream)return;
 if(mode==="calibrated"&&!S.model)return;
 S.paintMode=mode;S.paintPrev=null;S.paintSmooth=null;S.paintHue=0;S.paintLastSeen=0;
 if(mode==="instant"){
  // Relative motion only; center is the starting gaze, not an absolute screen point.
  S.paintCenter=S.feature?[...S.feature]:null;
  S.paintRange=[.11,.085];
 }
 stage("paint");els.board.classList.add("paintMode");setVisible(els.alignment,false);setVisible(els.centerInfo,false);
 setVisible(els.estimate,false);setVisible(els.metrics,false);setVisible(els.metricExtra,false);
 setVisible(els.paintCanvas,true);setVisible(els.paintCursor,true);
 const c=els.paintCanvas,rect=els.board.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);
 c.width=Math.round(rect.width*dpr);c.height=Math.round(rect.height*dpr);
 const ctx=c.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);
 setMessage(mode==="instant"?"Instant Paint · relative gaze motion, not screen-calibrated.":"Calibrated Paint · draw by moving only your eyes.");
 setIndicator(true,mode==="instant"?"Instant · relative":"Calibrated");
 els.counter.textContent="Eye Paint";
}
function tickPaint(fresh){
 if(!S.feature || performance.now()-S.lastSeen>1500){S.paintPrev=null;S.paintSmooth=null;setIndicator(false,els.video.paused?"Camera paused":(els.video.readyState<2?"Waiting for camera":"Eyes not detected"));return;}
 if(!fresh)return;
 let q;
 if(S.paintMode==="calibrated")q=S.model.predict(S.feature);
 else{
  if(!S.paintCenter)S.paintCenter=[...S.feature];
  // Front-camera landmark x is mirrored relative to the user-facing paint canvas.
  q=[.5-(S.feature[0]-S.paintCenter[0])/S.paintRange[0],.5+(S.feature[1]-S.paintCenter[1])/S.paintRange[1]];
 }
 if(!q.every(Number.isFinite))return;
 q=q.map(v=>clamp(v,.035,.965));
 const gap=performance.now()-S.paintLastSeen;S.paintLastSeen=performance.now();
 if(gap>500){S.paintPrev=null;S.paintSmooth=null;}
 const alpha=.16;
 S.paintSmooth=S.paintSmooth?S.paintSmooth.map((v,i)=>v*(1-alpha)+q[i]*alpha):q;
 const [x,y]=S.paintSmooth;
 place(els.paintCursor,x,y);
 const rect=els.board.getBoundingClientRect(),ctx=els.paintCanvas.getContext("2d");
 if(S.paintPrev){
  const dx=(x-S.paintPrev[0])*rect.width,dy=(y-S.paintPrev[1])*rect.height;
  const step=Math.hypot(dx,dy);
  // Reject large tracking jumps and tiny jitter; do not connect disconnected strokes.
  if(step>=.85 && step<Math.min(38,rect.width*.095)){
   ctx.beginPath();ctx.moveTo(S.paintPrev[0]*rect.width,S.paintPrev[1]*rect.height);
   ctx.lineTo(x*rect.width,y*rect.height);ctx.lineWidth=4;ctx.strokeStyle="hsl("+Math.round(S.paintHue%360)+",95%,55%)";ctx.lineCap="round";ctx.lineJoin="round";ctx.stroke();S.paintHue+=8;
  }
 }
 S.paintPrev=[x,y];
 setIndicator(true,S.paintMode==="instant"?"Instant · relative":"Calibrated");
}
function clearPaint(){
 const c=els.paintCanvas,ctx=c.getContext("2d");ctx.clearRect(0,0,c.width,c.height);S.paintPrev=null;
 if(S.paintMode==="instant"&&S.feature)S.paintCenter=[...S.feature];
}
function endPaint(){
 if(S.phase!=="paint")return;
 setVisible(els.paintCanvas,false);setVisible(els.paintCursor,false);els.board.classList.remove("paintMode");S.paintPrev=null;
 stage(S.model?"results":"ready");
 if(S.model){setVisible(els.metrics,true);setVisible(els.metricExtra,true);announce("Paint complete","Compare instant and calibrated gaze drawing.");}
 else{announce("Ready to calibrate","Align your face to begin calibration.");}
 setMessage("Camera stays on. Choose another mode or calibrate.");
}
function restart(){
  if(S.phase==="results"||S.phase==="ready"){stage("ready");S.alignedSince=0;S.alignmentOK=false;S.headBaseline=null;setVisible(els.metrics,false);setVisible(els.metricExtra,false);setVisible(els.estimate,false);setMessage("Align your face to begin a new calibration.");}
}
function stopCamera(){
  releaseCamera();S.feature=null;S.model=null;S.result=null;S.headBaseline=null;S.alignmentOK=false;S.alignedSince=0;
  els.board.classList.remove("paintMode");if(els.choiceOverlay)els.choiceOverlay.hidden=true;S.choice=null;stage("idle");setVisible(els.target,false);setVisible(els.estimate,false);setVisible(els.metrics,false);setVisible(els.metricExtra,false);setVisible(els.gameHoop,false);setVisible(els.gameBall,false);setVisible(els.paintCanvas,false);setVisible(els.paintCursor,false);
  setIndicator(false,"Camera off");els.counter.textContent="Ready";
  announce("Control with your eyes.","Allow camera access to begin. Processing stays on your device.");
  setMessage("Camera stopped. No images were saved.");
}
function exportResult(){
  if(!S.result)return;
  const blob=new Blob([JSON.stringify(S.result,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="gaze-lab-study-"+new Date().toISOString().slice(0,10)+".json";
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
els.start.addEventListener("click",startCamera);
els.calibrate.addEventListener("click",launchCalibrate);
els.restart.addEventListener("click",restart);
els.stop.addEventListener("click",stopCamera);
els.export.addEventListener("click",exportResult);
els.play.addEventListener("click",startGame);
els.endGame.addEventListener("click",endGame);
els.instantPaint.addEventListener("click",()=>beginPaint("instant"));
els.calibratedPaint.addEventListener("click",()=>beginPaint("calibrated"));
els.clearPaint.addEventListener("click",clearPaint);
els.endPaint.addEventListener("click",endPaint);
// Your Eyes vs Your Choice — gaze is observed before the participant explicitly chooses.
// Do not infer unconscious preferences from dwell; this is a within-task exploratory comparison.
const choiceSets=[
 [["🌙","Midnight","#22253d"],["☀️","Daylight","#f7b850"]],
 [["🌊","Ocean","#247cbd"],["🏔️","Mountain","#64748b"]],
 [["🎨","Create","#e78eac"],["🧭","Explore","#55a99c"]],
 [["🌆","City","#805caa"],["🌿","Nature","#5f9b6d"]],
 [["✨","Surprise","#b58ce2"],["🕯️","Familiar","#d5a567"]],
 [["🎵","Rhythm","#df7391"],["🧩","Puzzle","#4c9baf"]]
];
function setupChoice(){
 const css=document.createElement("style");css.textContent=`
 .choiceOverlay{position:absolute;inset:0;background:#fff;z-index:6;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px;gap:12px}
 .choiceOverlay[hidden]{display:none!important}
 .choiceCards{display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%;max-width:540px}
 .choiceCard{min-height:170px;border-radius:23px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:13px;color:white;font-size:17px;font-weight:650;box-shadow:0 7px 24px #00000010}
 .choiceCard .choiceIcon{font-size:48px}
 .choiceOverlay .choicePrompt{font-size:19px;font-weight:700;text-align:center;letter-spacing:-.03em}
 .choiceOverlay .choiceHint{font-size:12px;color:#74747a;text-align:center}
 .choiceOverlay .choiceResult{font-size:13px;line-height:1.65;max-width:500px;text-align:center}
 @media(max-width:520px){.choiceCard{min-height:145px}.choiceCard .choiceIcon{font-size:38px}}
 `;document.head.append(css);
 els.choiceStart=document.createElement("button");els.choiceStart.textContent="Your Eyes vs Your Choice";els.choiceStart.className="primary";els.choiceStart.hidden=true;els.play.after(els.choiceStart);
 els.choiceEnd=document.createElement("button");els.choiceEnd.textContent="End experiment";els.choiceEnd.hidden=true;els.choiceStart.after(els.choiceEnd);
 els.choiceOverlay=document.createElement("div");els.choiceOverlay.className="choiceOverlay";els.choiceOverlay.hidden=true;els.board.append(els.choiceOverlay);
 els.choiceStart.addEventListener("click",startChoice);
 els.choiceEnd.addEventListener("click",endChoice);
}
function startChoice(){
 if(S.phase!=="results"||!S.model)return;
 S.choice={round:0,rows:[],phase:"observe",started:performance.now(),samples:[0,0],unknown:0,first:null,last:null,valid:0,sideOrder:[false,false,false,true,true,true].sort(()=>Math.random()-.5)};
 stage("choice");setVisible(els.estimate,false);setVisible(els.metrics,false);setVisible(els.metricExtra,false);setVisible(els.centerInfo,false);
 els.choiceOverlay.hidden=false;choiceRound();
}
function choiceRound(){
 const c=S.choice;if(!c)return;
 c.phase="observe";c.started=performance.now();c.samples=[0,0];c.unknown=0;c.first=null;c.last=null;c.lastRegion=null;c.valid=0;
 const repeat=c.round>=choiceSets.length;
 const pair=choiceSets[c.round%choiceSets.length],reversed=repeat?!c.sideOrder[c.round%choiceSets.length]:c.sideOrder[c.round];
 c.options=reversed?[pair[1],pair[0]]:pair;
 els.choiceOverlay.innerHTML="";
 const title=document.createElement("div");title.className="choicePrompt";title.textContent=repeat?"Would you make the same choice?":"Which one feels more like you?";
 const hint=document.createElement("div");hint.className="choiceHint";hint.textContent=(repeat?"Second look":"First look")+" · "+(c.round%choiceSets.length+1)+" / "+choiceSets.length+" · Observe for 6 seconds";
 const cards=document.createElement("div");cards.className="choiceCards";
 c.options.forEach((o,i)=>{const card=document.createElement("div");card.className="choiceCard";card.style.background=o[2];card.innerHTML='<span class="choiceIcon"></span><span class="choiceLabel"></span>';card.querySelector(".choiceIcon").textContent=o[0];card.querySelector(".choiceLabel").textContent=o[1];cards.append(card);});
 els.choiceOverlay.append(title,hint,cards);c.hint=hint;c.cards=cards;
 setIndicator(true,(repeat?"Second look":"First look")+" · "+(c.round%choiceSets.length+1)+"/6");
}
function tickChoice(now,fresh){
 const c=S.choice;if(!c||c.phase!=="observe")return;
 const elapsed=now-c.started;
 c.hint.textContent=(c.round>=choiceSets.length?"Second look":"First look")+" · "+(c.round%choiceSets.length+1)+"/6 · "+Math.max(0,Math.ceil((6000-elapsed)/1000))+"s";
 if(fresh&&S.feature){
  const q=S.model.predict(S.feature);
  if(q.every(Number.isFinite)){
   // The cards occupy the central part of the board; reject estimates outside card regions.
   const rect=els.board.getBoundingClientRect();
   const boxes=[...c.cards.children].map(el=>el.getBoundingClientRect());
   const px=rect.left+q[0]*rect.width,py=rect.top+q[1]*rect.height;
   const hit=boxes.findIndex(b=>px>=b.left&&px<=b.right&&py>=b.top&&py<=b.bottom);
   const dt=c.last?Math.min(250,now-c.last):110;c.last=now;
   if(hit>=0){c.samples[hit]+=dt;c.valid+=dt;if(c.first===null)c.first=hit;c.lastRegion=hit;}
   else c.unknown+=dt;
  }
 }
 if(elapsed>=6000){
  c.phase="choose";c.cards.querySelectorAll(".choiceCard").forEach((card,i)=>{card.style.cursor="pointer";card.setAttribute("role","button");card.tabIndex=0;card.addEventListener("click",()=>chooseChoice(i));card.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" ")chooseChoice(i);});});
  c.hint.textContent="Now tap your actual choice. Looking did not select it.";
  setIndicator(true,"Make your choice");
 }
}
function chooseChoice(i){
 const c=S.choice;if(!c||c.phase!=="choose")return;
 const total=c.samples[0]+c.samples[1],more=total>0?(c.samples[0]===c.samples[1]?null:(c.samples[0]>c.samples[1]?0:1)):null;
 const row={round:c.round+1,pass:c.round>=choiceSets.length?2:1,pairId:c.round%choiceSets.length,options:c.options.map(o=>o[1]),chosen:i,chosenLabel:c.options[i][1],lookedLongerAt:more===null?null:c.options[more][1],dwellMs:c.samples.map(Math.round),unclassifiedMs:Math.round(c.unknown),firstRegion:c.first,lastRegion:c.lastRegion,agreement:more===null?null:more===i,validMs:Math.round(c.valid),confidence:null};
 c.rows.push(row);c.phase="confidence";
 els.choiceOverlay.innerHTML="";
 const ch=document.createElement("div");ch.className="choicePrompt";ch.textContent="How sure are you?";
 const sub=document.createElement("div");sub.className="choiceHint";sub.textContent="You chose "+row.chosenLabel+". Rate your confidence before seeing your gaze results.";
 const buttons=document.createElement("div");buttons.style.cssText="display:flex;gap:8px;flex-wrap:wrap;justify-content:center";
 ["Not sure","Somewhat sure","Very sure"].forEach((label,k)=>{const b=document.createElement("button");b.textContent=label;b.addEventListener("click",()=>{row.confidence=k+1;revealChoice(row,i,more,total);});buttons.append(b);});
 els.choiceOverlay.append(ch,sub,buttons);
}
function revealChoice(row,i,more,total){
 const c=S.choice;if(!c||c.phase!=="confidence")return;c.phase="reveal";
 els.choiceOverlay.innerHTML="";
 const h=document.createElement("div");h.className="choicePrompt";h.textContent=total<900?"Not enough reliable gaze data":more===null?"Your gaze was evenly split":more===i?"Your gaze and choice matched":"Your gaze and choice differed";
 const d=document.createElement("div");d.className="choiceResult";d.textContent="You chose "+row.chosenLabel+" ("+["","not sure","somewhat sure","very sure"][row.confidence]+"). Estimated viewing time: "+row.options[0]+" "+(row.dwellMs[0]/1000).toFixed(1)+"s · "+row.options[1]+" "+(row.dwellMs[1]/1000).toFixed(1)+"s. First seen: "+(row.firstRegion===null?"unclassified":row.options[row.firstRegion])+". Last seen: "+(row.lastRegion===null?"unclassified":row.options[row.lastRegion])+". This is not a measure of unconscious preference.";
 const next=document.createElement("button");next.className="primary";next.textContent=c.round===choiceSets.length*2-1?"See my results":c.round===choiceSets.length-1?"Start second look":"Next round";next.addEventListener("click",()=>{c.round++;if(c.round===choiceSets.length){showChoiceBreak();}else if(c.round<choiceSets.length*2)choiceRound();else finishChoice();});
 els.choiceOverlay.append(h,d,next);
}
function showChoiceBreak(){
 const c=S.choice;if(!c)return;c.phase="break";els.choiceOverlay.innerHTML="";
 const h=document.createElement("div");h.className="choicePrompt";h.textContent="Second Look";
 const d=document.createElement("div");d.className="choiceResult";d.textContent="You will see the same six pairs again, with left and right positions switched. Your choice may stay the same or change. There is no right answer.";
 const b=document.createElement("button");b.className="primary";b.textContent="Begin second look";b.addEventListener("click",choiceRound);
 els.choiceOverlay.append(h,d,b);setIndicator(true,"Second look · ready");
}
function finishChoice(){
 const c=S.choice;if(!c)return;
 const usable=c.rows.filter(r=>r.validMs>=1800&&r.agreement!==null),matches=usable.filter(r=>r.agreement).length;
 const first=c.rows.filter(r=>r.pass===1),second=c.rows.filter(r=>r.pass===2);
 const comparisons=second.map(b=>{const a=first.find(x=>x.pairId===b.pairId);return {pairId:b.pairId,firstChoice:a?.chosenLabel??null,secondChoice:b.chosenLabel,changed:a?a.chosenLabel!==b.chosenLabel:null,firstConfidence:a?.confidence??null,secondConfidence:b.confidence,firstGazeMs:a?.dwellMs??null,secondGazeMs:b.dwellMs,firstOptions:a?.options??null,secondOptions:b.options};});
 const changed=comparisons.filter(x=>x.changed===true).length;
 els.choiceOverlay.innerHTML="";
 const h=document.createElement("div");h.className="choicePrompt";h.textContent="Your Eyes vs Your Choice";
 const d=document.createElement("div");d.className="choiceResult";
 const confident=usable.filter(r=>r.confidence===3),confidentMatch=confident.filter(r=>r.agreement).length;
 d.textContent="You changed your choice in "+changed+" of "+comparisons.length+" repeated pairs (with the sides swapped). "+(usable.length?"Gaze favored your chosen option in "+matches+" of "+usable.length+" measurable rounds. High-confidence matches: "+confidentMatch+" of "+confident.length+".":"There was not enough reliable gaze data to compare attention.")+" Changes may reflect many factors, including order, familiarity and uncertainty; they do not reveal hidden desires.";
 const p=document.createElement("div");p.className="choiceHint";p.textContent="12 rounds · 6 repeated pairs · No deception. This is an exploratory visual-attention game, not a personality or subconscious preference test.";
 const b=document.createElement("button");b.className="primary";b.textContent="Finish";b.addEventListener("click",endChoice);
 els.choiceOverlay.append(h,d,p,b);
 if(S.result)S.result.choiceExperiment={name:"Your Eyes vs Your Choice",rounds:c.rows,matchingRounds:matches,usableRounds:usable.length,highConfidenceRounds:confident.length,highConfidenceMatches:confidentMatch,choiceReversal:{changedPairs:changed,totalPairs:comparisons.length,comparisons,sideSwap:true},disclaimer:"Exploratory, non-clinical. Gaze estimates are not unconscious preference measures."};
 c.phase="complete";
}
function endChoice(){
 if(S.phase!=="choice")return;
 els.choiceOverlay.hidden=true;S.choice=null;stage("results");setVisible(els.metrics,true);setVisible(els.metricExtra,true);
 announce("Experiment complete","Compare what you looked at with what you chose.");
 setMessage("Your Eyes vs Your Choice · experimental, not a personality assessment.");
}
setupChoice();
window.addEventListener("pagehide",releaseCamera);
window.addEventListener("orientationchange",()=>{if(S.phase==="calibration"||S.phase==="validation"){stage("ready");setVisible(els.target,false);announce("Screen orientation changed.","Calibration ölçümleri iptal edildi. Yeniden deneyebilirsin.");setMessage("Screen orientation changed; restart the test.");}});
controls();