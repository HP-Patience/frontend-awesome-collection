from pathlib import Path
import base64
# Resolve paths from this script, not from the caller's working directory.
root=Path(__file__).resolve().parents[1]
w=root/'assets'
out=root/'index.html'
html=r'''<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>猫爪按钮 · Rive 交互复刻</title><link rel="icon" href="data:,">
<style>
:root{color-scheme:dark;--ink:#f0eee8;--muted:#777a80;--line:#242528;--gold:#ffaf32}*{box-sizing:border-box}body{overflow-x:clip;margin:0;background:#08090b;color:var(--ink);font-family:"Segoe UI","Microsoft YaHei",sans-serif;-webkit-font-smoothing:antialiased}button{font:inherit}header{height:76px;background:#000;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 76px 0 40px}.brand{display:flex;gap:12px;align-items:center;font-size:13px;letter-spacing:2px}.brand svg{width:25px;height:25px}.brand span{color:#666970;letter-spacing:0;font-size:12px;margin-left:10px}.cat{position:relative;width:119px;height:34px;overflow:visible;flex:none;isolation:isolate}.visual{position:absolute;left:-76px;top:-11px;width:270px;height:150px;pointer-events:none;z-index:0}.visual canvas{display:block;width:100%;height:100%}.hit{position:absolute;z-index:2;top:0;height:34px;width:60px;cursor:pointer}.hit.left{left:0}.hit.right{left:60px;width:59px}.lower{display:none;position:absolute;top:34px;width:80px;height:105px;z-index:1}.lower.left{left:-20px}.lower.right{right:-21px}.cat.active .lower{display:block}.cat:focus-visible{outline:2px solid #fff;outline-offset:7px;border-radius:8px}.fallback{position:absolute;inset:0;border:1px solid #ffb21b;border-radius:8px;display:grid;place-items:center;font-size:11px;background:#392700;color:white;pointer-events:none}.loaded .fallback{display:none}main{max-width:1160px;margin:auto;padding:70px 42px 30px}.eyebrow{color:var(--gold);font:11px/1.5 Consolas,monospace;letter-spacing:2px}.heading{display:flex;align-items:end;justify-content:space-between;gap:20px;margin:20px 0 32px}h1{font-size:clamp(29px,4vw,46px);font-weight:550;letter-spacing:-1.8px;margin:0;line-height:1.35}.intro{margin:0 0 4px;color:#96989e;font-size:13px;line-height:1.9}.stage{position:relative;border:1px solid var(--line);background:#000;border-radius:14px;min-height:370px;display:grid;place-items:center;overflow:visible}.stage-label{position:absolute;top:24px;left:26px;color:#65686f;font:10px Consolas,monospace;letter-spacing:1.5px}.scale{transform:scale(2);transform-origin:center;position:relative;top:-28px}.stage-note{position:absolute;bottom:27px;color:#666971;font-size:12px;display:flex;align-items:center;gap:9px}.stage-note i{width:5px;height:5px;border-radius:50%;background:var(--gold)}.toolbar{display:flex;justify-content:space-between;align-items:center;padding:20px 0;border-bottom:1px solid var(--line);gap:12px}.state{font:11px Consolas,monospace;color:#777d86;display:flex;gap:13px;align-items:center}.dot{width:6px;height:6px;border-radius:50%;background:#737980}.ready .dot{background:#a4c68c;box-shadow:0 0 8px #a4c68c22}#state-value{color:#cecfcf}#demo{border:1px solid #3d3525;background:#1b170f;color:#eabd6c;border-radius:7px;padding:9px 15px;cursor:pointer;font-size:12px;transition:background .2s}#demo:hover{background:#302516}#demo:focus-visible{outline:2px solid var(--gold);outline-offset:3px}#demo:disabled{opacity:.4;cursor:wait}.notes{display:grid;grid-template-columns:repeat(3,1fr);gap:40px;margin:29px 0 48px}.notes article{display:flex;gap:13px}.number{font:11px Consolas,monospace;color:#66553a;padding-top:3px}.notes h2{font-size:13px;font-weight:500;margin:0 0 8px}.notes p{font-size:12px;color:#797c82;line-height:1.8;margin:0}footer{font-size:10px;color:#62666d;line-height:1.8;display:flex;justify-content:space-between;gap:20px}footer span:last-child{font-family:Consolas,monospace}#toast{position:fixed;bottom:25px;left:50%;transform:translate(-50%,12px);background:#28231a;border:1px solid #675030;border-radius:8px;padding:12px 20px;color:#f5d8a5;font-size:12px;opacity:0;transition:opacity .2s,transform .2s;pointer-events:none;z-index:10}#toast.show{opacity:1;transform:translate(-50%,0)}@media(max-width:650px){header{padding:0 76px 0 20px}.brand span{display:none}main{padding:45px 22px 25px}.heading{display:block}.intro{margin-top:17px}.stage{min-height:340px}.scale{transform:scale(1.25)}.notes{grid-template-columns:1fr;gap:23px;margin-bottom:30px}footer{display:block}.stage-note{font-size:11px}h1{letter-spacing:-1px}.state{gap:7px;font-size:10px}}@media(prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
</head><body>
<header><div class="brand"><svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="#ffaf32" stroke-width="2"><path d="M6 24V9l7 5 3-10 3 10 7-5v15z"/><path d="M12 22h8"/></svg>PAW / PLAY<span>交互复刻实验</span></div><div class="cat" id="nav-cat" role="button" tabindex="0" aria-label="Get started 猫爪互动按钮"><div class="fallback">GET STARTED</div><div class="visual"><canvas aria-hidden="true"></canvas></div><span class="hit left" data-zone="isHoverLeft"></span><span class="hit right" data-zone="isHoverRight"></span><span class="lower left" data-zone="isHoverLeft2"></span><span class="lower right" data-zone="isHoverRight2"></span></div></header>
<main><div class="eyebrow">INTERACTION STUDY &nbsp; / &nbsp; 001</div><div class="heading"><h1>一只不太安分的猫。</h1><p class="intro">鼠标放上去，看看谁先动手。<br>原尺寸在右上角，下方放大看看。</p></div><section class="stage" aria-label="放大的猫爪按钮演示"><span class="stage-label">HOVER TO PLAY · DETAIL VIEW</span><div class="scale"><div class="cat" id="main-cat" role="button" tabindex="0" aria-label="放大猫爪按钮，悬浮互动或按 Enter 演示"><div class="fallback">GET STARTED</div><div class="visual"><canvas aria-hidden="true"></canvas></div><span class="hit left" data-zone="isHoverLeft"></span><span class="hit right" data-zone="isHoverRight"></span><span class="lower left" data-zone="isHoverLeft2"></span><span class="lower right" data-zone="isHoverRight2"></span></div></div><div class="stage-note"><i></i>试试左右两侧，再慢慢往下移</div></section><div class="toolbar"><div class="state" id="status"><span class="dot"></span><span>MOTION /</span><span id="state-value" role="status" aria-live="polite">LOADING</span></div><button id="demo" disabled>自动演示 ↗</button></div><div class="notes"><article><span class="number">01</span><div><h2>靠近</h2><p>悬浮按钮左右两侧，<br>触发不同方向的猫爪动作。</p></div></article><article><span class="number">02</span><div><h2>逗一下</h2><p>从按钮缓缓向下移动，<br>探索下方隐藏的感应区域。</p></div></article><article><span class="number">03</span><div><h2>放开</h2><p>移开鼠标，猫爪回到原位。<br>触屏或键盘可使用自动演示。</p></div></article></div><footer><span>学习演示 · 使用 Rive 原站公开动画资源，素材权利归原作者。<br>动画与运行时已内嵌，打开本文件即可使用，无需联网。</span><span>RIVE CANVAS / CAT → MOTION</span></footer></main><div id="toast" role="status">这里是交互演示，不会跳转注册页面。</div>
<script>__RUNTIME__</script>
<script>
'use strict';
const wasm='data:application/wasm;base64,__WASM__';
const bytes=Uint8Array.from(atob('__RIV__'),c=>c.charCodeAt(0));
rive.RuntimeLoader.setWasmUrl(wasm);
const keys=['isHoverLeft','isHoverRight','isHoverLeft2','isHoverRight2','isHovercenter'];
const label=document.querySelector('#state-value');
const demo=document.querySelector('#demo');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let loaded=0,sequence=0,toastTimer;
const controllers=[];
function notify(){clearTimeout(toastTimer);document.querySelector('#toast').classList.add('show');toastTimer=setTimeout(()=>document.querySelector('#toast').classList.remove('show'),2200)}
function updateStatus(zone){label.textContent=zone?zone.replace('isHover','HOVER / ').toUpperCase():'IDLE'}
function createCat(root){
 const canvas=root.querySelector('canvas');let inputs=[],pending=null,current=null,ready=false;
 const instance=new rive.Rive({buffer:bytes.buffer.slice(0),canvas,artboard:'Cat',stateMachines:'Motion',autoplay:true,layout:new rive.Layout({fit:rive.Fit.Contain,alignment:rive.Alignment.Center}),onLoad(){
  inputs=instance.stateMachineInputs('Motion');ready=true;instance.resizeDrawingSurfaceToCanvas();root.classList.add('loaded');loaded++;if(loaded===2){document.querySelector('#status').classList.add('ready');updateStatus(null);demo.disabled=false}if(reduced)instance.pause();
 },onLoadError(error){label.textContent='LOAD ERROR';console.error(error)}});
 const control={instance,get current(){return current},get inputs(){return inputs},set(zone){
  if(!ready)return;clearTimeout(pending);current=zone;
  // Canvas is non-interactive. HTML hit zones select one state input at a time.
  inputs.forEach(input=>{if(keys.includes(input.name))input.value=input.name===zone});
  root.classList.toggle('active',Boolean(zone));instance.play('Motion');updateStatus(zone);
 },resetSoon(){clearTimeout(pending);pending=setTimeout(()=>control.set(null),45)}};
 root.querySelectorAll('[data-zone]').forEach(el=>{el.addEventListener('pointerenter',event=>{if(event.pointerType==='touch')return;sequence++;control.set(el.dataset.zone)});el.addEventListener('pointerleave',()=>control.resetSoon())});
 root.addEventListener('pointerleave',()=>control.resetSoon());
 root.addEventListener('click',event=>{notify();if(event.pointerType==='touch')runDemo(control)});
 root.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();runDemo(control)}if(event.key==='Escape'){sequence++;control.set(null)}});
 root.addEventListener('blur',()=>{sequence++;control.set(null)});
 const resize=()=>instance.resizeDrawingSurfaceToCanvas();new ResizeObserver(resize).observe(canvas);
 window.addEventListener('resize',resize);controllers.push(control);return control;
}
const nav=createCat(document.querySelector('#nav-cat'));
const main=createCat(document.querySelector('#main-cat'));
async function runDemo(control=main){
 const id=++sequence;demo.textContent='正在演示…';
 const frames=[[null,250],['isHoverRight',1100],['isHoverRight2',1000],[null,650],['isHoverLeft',1100],['isHoverLeft2',1000],[null,400]];
 for(const [zone,delay] of frames){if(id!==sequence)break;control.set(zone);await new Promise(resolve=>setTimeout(resolve,delay))}
 demo.textContent='自动演示 ↗';
}
demo.addEventListener('click',()=>runDemo());
document.addEventListener('visibilitychange',()=>{if(document.hidden){sequence++;controllers.forEach(c=>{c.set(null);c.instance.pause()})}else controllers.forEach(c=>{if(!reduced)c.instance.play('Motion')})});
window.addEventListener('pagehide',()=>controllers.forEach(c=>c.instance.cleanup()));
window.catDemo={controllers,runDemo};
</script></body></html>'''
html=html.replace('__RUNTIME__',(w/'rive.js').read_text(encoding='utf-8').replace('</script','<\\/script'))
html=html.replace('__WASM__',base64.b64encode((w/'rive.wasm').read_bytes()).decode())
html=html.replace('__RIV__',base64.b64encode((w/'cat.riv').read_bytes()).decode())
out.write_text(html,encoding='utf-8')
print(out, out.stat().st_size)
