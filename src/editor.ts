import { History, area, cost, prices, rules, wallLength, type BuildingModel, type Point, type Wall } from './model'
import './editor.css'

type Tool = 'wall' | 'door' | 'window' | 'remove'

const tools: Record<Tool, string> = {
  wall: 'Стена', door: 'Дверь', window: 'Окно', remove: 'Удалить',
}
const symbols = {
  wall: '<path d="M3 6h18v12H3z M3 12h18 M9 6v6m6 0v6"/>',
  door: '<path d="M4 20V4h15v16 M7 19V6l9 2v13z M12.5 13h.3"/>',
  window: '<path d="M4 4h16v16H4z M12 4v16M4 12h16"/>',
  remove: '<path d="m4 14 9-10 7 6-9 10H9z M9 9l7 6m-5 5h10"/>',
  undo: '<path d="m8 5-5 5 5 5 M4 10h10a6 6 0 0 1 6 6v2"/>',
  redo: '<path d="m16 5 5 5-5 5m4-5H10a6 6 0 0 0-6 6v2"/>',
  city: '<path d="m10 5-7 7 7 7 M4 12h17"/>',
  preview: '<path d="m12 2 9 5v10l-9 5-9-5V7z M3 7l9 5 9-5m-9 5v10"/>',
}
const icon = (name: keyof typeof symbols) =>
  `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${symbols[name]}</svg>`

const histories = new WeakMap<BuildingModel, History>()
const step = 36
const x = (u: number) => 50 + step * u
const y = (v: number) => 43 + step * v
const eq = (a: Point, b: Point) => a[0] === b[0] && a[1] === b[1]
function slotPoint(w: Wall, offset: number): Point {
  return [
    w.a[0] + Math.sign(w.b[0] - w.a[0]) * offset,
    w.a[1] + Math.sign(w.b[1] - w.a[1]) * offset,
  ]
}
function options(count: number) {
  return Array.from({ length: count }, (_, i) => `<option value="${i}">${i}</option>`).join('')
}

