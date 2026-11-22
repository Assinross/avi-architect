import {test,expect} from '@playwright/test'
import {learningKey} from '../../src/education'

test('Книга архитектора: пять локальных фотографий, вопросы, прогресс и сброс',async({page})=>{
 const errors:string[]=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto('./')
 await page.locator('[data-action="book"]').click()
 await expect(page.getByRole('heading',{name:'Книга архитектора'})).toBeVisible()
 await expect(page.locator('#modal .ed-tile')).toHaveCount(5)
 await expect(page.locator('#modal .ed-progress')).toContainText('0 / 3')
 await expect.poll(()=>page.locator('#modal .ed-tile img').first().evaluate(
   (img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true)
 await page.locator('#modal [data-action="story-gaudi"]').click()
 await expect(page.locator('#modal [data-story="gaudi"]')).toContainText('Дом Бальо')
 await expect(page.locator('#modal .ed-credit')).toContainText('ProtoplasmaKid')
 await expect.poll(()=>page.locator('#modal .ed-hero img').evaluate(
   (img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true)
 await page.locator('#modal [data-action="answer-gaudi-1"]').click()
 await expect(page.locator('#modal .ed-feedback')).toContainText('Попробуй другой ответ')
 await page.locator('#modal [data-action="answer-gaudi-0"]').click()
 await expect(page.locator('#modal .ed-feedback')).toContainText('Да! Это была реконструкция')
 const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),learningKey)
 expect(saved.read).toContain('gaudi')
 expect(saved.solved).toContain('gaudi')
 await page.locator('#modal [data-action="book"]').click()
 await expect(page.locator('#modal .ed-progress')).toContainText('1 / 5')
 await page.locator('#modal [data-action="close"]').click()
 await page.reload()
 await page.locator('[data-action="book"]').click()
 await expect(page.locator('#modal .ed-progress')).toContainText('1 / 5')
 await page.locator('#modal [data-action="close"]').click()
 await page.locator('[data-action="new"]').click()
 expect(await page.evaluate(key=>localStorage.getItem(key),learningKey)).toBeNull()
 expect(errors).toEqual([])
})

test('Свободная мастерская: книга и урок доступны без прогресса города',async({page})=>{
 const errors:string[]=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto('./workshop.html')
 await expect(page.locator('#learningTitle')).toContainText('Экспериментируй')
 await page.locator('#knowledge').click()
 await expect(page.locator('#learningDialog[open] .ed-tile')).toHaveCount(5)
 await page.locator('#learningDialog [data-action="story-pantheon"]').click()
 await expect(page.locator('#learningDialog [data-story="pantheon"]')).toContainText('окулюс')
 await expect.poll(()=>page.locator('#learningDialog .ed-hero img').evaluate(
   (img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true)
 await page.locator('#learningDialog [data-action="answer-pantheon-0"]').click()
 await expect(page.locator('#learningDialog .ed-feedback')).toContainText('Окулюс пропускает дневной свет')
 await page.locator('#learningDialog [data-action="book"]').click()
 await expect(page.locator('#learningDialog .ed-progress')).toContainText('1 / 5')
 await page.keyboard.press('Escape')
 await expect(page.locator('#learningDialog')).not.toBeVisible()
 await page.goto('./workshop.html?mode=career&quest=home')
 await expect(page.locator('#learningTitle')).toContainText('План, площадь и свет')
 await expect(page.locator('#learningExperiment')).toContainText('4×3')
 expect(errors).toEqual([])
})
