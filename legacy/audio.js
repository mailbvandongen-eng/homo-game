(()=> {
let ctx=null,master=null,musicGain=null,sfxGain=null,noiseBuffer=null,musicEnabled=true,sfxLevel=.72,scene='savanna',timer=null,step=0,nextTime=0;
const tempo={savanna:116,cave:88};
const tunes={
 savanna:[67,null,71,74,79,null,74,71,67,null,71,74,81,null,79,74,76,null,79,83,81,null,79,76,74,null,71,74,79,74,71,null],
 cave:[55,null,58,62,null,65,62,null,55,null,58,60,null,62,58,null,53,null,57,60,null,62,60,null,53,null,57,58,null,60,57,null]
};
function ensure(){
 if(ctx)return;
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
 ctx=new AC();master=ctx.createGain();musicGain=ctx.createGain();sfxGain=ctx.createGain();
 master.gain.value=.72;musicGain.gain.value=musicEnabled?.18:0;sfxGain.gain.value=sfxLevel;
 musicGain.connect(master);sfxGain.connect(master);master.connect(ctx.destination);
 noiseBuffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.45),ctx.sampleRate);
 const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length*.42);
}
function midi(n){return 440*Math.pow(2,(n-69)/12)}
function tone(freq,duration,wave,level,when,dest,slide=0){
 if(!ctx)return;const o=ctx.createOscillator(),g=ctx.createGain();o.type=wave;o.frequency.setValueAtTime(Math.max(30,freq),when);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*slide),when+duration);
 g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime(Math.max(.0002,level),when+.012);g.gain.setTargetAtTime(.0001,when+Math.max(.035,duration*.68),Math.max(.025,duration*.16));o.connect(g);g.connect(dest);o.start(when);o.stop(when+duration+.13);
}
function noise(when,duration,level,filterType,cutoff,slide=0){
 if(!ctx)return;const src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();src.buffer=noiseBuffer;f.type=filterType;f.frequency.setValueAtTime(cutoff,when);if(slide)f.frequency.exponentialRampToValueAtTime(slide,when+duration);g.gain.setValueAtTime(level,when);g.gain.exponentialRampToValueAtTime(.0001,when+duration);src.connect(f);f.connect(g);g.connect(sfxGain);src.start(when);src.stop(when+duration+.02);
}
function tickMusic(){
 if(!ctx||!musicEnabled||ctx.state!=='running')return;
 const pattern=tunes[scene],bpm=tempo[scene],interval=60/bpm/2;
 while(nextTime<ctx.currentTime+.12){
  const n=pattern[step%pattern.length],t=nextTime;
  if(n)tone(midi(n),interval*.72,'square',scene==='cave'?.022:.027,t,musicGain);
  if(step%4===0){const root=scene==='cave'?[43,41,38,41][Math.floor(step/8)%4]:[43,40,45,38][Math.floor(step/8)%4];tone(midi(root),interval*1.8,'triangle',.055,t,musicGain,.82)}
  if(step%8===0){tone(scene==='cave'?midi(31):midi(35),.11,'sine',.12,t,musicGain,.34);noise(t,.045,.018,'lowpass',1500,280)}
  else if(step%8===4)noise(t,.055,scene==='cave'?.012:.016,'bandpass',2100,750);
  step++;nextTime+=interval;
 }
}
function start(){
 ensure();if(!ctx)return;ctx.resume().catch(()=>{});
 if(!timer){nextTime=ctx.currentTime+.04;timer=setInterval(tickMusic,25)}
 tickMusic();
}
function setMusic(on){musicEnabled=!!on;if(!ctx)ensure();if(musicGain&&ctx){musicGain.gain.cancelScheduledValues(ctx.currentTime);musicGain.gain.setTargetAtTime(musicEnabled?.18:0,ctx.currentTime,.035)}if(musicEnabled)start();updateControls()}
function setSfx(level){sfxLevel=Math.max(0,Math.min(1,Number(level)||0));if(sfxGain&&ctx)sfxGain.gain.setTargetAtTime(sfxLevel,ctx.currentTime,.025);updateControls()}
function toggleSfx(){setSfx(sfxLevel>0?0:.72)}
function setScene(name){scene=name==='cave'?'cave':'savanna';step=0;if(ctx&&musicEnabled)nextTime=ctx.currentTime+.04}
function play(kind){
 start();if(!ctx||!sfxGain||sfxLevel<=0)return;const t=ctx.currentTime+.005;
 if(kind==='throw'){noise(t,.19,.22,'bandpass',1450,360);tone(620,.16,'triangle',.055,t,sfxGain,.43)}
 else if(kind==='jump'){tone(205,.28,'sawtooth',.14,t,sfxGain,2.4);tone(510,.12,'sine',.065,t+.035,sfxGain,.62)}
 else if(kind==='hit'){tone(520,.22,'sawtooth',.13,t,sfxGain,.48);tone(760,.15,'triangle',.08,t+.018,sfxGain,.55);noise(t,.11,.05,'bandpass',1200,450)}
 else if(kind==='hyena'){tone(145,.42,'sawtooth',.16,t,sfxGain,.62);tone(205,.3,'square',.06,t,sfxGain,.54);noise(t,.32,.12,'lowpass',680,180)}
 else if(kind==='stone'){noise(t,.095,.22,'highpass',2100,620);tone(180,.12,'triangle',.09,t,sfxGain,.48)}
 else if(kind==='paw'){tone(95,.25,'sine',.2,t,sfxGain,.42);noise(t,.18,.15,'lowpass',380,95)}
 else if(kind==='win'){[69,74,78,81].forEach((n,i)=>tone(midi(n),.18,'square',.105,t+i*.105,sfxGain));tone(midi(86),.52,'triangle',.13,t+.49,sfxGain,.72);tone(midi(62),.62,'triangle',.095,t+.49,sfxGain,.9);noise(t+.50,.16,.1,'lowpass',760,160)}
 else if(kind==='step'){noise(t,.035,.025,'lowpass',520,190)}
 else{tone(260,.12,'triangle',.08,t,sfxGain,.72)}
}
function updateControls(){
 const musicButton=document.getElementById('musicToggle'),sfxButton=document.getElementById('sfxToggle'),slider=document.getElementById('sfxVolume'),readout=document.getElementById('sfxReadout');
 if(musicButton){musicButton.textContent=musicEnabled?'♫  MUZIEK AAN':'♫  MUZIEK UIT';musicButton.setAttribute('aria-pressed',String(musicEnabled))}
 if(sfxButton){sfxButton.textContent=sfxLevel>0?'SFX AAN':'SFX UIT';sfxButton.setAttribute('aria-pressed',String(sfxLevel>0))}
 if(slider&&Number(slider.value)!==Math.round(sfxLevel*100))slider.value=String(Math.round(sfxLevel*100));
 if(readout)readout.textContent=Math.round(sfxLevel*100)+'%';
}
function bindControls(){
 const open=document.getElementById('audioButton'),panel=document.getElementById('audioPanel'),musicButton=document.getElementById('musicToggle'),sfxButton=document.getElementById('sfxToggle'),slider=document.getElementById('sfxVolume'),close=document.getElementById('audioClose');
 if(open&&panel){open.addEventListener('pointerdown',e=>{e.preventDefault();panel.classList.toggle('open');panel.setAttribute('aria-hidden',String(!panel.classList.contains('open')));open.setAttribute('aria-expanded',String(panel.classList.contains('open')))});}
 if(close&&panel)close.addEventListener('pointerdown',e=>{e.preventDefault();panel.classList.remove('open');panel.setAttribute('aria-hidden','true');if(open)open.setAttribute('aria-expanded','false')});
 if(musicButton)musicButton.addEventListener('pointerdown',e=>{e.preventDefault();setMusic(!musicEnabled)});
 if(sfxButton)sfxButton.addEventListener('pointerdown',e=>{e.preventDefault();toggleSfx()});
 if(slider)slider.addEventListener('input',()=>setSfx(Number(slider.value)/100));
 updateControls();
}
document.addEventListener('DOMContentLoaded',bindControls,{once:true});
window.HomoAudio={start,play,setScene,setMusic,setSfx};
})();