export function renderEditor(host: HTMLElement, initial: BuildingModel, onChange: (m: BuildingModel) => void,
  onPreview: () => void, onCity: () => void): void {
  const history = histories.get(initial) ?? new History(initial)
  histories.set(initial, history)
  let tool: Tool = 'wall'
  let start: Point | null = null
  let first: Point | null = null
  let note = ''
  let isError = false
  let drawWallIndex = 0
  const title = initial.purpose === 'home' ? 'Дом Эммы' : 'Первая пекарня'
  host.innerHTML = `<section class="ae" aria-label="Планировщик">
    <header class="ae-head">
      <button type="button" class="ae-back" data-editor-action="city" aria-label="В город">${icon('city')}<span>В город</span></button>
      <div class="ae-title"><span>Архитектурная мастерская</span><h1>${title}</h1></div>
      <button type="button" class="ae-preview" data-editor-action="preview">${icon('preview')}Объём 3D</button>
    </header>
    <div class="ae-body"><main class="ae-main">
      <div class="ae-toolbar" aria-label="Инструменты">
        <div class="ae-tools">${(Object.keys(tools) as Tool[]).map(t => `<button type="button" data-tool="${t}" aria-pressed="false">${icon(t)}${tools[t]}</button>`).join('')}</div>
        <div class="ae-history">${(['undo','redo'] as const).map((a,i) => `<button type="button" data-editor-action="${a}" aria-label="${i?'Повторить':'Отменить'}" title="${i?'Повторить':'Отменить'}">${icon(a)}</button>`).join('')}</div>
      </div>
      <div class="ae-paper"><div class="ae-sheet-head"><strong>План участка</strong><span>12 × 10 м</span></div>
        <svg class="ae-blueprint" viewBox="0 0 532 449" preserveAspectRatio="xMidYMid meet" role="group" aria-label="Чертёж участка в метрах"></svg>
        <div class="ae-sheet-foot"><span>Шаг сетки 1 м</span><span class="ae-scale">0 ├────┤ 2 м</span></div></div>
      <p class="ae-note" role="status" aria-live="polite"></p>
      <details class="ae-precise"><summary>Точный ввод</summary><div class="ae-fields"></div></details>
    </main><aside class="ae-spec" aria-label="Условия заказа"></aside></div>
  </section>`
  const root = host.querySelector<HTMLElement>('.ae')!
  const blueprint = root.querySelector<SVGSVGElement>('.ae-blueprint')!
  const fields = root.querySelector<HTMLElement>('.ae-fields')!
  const spec = root.querySelector<HTMLElement>('.ae-spec')!
  const hint = root.querySelector<HTMLElement>('.ae-note')!
  function grid() {
    const m = history.model
    const items: string[] = []
    items.push(`<rect x="${x(0)}" y="${y(0)}" width="${12*step}" height="${10*step}" fill="#f8f6ea" stroke="#9caa94"/>`)
    for (let i = 0; i <= 12; i++) {
      items.push(`<path class="ae-grid" d="M${x(i)} ${y(0)}v${10*step}"/><text class="ae-axis" x="${x(i)}" y="${y(0)-15}">${i}</text>`)
    }
    for (let j = 0; j <= 10; j++) {
      items.push(`<path class="ae-grid" d="M${x(0)} ${y(j)}h${12*step}"/><text class="ae-axis" x="${x(0)-19}" y="${y(j)+4}">${j}</text>`)
    }
    if (area(m)>0) {
      const pts = m.walls.flatMap(w=>[w.a,w.b])
      const xx = pts.map(p=>p[0]), yy = pts.map(p=>p[1])
      items.push(`<rect class="ae-floor" x="${x(Math.min(...xx))}" y="${y(Math.min(...yy))}" width="${step*(Math.max(...xx)-Math.min(...xx))}" height="${step*(Math.max(...yy)-Math.min(...yy))}"/>`)
    }
    m.walls.forEach((w,wi)=>{
      const [cx,cy] = slotPoint(w,wallLength(w)/2)
      const horizontal = w.a[1]===w.b[1]
      const path = `M${x(w.a[0])} ${y(w.a[1])}L${x(w.b[0])} ${y(w.b[1])}`
      items.push(`<path class="ae-wall" d="${path}"/><text class="ae-dimension" x="${x(cx)+(horizontal?0:14)}" y="${y(cy)+(horizontal?-11:4)}" text-anchor="${horizontal?'middle':'start'}">${wallLength(w)} м</text>`)
      if (tool==='remove') items.push(`<path data-wall="${wi}" d="${path}" stroke="transparent" stroke-width="19" fill="none" class="ae-hot"/>`)
      for (let n=0;n<wallLength(w);n++) {
        const offset = n+0.5
        const [u,v] = slotPoint(w,offset)
        const opening = m.openings.find(o=>o.wallId===w.id && o.offset===offset)
        const rotate = Math.atan2(w.b[1]-w.a[1],w.b[0]-w.a[0])*180/Math.PI
        const figure = opening?.kind==='door' ? '<path d="M-13 0v-25a25 25 0 0 1 25 25" stroke="#986849" stroke-width="2" fill="none"/>' : opening?.kind==='window' ? '<rect x="-12" y="-3" width="24" height="6" fill="#add2cf" stroke="#365c5e"/><path d="M0 -3v6" stroke="#365c5e"/>' : ''
        if (opening) items.push(`<g pointer-events="none" transform="translate(${x(u)} ${y(v)}) rotate(${rotate})"><path d="M-13 0h26" stroke="#f8f6ea" stroke-width="7"/>${figure}</g>`)
        if(tool==='door'||tool==='window'||(tool==='remove'&&opening)) {
          items.push(`<g class="ae-hot" data-slot="${u},${v}" data-wall-index="${wi}" data-offset="${offset}"><circle cx="${x(u)}" cy="${y(v)}" r="16" fill="transparent"/>${opening?'':`<circle cx="${x(u)}" cy="${y(v)}" r="5" fill="#f8f6ea" stroke="#a66646" stroke-width="2"/>`}</g>`)
        }
      }
    })
    if(tool==='wall') {
      for(let i=0;i<=12;i++) for(let j=0;j<=10;j++) {
        const selected = start && eq(start,[i,j])
        const aligned = start && !selected && (i===start[0] || j===start[1])
        items.push(`<g class="ae-hot" data-node="${i},${j}"><rect x="${x(i)-step/2}" y="${y(j)-step/2}" width="${step}" height="${step}" fill="transparent"/><circle cx="${x(i)}" cy="${y(j)}" r="${selected?6:aligned?3.5:1.7}" fill="${selected||aligned?'#ad6546':'#899986'}"/></g>`)
      }
    }
    blueprint.innerHTML=items.join('')
  }
  function instructions() {
    if(tool==='wall') return start ? `Начало (${start.join(', ')}). Выбери следующую точку по горизонтали или вертикали.` : 'Выбери первую точку. Построй четыре стены по периметру прямоугольника.'
    if(tool==='remove') return 'Выбери проём или свободную часть стены для удаления.'
    return 'Нажми на кружок на стене, чтобы поставить ' + (tool==='door'?'входную дверь.':'окно.')
  }
  function fieldPanel() {
    const m=history.model
    if (tool==='wall') {
      if(!fields.querySelector('[data-x]')) fields.innerHTML=`<label>X <select data-x>${options(13)}</select></label><label>Y <select data-y>${options(11)}</select></label><button type="button" data-input-point>Отметить точку</button>`
      return
    }
    if (!m.walls.length) {fields.textContent='Сначала постройте стену.';return}
    drawWallIndex=Math.min(drawWallIndex,m.walls.length-1)
    const w=m.walls[drawWallIndex]
    fields.innerHTML=`<label>Стена <select data-select-wall>${m.walls.map((s,i)=>`<option value="${i}" ${i===drawWallIndex?'selected':''}>(${s.a.join(', ')}) → (${s.b.join(', ')})</option>`).join('')}</select></label>
      <label>От начала <select data-select-slot>${Array.from({length:wallLength(w)},(_,i)=>`<option value="${i+0.5}">${i+0.5} м</option>`).join('')}</select></label>
      <button type="button" data-input-slot>${tool==='remove'?'Удалить проём':'Установить'}</button>${tool==='remove'?'<button type="button" data-input-wall>Удалить стену</button>':''}`
  }
  function redraw() {
    const m=history.model, r=rules[m.purpose], spent=cost(m)
    const floor=area(m), windows=m.openings.filter(o=>o.kind==='window').length
    const criteria:[boolean,string][]=[
      [floor>0,'Замкнутый контур'],[floor>=r.minArea,`Площадь от ${r.minArea} м²`],
      [m.openings.some(o=>o.kind==='door'),'Входная дверь'],[windows>=r.windows,`Окна · ${windows} из ${r.windows}`],
      [spent<=r.budget,'В пределах бюджета'],
    ]
    const pricesOpen = spec.querySelector<HTMLDetailsElement>('.ae-prices')?.open ?? false
    spec.innerHTML=`<h2>Условия заказа</h2><ul>${criteria.map(([ok,label])=>`<li class="${ok?'ae-met':''}"><span aria-label="${ok?'Выполнено':'Ожидает'}">${ok?'✓':'○'}</span>${label}</li>`).join('')}</ul>
      <div class="ae-estimate"><h2>Смета</h2><div class="ae-value"><strong>${spent}</strong> / ${r.budget}</div><progress aria-label="Расход бюджета" max="${r.budget}" value="${Math.min(spent,r.budget)}"></progress>
      <p>${spent>r.budget?'Превышение':'Осталось'} <b>${Math.abs(r.budget-spent)}</b></p></div>
      <details class="ae-prices" ${pricesOpen?'open':''}><summary>Расценки</summary><dl class="ae-metrics"><div><dt>Стена · метр</dt><dd>${prices.wall}</dd></div><div><dt>Дверь</dt><dd>${prices.door}</dd></div><div><dt>Окно</dt><dd>${prices.window}</dd></div><div><dt>Пол и крыша · м²</dt><dd>${prices.surface}</dd></div></dl></details>
      <dl class="ae-metrics"><div><dt>Площадь пола</dt><dd>${floor} м²</dd></div><div><dt>Длина стен</dt><dd>${m.walls.reduce((n,w)=>n+wallLength(w),0)} м</dd></div></dl>`
    hint.textContent=note||instructions()
    hint.classList.toggle('ae-error',isError)
    root.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===tool)))
    root.querySelector<HTMLButtonElement>('[data-editor-action="undo"]')!.disabled=!history.canUndo
    root.querySelector<HTMLButtonElement>('[data-editor-action="redo"]')!.disabled=!history.canRedo
    grid();fieldPanel()
  }
  function finish(error:string|null, success = '') {
    isError=error!==null;note=error??success
    if (!error) {histories.set(history.model,history);onChange(history.model)}
    redraw()
  }
  function choosePoint(p:Point) {
    if (!start || eq(start,p)) {
      start=start?null:p;first=start;isError=false;note='';redraw();return
    }
    const error=history.addWall(start,p)
    if (!error) {
      start=first&&eq(first,p)?null:p
      if(!start) first=null
    }
    finish(error)
  }
  function chooseSlot(w:Wall,offset:number) {
    const error=tool==='door'?history.addDoor(w.id,offset):tool==='window'?history.addWindow(w.id,offset):history.removeOpening(w.id,offset)
    const message = tool === 'door' ? 'Дверь установлена.' : tool === 'window' ? 'Окно установлено.' : 'Проём удалён.'
    finish(error, message)
  }
  root.addEventListener('click',e=>{
    const target=e.target as Element
    const button=target.closest<HTMLButtonElement>('[data-tool], [data-editor-action]')
    if (button?.dataset.tool) {
      tool=button.dataset.tool as Tool;start=null;first=null;note='';isError=false;redraw();return
    }
    switch(button?.dataset.editorAction) {
      case 'city':onCity();return
      case 'preview':onPreview();return
      case 'undo':start=null;first=null;finish(history.undo());return
      case 'redo':start=null;first=null;finish(history.redo());return
    }
    const node=target.closest<SVGElement>('[data-node]')
    if(node?.dataset.node){choosePoint(node.dataset.node.split(',').map(Number) as Point);return}
    const slot=target.closest<SVGElement>('[data-slot]')
    if(slot){chooseSlot(history.model.walls[Number(slot.dataset.wallIndex)],Number(slot.dataset.offset));return}
    const wall=target.closest<SVGElement>('[data-wall]')
    if(wall){finish(history.removeWall(history.model.walls[Number(wall.dataset.wall)].id));return}
    if(target.closest('[data-input-point]')){
      choosePoint([Number(fields.querySelector<HTMLSelectElement>('[data-x]')!.value),Number(fields.querySelector<HTMLSelectElement>('[data-y]')!.value)])
    }else if(target.closest('[data-input-slot]')){
      chooseSlot(history.model.walls[drawWallIndex],Number(fields.querySelector<HTMLSelectElement>('[data-select-slot]')!.value))
    }else if(target.closest('[data-input-wall]')){
      finish(history.removeWall(history.model.walls[drawWallIndex].id))
    }
  })
  fields.addEventListener('change',e=>{
    const select=e.target as HTMLSelectElement
    if(select.matches('[data-select-wall]')){drawWallIndex=Number(select.value);fieldPanel()}
  })
  redraw()
}
