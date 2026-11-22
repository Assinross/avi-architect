import './style.css'
import { emblem, icon } from './icons'
import { Valley } from './rendering'
import { freshWorld, newModel, currentQuest, complete, issues, cost, area, rules, type Purpose } from './model'
import { clear, load, save } from './storage'
import { renderEditor } from './editor'

type Screen = 'menu'|'city'|'plot'|'editor'|'preview'|'finished'
const app = document.querySelector<HTMLElement>('#app')!
const modal = document.querySelector<HTMLDialogElement>('#modal')!
const worldHost = document.querySelector<HTMLElement>('#world')!
const themeNames = ['Cozy Village','Colorful Blocks','Modern Low Poly','Friendly Future']
const copy = {
  home:{name:'Дом первого жителя', client:'Эмма', place:'Луговой участок', line:'Я выбрала место у площади. Хочу небольшой дом, где утренний свет будет падать на стол у окна.', thanks:'Здесь столько света! Сегодня же поставлю у окна свой стол.'},
  bakery:{name:'Первая пекарня', client:'Пекарь Лев', place:'Торговый участок', line:'В долине пора печь свой хлеб. Мне нужна просторная пекарня с двумя окнами, чтобы гости видели свежую выпечку.', thanks:'Первая партия уже в печи. Скоро на площади запахнет хлебом!'}
}
let saved = load()
let world = saved ?? freshWorld()
let screen:Screen='menu'
let finished:Purpose='home'
let roof=true
let warned=false
let focusBefore:HTMLElement|null=null
const button=(action:string,label:string,glyph:string,cls='btn')=>`<button class="${cls}" data-action="${action}">${icon(glyph)}${label}</button>`
const brand=(sub:string)=>`<div class="brand">${emblem}<div>Architects of Time<small>${sub}</small></div></div>`
const quest=()=>currentQuest(world)
function tell(msg:string){document.querySelector('#notice')!.textContent=msg}
function persist(){
  if(save(world)){saved=world;if(warned)tell('');warned=false}
  else {tell('Не удалось сохранить город на этом устройстве. Игра продолжится до закрытия вкладки.');warned=true}
}
let valley:Valley
try { valley=new Valley(worldHost,target=>{
  if(modal.open || (screen!=='city' && screen!=='plot')) return
  const q=quest()
  if((target==='home'||target==='bakery') && world.buildings[target]){
    popup(copy[target].name,`<p>${copy[target].client} · ${area(world.buildings[target]!)} м²</p>`);return
  }
  if(q && (target===q || target==='mayor' || target===(q==='home'?'resident':'baker'))){
    if(world.accepted)show('plot');else order(q)
  }else journal()
}) } catch {
  app.innerHTML='<section class="sheet"><h2>Для долины нужен WebGL 2</h2><p>Включите аппаратное ускорение в браузере и обновите страницу.</p></section>'
  throw new Error('Не удалось создать 3D-сцену')
}
function show(next:Screen){
  screen=next
  app.classList.toggle('editing',next==='editor')
  worldHost.hidden=next==='editor'
  if(next==='editor' && world.draft){
    valley.pause(true)
    app.innerHTML=''
    renderEditor(app,world.draft,model=>{world={...world,draft:model};persist()},()=>show('preview'),()=>show('city'))
    return
  }
  valley.pause(false)
  if(next==='preview' && world.draft)valley.preview(world.draft,world.theme,roof)
  else valley.city(world,next==='plot'?quest()??undefined:next==='finished'?finished:undefined)
  if(next==='menu'){
    app.innerHTML=`<section class="menu"><header class="mast">${brand('Архитектурная мастерская')}${button('help','<span>Справка</span>','help','ghost')}</header>
    <div class="hero"><div class="kicker">Глава I · Новая долина</div><h1 lang="en">Architects<br><em>of Time</em></h1><p>Спроектируйте первый дом и вдохните жизнь в город у реки.</p>
    <div class="menu-actions">${button('new','Новая игра<span class="tail">'+icon('next')+'</span>','build')}<button class="minor continue" data-action="continue" ${saved?'':'disabled'}>${icon('play')}Продолжить</button>${button('themes','Выбрать стиль','palette','minor')}${button('settings','Настройки','settings','minor')}</div></div>
    <footer class="foot"><div class="place">${icon('pin')}<div><strong>Новая долина</strong><small>Речная низина · Глава I</small></div></div><div class="orientation" aria-hidden="true">С${icon('compass')}</div></footer></section>`
    return
  }
  const q=quest()
  const progress=Object.keys(world.buildings).length
  const header=`<header class="hud">${brand('Глава I · Новая долина')}<nav class="tools">${button('journal','<span>Журнал</span>','book','')}${button('settings','<span>Настройки</span>','settings','')}<button data-action="help" aria-label="Справка">${icon('help')}</button></nav></header>`
  let content=''
  if(next==='city'){
    content=q?`<div class="eyebrow">Заказ ${progress+1} из 2 · ${copy[q].client}</div><h2>${copy[q].name}</h2><p>${world.accepted?'Заказ принят. Участок ждёт вашего проекта.':q==='home'?'Эмма ждёт вас у площади.':'Пекарь Лев хочет открыть дело в долине.'}</p>${button(world.accepted?'plot':'order',world.accepted?'К строительству':'Поговорить','next')}`:
    `<div class="eyebrow">Глава I завершена</div><h2>Долина ожила</h2><p>Эмма обживает свой дом, а Лев встречает гостей в пекарне.</p>${button('journal','Журнал заказов','book')}`
  }else if(next==='plot' && q){
    content=`<div class="eyebrow">Участок для строительства</div><h2>${copy[q].place}</h2><div class="stats"><span class="chip">12 × 10 м</span><span class="chip">Есть дорожка</span><span class="chip">Свободен</span></div>${button('edit','Открыть планировщик','build')}`
  }else if(next==='preview' && world.draft){
    const m=world.draft
    content=`<div class="eyebrow">Объём 3D · ${copy[m.purpose].client}</div><h2>${copy[m.purpose].name}</h2><div class="stats"><span class="chip">${area(m)} м²</span><span class="chip">Смета ${cost(m)} / ${rules[m.purpose].budget}</span></div><div class="row">${button('edit','План 2D','back','minor')}${button('roof',roof?'Скрыть крышу':'Показать крышу','build','minor')}</div><div class="modal-actions">${button('submit','Проверить и сдать','check')}</div>`
  }else if(next==='finished'){
    content=`<div class="eyebrow">Заказ выполнен · +${rules[finished].reward} ★</div><h2>${copy[finished].name}</h2><p>"${copy[finished].thanks}"<br>- ${copy[finished].client}</p>${button('city','Вернуться в город','map')}`
  }
  app.innerHTML=header+`<section class="sheet">${content}</section><div class="status-pill">Построено · ${progress} / 2</div>`
}
function popup(title:string,body:string){
  if(!modal.open) focusBefore=document.activeElement instanceof HTMLElement?document.activeElement:null
  modal.innerHTML=`<div class="modal-head"><h2>${title}</h2><button data-action="close" aria-label="Закрыть" class="round">${icon('x')}</button></div>${body}`
  if(!modal.open)modal.showModal()
  valley.pause(true)
}
function close(){
  if(modal.open)modal.close()
  valley.pause(screen==='editor')
  focusBefore?.focus()
}
modal.addEventListener('cancel',event=>{event.preventDefault();close()})
function order(q:Purpose){
  popup(copy[q].name,`<div class="eyebrow">${copy[q].client}</div><p>"${copy[q].line}"</p><div class="stats"><span class="chip">От ${rules[q].minArea} м²</span><span class="chip">Окон от ${rules[q].windows}</span><span class="chip">Бюджет ${rules[q].budget}</span></div><p>Замкните стены и предусмотрите входную дверь.</p>${button('accept','Принять заказ','check')}`)
}
function journal(){
  popup('Журнал заказов',(['home','bakery'] as const).map(q=>`<div class="journal-item"><strong>${copy[q].name}</strong><small>${world.buildings[q]?'Выполнен':quest()===q?(world.accepted?'В работе':'Доступен'):'После дома Эммы'}</small></div>`).join('')+`<p>Награды архитектора · ${world.rewards} ★</p>`)
}
const palettes=[
  ['#bfd5ca','#719375','#45684e','#eee1c5','#995e41'],['#c6e6fa','#88b992','#388960','#f7d88c','#cb685c'],
  ['#d6d9d0','#a3ab8d','#68735a','#e3d7bc','#71716d'],['#c5dbe2','#95bbb2','#4d8a86','#edf2de','#56899b']
]
function styleTile(i:number){
  const [sky,hill,tree,wall,top]=palettes[i]
  return `<button class="theme-tile" data-action="theme-${i}" aria-pressed="${world.theme===i}"><svg viewBox="0 0 180 72" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="180" height="72" fill="${sky}"/><circle cx="138" cy="14" r="8" fill="#fff1be"/><path d="M0 52Q35 12 79 37T180 23V72H0" fill="${hill}"/><path d="m0 62 48-17 56 13 76-19v33H0" fill="${tree}"/><path d="m65 39 24-15 22 14v24H65" fill="${wall}"/><path d="m60 40 27-21 31 18-7 4-24-14-21 16z" fill="${top}"/><path d="M78 48h7v14h-7m16-18h8v9h-8" fill="${tree}"/><path d="m29 46 8-21 9 21h-6v9h-5v-9m97-10 6-16 8 16h-5v8h-4v-8" fill="${tree}"/></svg><strong>${themeNames[i]}</strong></button>`
}
function themes(){popup('Выбрать стиль',`<div class="theme-grid">${themeNames.map((_,i)=>styleTile(i)).join('')}</div><div class="modal-actions">${button('close','Готово','check')}</div>`)}
function settings(){popup('Настройки',`<label class="setting">Качество графики <select id="quality">${(['auto','low','high'] as const).map((v,i)=>`<option value="${v}" ${world.quality===v?'selected':''}>${['Авто','Экономное','Высокое'][i]}</option>`).join('')}</select></label><div class="modal-actions">${button('themes','Выбрать стиль','palette','minor')}${screen!=='menu'?button('menu','Главное меню','back','minor'):''}${saved?button('reset','Сбросить прогресс','x','minor'):''}</div>`)}
modal.addEventListener('change',e=>{
  const select=e.target
  if(select instanceof HTMLSelectElement && select.id==='quality'){
    world={...world,quality:select.value as typeof world.quality}
    if(saved)persist()
    show(screen);valley.pause(true)
  }
})
function start(){
  world={...freshWorld(),theme:world.theme,quality:world.quality}
  persist();close();show('city')
}
function act(action:string){
  if(action.startsWith('theme-')){
    world={...world,theme:Number(action.slice(6)) as typeof world.theme}
    if(saved)persist()
    show(screen);themes();return
  }
  const q=quest()
  switch(action){
    case 'new': if(saved)popup('Начать новую игру?',`<p>Новая долина заменит сохранённый город и его чертежи.</p><div class="row">${button('start','Начать заново','build')}${button('close','Отмена','back','minor')}</div>`);else start();break
    case 'start':start();break
    case 'continue':if(saved){world=saved;show('city')}break
    case 'settings':settings();break
    case 'themes':themes();break
    case 'journal':journal();break
    case 'help':popup('Мастерская архитектора','<p>Поверните долину мышью или одним пальцем. Колесо и щипок меняют масштаб. Перемещайте карту правой кнопкой мыши или двумя пальцами.</p><p>Примите заказ, выберите участок и соедините точки на плане. Поставьте дверь и окна, затем осмотрите здание в объёме.</p>'+button('close','Вернуться','back'));break
    case 'order':if(q)order(q);break
    case 'accept':if(q){world={...world,accepted:true};persist();close();show('plot')}break
    case 'plot':show('plot');break
    case 'edit':if(q&&world.accepted){if(!world.draft){world={...world,draft:newModel(q)};persist()}close();show('editor')}break
    case 'roof':roof=!roof;show('preview');break
    case 'submit':if(world.draft){
      const problems=issues(world.draft)
      if(problems.length){popup('Поправим проект',`<ul class="errors">${problems.map(p=>'<li>'+p+'</li>').join('')}</ul>${button('edit','Исправить на плане','back')}`);break}
      finished=world.draft.purpose;world=complete(world,world.draft);persist();roof=true;show('finished')
    }break
    case 'close':close();break
    case 'city':close();show('city');break
    case 'menu':close();show('menu');break
    case 'reset':popup('Сбросить прогресс?',`<p>Оба участка, чертёж и журнал заказов будут очищены.</p><div class="row">${button('confirm-reset','Сбросить','x')}${button('close','Отмена','back','minor')}</div>`);break
    case 'confirm-reset':if(clear()){saved=null;world=freshWorld();close();show('menu')}else tell('Хранилище недоступно. Сбросить прогресс не удалось.');break
  }
}
document.addEventListener('click',event=>{
  const target=event.target
  if(target instanceof Element){const el=target.closest<HTMLButtonElement>('button[data-action]');if(el&&!el.disabled)act(el.dataset.action!)}
})
show('menu')
