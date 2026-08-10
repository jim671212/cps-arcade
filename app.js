const VERSION='v1.1';
const games={
 tk2j:{name:'三國志2',rom:'roms/tk2j.zip',core:'fbalpha2012_cps1'},
 sf2j:{name:'快打旋風',rom:'roms/sf2j.zip',core:'fbalpha2012_cps1'},
 knights:{name:'圓桌武士',rom:'roms/knights.zip',core:'fbalpha2012_cps1'}
};
let currentGame=null,deferredInstall=null,peer=null,conn=null,remoteStream=null,localStream=null;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const state={keys:new Set(),joyId:null,center:null,lastDir:null,lastDirAt:0,bufferMs:70,inner:18,outer:72,turboA:false,turboB:false,timers:{}};

document.addEventListener('contextmenu',e=>e.preventDefault());
function keyEvent(key,down,remote=false){
  const type=down?'keydown':'keyup';
  const opts={key,code:key,bubbles:true,cancelable:true};
  document.dispatchEvent(new KeyboardEvent(type,opts)); window.dispatchEvent(new KeyboardEvent(type,opts));
  if(!remote && conn?.open) conn.send({t:'key',key,down});
}
function press(key,remote=false){if(state.keys.has(key))return;state.keys.add(key);keyEvent(key,true,remote)}
function release(key,remote=false){if(!state.keys.has(key)&&!remote)return;state.keys.delete(key);keyEvent(key,false,remote)}
function releaseDirs(){['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].forEach(release)}
function setDir(dx,dy){
 const mag=Math.hypot(dx,dy); if(mag<state.inner){releaseDirs();return;}
 const a=Math.atan2(dy,dx); const deg=(a*180/Math.PI+360)%360;
 const next=[]; if(deg>=337.5||deg<22.5)next.push('ArrowRight'); else if(deg<67.5)next.push('ArrowRight','ArrowDown'); else if(deg<112.5)next.push('ArrowDown'); else if(deg<157.5)next.push('ArrowDown','ArrowLeft'); else if(deg<202.5)next.push('ArrowLeft'); else if(deg<247.5)next.push('ArrowLeft','ArrowUp'); else if(deg<292.5)next.push('ArrowUp'); else next.push('ArrowUp','ArrowRight');
 const signature=next.join('+'),now=performance.now();
 // 70ms direction buffer/sliding-window: diagonal transitions keep shared directions pressed instead of full neutral reset.
 ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].forEach(k=>{if(!next.includes(k))release(k)}); next.forEach(press);
 state.lastDir=signature;state.lastDirAt=now;
}
function initJoystick(){const zone=$('#joyZone'),base=$('#joyBase'),knob=$('#joyKnob');
 zone.addEventListener('pointerdown',e=>{if(state.joyId!==null)return;state.joyId=e.pointerId;zone.setPointerCapture(e.pointerId);state.center={x:e.clientX,y:e.clientY};base.style.left=e.clientX+'px';base.style.top=e.clientY+'px';base.classList.remove('hidden');knob.style.transform='translate(-50%,-50%)';setDir(0,0);});
 zone.addEventListener('pointermove',e=>{if(e.pointerId!==state.joyId||!state.center)return;let dx=e.clientX-state.center.x,dy=e.clientY-state.center.y;const m=Math.hypot(dx,dy);if(m>state.outer){dx=dx/m*state.outer;dy=dy/m*state.outer}knob.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;setDir(dx,dy)});
 const end=e=>{if(e.pointerId!==state.joyId)return;state.joyId=null;state.center=null;base.classList.add('hidden');releaseDirs()}; zone.addEventListener('pointerup',end);zone.addEventListener('pointercancel',end);
}
function turboKey(key,enabled,el){if(!enabled){clearInterval(state.timers[key]);delete state.timers[key];release(key);return} if(state.timers[key])return; let on=false; state.timers[key]=setInterval(()=>{on=!on;on?press(key):release(key)},42); el?.classList.toggle('pressed',enabled)}
function initButtons(){
 $$('.arc-btn,[data-key],.combo-btn').forEach(el=>{el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture?.(e.pointerId);el.classList.add('pressed');if(el.dataset.combo){el.dataset.combo.split(',').forEach(press);return}const k=el.dataset.key;if(k==='z'&&state.turboA){turboKey(k,true,el);return}if(k==='x'&&state.turboB){turboKey(k,true,el);return}press(k)}); const end=e=>{el.classList.remove('pressed');if(el.dataset.combo){el.dataset.combo.split(',').forEach(release);return}const k=el.dataset.key;if(k==='z'&&state.turboA){turboKey(k,false,el);return}if(k==='x'&&state.turboB){turboKey(k,false,el);return}release(k)};el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end)});
 // 30ms A+B simultaneous window: if physical A/B are pressed nearly together, normalize to a true simultaneous pair.
 let lastA=0,lastB=0;document.addEventListener('keydown',e=>{const n=performance.now();if(e.key==='z')lastA=n;if(e.key==='x')lastB=n;if(Math.abs(lastA-lastB)<=30&&lastA&&lastB){keyEvent('z',true);keyEvent('x',true)}});
}
function loadGame(id){currentGame=games[id];if(!currentGame)return;$('#library').classList.add('hidden');$('#play').classList.remove('hidden');
 const old=$('#game');old.innerHTML='';
 window.EJS_player='#game';window.EJS_core=currentGame.core;window.EJS_gameUrl=currentGame.rom;window.EJS_gameName=currentGame.name;window.EJS_pathtodata='https://cdn.emulatorjs.org/stable/data/';window.EJS_startOnLoaded=true;window.EJS_fullscreenOnLoaded=false;window.EJS_language='zh-TW';
 const prev=document.querySelector('script[data-ejs]');if(prev)prev.remove();const s=document.createElement('script');s.src='https://cdn.emulatorjs.org/stable/data/loader.js';s.dataset.ejs='1';document.body.appendChild(s); localStorage.setItem('lastGame',id);
}
function enterFullscreen(){const el=document.documentElement;if(el.requestFullscreen)el.requestFullscreen().catch(()=>{});screen.orientation?.lock?.('landscape').catch?.(()=>{})}
function populateWidths(){const sel=$('#screenWidth');[100,95,90,85,80,75,70,65,60].forEach(n=>{const o=document.createElement('option');o.value=n;o.textContent=n+'%';sel.appendChild(o)});sel.value='100'}
function applyControls(){const root=document.documentElement;root.style.setProperty('--leftScale',$('#leftSize').value/100);root.style.setProperty('--leftX',$('#leftX').value+'vw');root.style.setProperty('--leftY',$('#leftY').value+'vh');root.style.setProperty('--rightScale',$('#rightSize').value/100);root.style.setProperty('--rightX',$('#rightX').value+'vw');root.style.setProperty('--rightY',$('#rightY').value+'vh');}
function initSettings(){populateWidths();$('#menuFab').onclick=()=>$('#settings').classList.toggle('hidden');$('#settingsClose').onclick=()=>$('#settings').classList.add('hidden');$('#sound').onchange=e=>{document.querySelectorAll('audio,video').forEach(m=>m.muted=!e.target.checked)};$('#edgeFill').onchange=e=>{if(e.target.checked){$('#screenWidth').value='100';setScreenWidth(100)}};$('#screenWidth').onchange=e=>setScreenWidth(+e.target.value);function setScreenWidth(n){$('#gameWrap').className='game-wrap width-'+n;$('#edgeFill').checked=n===100}['leftSize','leftX','leftY','rightSize','rightX','rightY'].forEach(id=>$('#'+id).oninput=applyControls);$('#resetControls').onclick=()=>{Object.entries({leftSize:100,leftX:0,leftY:0,rightSize:100,rightX:0,rightY:0}).forEach(([k,v])=>$('#'+k).value=v);applyControls()};$('#turboA').onchange=e=>state.turboA=e.target.checked;$('#turboB').onchange=e=>state.turboB=e.target.checked;$('#backLibrary').onclick=()=>location.reload();}
async function enableVoice(){if(!$('#voice').checked)return null;try{localStream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});return localStream}catch(e){$('#netStatus').textContent='語音權限未開啟，仍可連線遊戲';return null}}
function randomCode(){return String(Math.floor(1000+Math.random()*9000))}
async function host(){const code=randomCode();$('#roomCode').textContent=code;$('#netStatus').textContent='建立房間中…';const stream=await enableVoice();peer=new Peer('cps-'+code+'-host');peer.on('open',()=>$('#netStatus').textContent='房間已建立，等待朋友加入');peer.on('connection',c=>{conn=c;wireConn(c)});peer.on('call',call=>{call.answer(stream||undefined);call.on('stream',attachRemote)});peer.on('error',()=>$('#netStatus').textContent='房號衝突，請重新建立');}
async function join(){const code=$('#joinCode').value.replace(/\D/g,'').slice(0,4);if(code.length!==4){$('#netStatus').textContent='請輸入 4 碼邀請碼';return}$('#roomCode').textContent=code;const stream=await enableVoice();peer=new Peer();peer.on('open',()=>{conn=peer.connect('cps-'+code+'-host',{reliable:true});wireConn(conn);if(stream){const call=peer.call('cps-'+code+'-host',stream);call.on('stream',attachRemote)}});peer.on('error',()=>$('#netStatus').textContent='找不到房間或連線失敗');}
function wireConn(c){c.on('open',()=>{$('#netStatus').textContent='已連線 · 輸入同步中';if(currentGame)c.send({t:'game',id:Object.keys(games).find(k=>games[k]===currentGame)})});c.on('data',d=>{if(d?.t==='key')d.down?press(d.key,true):release(d.key,true);if(d?.t==='game'&&!currentGame&&games[d.id])loadGame(d.id)});c.on('close',()=>$('#netStatus').textContent='連線已中斷')}
function attachRemote(stream){if(remoteStream)return;remoteStream=stream;const a=document.createElement('audio');a.autoplay=true;a.srcObject=stream;document.body.appendChild(a)}
function initPWA(){if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;$('#installBanner').classList.remove('hidden')});const isiOS=/iphone|ipad|ipod/i.test(navigator.userAgent);if(isiOS&&!window.navigator.standalone&&!localStorage.getItem('installDismiss')){$('#installBanner span').textContent='iPhone/iPad：分享 → 加入主畫面';$('#installBanner').classList.remove('hidden')};$('#installBtn').onclick=async()=>{if(deferredInstall){deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$('#installBanner').classList.add('hidden')}else if(isiOS){alert('Safari 下方「分享」→「加入主畫面」即可安裝。')}};$('#installClose').onclick=()=>{$('#installBanner').classList.add('hidden');localStorage.setItem('installDismiss','1')}}

document.addEventListener('DOMContentLoaded',()=>{$$('.game-card').forEach(b=>b.onclick=()=>loadGame(b.dataset.game));$('#fullscreenHome').onclick=enterFullscreen;$('#multiOpen').onclick=()=>$('#multiModal').classList.remove('hidden');$('#multiClose').onclick=()=>$('#multiModal').classList.add('hidden');$('#hostRoom').onclick=host;$('#joinRoom').onclick=join;initJoystick();initButtons();initSettings();initPWA();});
