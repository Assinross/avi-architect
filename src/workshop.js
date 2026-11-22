import * as Engine from './multistorey';
import { MultiStoreyView } from './rendering/multistorey';
import { load as loadCity, save as saveCity } from './storage';
import { publishLandmark } from './city-landmark';
import { builderIssues, commissionModel, profiles } from './builder-policy';
import { complete, currentQuest } from './model';
import * as Gestures from './plan-interactions';
(function(){
'use strict';
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
const careerQuest=params.get('mode')==='career' ? params.get('quest') : null;
const mode=['home','bakery','landmark'].includes(careerQuest)?careerQuest:'free';
const profile=profiles[mode];
const key=mode==='free'?'avi-architect.multistorey-workshop.v1':`avi-architect.career.${mode}.v1`;
document.title=profile.title+' · Avi Architect';
$('modeTitle').textContent=mode==='free'?'СВОБОДНАЯ МАСТЕРСКАЯ · ВСЕ ИНСТРУМЕНТЫ ОТКРЫТЫ':'КАРЬЕРА АРХИТЕКТОРА · ПОЭТАПНОЕ РАЗВИТИЕ';
$('mainHeading').textContent=mode==='free'?'Мой дом мечты':profile.title;
$('modeDescription').textContent=mode==='free'
  ?'Строй сколько угодно этажей, планируй лестницы и комнаты. Результат всегда виден справа в 3D.'
  :mode==='home'?'Первый заказ: научись менять контур дома, добавлять вход и окна. Перегородки и этажи откроются позже.'
  :mode==='bakery'?'Второй заказ: теперь доступны внутренние перегородки. Этажи и лестницы откроются после пекарни.'
  :'Третий заказ: многоэтажность открыта. Спроектируй двухэтажный дом со ступенями и рассчитай бюджет.';
const cell=36, bx=60, by=48;
const px=x=>bx+x*cell, py=z=>by+z*cell;
const rectFloor=(x0,z0,x1,z1,index)=>({walls:[
 {id:`f${index}a`,a:[x0,z0],b:[x1,z0]}, {id:`f${index}b`,a:[x1,z0],b:[x1,z1]},
 {id:`f${index}c`,a:[x1,z1],b:[x0,z1]}, {id:`f${index}d`,a:[x0,z1],b:[x0,z0]},
],openings:[],partitions:[],stairToNext:null});
const starter=mode==='home'?rectFloor(2,2,6,5,0):mode==='bakery'?rectFloor(2,2,7,6,0):rectFloor(1,1,8,7,0);
let project={floors:[starter]}, active=0,tool='inspect',start=null,past=[],future=[];
try {
  const saved=JSON.parse(localStorage.getItem(key)||'null');
  if(isSafePlan(saved))project=saved;
  else if(mode==='landmark') {
    const city=loadCity();
    if(city?.landmark)project=structuredClone(city.landmark);
  }
} catch {}
function isSafePlan(p) {
  return p && Array.isArray(p.floors) && p.floors.length > 0 && p.floors.length <= 400 && p.floors.every(f =>
    f && Array.isArray(f.walls) && f.walls.length === 4 &&
    Array.isArray(f.openings) && f.openings.length < 600 &&
    Array.isArray(f.partitions) && f.partitions.length < 600 &&
    (f.stairToNext === null || (f.stairToNext && Number.isSafeInteger(f.stairToNext.x) && Number.isSafeInteger(f.stairToNext.z) &&
      (f.stairToNext.kind===undefined || ['straight','spiral'].includes(f.stairToNext.kind)))) &&
    f.walls.every(w => w && typeof w.id === 'string' && Array.isArray(w.a) && Array.isArray(w.b) &&
      w.a.length === 2 && w.b.length === 2 && [...w.a, ...w.b].every(Number.isSafeInteger)) &&
    f.partitions.every(w => w && typeof w.id === 'string' && Array.isArray(w.a) && Array.isArray(w.b) &&
      w.a.length === 2 && w.b.length === 2 && [...w.a, ...w.b].every(Number.isSafeInteger)) &&
    f.openings.every(o => o && typeof o.wallId === 'string' && ['door','window'].includes(o.kind) &&
      Number.isFinite(o.offset))
  );
}
const deep=x=>JSON.parse(JSON.stringify(x));
function save(){try{localStorage.setItem(key,JSON.stringify(project));}catch{message('Сохранение недоступно в этом браузере.')}}
function snapshot(){past.push(deep(project));if(past.length>80)past.shift();future=[]}
function modify(fn){snapshot();try{fn();save();paint()}catch(e){project=past.pop();paint();message(e.message||'Не удалось изменить проект')}}
function message(s){$('status').textContent=s}
function toast(s){$('toast').textContent=s;$('toast').hidden=false;window.setTimeout(()=>$('toast').hidden=true,2500)}
function rfloor(i=active){return Engine.footprint(project.floors[i])}
function dims(){const r=rfloor();if(!r)return;for(const [id,n] of [['x0',r.x0],['z0',r.z0],['w',r.x1-r.x0],['d',r.z1-r.z0]])$(id).value=n}
function poly(points,fill,stroke='none',sw=1,other=''){return `<polygon points="${points.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${other}/>`}
function parseXY(s){return s.split(',').map(Number)}
const p3=(x,z,y)=>[300+(x-z)*16,155+(x+z)*8-y*20];
let renderedPlan = '';
let showRoof = true, cutaway = false;
let scene;
const previewPanel=document.querySelector('.preview-panel');
const previewToggle=$('previewToggle');
if(!profile.live3d){
  $('careerReview').hidden=false;
  document.body.classList.add('career');
  previewPanel.hidden=true;
  previewToggle.hidden=false;
  $('fromCity').hidden=true;
  $('import').hidden=true;
  $('export').hidden=true;
}
if(!profile.partitions)document.querySelector('[data-tool="partition"]').hidden=true;
if(!profile.stairs) {
  document.querySelector('[data-tool="stairs"]').hidden=true;
  $('stairFacing').closest('label').hidden=true;
  $('stairKind').closest('label').hidden=true;
}
$('add').disabled=profile.maxFloors===1;
$('remove').disabled=profile.maxFloors===1;
$('publish').textContent=mode==='free'?'Поселить в городе':'Сдать заказ';
function initScene(){
  if(scene)return;
  try{scene=new MultiStoreyView($('volume'))}
  catch(error){
    $('volume').textContent='Для 3D-вида нужен WebGL. Планировщик 2D продолжает работать.';
    console.warn('WebGL unavailable:',error);
  }
}
if(profile.live3d)initScene();
previewToggle.addEventListener('click',()=>{
  if(!previewPanel.hidden){
    previewPanel.hidden=true;document.body.classList.remove('show-preview');
    previewToggle.textContent='Посмотреть 3D';
  }else{
    previewPanel.hidden=false;document.body.classList.add('show-preview');
    previewToggle.textContent='Вернуться к плану';
    initScene();renderedPlan='';volume();
  }
});
function volume() {
  if (!scene || previewPanel.hidden) return;
  const options={showRoof, ...(cutaway?{cutawayFloor:active}:{})};
  const current = JSON.stringify([project,options]);
  if (current !== renderedPlan) { scene.render(project, options); renderedPlan = current; }
}
window.addEventListener('pagehide', () => scene?.dispose());
function drawPlan(){
 const f=project.floors[active],r=rfloor(),items=[];
 items.push(`<rect x="${bx}" y="${by}" width="${12*cell}" height="${10*cell}" fill="#f8f7eb" stroke="#b5c3af" stroke-width="1"/>`);
 const below=active?rfloor(active-1):null;
 if(below)items.push(`<rect x="${px(below.x0)}" y="${py(below.z0)}" width="${(below.x1-below.x0)*cell}" height="${(below.z1-below.z0)*cell}" fill="#f0ce9c" opacity=".36" stroke="#c49b6d" stroke-dasharray="5 5" stroke-width="2"/>`)
 if(r)items.push(`<rect x="${px(r.x0)}" y="${py(r.z0)}" width="${(r.x1-r.x0)*cell}" height="${(r.z1-r.z0)*cell}" fill="#e4efe5" stroke="#b2c4b5" ${tool==='inspect'?'data-drag-room="true"':''}/>`)
 // On the lower floor show the raised mansard wing and its automatic pillars.
 for(const wing of Engine.overhangs(project).filter(w=>w.upperFloor===active+1)){
   items.push(`<rect data-overhang="true" x="${px(wing.x0)}" y="${py(wing.z0)}" width="${(wing.x1-wing.x0)*cell}" height="${(wing.z1-wing.z0)*cell}" fill="#ddba9666" stroke="#af7952" stroke-width="2" stroke-dasharray="7 4" pointer-events="none"/>`)
 }
 for(const support of Engine.columns(project).filter(c=>c.upperFloor===active+1)){
   items.push(`<circle data-support="true" cx="${px(support.x)}" cy="${py(support.z)}" r="5" fill="#8e6a50" stroke="#ffefd7" stroke-width="2" pointer-events="none"/>`)
 }
 for(let x=0;x<=12;x++){items.push(`<line x1="${px(x)}" y1="${py(0)}" x2="${px(x)}" y2="${py(10)}" class="grid-line"/><text x="${px(x)}" y="${by-13}" fill="#839786" text-anchor="middle" font-size="10">${x}</text>`)}
 for(let z=0;z<=10;z++){items.push(`<line x1="${px(0)}" y1="${py(z)}" x2="${px(12)}" y2="${py(z)}" class="grid-line"/><text x="${bx-15}" y="${py(z)+3}" fill="#839786" text-anchor="middle" font-size="10">${z}</text>`)}
 const stair=f.stairToNext;
 if(stair){const s=Engine.stairRect(stair),w=(s.x1-s.x0)*cell,d=(s.z1-s.z0)*cell;
  const spiral=stair.kind==='spiral';
  items.push(`<g data-stair="true" data-stair-kind="${spiral?'spiral':'straight'}"><rect x="${px(s.x0)}" y="${py(s.z0)}" width="${w}" height="${d}" fill="#a2c7c6aa" stroke="#477c83" stroke-width="2"/>`);
  if(spiral){
    const cx=px((s.x0+s.x1)/2),cy=py((s.z0+s.z1)/2);
    items.push(`<circle cx="${cx}" cy="${cy}" r="${cell*.38}" fill="none" stroke="#477c83" stroke-width="1.7"/>`);
    for(let k=0;k<12;k++){const angle=k*Math.PI/6;
      items.push(`<line x1="${cx}" y1="${cy}" x2="${cx+Math.cos(angle)*cell*.38}" y2="${cy+Math.sin(angle)*cell*.38}" stroke="#477c83" stroke-width="1.2"/>`)}
  }else{
    for(let k=1;k<12;k++){const fraction=k/12;
      if(stair.facing==='north'||stair.facing==='south')
        items.push(`<line x1="${px(s.x0)+4}" y1="${py(s.z0)+fraction*d}" x2="${px(s.x1)-4}" y2="${py(s.z0)+fraction*d}" stroke="#477c83" stroke-width="1"/>`);
      else items.push(`<line x1="${px(s.x0)+fraction*w}" y1="${py(s.z0)+4}" x2="${px(s.x0)+fraction*w}" y2="${py(s.z1)-4}" stroke="#477c83" stroke-width="1"/>`)}
  }
  items.push(`<text x="${px((s.x0+s.x1)/2)}" y="${py((s.z0+s.z1)/2)+3}" text-anchor="middle" fill="#2c6465" font-weight="800" font-size="12">${spiral?'↻':'↑'}</text></g>`)
 }
 if(active>0){const incoming=project.floors[active-1].stairToNext;
  if(incoming){const s=Engine.stairRect(incoming);items.push(`<rect x="${px(s.x0)}" y="${py(s.z0)}" width="${(s.x1-s.x0)*cell}" height="${(s.z1-s.z0)*cell}" fill="none" stroke="#3b9b91" stroke-dasharray="5 4" stroke-width="3"/><text x="${px(s.x0)+6}" y="${py(s.z1)-5}" fill="#407c7a" font-size="10">снизу</text>`)}}
 for(const [kind,walls] of [['wall',f.walls],['partition',f.partitions]])for(const w of walls){
  items.push(`<line x1="${px(w.a[0])}" y1="${py(w.a[1])}" x2="${px(w.b[0])}" y2="${py(w.b[1])}" class="${kind} ${tool==='erase'?'hot':''}" data-remove-wall="${kind==='partition'?w.id:''}"/>`);
  if(tool==='inspect'){
    const attr=kind==='wall'?`data-drag-edge="${w.id}"`:`data-drag-partition="${w.id}"`;
    items.push(`<line x1="${px(w.a[0])}" y1="${py(w.a[1])}" x2="${px(w.b[0])}" y2="${py(w.b[1])}" stroke="transparent" stroke-width="24" pointer-events="stroke" ${attr}/>`);
    if(kind==='wall'){
      const x=(w.a[0]+w.b[0])/2,z=(w.a[1]+w.b[1])/2;
      const arrow=w.a[0]===w.b[0]?'↔':'↕';
      items.push(`<circle data-drag-edge="${w.id}" cx="${px(x)}" cy="${py(z)}" r="10" fill="#fff9e4" stroke="#5e836c" stroke-width="2.5"/>`);
      items.push(`<text x="${px(x)}" y="${py(z)+4}" font-size="12" text-anchor="middle" font-weight="800" fill="#3b6854" pointer-events="none">${arrow}</text>`);
    }
    if(kind==='partition')for(const end of ['a','b']){
      items.push(`<circle cx="${px(w[end][0])}" cy="${py(w[end][1])}" r="9" class="vertex-handle" data-drag-end="${w.id}" data-end="${end}"/>`);
    }
  }
  if(tool==='door'||tool==='window'||tool==='erase'){
   for(let k=0;k<Engine.wallLength(w);k++){const off=k+.5,x=w.a[0]+(w.b[0]-w.a[0])*off/Engine.wallLength(w),z=w.a[1]+(w.b[1]-w.a[1])*off/Engine.wallLength(w);
    items.push(`<circle cx="${px(x)}" cy="${py(z)}" r="11" fill="transparent" class="cell" data-wall="${w.id}" data-offset="${off}"/>`);
   }
  }
 }
 // Each adjacent sequence of cells is one resizable glazed opening.
 for(const w of [...f.walls,...f.partitions]){
  const length=Engine.wallLength(w);
  if(!length)continue;
  for(const run of Engine.openingRuns(w,f.openings)){
   const begin=(run.offset-.5)/length,end=(run.offset-.5+run.width)/length;
   const x0=w.a[0]+(w.b[0]-w.a[0])*begin,z0=w.a[1]+(w.b[1]-w.a[1])*begin;
   const x1=w.a[0]+(w.b[0]-w.a[0])*end,z1=w.a[1]+(w.b[1]-w.a[1])*end;
   const x=(x0+x1)/2,z=(z0+z1)/2,color=run.kind==='door'?'#c18a58':'#83b9c5';
   items.push(`<line data-opening-span="${run.kind}" data-span-width="${run.width}" x1="${px(x0)}" y1="${py(z0)}" x2="${px(x1)}" y2="${py(z1)}" stroke="${color}" stroke-width="8" stroke-linecap="round" pointer-events="none"/>`);
   if(tool==='inspect')items.push(`<line x1="${px(x0)}" y1="${py(z0)}" x2="${px(x1)}" y2="${py(z1)}" stroke="transparent" stroke-width="22" pointer-events="stroke" data-drag-opening="${w.id}" data-run-offset="${run.offset}" data-run-width="${run.width}"/>`);
   if(run.width>1)items.push(`<text x="${px(x)}" y="${py(z)-10}" text-anchor="middle" font-size="10" font-weight="800" fill="#477c83" pointer-events="none">${run.width} м</text>`);
  }
 }
 if(tool==='partition'||tool==='outline'||tool==='stairs'){
  if(tool==='stairs'){for(let x=0;x<=12;x++)for(let z=0;z<=10;z++)items.push(`<circle cx="${px(x)}" cy="${py(z)}" r="12" fill="transparent" class="cell" data-stair-node="${x},${z}"/>`)}
  else for(let x=0;x<=12;x++)for(let z=0;z<=10;z++)items.push(`<circle cx="${px(x)}" cy="${py(z)}" r="${start&&start[0]===x&&start[1]===z?6:3}" class="node" data-node="${x},${z}"/>`)
 }
 if(gesture&&(gesture.kind==='new-partition'||gesture.kind==='outline')&&gesture.moved){
   const a=gesture.origin,b=gesture.current;
   if(gesture.kind==='new-partition'){
     const end=Math.abs(b[0]-a[0])>=Math.abs(b[1]-a[1])?[b[0],a[1]]:[a[0],b[1]];
     items.push(`<line data-ghost="true" x1="${px(a[0])}" y1="${py(a[1])}" x2="${px(end[0])}" y2="${py(end[1])}"/>`);
   }else{
     const x0=Math.min(a[0],b[0]),z0=Math.min(a[1],b[1]);
     items.push(`<rect data-ghost="true" x="${px(x0)}" y="${py(z0)}" width="${Math.abs(b[0]-a[0])*cell}" height="${Math.abs(b[1]-a[1])*cell}" fill="none"/>`);
   }
 }
 $('plan').innerHTML=items.join('')
}
function paint(){
 const f=project.floors[active],r=rfloor(),issues=Engine.validate(project),careerIssues=builderIssues(project,mode),posts=Engine.columns(project),roof=Engine.roofs(project),price=Engine.estimate(project);
 $('floorcount').textContent=project.floors.length;$('floorStat').textContent=project.floors.length;
 $('selectedFloor').textContent=`${active+1} этаж`;$('floorTitle').textContent=`${active+1} этажа`;
 if(f.stairToNext){$('stairFacing').value=f.stairToNext.facing;$('stairKind').value=f.stairToNext.kind||'straight';}
 $('floors').innerHTML=[...project.floors].reverse().map((floor,ri)=>{const i=project.floors.length-1-ri;
  return `<button class="floor" data-floor="${i}" aria-pressed="${i===active}">▣ ${i+1} этаж <span>${Engine.rectangleArea(Engine.footprint(floor)||{x0:0,x1:0,z0:0,z1:0})} м²</span></button>`}).join('');
 $('remove').disabled=project.floors.length===1||!profile.stairs;$('add').disabled=project.floors.length>=profile.maxFloors;$('undo').disabled=!past.length;$('redo').disabled=!future.length;
 $('tools').querySelectorAll('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===tool)));
 $('area').textContent=`${Engine.totalArea(project)} м²`;$('columns').textContent=posts.length;
 $('roofArea').textContent=`${roof.reduce((n,r)=>n+Engine.rectangleArea(r),0)} м²`;
 const entries=[['Наружные стены',price.outerWalls],['Перегородки',price.partitions],['Окна и двери',price.openings],['Перекрытия',price.slabs],['Лестницы',price.stairs],['Опорные колонны',price.columns],['Кровля и террасы',price.roofs]];
 $('estimate').innerHTML=entries.map(([s,n])=>`<div class="estrow"><span>${s}</span><b class="mono">${Math.round(n)} ◇</b></div>`).join('')+
   `<div class="estrow total"><span>Итого</span><b class="mono">${Math.round(price.total)} ◇</b></div>`+
   (profile.budget!==null?`<div class="estrow"><span>Бюджет заказа</span><b class="mono">${profile.budget} ◇</b></div>`:'');
 $('checks').innerHTML=careerIssues.length?careerIssues.slice(0,12).map(text=>`<li>${text}</li>`).join(''):
 `<li class="fine">✓ Проект удовлетворяет требованиям ${mode==='free'?'геометрии':'заказчика'}.</li>`;
 if(careerIssues.length>12)$('checks').innerHTML+=`<li>И ещё ${careerIssues.length-12} замечаний.</li>`;
 if(!profile.live3d)$('careerChecks').innerHTML=$('checks').innerHTML;
 dims();drawPlan();volume();
}
function setFootprint(){
 const x0=+$('x0').value,z0=+$('z0').value,w=+$('w').value,d=+$('d').value;
 if(![x0,z0,w,d].every(Number.isInteger)||x0<0||z0<0||w<2||d<2||x0+w>12||z0+d>10){toast('Комната должна помещаться на сетке, размер каждой стороны от 2 м.');dims();return}
 const prior=rfloor();if(prior&&prior.x0===x0&&prior.z0===z0&&prior.x1===x0+w&&prior.z1===z0+d)return;
 const changed=Gestures.dragFootprint(project.floors[active],[x0,z0],[x0+w,z0+d]);
 if(!changed){toast('Не получилось изменить контур: проверь перегородки и окна.');dims();return}
 modify(()=>{project.floors[active]=changed});
 message('Контур изменён, наружные стены соединены. Окна и перегородки адаптированы.');
}
$('floors').addEventListener('click',e=>{const b=e.target.closest('[data-floor]');if(!b)return;active=+b.dataset.floor;start=null;paint();message('План этажа выбран. Нижний контур виден светлым пунктиром.')});
$('tools').addEventListener('click',e=>{const b=e.target.closest('[data-tool]');if(!b||b.hidden||b.disabled)return;tool=b.dataset.tool;start=null;paint();message({outline:'Потяни от первого угла комнаты до противоположного: все четыре внешние стены подстроятся.',partition:'Нажми и тяни, чтобы нарисовать прямую стену. Можно также выбрать две точки по очереди.',stairs:'Выбери тип лестницы, затем начальную клетку.',door:'Нажми на метровый участок стены.',window:'Нажми на метровый участок стены; соседние окна объединятся.',erase:'Нажми на элемент для удаления.',inspect:'Тяни внешнюю стену, перегородку, её конец, окно, лестницу или всю комнату. Esc отменяет перетаскивание.'}[tool])});

/**
 * One pointer gesture = one undo step, for mouse, pen and touch.
 * Keep capture on the stable <svg> root so rerendering handles during a drag
 * cannot lose pointermove/pointerup.
 */
const planSvg=$('plan');
let gesture=null;
let suppressClick=false;
function gridPoint(event){
 const matrix=planSvg.getScreenCTM();
 if(!matrix)return null;
 const pointer=planSvg.createSVGPoint();
 pointer.x=event.clientX;pointer.y=event.clientY;
 const local=pointer.matrixTransform(matrix.inverse());
 return [
  Math.max(0,Math.min(Engine.GRID.width,Math.round((local.x-bx)/cell))),
  Math.max(0,Math.min(Engine.GRID.depth,Math.round((local.y-by)/cell)))
 ];
}
function cancelGesture(){
 if(!gesture)return;
 project=gesture.before;
 gesture=null;
 $('planDrawing').classList.remove('dragging');
 paint();
 message('Перетаскивание отменено.');
}
function finishGesture(){
 if(!gesture)return;
 const g=gesture;
 gesture=null;
 $('planDrawing').classList.remove('dragging');
 // A click without movement must keep the original SVG node in the DOM until
 // the browser dispatches click; repainting on pointerup would destroy it.
 if(!g.moved)return;
 if(g.moved){
   suppressClick=true;
   // Some browsers omit click after a pointer capture/drag.
   window.setTimeout(()=>{suppressClick=false},200);
 }
 if(g.changed){
   past.push(g.before);if(past.length>80)past.shift();
   future=[];
   start=null;
   save();paint();
   message(g.kind==='edge'?'Комната растянута: четыре стены остались соединены.':
     g.kind==='new-partition'?'Стена создана.':
     g.kind==='outline'?'Контур комнаты перестроен.':'Элемент перемещён. Для отмены нажми ↶.');
 }else{
   project=g.before;
   paint();
   if(g.moved)message('Дальше переместить нельзя: границы участка, стены или проёмы не позволяют.');
 }
}
planSvg.addEventListener('pointerdown',event=>{
 if(gesture||(event.pointerType==='mouse'&&event.button!==0))return;
 const target=event.target instanceof Element?event.target:null;
 const point=gridPoint(event);
 if(!target||!point)return;
 let kind=null,id=null,part=null,runOffset=null,runWidth=null;
 if(tool==='partition'&&profile.partitions)kind='new-partition';
 else if(tool==='outline')kind='outline';
 else if(tool==='inspect'){
   const opening=target.closest('[data-drag-opening]');
   const endpoint=target.closest('[data-drag-end]');
   const exterior=target.closest('[data-drag-edge]');
   const partition=target.closest('[data-drag-partition]');
   if(opening){
     kind='opening';id=opening.dataset.dragOpening;
     runOffset=Number(opening.dataset.runOffset);runWidth=Number(opening.dataset.runWidth);
   }else if(endpoint){
     kind='partition-end';id=endpoint.dataset.dragEnd;part=endpoint.dataset.end;
   }else if(partition){kind='partition';id=partition.dataset.dragPartition}
   else if(exterior){kind='edge';id=exterior.dataset.dragEdge}
   else if(target.closest('[data-stair]')&&project.floors[active].stairToNext)kind='stair';
   else if(target.closest('[data-drag-room]'))kind='room';
 }
 if(!kind)return;
 gesture={pointerId:event.pointerId,kind,id,part,runOffset,runWidth,
   floor:active,origin:point,current:point,before:deep(project),
   moved:false,changed:false,
   newId:'inner-'+Date.now()+'-'+Math.random().toString(36).slice(2,7)};
 // For a simple two-click wall placement, let the native click keep its node target.
 // Capture the pointer immediately for existing-element moves; for new drawing
 // capture only once it has actually moved to another grid point.
 if(kind!=='new-partition'&&kind!=='outline')planSvg.setPointerCapture(event.pointerId);
 $('planDrawing').classList.add('dragging');
});
planSvg.addEventListener('pointermove',event=>{
 const g=gesture;
 if(!g||g.pointerId!==event.pointerId)return;
 const point=gridPoint(event);
 if(!point||point[0]===g.current[0]&&point[1]===g.current[1])return;
 g.current=point;
 if(point[0]!==g.origin[0]||point[1]!==g.origin[1]){
   g.moved=true;
   if(!planSvg.hasPointerCapture(event.pointerId))
     planSvg.setPointerCapture(event.pointerId);
 }
 const dx=point[0]-g.origin[0],dz=point[1]-g.origin[1];
 const floor=g.before.floors[g.floor];
 let next=null;
 switch(g.kind){
   case 'edge':{
     const w=floor.walls.find(w=>w.id===g.id);
     if(w)next=Gestures.dragExteriorWall(floor,g.id,w.a[0]===w.b[0]?point[0]:point[1]);
     break;
   }
   case 'room':next=Gestures.dragRoom(floor,dx,dz);break;
   case 'partition':next=Gestures.dragPartition(floor,g.id,dx,dz);break;
   case 'partition-end':next=Gestures.dragPartitionEnd(floor,g.id,g.part,point);break;
   case 'stair':next=Gestures.dragStaircase(floor,dx,dz);break;
   case 'opening':{
     const w=[...floor.walls,...floor.partitions].find(w=>w.id===g.id);
     if(w){
       const axis=w.a[0]===w.b[0]?1:0;
       const direction=Math.sign(w.b[axis]-w.a[axis]);
       const nextOffset=g.runOffset+(axis===0?dx:dz)*direction;
       next=Gestures.dragOpeningRun(floor,g.id,g.runOffset,g.runWidth,nextOffset);
     }
     break;
   }
   case 'new-partition':{
     // CAD-style orthogonal snapping keeps every wall perfectly straight.
     const end=Math.abs(dx)>=Math.abs(dz)?
       [point[0],g.origin[1]]:[g.origin[0],point[1]];
     next=Gestures.drawPartition(floor,g.origin,end,g.newId);
     break;
   }
   case 'outline':next=Gestures.dragFootprint(floor,g.origin,point);break;
 }
 if(!next){
   // A rejected preview never corrupts the last valid state.
   return;
 }
 project=deep(g.before);
 project.floors[g.floor]=next;
 g.changed=JSON.stringify(next)!==JSON.stringify(floor);
 drawPlan();
 // Only a snapped grid change rebuilds the 3D mesh, not every mouse pixel.
 volume();
});
planSvg.addEventListener('pointerup',event=>{
 if(gesture?.pointerId===event.pointerId)finishGesture();
});
planSvg.addEventListener('pointercancel',event=>{
 if(gesture?.pointerId===event.pointerId)cancelGesture();
});
window.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&gesture){event.preventDefault();cancelGesture();}
});
$('plan').addEventListener('click',e=>{
 // A synthetic click after capture lands on the SVG root; do not swallow
 // the next genuine quick click on a window, stair or grid node.
 if(suppressClick){suppressClick=false;if(e.target===planSvg)return}
 const t=e.target;
 const node=t.closest('[data-node]');const stairNode=t.closest('[data-stair-node]');const wallTarget=t.closest('[data-wall]');const partitionTarget=t.closest('[data-remove-wall]');
 if(node&&tool==='outline'){
  const point=parseXY(node.dataset.node);
  if(!start){start=point;message('Начальная точка выбрана. Теперь выбери противоположный угол или растяни контур мышью.');paint();return}
  const first=start;start=null;
  const changed=Gestures.dragFootprint(project.floors[active],first,point);
  if(!changed){message('Минимальный размер 2 × 2 м; существующие элементы должны оставаться внутри.');paint();return}
  modify(()=>{project.floors[active]=changed});message('Контур комнаты замкнут и обновлён.');return;
 }
 if(node&&tool==='partition'&&profile.partitions){
  const pt=parseXY(node.dataset.node);if(!start){start=pt;message(`Первая точка (${pt.join(', ')}). Укажи вторую точку на той же вертикали или горизонтали.`);paint();return}
  const first=start;start=null;if(first[0]!==pt[0]&&first[1]!==pt[1]){message('Перегородка должна быть прямой: горизонталь или вертикаль.');paint();return}
  if(first[0]===pt[0]&&first[1]===pt[1]){paint();return}
  const id=`inner-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  const changed=Gestures.drawPartition(project.floors[active],first,pt,id);
  if(!changed){message('Не удалось поставить стену: она должна быть внутри комнаты, без наложений.');paint();return}
  modify(()=>{project.floors[active]=changed});message('Стена добавлена.');return;
 }
 if(stairNode&&tool==='stairs'&&profile.stairs){
  if(active===project.floors.length-1){message('Сначала добавь следующий этаж, затем выбери этот этаж и поставь лестницу.');return}
  const [x,z]=parseXY(stairNode.dataset.stairNode);modify(()=>project.floors[active].stairToNext={x,z,facing:$('stairFacing').value,kind:$('stairKind').value});message('Лестница обновлена. Если она не помещается на обоих этажах, появится предупреждение.');return;
 }
 if(wallTarget&&['door','window','erase'].includes(tool)){
  const wallId=wallTarget.dataset.wall,offset=+wallTarget.dataset.offset;
  modify(()=>{const f=project.floors[active],existing=f.openings.findIndex(o=>o.wallId===wallId&&o.offset===offset);
    if(tool==='erase'){if(existing>=0)f.openings.splice(existing,1)}else if(existing>=0)f.openings[existing]={wallId,offset,kind:tool};else f.openings.push({wallId,offset,kind:tool})});
  message(tool==='erase'?'Проём удалён.':'Проём размещён.');return;
 }
 if(partitionTarget&&tool==='erase'&&partitionTarget.dataset.removeWall){modify(()=>{const f=project.floors[active];const id=partitionTarget.dataset.removeWall;f.partitions=f.partitions.filter(w=>w.id!==id);f.openings=f.openings.filter(o=>o.wallId!==id)});message('Перегородка удалена.');return}
 if(tool==='erase'&&t.closest('[data-stair]')){modify(()=>project.floors[active].stairToNext=null);message('Лестница удалена.')}
});
$('stairFacing').addEventListener('change',()=>{
 if(project.floors[active].stairToNext)modify(()=>project.floors[active].stairToNext.facing=$('stairFacing').value);
});
$('stairKind').addEventListener('change',()=>{
 if(project.floors[active].stairToNext)modify(()=>project.floors[active].stairToNext.kind=$('stairKind').value);
});
for(const id of ['x0','z0','w','d'])$(id).addEventListener('change',setFootprint);
$('add').addEventListener('click',()=>{if(!profile.stairs||project.floors.length>=profile.maxFloors)return;modify(()=>{const below=project.floors.length-1;project=Engine.addFloor(project);const r=rfloor(below);
  if(r&&!project.floors[below].stairToNext)project.floors[below].stairToNext={x:r.x0,z:r.z0,facing:'north',kind:'straight'};
  active=project.floors.length-1;start=null;});message('Новый этаж скопировал наружный контур. Уменьши его габариты и проверь лестницу.')});
$('remove').addEventListener('click',()=>{if(!profile.stairs||project.floors.length<2)return;modify(()=>{project=Engine.removeTopFloor(project);active=Math.min(active,project.floors.length-1);start=null});message('Верхний этаж удалён.')});
$('undo').addEventListener('click',()=>{if(!past.length)return;future.push(deep(project));project=past.pop();active=Math.min(active,project.floors.length-1);start=null;save();paint();message('Последнее действие отменено.')});
$('redo').addEventListener('click',()=>{if(!future.length)return;past.push(deep(project));project=future.pop();active=Math.min(active,project.floors.length-1);start=null;save();paint();message('Действие повторено.')});
$('reset').addEventListener('click',()=>{if(confirm('Создать новый проект? Текущий эскиз будет удалён.')){modify(()=>{project={floors:[deep(starter)]};active=0;start=null});message('Создан новый проект.') }});
$('import').addEventListener('click', () => $('importFile').click());
$('importFile').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > 2_000_000) throw Error('Файл слишком большой.');
    const data = JSON.parse(await file.text());
    if (!isSafePlan(data) || Engine.validate(data).some(i => i.kind === 'footprint'))
      throw Error('Неверный формат проекта.');
    if (!confirm('Загрузить проект вместо текущего?')) return;
    modify(() => {project={floors:deep(data.floors)}; active=0; start=null;});
    message('Проект импортирован.');
  } catch (error) {toast(error.message || 'Не удалось прочитать проект.');}
  finally {event.target.value='';}
});
$('fromCity').addEventListener('click', () => {
  try {
    const envelope=JSON.parse(localStorage.getItem('architects-of-time.valley')||'null');
    const cityHome=envelope?.world?.buildings?.home;
    if (!cityHome || !Array.isArray(cityHome.walls) || !Array.isArray(cityHome.openings))
      return toast('В городе пока нет построенного дома Эммы.');
    const imported=Engine.fromLegacy(cityHome);
    if (!isSafePlan(imported) || Engine.validate(imported).some(i=>i.kind==='footprint'))
      return toast('План дома из города несовместим.');
    if (!confirm('Создать копию дома Эммы в свободной мастерской? Город останется без изменений.'))return;
    modify(() => {project=imported;active=0;start=null;});
    message('Дом Эммы скопирован. Теперь можно добавлять этажи. Сохранение города не меняется.');
  } catch {toast('Не удалось открыть сохранение города.');}
});
$('roofSwitch').addEventListener('click',()=>{showRoof=!showRoof;$('roofSwitch').textContent=showRoof?'Крыша: да':'Крыша: нет';volume()});
$('cutaway').addEventListener('click',()=>{cutaway=!cutaway;$('cutaway').setAttribute('aria-pressed',String(cutaway));$('cutaway').textContent=cutaway?'Срез: да':'Срез: нет';volume()});
$('export').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({format:'avi-architect-multistorey',version:1,...project},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='avi-architect-multistorey.json';a.click();URL.revokeObjectURL(url);toast('План экспортирован в JSON.')});
$('publish').addEventListener('click',()=>{
  const errors=builderIssues(project,mode);
  if(errors.length){message(errors[0]);paint();return;}
  const city=loadCity();
  if(!city){message('Сначала начни игру в городе и прими заказ.');return;}
  try {
    if(mode==='home'||mode==='bakery'){
      if(!city.accepted||currentQuest(city)!==mode)
        throw Error('Сначала прими соответствующий заказ в городе.');
      const finished=complete(city,commissionModel(project,mode));
      finished.careerPlans={...city.careerPlans,[mode]:deep(project)};
      if(!saveCity(finished))throw Error('Не удалось сохранить построенный дом.');
      window.location.assign(new URL(`./?finished=${mode}`,document.baseURI).href);
      return;
    }
    if(mode==='landmark' && (!city.buildings.home || !city.buildings.bakery))
      throw Error('Сначала заверши первые два заказа.');
    const next=publishLandmark(city,project);
    if(city.landmark&&!confirm('Заменить ранее построенный дом Ники новым проектом?'))return;
    if(!saveCity(next))throw Error('Не удалось сохранить дом в городе.');
    window.location.assign(new URL('./?city=1',document.baseURI).href);
  }catch(error){message(error.message||'Исправь план перед сдачей заказа.');}
});
paint();
})();