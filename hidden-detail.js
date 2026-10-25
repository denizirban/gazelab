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
const palette=["#d7b46c","#a66d5d","#7d9c88","#506a80","#c28d8a","#e6c990","#566d62","#a8b3ac"];
let session=null,raf=0;
const rand=(seed)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
function stopClock(){if(raf)cancelAnimationFrame(raf);raf=0;}
function shutdown(){stopClock();root.hidden=true;document.body.classList.remove("hd-lock");session=null;openButton.focus();}
function button(text,fn,secondary=false){const b=el("button",secondary?"hd-button hd-secondary":"hd-button",text);b.type="button";b.addEventListener("click",fn);return b;}
function showIntro(){
 body.replaceChildren();
 const kicker=el("div","hd-kicker","IRISPECTRA / ART × ATTENTION");
 const title=el("h2","hd-title","The Hidden Detail");
 const desc=el("p","hd-description","A visual search experiment disguised as an art mystery. Discover how efficiently you find a detail inside increasingly complex scenes.");
 const sample=el("div","hd-intro-art");
 sample.innerHTML='<svg viewBox="0 0 560 140" aria-hidden="true"><rect width="560" height="140" rx="16" fill="#182b37"/><circle cx="96" cy="70" r="45" fill="#c0a06c"/><path d="M210 30 Q260 90 210 120 Q160 90 210 30" fill="#8cae9a"/><path d="M320 30 Q400 65 320 110 Q270 65 320 30" fill="#b7746d"/><circle cx="466" cy="70" r="43" fill="#536b76"/><path d="M466 43 A27 27 0 1 0 466 97 A20 20 0 1 1 466 43Z" fill="#f2d28c"/></svg>';
 const note=el("p","hd-note","Four artworks · Find a different target each time · Tap where you find it. No camera permission required. Your results stay on this device unless you export them.");
 body.append(kicker,title,desc,sample,note,button("Enter the gallery",startGame));
}
function startGame(){session={id:Date.now().toString(36),round:0,results:[],started:Date.now()};nextRound();}
function buildArtwork(round,targetId){
 const seed=(Date.now()>>>0)+round*8171;
 const random=rand(seed);
 const count=[38,62,88,118][round];
 const targetIndex=Math.floor(random()*count);
 const kinds=Object.keys(motifs).filter(k=>k!==targetId);
 const target={x:0,y:0,r:0};
 let svg='<svg class="hd-artwork" viewBox="0 0 700 480" role="img" aria-label="Decorative artwork containing the hidden target" preserveAspectRatio="xMidYMid meet"><defs><radialGradient id="hdsky"><stop stop-color="#30465a"/><stop offset="1" stop-color="#152733"/></radialGradient><pattern id="hdgrain" width="39" height="37" patternUnits="userSpaceOnUse"><circle cx="5" cy="8" r="1" fill="#fff" opacity=".12"/><circle cx="26" cy="28" r=".7" fill="#fff" opacity=".12"/></pattern></defs><rect width="700" height="480" fill="url(#hdsky)"/><circle cx="350" cy="220" r="170" fill="none" stroke="#cba66f" stroke-width="1.5" opacity=".35"/><circle cx="350" cy="220" r="210" fill="none" stroke="#cba66f" stroke-width="1" opacity=".2"/>';
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
 const color=isTarget?"#e9c47d":palette[Math.floor(random()*palette.length)];
 const rot=Math.floor(random()*360);
 svg+='<g transform="translate('+x.toFixed(1)+' '+y.toFixed(1)+') rotate('+rot+') scale('+scale.toFixed(2)+')" style="color:'+color+'">'+motifs[kind]+'</g>';
 if(isTarget){target.x=x;target.y=y;target.r=22*scale+9;}
 }
 svg+='<rect width="700" height="480" fill="url(#hdgrain)" pointer-events="none"/><rect x="10" y="10" width="680" height="460" rx="7" fill="none" stroke="#d8b77b" opacity=".6" stroke-width="2"/></svg>';
 return {svg,target,seed,count};
}
function nextRound(){
 stopClock();if(!session)return;
 const round=session.round;
 if(round>=4){showResults();return;}
 const item=targets[round],scene=buildArtwork(round,item.id);
 const record={round:round+1,target:item.id,distractorCount:scene.count-1,seed:scene.seed,correct:false,misses:0,searchTimeMs:null,attempts:[]};
 session.active={record,scene,start:0,paused:false};
 body.replaceChildren();
 const head=el("div","hd-round-head");
 const label=el("div","hd-kicker","GALLERY "+String(round+1).padStart(2,"0")+" / 04");
 const time=el("div","hd-timer","0.0s");
 head.append(label,time);
 const title=el("h2","hd-round-title","Find "+item.label+".");
 const help=el("p","hd-help","Explore the artwork. Tap the detail when you find it.");
 const art=el("div","hd-art-shell");
 art.innerHTML=scene.svg;
 const svg=art.querySelector("svg");
 const feedback=el("div","hd-feedback","Tap the artwork to select a detail.");
 const bottom=el("div","hd-round-actions");
 const skip=button("Skip artwork",()=>finishRound(false,true),true);
 bottom.append(skip);
 body.append(head,title,help,art,feedback,bottom);
 const start=performance.now();session.active.start=start;
 function clock(now){if(!session||session.active?.record!==record)return;time.textContent=((now-start)/1000).toFixed(1)+"s";raf=requestAnimationFrame(clock);}
 raf=requestAnimationFrame(clock);
 svg.addEventListener("click",e=>{
  if(!session||session.active?.record!==record||record.correct)return;
  const bounds=svg.getBoundingClientRect();
  const x=(e.clientX-bounds.left)/bounds.width*700,y=(e.clientY-bounds.top)/bounds.height*480;
  const distance=Math.hypot(x-scene.target.x,y-scene.target.y);
  const correct=distance<=Math.max(scene.target.r,17);
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
 record.skipped=!!skipped;record.correct=found;
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
 const ring=document.createElementNS(ns,"circle");ring.setAttribute("cx",scene.target.x);ring.setAttribute("cy",scene.target.y);ring.setAttribute("r","29");ring.setAttribute("fill","none");ring.setAttribute("stroke","#f5d783");ring.setAttribute("stroke-width","5");ring.setAttribute("class","hd-target-ring");svg.append(ring);
 body.append(kicker,title,subtitle,reveal,button(session.round===3?"See my results":"Next artwork",()=>{session.round++;nextRound();}));
}
function showResults(){
 if(!session)return;body.replaceChildren();
 const rows=session.results,success=rows.filter(r=>r.correct),mean=success.length?success.reduce((a,r)=>a+r.searchTimeMs,0)/success.length/1000:null;
 const kicker=el("div","hd-kicker","YOUR VISUAL SEARCH PROFILE");
 const title=el("h2","hd-title","The gallery, through your eyes.");
 const note=el("p","hd-description","A snapshot of how you searched, not a test of neurological health.");
 const stats=el("div","hd-stats");
 [["Found",success.length+" / 4"],["Average find time",mean===null?"—":mean.toFixed(1)+"s"],["Missed taps",rows.reduce((a,r)=>a+r.misses,0)]].forEach(([label,value])=>{const card=el("div","hd-stat");card.append(el("strong","",value),el("span","",label));stats.append(card);});
 const detail=el("div","hd-results-list");
 rows.forEach(r=>{const line=el("div","hd-result-line");line.append(el("span","",String(r.round).padStart(2,"0")+" · "+targets[r.round-1].label),el("strong","",r.correct?(r.searchTimeMs/1000).toFixed(1)+"s":"Skipped"));detail.append(line);});
 const explain=el("p","hd-note","Measured: touch-based target localization, response time and missed taps. Not measured: precise eye fixation, saccades, or Alzheimer's/Parkinson's risk. Repeated play introduces learning effects.");
 const actions=el("div","hd-result-actions");
 actions.append(button("Play another gallery",startGame),button("Export session JSON",exportData,true));
 body.append(kicker,title,note,stats,detail,explain,actions);
}
function exportData(){
 if(!session)return;
 const payload={experiment:"The Hidden Detail",version:"1.0",sessionId:session.id,startedAt:new Date(session.started).toISOString(),mode:"touch-visual-search",results:session.results,disclaimer:"Non-clinical visual-search game. Not a validated diagnostic measure. No eye tracking performed."};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="irispectra-hidden-detail-"+session.id+".json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
openButton.addEventListener("click",()=>{root.hidden=false;document.body.classList.add("hd-lock");showIntro();});
close.addEventListener("click",shutdown);
root.addEventListener("click",e=>{if(e.target===root)shutdown();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!root.hidden)shutdown();});
})();