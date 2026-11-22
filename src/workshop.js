import * as Engine from './multistorey';
import { MultiStoreyView } from './rendering/multistorey';
import { load as loadCity, save as saveCity } from './storage';
import { publishLandmark } from './city-landmark';
(function(){
'use strict';
const $=id=>document.getElementById(id);
const key='avi-architect.multistorey-workshop.v1';
const cell=36, bx=60, by=48;
const px=x=>bx+x*cell, py=z=>by+z*cell;
const rectFloor=(x0,z0,x1,z1,index)=>({walls:[
 {id:`f${index}a`,a:[x0,z0],b:[x1,z0]}, {id:`f${index}b`,a:[x1,z0],b:[x1,z1]},
 {id:`f${index}c`,a:[x1,z1],b:[x0,z1]}, {id:`f${index}d`,a:[x0,z1],b:[x0,z0]},
],openings:[],partitions:[],stairToNext:null});
let project={floors:[rectFloor(1,1,8,7,0)]}, active=0,tool='inspect',start=null,past=[],future=[];
try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(isSafePlan(saved)){project=saved;}}catch{}
function isSafePlan(p) {
  return p && Array.isArray(p.floors) && p.floors.length > 0 && p.floors.length <= 400 && p.floors.every(f =>
    f && Array.isArray(f.walls) && f.walls.length === 4 &&
    Array.isArray(f.openings) && f.openings.length < 600 &&
    Array.isArray(f.partitions) && f.partitions.length < 600 &&
    (f.stairToNext === null || (f.stairToNext && Number.isSafeInteger(f.stairToNext.x) && Number.isSafeInteger(f.stairToNext.z))) &&
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
try { scene = new MultiStoreyView($('volume')) }
catch (error) {
  $('volume').textContent = 'Для 3D-вида нужен WebGL. Планировщик 2D продолжает работать.';
  console.warn('WebGL unavailable:', error);
}
function volume() {
  if (!scene) return;
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
 if(r)items.push(`<rect x="${px(r.x0)}" y="${py(r.z0)}" width="${(r.x1-r.x0)*cell}" height="${(r.z1-r.z0)*cell}" fill="#e4efe5" stroke="#b2c4b5"/>`)
 for(let x=0;x<=12;x++){items.push(`<line x1="${px(x)}" y1="${py(0)}" x2="${px(x)}" y2="${py(10)}" class="grid-line"/><text x="${px(x)}" y="${by-13}" fill="#839786" text-anchor="middle" font-size="10">${x}</text>`)}
 for(let z=0;z<=10;z++){items.push(`<line x1="${px(0)}" y1="${py(z)}" x2="${px(12)}" y2="${py(z)}" class="grid-line"/><text x="${bx-15}" y="${py(z)+3}" fill="#839786" text-anchor="middle" font-size="10">${z}</text>`)}
 const stair=f.stairToNext;
 if(stair){const s=Engine.stairRect(stair),w=(s.x1-s.x0)*cell,d=(s.z1-s.z0)*cell;
  items.push(`<g data-stair="true"><rect x="${px(s.x0)}" y="${py(s.z0)}" width="${w}" height="${d}" fill="#a2c7c6aa" stroke="#477c83" stroke-width="2"/>`);
  for(let k=1;k<12;k++){const fraction=k/12;if(stair.facing==='north'||stair.facing==='south')items.push(`<line x1="${px(s.x0)+4}" y1="${py(s.z0)+fraction*d}" x2="${px(s.x1)-4}" y2="${py(s.z0)+fraction*d}" stroke="#477c83" stroke-width="1"/>`);else items.push(`<line x1="${px(s.x0)+fraction*w}" y1="${py(s.z0)+4}" x2="${px(s.x0)+fraction*w}" y2="${py(s.z1)-4}" stroke="#477c83" stroke-width="1"/>`)}
  items.push(`<text x="${px((s.x0+s.x1)/2)}" y="${py((s.z0+s.z1)/2)+3}" text-anchor="middle" fill="#2c6465" font-weight="800" font-size="12">↑</text></g>`)
 }
 if(active>0){const incoming=project.floors[active-1].stairToNext;
  if(incoming){const s=Engine.stairRect(incoming);items.push(`<rect x="${px(s.x0)}" y="${py(s.z0)}" width="${(s.x1-s.x0)*cell}" height="${(s.z1-s.z0)*cell}" fill="none" stroke="#3b9b91" stroke-dasharray="5 4" stroke-width="3"/><text x="${px(s.x0)+6}" y="${py(s.z1)-5}" fill="#407c7a" font-size="10">снизу</text>`)}}
 for(const [kind,walls] of [['wall',f.walls],['partition',f.partitions]])for(const w of walls){
  items.push(`<line x1="${px(w.a[0])}" y1="${py(w.a[1])}" x2="${px(w.b[0])}" y2="${py(w.b[1])}" class="${kind} ${tool==='erase'?'hot':''}" data-remove-wall="${kind==='partition'?w.id:''}"/>`);
  if(tool==='door'||tool==='window'||tool==='erase'){
   for(let k=0;k<Engine.wallLength(w);k++){const off=k+.5,x=w.a[0]+(w.b[0]-w.a[0])*off/Engine.wallLength(w),z=w.a[1]+(w.b[1]-w.a[1])*off/Engine.wallLength(w);
    items.push(`<circle cx="${px(x)}" cy="${py(z)}" r="11" fill="transparent" class="cell" data-wall="${w.id}" data-offset="${off}"/>`);
   }
  }
 }
 for(const o of f.openings){const w=[...f.walls,...f.partitions].find(w=>w.id===o.wallId);if(!w)continue;
  const v=o.offset/Engine.wallLength(w),x=w.a[0]+(w.b[0]-w.a[0])*v,z=w.a[1]+(w.b[1]-w.a[1])*v;
  items.push(`<circle cx="${px(x)}" cy="${py(z)}" r="7" fill="${o.kind==='door'?'#c18a58':'#83b9c5'}" stroke="#fff6e4" stroke-width="2" pointer-events="none"/>`)
 }
 if(tool==='partition'||tool==='stairs'){
  if(tool==='stairs'){for(let x=0;x<=12;x++)for(let z=0;z<=10;z++)items.push(`<circle cx="${px(x)}" cy="${py(z)}" r="12" fill="transparent" class="cell" data-stair-node="${x},${z}"/>`)}
  else for(let x=0;x<=12;x++)for(let z=0;z<=10;z++)items.push(`<circle cx="${px(x)}" cy="${py(z)}" r="${start&&start[0]===x&&start[1]===z?6:3}" class="node" data-node="${x},${z}"/>`)
 }
 $('plan').innerHTML=items.join('')
}
function paint(){
 const f=project.floors[active],r=rfloor(),issues=Engine.validate(project),posts=Engine.columns(project),roof=Engine.roofs(project),price=Engine.estimate(project);
 $('floorcount').textContent=project.floors.length;$('floorStat').textContent=project.floors.length;
 $('selectedFloor').textContent=`${active+1} этаж`;$('floorTitle').textContent=`${active+1} этажа`;
 if(f.stairToNext)$('stairFacing').value=f.stairToNext.facing;
 $('floors').innerHTML=[...project.floors].reverse().map((floor,ri)=>{const i=project.floors.length-1-ri;
  return `<button class="floor" data-floor="${i}" aria-pressed="${i===active}">▣ ${i+1} этаж <span>${Engine.rectangleArea(Engine.footprint(floor)||{x0:0,x1:0,z0:0,z1:0})} м²</span></button>`}).join('');
 $('remove').disabled=project.floors.length===1;$('undo').disabled=!past.length;$('redo').disabled=!future.length;
 $('tools').querySelectorAll('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===tool)));
 $('area').textContent=`${Engine.totalArea(project)} м²`;$('columns').textContent=posts.length;
 $('roofArea').textContent=`${roof.reduce((n,r)=>n+Engine.rectangleArea(r),0)} м²`;
 const entries=[['Наружные стены',price.outerWalls],['Перегородки',price.partitions],['Окна и двери',price.openings],['Перекрытия',price.slabs],['Лестницы',price.stairs],['Опорные колонны',price.columns],['Кровля и террасы',price.roofs]];
 $('estimate').innerHTML=entries.map(([s,n])=>`<div class="estrow"><span>${s}</span><b class="mono">${Math.round(n)} ◇</b></div>`).join('')+`<div class="estrow total"><span>Итого</span><b class="mono">${Math.round(price.total)} ◇</b></div>`;
 $('checks').innerHTML=issues.length?issues.slice(0,12).map(i=>`<li><strong>${i.floor+1} этаж.</strong> ${i.message}</li>`).join(''):
 `<li class="fine">✓ Планы этажей и лестницы совместимы. Выступающие части обеспечены автоматическими колоннами.</li>`;
 if(issues.length>12)$('checks').innerHTML+=`<li>И ещё ${issues.length-12} замечаний.</li>`;
 dims();drawPlan();volume();
}
function setFootprint(){
 const x0=+$('x0').value,z0=+$('z0').value,w=+$('w').value,d=+$('d').value;
 if(![x0,z0,w,d].every(Number.isInteger)||x0<0||z0<0||w<=0||d<=0||x0+w>12||z0+d>10){toast('Габариты должны помещаться на сетке 12 × 10 м.');dims();return}
 const prior=rfloor();if(prior&&prior.x0===x0&&prior.z0===z0&&prior.x1===x0+w&&prior.z1===z0+d)return;
 modify(()=>{const f=project.floors[active],newWalls=rectFloor(x0,z0,x0+w,z0+d,active).walls;
   const oldWallIds=new Set(f.walls.map(wall=>wall.id));f.walls=newWalls;f.openings=f.openings.filter(o=>!oldWallIds.has(o.wallId));});
 message('Габариты этажа изменены. Проверь лестницы и опоры.');
}
$('floors').addEventListener('click',e=>{const b=e.target.closest('[data-floor]');if(!b)return;active=+b.dataset.floor;start=null;paint();message('План этажа выбран. Нижний контур виден светлым пунктиром.')});
$('tools').addEventListener('click',e=>{const b=e.target.closest('[data-tool]');if(!b)return;tool=b.dataset.tool;start=null;paint();message({partition:'Выбери две точки сетки для внутренней перегородки.',stairs:'Щёлкни точку для лестницы 2 × 3 м. Она соединяет этот этаж со следующим.',door:'Щёлкни метровый сегмент наружной стены или перегородки.',window:'Щёлкни метровый сегмент стены для окна.',erase:'Нажми на перегородку или дверной/оконный маркер, чтобы убрать.',inspect:'Осматривай план и объём справа.'}[tool])});
$('plan').addEventListener('click',e=>{
 const t=e.target;
 const node=t.closest('[data-node]');const stairNode=t.closest('[data-stair-node]');const wallTarget=t.closest('[data-wall]');const partitionTarget=t.closest('[data-remove-wall]');
 if(node&&tool==='partition'){
  const pt=parseXY(node.dataset.node);if(!start){start=pt;message(`Первая точка (${pt.join(', ')}). Укажи вторую точку на той же вертикали или горизонтали.`);paint();return}
  const first=start;start=null;if(first[0]!==pt[0]&&first[1]!==pt[1]){message('Перегородка должна быть прямой: горизонталь или вертикаль.');paint();return}
  if(first[0]===pt[0]&&first[1]===pt[1]){paint();return}
  modify(()=>{const f=project.floors[active];f.partitions.push({id:`inner-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,a:first,b:pt})});
  const warnings=Engine.validate(project).filter(p=>p.floor===active&&p.kind==='partition');if(warnings.length)message(warnings[0].message);else message('Перегородка добавлена.');return;
 }
 if(stairNode&&tool==='stairs'){
  if(active===project.floors.length-1){message('Сначала добавь следующий этаж, затем выбери этот этаж и поставь лестницу.');return}
  const [x,z]=parseXY(stairNode.dataset.stairNode);modify(()=>project.floors[active].stairToNext={x,z,facing:$('stairFacing').value});message('Лестница обновлена. Если она не помещается на обоих этажах, появится предупреждение.');return;
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
for(const id of ['x0','z0','w','d'])$(id).addEventListener('change',setFootprint);
$('add').addEventListener('click',()=>{modify(()=>{const below=project.floors.length-1;project=Engine.addFloor(project);const r=rfloor(below);
  if(r&&!project.floors[below].stairToNext)project.floors[below].stairToNext={x:r.x0,z:r.z0,facing:'north'};
  active=project.floors.length-1;start=null;});message('Новый этаж скопировал наружный контур. Уменьши его габариты и проверь лестницу.')});
$('remove').addEventListener('click',()=>{if(project.floors.length<2)return;modify(()=>{project=Engine.removeTopFloor(project);active=Math.min(active,project.floors.length-1);start=null});message('Верхний этаж удалён.')});
$('undo').addEventListener('click',()=>{if(!past.length)return;future.push(deep(project));project=past.pop();active=Math.min(active,project.floors.length-1);start=null;save();paint();message('Последнее действие отменено.')});
$('redo').addEventListener('click',()=>{if(!future.length)return;past.push(deep(project));project=future.pop();active=Math.min(active,project.floors.length-1);start=null;save();paint();message('Действие повторено.')});
$('reset').addEventListener('click',()=>{if(confirm('Создать новый проект? Текущий эскиз будет удалён.')){modify(()=>{project={floors:[rectFloor(1,1,8,7,0)]};active=0;start=null});message('Создан новый проект.') }});
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
  const city=loadCity();
  if(!city){message('Сначала начни игру в городе и выполни заказы Эммы и Льва.');return;}
  try {
    const next=publishLandmark(city,project);
    if(city.landmark&&!confirm('Заменить ранее построенный дом Ники новым проектом?'))return;
    if(!saveCity(next))throw Error('Не удалось сохранить дом: проверь доступность хранилища браузера.');
    // The workshop draft is independent and remains editable.
    window.location.assign(new URL('./?city=1',document.baseURI).href);
  }catch(error){message(error.message||'Исправь план перед размещением в городе.');}
});
paint();
})();