import {test,expect} from '@playwright/test'
import {History,newModel,complete,freshWorld,type Purpose} from '../../src/model'
import {addFloor,fromLegacy,validate} from '../../src/multistorey'
import {saveKey} from '../../src/storage'

function building(purpose:Purpose) {
  const h=new History(newModel(purpose)),w=purpose==='home'?4:5
  const points:[number,number][]=[[1,1],[1+w,1],[1+w,5],[1,5]]
  for(let i=0;i<4;i++)h.addWall(points[i],points[(i+1)%4])
  const id=h.model.walls[0].id
  h.addDoor(id,.5);h.addWindow(id,1.5)
  if(purpose==='bakery')h.addWindow(id,2.5)
  return h.model
}
function prepared() {
  const first=complete({...freshWorld(),accepted:true},building('home'))
  const finished=complete({...first,accepted:true},building('bakery'))
  const city=finished
  const project=addFloor(fromLegacy(building('home')))
  project.floors[0].stairToNext={x:1,z:1,facing:'south'}
  expect(validate(project)).toEqual([])
  return {city,project}
}

test('Город сохраняет и отображает многоэтажный дом Ники после публикации',async({page})=>{
  const errors:string[]=[]
  page.on('pageerror',e=>errors.push(e.message))
  const {city,project}=prepared()
  await page.goto('./')
  await page.evaluate(({city,project,saveKey})=>{
    localStorage.setItem(saveKey,JSON.stringify({version:3,world:city}))
    localStorage.setItem('avi-architect.multistorey-workshop.v1',JSON.stringify(project))
  },{city,project,saveKey})
  await page.goto('./workshop.html')
  await expect(page.locator('#publish')).toBeVisible()
  await page.locator('#publish').click()
  await page.waitForURL(/\?city=1/)
  await expect(page.locator('.sheet')).toContainText('Дом Ники готов')
  const persisted=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),saveKey)
  expect(persisted.version).toBe(3)
  expect(persisted.world.landmark).toEqual(project)
  expect(persisted.world.rewards).toBe(3)
  await page.reload()
  await expect(page.getByRole('button',{name:'Улучшить дом Ники'})).toBeVisible()
  await expect(page.locator('.status-pill')).toContainText('3 / 5')
  expect(errors).toEqual([])
})

test('Без заказов мастерская не может разместить дом в городе',async({page})=>{
  await page.goto('./workshop.html')
  await page.locator('#publish').click()
  await expect(page.locator('#status')).toContainText('Сначала начни игру')
  await expect(page).toHaveURL(/workshop.html/)
})
