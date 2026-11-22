import {describe,expect,it} from 'vitest'
import {stories,featured,checkAnswer,lessons,normalizeLearning,bookMarkup,storyMarkup,skillCount,storyImage} from '../src/education'

describe('Архитектурная энциклопедия и учебные открытия',()=>{
 it('каждый заказ открывает конкретную проверенную историю',()=>{
   expect(featured('home').id).toBe('gaudi')
   expect(featured('bakery').id).toBe('shukhov')
   expect(featured('landmark').id).toBe('fallingwater')
   expect(new Set(stories.map(s=>s.id)).size).toBe(stories.length)
   expect(stories).toHaveLength(5)
   expect(Object.values(lessons).every(l=>l.experiment&&l.achieved)).toBe(true)
 })
 it('у фотографий есть локальный путь, автор, лицензия и источник',()=>{
   for(const story of stories){
     expect(storyImage(story)).toContain(`./architecture/${story.id}.jpg`)
     expect(storyImage(story)).toContain(`./architecture/${story.id}.svg`)
     expect(story.commons).toMatch(/^https:\/\/commons\.wikimedia\.org\//)
     expect(story.license.length).toBeGreaterThan(2)
     expect(story.reference).toMatch(/^https:\/\//)
     expect(story.answers).toHaveLength(2)
     expect(checkAnswer(story.id,story.correct)).toBe(true)
     expect(checkAnswer(story.id,1-story.correct)).toBe(false)
   }
 })
 it('в книге отдельно учитываются выполненные практики и ответы, а данные нормализуются',()=>{
   expect(skillCount({home:true,bakery:false,landmark:false})).toBe(1)
   expect(skillCount({home:true,bakery:true,landmark:true})).toBe(3)
   expect(normalizeLearning({read:['gaudi','gaudi','bad'],solved:['shukhov','fake']}))
      .toEqual({read:['gaudi'],solved:['shukhov']})
   expect(normalizeLearning(null)).toEqual({read:[],solved:[]})
   const html=bookMarkup({home:true,bakery:false,landmark:false},{read:['gaudi'],solved:[]})
   expect(html).toContain('1 / 3')
   expect(html).toContain('story-gaudi')
   expect(html).toContain('Уже читал')
   expect(storyMarkup(stories[0],{read:[],solved:[]})).toContain('answer-gaudi-0')
 })
})
