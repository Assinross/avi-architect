import {test,expect,type Page} from '@playwright/test'

/** Convert metre-grid coordinates to actual screen pixels at any responsive size. */
async function dragGrid(page:Page,from:[number,number],to:[number,number]){
  const [start,end]=await page.locator('#plan').evaluate((svg,coords)=>{
    const matrix=(svg as SVGSVGElement).getScreenCTM()!
    return coords.map(([x,z])=>{
      const p=new DOMPoint(60+x*36,48+z*36).matrixTransform(matrix)
      return {x:p.x,y:p.y}
    })
  },[from,to])
  await page.mouse.move(start.x,start.y)
  await page.mouse.down()
  await page.mouse.move(end.x,end.y,{steps:8})
  await page.mouse.up()
}

test('Перетаскивание внешней стены сохраняет прямоугольник и позволяет откатить изменение',async({page})=>{
  const errors:string[]=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto('/workshop.html')
  await expect(page.locator('[data-drag-edge="f0b"]').first()).toBeVisible()
  await dragGrid(page,[8,4],[10,4])
  await expect(page.locator('#w')).toHaveValue('9')
  await expect(page.locator('.wall')).toHaveCount(4)
  await expect(page.locator('#checks .fine')).toBeVisible()
  await page.locator('#undo').click()
  await expect(page.locator('#w')).toHaveValue('7')
  await page.locator('#redo').click()
  await expect(page.locator('#w')).toHaveValue('9')
  await page.locator('[data-tool="partition"]').click()
  await dragGrid(page,[4,3],[4,6])
  await expect(page.locator('.partition')).toHaveCount(1)
  await page.locator('[data-tool="inspect"]').click()
  await dragGrid(page,[4,4],[5,4])
  await expect(page.locator('[data-drag-partition]')).toHaveAttribute('x1',String(60+5*36))
  await page.locator('#undo').click()
  await expect(page.locator('[data-drag-partition]')).toHaveAttribute('x1',String(60+4*36))
  expect(errors).toEqual([])
})

test('Контур рисуется одним жестом, а широкое окно переносится целиком',async({page})=>{
  const errors:string[]=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto('/workshop.html')
  await page.locator('[data-tool="outline"]').click()
  await dragGrid(page,[2,2],[9,8])
  await expect(page.locator('#x0')).toHaveValue('2')
  await expect(page.locator('#w')).toHaveValue('7')
  await expect(page.locator('#d')).toHaveValue('6')
  await page.locator('[data-tool="window"]').click()
  await page.locator('[data-wall="f0a"][data-offset="1.5"]').click()
  await page.locator('[data-wall="f0a"][data-offset="2.5"]').click()
  await expect(page.locator('[data-opening-span="window"][data-span-width="2"]')).toHaveCount(1)
  await page.locator('[data-tool="inspect"]').click()
  await dragGrid(page,[4,2],[6,2])
  await expect(page.locator('[data-drag-opening="f0a"][data-run-offset="3.5"]')).toHaveCount(1)
  await expect(page.locator('[data-opening-span="window"][data-span-width="2"]')).toHaveCount(1)
  await dragGrid(page,[7,5],[8,5])
  await expect(page.locator('#x0')).toHaveValue('3')
  await expect(page.locator('#w')).toHaveValue('7')
  await expect(page.locator('#checks .fine')).toBeVisible()
  expect(errors).toEqual([])
})
