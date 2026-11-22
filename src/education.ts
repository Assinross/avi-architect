/**
 * Audiovisual learning layer for Avi Architect.
 *
 * Facts are deliberately short, age-appropriate and reviewed against the
 * primary sources listed in docs/educational-design.md.
 * Photographs live at /architecture/*.jpg, WITH credits in ASSET_REGISTER.csv.
 * Illustrated /architecture/*.svg files are a local offline fallback.
 */
export type Milestone = 'home'|'bakery'|'landmark'
export type StoryId = 'gaudi'|'shukhov'|'fallingwater'|'pantheon'|'brunelleschi'

export interface Story {
  id:StoryId
  title:string
  person:string
  place:string
  years:string
  kind:'Архитектор'|'Инженер'|'Сооружение'
  intro:string
  fact:string
  link:string
  idea:string
  question:string
  answers:readonly [string,string]
  correct:0|1
  explanation:string
  photo:string
  alt:string
  author:string
  license:string
  commons:string
  reference:string
}

export const stories:readonly Story[] = [
  {
    id:'gaudi',title:'Дом, похожий на сказку',
    person:'Антони Гауди · Дом Бальо',place:'Барселона, Испания',years:'1904–1906',
    kind:'Архитектор',
    intro:'Ты уже построил дом с окнами. А архитектор Антони Гауди придумал окна и балконы, которые напоминают формы живой природы.',
    fact:'Гауди не строил дом заново: он полностью преобразил старое здание. Посмотри на необычные балконы и плавные линии фасада.',
    idea:'Попробуй выбрать для своего следующего проекта необычную форму окна или придумать красивый фасад.',
    question:'Что Гауди изменил в Доме Бальо?',answers:['Перестроил существующий дом','Построил новый замок'],
    correct:0,explanation:'Да! Это была реконструкция: старый дом получил совершенно новый облик.',
    photo:'gaudi.jpg',alt:'Фасад Дома Бальо в Барселоне: необычные балконы и волнистые линии',
    author:'ProtoplasmaKid',license:'CC BY 4.0',
    commons:'https://commons.wikimedia.org/wiki/File:Exterior_de_la_Casa_Batll%C3%B3_-_2026_-_01.jpg',
    reference:'https://www.casabatllo.es/en/antoni-gaudi/casa-batllo/history/',
    link:'https://www.casabatllo.es/en/antoni-gaudi/casa-batllo/history/',
  },
  {
    id:'shukhov',title:'Башня из тонких линий',
    person:'Владимир Шухов · Шуховская башня',place:'Москва, Россия',years:'1922',
    kind:'Инженер',
    intro:'Любому большому зданию нужна прочность. Инженер Владимир Шухов придумал решётчатые конструкции, которые выглядят лёгкими.',
    fact:'Шуховская радиобашня состоит из множества металлических стержней. Их форма помогает создать высокую конструкцию без сплошных массивных стен.',
    idea:'Сравни массивную стену и решётку: где понадобилось бы больше материала?',
    question:'Из чего собрана Шуховская башня?',answers:['Из сплошного камня','Из металлической решётки'],
    correct:1,explanation:'Верно! Это лёгкая стальная решётчатая конструкция, а не каменная башня.',
    photo:'shukhov.jpg',alt:'Шуховская радиобашня с пересекающимися металлическими стержнями',
    author:'Maxim Fedorov',license:'Public domain',
    commons:'https://commons.wikimedia.org/wiki/File:Shukhov_Tower_photo_by_Maxim_Fedorov_(1).JPG',
    reference:'https://www.nnov.ec/en/Vladimir_Shukhov',
    link:'https://www.nnov.ec/en/Vladimir_Shukhov',
  },
  {
    id:'fallingwater',title:'Дом над водопадом',
    person:'Фрэнк Ллойд Райт · Дом над водопадом',place:'Пенсильвания, США',years:'1935–1939',
    kind:'Архитектор',
    intro:'У твоего дома появился второй этаж и поддерживающие опоры. А этот знаменитый дом буквально нависает над водопадом!',
    fact:'Фрэнк Ллойд Райт расположил большие террасы над водой. Их держат специальные консольные конструкции, а сам дом вписан в скалы и лес.',
    idea:'Построй выступающий этаж и подумай: куда должна передаваться его нагрузка?',
    question:'Какой принцип помог создать выступающие террасы?',answers:['Консольные конструкции','Верёвки, привязанные к деревьям'],
    correct:0,explanation:'Правильно! Консоль опирается на конструкцию здания и может выступать за пределы стен.',
    photo:'fallingwater.jpg',alt:'Дом над водопадом Фрэнка Ллойда Райта среди деревьев',
    author:'Euelbenul',license:'CC BY-SA 4.0',
    commons:'https://commons.wikimedia.org/wiki/File:Fallingwater%2C_Pennsylvania.jpg',
    reference:'https://fallingwater.org/media-resources/fallingwater-facts/',
    link:'https://fallingwater.org/media-resources/fallingwater-facts/',
  },
  {
    id:'pantheon',title:'Окно в самом куполе',
    person:'Пантеон · Древний Рим',place:'Рим, Италия',years:'II век н. э.',
    kind:'Сооружение',
    intro:'В Риме почти две тысячи лет стоит огромное круглое здание под куполом — Пантеон.',
    fact:'В центре купола есть круглое отверстие — окулюс. Сквозь него внутрь попадает дневной свет. Во время дождя вода тоже попадает внутрь, поэтому в полу устроен водоотвод.',
    idea:'Может ли окно быть не только в стене? Попробуй представить свет из отверстия в крыше.',
    question:'Зачем нужен окулюс в куполе Пантеона?',answers:['Пропускает свет','Держит стены, как колонна'],
    correct:0,explanation:'Точно! Окулюс пропускает дневной свет, а вода уходит через отверстия в полу.',
    photo:'pantheon.jpg',alt:'Древнеримский Пантеон с колоннами и куполом',
    author:'John Samuel',license:'CC BY-SA 4.0',
    commons:'https://commons.wikimedia.org/wiki/File:Pantheon_(Rome)_-_Exterior_01.jpg',
    reference:'https://direzionemuseiroma.cultura.gov.it/en/pantheon/historical-background/',
    link:'https://direzionemuseiroma.cultura.gov.it/en/pantheon/historical-background/',
  },
  {
    id:'brunelleschi',title:'Купол, который удивил мир',
    person:'Филиппо Брунеллески · Собор во Флоренции',place:'Флоренция, Италия',years:'1420–1436',
    kind:'Архитектор',
    intro:'Много веков назад во Флоренции строители столкнулись с задачей: как перекрыть огромный собор высоким куполом?',
    fact:'Брунеллески придумал необычный способ возведения кирпичного купола. Работы над основным куполом продолжались с 1420 до 1436 года.',
    idea:'Нарисуй круг и квадрат одинаковой ширины. Какой потолок было бы труднее построить без дополнительных опор?',
    question:'Какую главную задачу решал Брунеллески?',answers:['Построить большой купол','Спрятать все окна собора'],
    correct:0,explanation:'Верно! Это был труднейший инженерный проект своего времени.',
    photo:'brunelleschi.jpg',alt:'Красный купол собора Санта-Мария-дель-Фьоре во Флоренции',
    author:'Ilya Orehov',license:'CC0 1.0',
    commons:'https://commons.wikimedia.org/wiki/File:Cathedral_of_Santa_Maria_del_Fiore%2C_Firenze%2C_Italy_(Unsplash).jpg',
    reference:'https://duomo.firenze.it/en/discover/dome',
    link:'https://duomo.firenze.it/en/discover/dome',
  },
] as const

