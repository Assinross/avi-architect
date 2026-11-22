import {test,expect,type Page} from '@playwright/test'
import {saveKey} from '../../src/storage'
import type {CityWorld} from '../../src/model'

const action=(page:Page,name:string)=>page.locator('[data-action="'+name+'"]').last()
const world=(page:Page):Promise<CityWorld>=>
  page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).world,saveKey)

async function openings(page:Page,numberOfWindows:number,requireValid=true) {
  await page.locator('[data-tool="door"]').click()
  await page.locator('[data-wall="f0a"][data-offset="0.5"]').click()
  await page.locator('[data-tool="window"]').click()
  for(let i=0;i<numberOfWindows;i++)
    await page.locator(`[data-wall="f0a"][data-offset="${i*2+1.5}"]`).click()
  if(requireValid)await expect(page.locator('#checks .fine')).toBeVisible()
}

test('Общая мастерская: карьерные открытия, три проекта и заселение города',async({page})=>{
  const errors:string[]=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto('./')
  await expect(action(page,'continue')).toBeDisabled()
  await action(page,'new').click()

  // Chapter 1: the same editor, with walls/windows, no partitions or second floor.
  await action(page,'order').click()
  await action(page,'accept').click()
  await action(page,'edit').click()
  await expect(page).toHaveURL(/mode=career&quest=home/)
  await expect(page.locator('#mainHeading')).toContainText('Эммы')
  await expect(page.locator('#add')).toBeDisabled()
  await expect(page.locator('[data-tool="partition"]')).toBeHidden()
  await expect(page.locator('[data-tool="stairs"]')).toBeHidden()
  await expect(page.locator('.preview-panel')).toBeHidden()
  await openings(page,1)
  await page.locator('#publish').click()
  await page.waitForURL(/finished=home/)
  await expect(page.locator('.sheet')).toContainText('Заказ выполнен')
  expect((await world(page)).careerPlans.home?.floors).toHaveLength(1)
  await action(page,'city').click()

  // Chapter 2: the editor unlocks room partitions, but not stairs.
  await action(page,'order').click()
  await action(page,'accept').click()
  await action(page,'edit').click()
  await expect(page).toHaveURL(/mode=career&quest=bakery/)
  await expect(page.locator('#add')).toBeDisabled()
  await expect(page.locator('[data-tool="partition"]')).toBeVisible()
  await expect(page.locator('[data-tool="stairs"]')).toBeHidden()
  await page.locator('[data-tool="partition"]').click()
  await page.locator('[data-node="4,3"]').click()
  await page.locator('[data-node="4,5"]').click()
  await expect(page.locator('.partition')).toHaveCount(1)
  await openings(page,2)
  await page.locator('#previewToggle').click()
  await expect(page.locator('.preview-panel')).toBeVisible()
  await expect(page.locator('#volume canvas')).toBeVisible()
  await page.locator('#publish').click()
  await page.waitForURL(/finished=bakery/)
  await expect(page.locator('.sheet')).toContainText('Заказ выполнен')
  expect((await world(page)).careerPlans.bakery?.floors[0].partitions).toHaveLength(1)
  await action(page,'city').click()

  // Chapter 3: stairs and multiple floors unlock for Nika's commission.
  await expect(page.locator('.sheet')).toContainText('Долина ожила')
  await action(page,'nika').click()
  await expect(page).toHaveURL(/mode=career&quest=landmark/)
  await expect(page.locator('#add')).toBeEnabled()
  await expect(page.locator('[data-tool="stairs"]')).toBeVisible()
  await openings(page,2,false)
  await page.locator('#add').click()
  await expect(page.locator('#floorStat')).toHaveText('2')
  await expect(page.locator('#checks .fine')).toBeVisible()
  await page.locator('#publish').click()
  await page.waitForURL(/\?city=1/)
  await expect(page.locator('.sheet')).toContainText('дом Ники готов')
  const city=await world(page)
  expect(city.rewards).toBe(3)
  expect(city.landmark?.floors).toHaveLength(2)
  expect(city.careerPlans.home?.floors).toHaveLength(1)
  expect(city.careerPlans.bakery?.floors[0].partitions).toHaveLength(1)
  await page.reload()
  await expect(page.locator('.sheet')).toContainText('Ника поселилась')
  expect(errors).toEqual([])
})

test.describe('Планшет',()=>{
  test.use({viewport:{width:768,height:1024},hasTouch:true,isMobile:true})
  test('В карьере 3D включается по желанию; в свободном режиме показывается сразу',async({page})=>{
    await page.goto('./')
    for(const name of ['new','order','accept','edit'])await action(page,name).tap()
    await expect(page.locator('.preview-panel')).toBeHidden()
    await page.locator('#previewToggle').tap()
    await expect(page.locator('#volume canvas')).toBeVisible()
    await page.locator('#previewToggle').tap()
    await expect(page.locator('.preview-panel')).toBeHidden()
    await page.goto('./workshop.html')
    await expect(page.locator('.preview-panel')).toBeVisible()
    await expect(page.locator('#volume canvas')).toBeVisible()
    await expect(page.locator('#add')).toBeEnabled()
    await expect(page.locator('[data-tool="stairs"]')).toBeVisible()
  })
})
