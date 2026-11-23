export type Plant = 'grass'|'path'|'tree'|'flowers'
export interface Riverworks { heights: number[]; garden?: Plant[] }

export function waterStops(heights:number[]) {
  const profile=[6,...heights,0]
  return profile.findIndex((height,i)=>i>0 && height>=profile[i-1])
}

export function gardenIssue(plan:Plant[]):string {
  const nearby=(a:number,b:number)=>Math.abs(a%3-b%3)+Math.abs(Math.floor(a/3)-Math.floor(b/3))===1
  const reachable=new Set([3])
  for(const cell of reachable){
    for(let i=0;i<9;i++)if(nearby(cell,i)&&(plan[i]==='path'||i===5))reachable.add(i)
  }
  if(!reachable.has(5))return 'От калитки пока нельзя дойти до скамьи. Соедини их дорожкой по сторонам клеток.'
  if(!plan.some((plant,i)=>plant==='tree'&&nearby(i,5)))return 'На скамье жарко. Посади дерево в соседней с ней клетке.'
  if(!plan.includes('flowers'))return 'Садовница принесла рассаду. Выбери для цветов место у канала.'
  if(plan.some((plant,i)=>plant==='flowers'&&i>=3))return 'Вода из канала доходит только до верхнего ряда. Перенеси туда цветы.'
  return ''
}

export function validRiverworks(value:unknown):value is Riverworks {
  if(!value||typeof value!=='object'||!('heights' in value))return false
  const h=value.heights
  if(!Array.isArray(h)||h.length!==2||!h.every(n=>Number.isInteger(n)&&n>0&&n<6)||waterStops(h)!==-1)return false
  if(!('garden' in value))return true
  const g=value.garden
  return Array.isArray(g)&&g.length===9&&g.every(v=>['grass','path','tree','flowers'].includes(v))&&
    g[3]==='path'&&g[5]==='path'&&!gardenIssue(g)
}

export function historyNote(garden:boolean){
  const facts=garden?'В персидских садах каналы орошали посадки и украшали сад. План делили на четыре части. В список ЮНЕСКО вошли девять таких садов в разных провинциях Ирана.':
    'Мост Пон-дю-Гар переносил воду через реку Гардон. Его три яруса поднимаются почти на 49 метров. Сам мост был лишь частью водопровода длиной около 50 километров, снабжавшего город Ним.'
  return `<details class="river-history"><summary>${garden?'Как устраивали персидские сады?':'Как римляне доставляли воду в Ним?'}</summary><p>${facts} <a href="https://whc.unesco.org/en/list/${garden?'1372':'344'}/" target="_blank" rel="noopener">ЮНЕСКО</a></p></details>`
}

export function aqueductForm(heights:number[]){
  const profile=[6,...heights,0],stop=waterStops(heights)
  const points=profile.map((h,i)=>`${20+i*88},${55-h*6}`)
  return `<p>Пекарь Лев носит воду вёдрами. Настрой две опоры так, чтобы от родника до водосборника канал всё время шёл под уклон.</p>
    <svg class="river-profile" viewBox="0 0 304 78" role="img" aria-label="Профиль канала. Отметки в сантиметрах: ${profile.join(', ')}">
    <path d="M0 67 Q50 55 95 66 T185 66 T304 65 V78 H0Z" fill="#859a66"/>
    ${profile.map((h,i)=>`<rect x="${16+i*88}" y="${55-h*6}" width="8" height="${20+h*6}" fill="#ad9271"/>`).join('')}
    <polyline points="${points.join(' ')}" stroke="#aa9178" stroke-width="5" fill="none"/>
    <polyline points="${points.slice(0,stop<0?4:stop).join(' ')}" stroke="#308786" stroke-width="4" fill="none"/></svg>
    <small>Родник +6 см · Водосборник 0 см · Перепад на схеме увеличен</small>
    ${heights.map((h,i)=>`<label class="setting">Опора ${i+1}<select data-support="${i}">${[0,1,2,3,4,5,6].map(v=>`<option value="${v}" ${v===h?'selected':''}>+${v} см</option>`).join('')}</select></label>`).join('')}`
}

export const plantNames:Record<Plant,string>={grass:'Газон',path:'Дорожка',tree:'Дерево',flowers:'Цветы'}
export function gardenForm(plan:Plant[],brush:Plant){
  const symbols={grass:'·',path:'▪',tree:'♣',flowers:'✿'}
  return `<p>Устрой сад для Эммы. Проведи дорожку от калитки к скамье, посади рядом со скамьёй дерево, а у поливочного канала разбей цветник.</p>
    <div class="garden-tools">${(Object.keys(plantNames) as Plant[]).map(p=>`<button data-brush="${p}" aria-pressed="${brush===p}">${plantNames[p]}</button>`).join('')}</div>
    <div class="garden-canal">Поливочный канал</div><div class="garden-grid">${plan.map((p,i)=>i===3||i===5?`<span>${i===3?'Калитка':'Скамья'}</span>`:`<button class="plant-${p}" data-cell="${i}" aria-label="Ряд ${1+Math.floor(i/3)}, место ${1+i%3}. ${plantNames[p]}">${symbols[p]} <small>${plantNames[p]}</small></button>`).join('')}</div>`
}