export const lessons:Record<Milestone,{title:string;objective:string;experiment:string;achieved:string;story:StoryId}> = {
  home:{
    title:'План, площадь и свет',
    objective:'Измерить стены, найти площадь, выбрать вход и окно и уложиться в бюджет.',
    experiment:'Сравни прямоугольники 4×3 и 6×2 м: площадь одинаковая, а длина стен разная.',
    achieved:'Ты построил первый дом: выбрал габариты, дверь, окно и учёл стоимость.',
    story:'gaudi',
  },
  bakery:{
    title:'Удобство и назначение комнат',
    objective:'Подумать, как люди входят в здание, куда поставить окна и перегородки.',
    experiment:'Представь кухню, прилавок и вход в пекарню. Как отделить место работы от гостей?',
    achieved:'Ты спланировал общественное здание и научился пользоваться перегородками.',
    story:'shukhov',
  },
  landmark:{
    title:'Этажи и устойчивость',
    objective:'Соединить уровни лестницей, продумать перекрытия и опоры.',
    experiment:'Выдвинь второй этаж за контур первого и найди на плане поддерживающие колонны.',
    achieved:'Ты спроектировал многоэтажное здание, лестничную связь и опоры.',
    story:'fallingwater',
  },
}
export const storyById=(id:string):Story|undefined=>stories.find(s=>s.id===id)
export const featured=(m:Milestone):Story=>storyById(lessons[m].story)!

