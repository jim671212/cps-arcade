const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const st={joyId:null,cx:0,cy:0,inner:18,outer:72,pressed:new Set(),lastA:0,lastB:0};
function sim(input,down){
  try{if(typeof window.simulate_input==='function'){window.simulate_input(0,input,down?1:0);return}}
  catch(e){}
  const map={0:'x',1:'s',2:'v',3:'Enter',4:'ArrowUp',5:'ArrowDown',6:'ArrowLeft',7:'ArrowRight',8:'z',9:'a'};
  const key=map[input]; if(!key)return; const ev=new KeyboardEvent(down?'keydown':'keyup',{key,code:key,bubbles:true,cancelable:true});window.dispatchEvent(ev);document.dispatchEvent(ev)
}
function press(input){if(st.pressed.has(input))return;st.pressed.add(input);sim(input,true)}
function release(input){if(!st.pressed.has(input))return;st.pressed.delete(input);sim(input,false)}
function releaseDirs(){[4,5,6,7].forEach(release)}
function dir(dx,dy){const m=Math.hypot(dx,dy);if(m<st.inner){releaseDirs();return}const deg=(Math.atan2(dy,dx)*180/Math.PI+360)%360;let n=[];if(deg>=337.5||deg<22.5)n=[7];else if(deg<67.5)n=[7,5];else if(deg<112.5)n=[5];else if(deg<157.5)n=[5,6];else if(deg<202.5)n=[6];else if(deg<247.5)n=[6,4];else if(deg<292.5)n=[4];else n=[4,7];[4,5,6,7].forEach(i=>{if(!n.includes(i))release(i)});n.forEach(press)}
function initJoy(){const z=$('#joyZone'),b=$('#joyBase'),k=$('#joyKnob');z.addEventListener('pointerdown',e=>{if(st.joyId!==null)return;st.joyId=e.pointerId;st.cx=e.clientX;st.cy=e.clientY;z.setPointerCapture(e.pointerId);b.style.left=e.clientX+'px';b.style.top=e.clientY+'px';b.classList.remove('hidden');k.style.transform='translate(-50%,-50%)';dir(0,0)});z.addEventListener('pointermove',e=>{if(e.pointerId!==st.joyId)return;let dx=e.clientX-st.cx,dy=e.clientY-st.cy;let m=Math.hypot(dx,dy);if(m>st.outer){dx=dx/m*st.outer;dy=dy/m*st.outer}k.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;dir(dx,dy)});const end=e=>{if(e.pointerId!==st.joyId)return;st.joyId=null;b.classList.add('hidden');releaseDirs()};z.addEventListener('pointerup',end);z.addEventListener('pointercancel',end)}
function bindButton(el){const inputs=el.dataset.combo?el.dataset.combo.split(',').map(Number):[Number(el.dataset.input)];el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture?.(e.pointerId);el.classList.add('pressed');inputs.forEach(press)});const end=e=>{el.classList.remove('pressed');inputs.forEach(release)};el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end)}
function initButtons(){$$('[data-input],[data-combo]').forEach(bindButton)}
function initMenu(){const q=$('#quickMenu');$('#menuBtn').onclick=()=>q.classList.toggle('hidden');$('#backBtn').onclick=()=>location.href='./';$('#fullBtn').onclick=()=>document.documentElement.requestFullscreen?.().catch(()=>{});$('#controlSize').oninput=e=>document.documentElement.style.setProperty('--controlScale',e.target.value/100);$('#resetBtn').onclick=()=>{$('#controlSize').value=100;document.documentElement.style.setProperty('--controlScale',1)}}
function hideEmulatorUI(){const kill=()=>{document.querySelectorAll('[class*="virtualGamepad"],[class*="virtual-gamepad"],.ejs_menu_bar,.ejs_menu_bar_root,.ejs_control_bar,.ejs_bottom_bar').forEach(e=>e.style.display='none')};kill();new MutationObserver(kill).observe(document.body,{childList:true,subtree:true})}
document.addEventListener('DOMContentLoaded',()=>{initJoy();initButtons();initMenu();hideEmulatorUI();setTimeout(()=>screen.orientation?.lock?.('landscape').catch?.(()=>{}),300)});
