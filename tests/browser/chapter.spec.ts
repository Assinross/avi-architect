import { test, expect, type Page } from '@playwright/test'
import { saveKey } from '../../src/storage'
import type { CityWorld } from '../../src/model'

const action=(p:Page,name:string)=>p.locator('[data-action="'+name+'"]')
const editor=(p:Page,name:string)=>p.locator('[data-editor-action="'+name+'"]')
const world=(p:Page):Promise<CityWorld>=>p.evaluate(key=>JSON.parse(localStorage.getItem(key)!).world,saveKey)

test('Два заказа, редактирование, награды и возвращение в город',async({page})=>{
  const errors:string[]=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto('./')
  await expect(action(page,'continue')).toBeDisabled()
  await action(page,'themes').click()
  await action(page,'theme-1').click()
  await action(page,'close').click()
  await action(page,'new').click()
  for(const purpose of ['home','bakery'] as const){
    await action(page,'order').click()
    await action(page,'accept').click()
    await action(page,'edit').click()
    // Design two different footprints and place openings via the same visible tools as a player.
    const right=purpose==='home'?6:8
    for(const node of ['2,2',right+',2',right+',6','2,6','2,2'])
      await page.locator('[data-node="'+node+'"]').click()
    if(purpose==='home'){
      await editor(page,'preview').click()
      await action(page,'submit').click()
      await expect(page.getByRole('dialog')).toContainText(/двер/i)
      await action(page,'edit').click()
    }
    await page.locator('[data-tool="door"]').click()
    await page.locator('[data-slot="2.5,2"]').click()
    await page.locator('[data-tool="window"]').click()
    await page.locator('[data-slot="4.5,2"]').click()
    await editor(page,'undo').click()
    await editor(page,'redo').click()
    if(purpose==='bakery')await page.locator('[data-slot="5.5,2"]').click()
    const model=(await world(page)).draft
    await editor(page,'preview').click()
    await action(page,'roof').click()
    if(purpose==='home'){
      await action(page,'settings').click()
      await action(page,'themes').click()
      await action(page,'theme-0').click()
      await action(page,'close').click()
      await expect(action(page,'roof')).toHaveText('Показать крышу')
    }
    expect((await world(page)).draft).toEqual(model)
    await action(page,'submit').click()
    await expect(page.locator('.sheet')).toContainText('Заказ выполнен')
    expect((await world(page)).buildings[purpose]).toEqual(model)
    await action(page,'city').click()
  }
  await expect(page.locator('.sheet')).toContainText('Долина ожила')
  const before=await world(page)
  expect(before.rewards).toBe(3)
  await page.reload()
  await action(page,'continue').click()
  await expect(page.locator('.status-pill')).toHaveText('Построено · 2 / 2')
  expect(await world(page)).toEqual(before)
  await action(page,'journal').click()
  await expect(page.getByText('Выполнен',{exact:true})).toHaveCount(2)
  expect(errors).toEqual([])
})

test.describe('Сенсорный планшет',()=>{
  test.use({viewport:{width:768,height:1024},hasTouch:true,isMobile:true})
  test('Чертёж восстанавливается после перезагрузки. Сброс требует подтверждения',async({page})=>{
    await page.goto('./')
    for(const name of ['new','order','accept','edit'])await action(page,name).tap()
    for(const node of ['1,1','5,1'])await page.locator('[data-node="'+node+'"]').tap()
    const before=(await world(page)).draft
    expect(before?.walls).toHaveLength(1)
    await page.reload()
    for(const name of ['continue','plot','edit'])await action(page,name).tap()
    expect((await world(page)).draft).toEqual(before)
    await editor(page,'city').tap()
    await action(page,'settings').tap()
    await action(page,'reset').tap()
    await action(page,'close').tap()
    expect((await world(page)).draft).toEqual(before)
    await action(page,'settings').tap()
    await action(page,'reset').tap()
    await action(page,'confirm-reset').tap()
    await expect(action(page,'continue')).toBeDisabled()
  })
})