export interface LearningProgress {read:StoryId[];solved:StoryId[]}
export const learningKey='avi-architect.learning.v1'
const validIds=new Set<StoryId>(stories.map(s=>s.id))
export const emptyLearning=():LearningProgress=>({read:[],solved:[]})
export function normalizeLearning(input:unknown):LearningProgress {
  if(!input||typeof input!=='object')return emptyLearning()
  const raw=input as Record<string,unknown>
  const take=(value:unknown):StoryId[]=>
    Array.isArray(value)?[...new Set(value.filter((v):v is StoryId=>typeof v==='string'&&validIds.has(v as StoryId)))]:[]
  return {read:take(raw.read),solved:take(raw.solved)}
}
export function readLearning():LearningProgress {
  try{return normalizeLearning(JSON.parse(localStorage.getItem(learningKey)||'null'))}
  catch{return emptyLearning()}
}
export function recordLearning(id:StoryId,kind:'read'|'solved'):LearningProgress {
  const current=readLearning()
  if(!current[kind].includes(id))current[kind].push(id)
  try{localStorage.setItem(learningKey,JSON.stringify(current))}catch{}
  return current
}
export function resetLearning(){
  try{localStorage.removeItem(learningKey)}catch{}
}
export function checkAnswer(id:StoryId,index:number):boolean {
  return storyById(id)?.correct===index
}
export function skillCount(status:{home:boolean;bakery:boolean;landmark:boolean}):number {
  return Number(status.home)+Number(status.bakery)+Number(status.landmark)
}
const escape=(value:string):string=>value.replace(/[&<>"']/g,character=>(
  {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]!
))
export function storyImage(story:Story,cls='ed-photo') {
  const base='./architecture/'+story.id
  return `<img class="${cls}" src="${base}.jpg" data-fallback="${base}.svg" alt="${escape(story.alt)}" loading="lazy"/>`
}
export function featuredMarkup(m:Milestone):string {
  const story=featured(m),lesson=lessons[m]
  return `<section class="ed-feature" data-education-feature="${m}">
    <div class="ed-feature-top"><span>✦ Открытие после заказа</span><span>${escape(story.place)}</span></div>
    ${storyImage(story)}
    <div class="ed-feature-copy"><strong>${escape(story.title)}</strong>
      <p>${escape(story.intro)}</p>
      <button type="button" class="ed-button" data-action="story-${story.id}">Посмотреть историю и фото</button>
    </div>
    <p class="ed-learning"><b>Новый навык:</b> ${escape(lesson.achieved)}</p>
  </section>`
}
export function storyMarkup(story:Story,progress=readLearning()):string {
  const known=progress.solved.includes(story.id)
  return `<div class="ed-story" data-story="${story.id}">
    <div class="ed-hero">${storyImage(story)}</div>
    <p class="ed-meta">${escape(story.kind)} · ${escape(story.place)} · ${escape(story.years)}</p>
    <h3>${escape(story.person)}</h3>
    <p class="ed-intro">${escape(story.intro)}</p>
    <p>${escape(story.fact)}</p>
    <aside class="ed-idea"><b>Попробуй в игре</b><p>${escape(story.idea)}</p></aside>
    <div class="ed-quiz"><strong>Проверь себя</strong><p>${escape(story.question)}</p>
      <div class="ed-answers">${story.answers.map((answer,i)=>`<button type="button" data-action="answer-${story.id}-${i}" ${known?'disabled':''}>${escape(answer)}</button>`).join('')}</div>
      <p class="ed-feedback" role="status" aria-live="polite">${known?'✓ '+escape(story.explanation):''}</p>
    </div>
    <p class="ed-credit">Фото: ${escape(story.author)} · ${escape(story.license)} ·
      <a href="${escape(story.commons)}" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>
      · <a href="${escape(story.reference)}" target="_blank" rel="noopener noreferrer">Источник фактов</a></p>
    <div class="ed-actions"><button type="button" class="ed-button" data-action="book">Книга архитектора</button>
      <button type="button" class="ed-button subtle" data-action="close">Вернуться</button></div>
  </div>`
}
export function bookMarkup(status:{home:boolean;bakery:boolean;landmark:boolean},progress=readLearning()):string {
  const skills=([
    ['home','План и площадь'],['bakery','Назначение помещений'],['landmark','Этажи и опоры'],
  ] as const)
  const mastered=skillCount(status)
  return `<div class="ed-book">
    <p class="ed-intro">Собирай открытия о зданиях и людях, которые их придумали. Книгу можно читать в любом порядке — даже если истории пока не связаны с заказом.</p>
    <div class="ed-progress"><strong>${mastered} / 3</strong><span>практических навыков · ${progress.solved.length} / ${stories.length} вопросов разгадано</span></div>
    <div class="ed-skills">${skills.map(([id,label])=>`<span class="ed-skill ${status[id]?'done':''}">${status[id]?'✓':'○'} ${label}</span>`).join('')}</div>
    <h3>Истории и архитекторы</h3>
    <div class="ed-collection">${stories.map(story=>`<button type="button" class="ed-tile" data-action="story-${story.id}">
      ${storyImage(story)}<span><b>${escape(story.title)}</b>
      <small>${escape(story.person)} · ${escape(story.years)}</small>
      <em>${progress.solved.includes(story.id)?'✓ Знание проверено':progress.read.includes(story.id)?'Уже читал':'Новое открытие'}</em></span></button>`).join('')}</div>
    <p class="ed-footnote">Знания и истории доступны без интернета после загрузки игры. Фото и авторские права указаны в каждой карточке.</p>
  </div>`
}
export function installPhotoFallback(root:ParentNode):void {
  for(const image of root.querySelectorAll<HTMLImageElement>('img[data-fallback]')){
    image.addEventListener('error',()=>{
      const fallback=image.dataset.fallback
      if(fallback){image.removeAttribute('data-fallback');image.src=fallback}
    },{once:true})
  }
}
