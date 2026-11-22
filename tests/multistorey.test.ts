import {describe, expect, it} from 'vitest'
import {
  addFloor, columns, estimate, footprint, fromLegacy, rectangleArea, removeTopFloor,
  roofs, stairRect, subtractRect, toLegacy, totalArea, validate, STOREY_HEIGHT, openingRuns, overhangs,
  type Facing, type FloorPlan, type MultiStoreyPlan, type Staircase,
} from '../src/multistorey'

const rect = (x0:number,z0:number,x1:number,z1:number,tag='f'):FloorPlan => ({
  walls:[
    {id:`${tag}-0`,a:[x0,z0],b:[x1,z0]},
    {id:`${tag}-1`,a:[x1,z0],b:[x1,z1]},
    {id:`${tag}-2`,a:[x1,z1],b:[x0,z1]},
    {id:`${tag}-3`,a:[x0,z1],b:[x0,z0]},
  ], openings:[], partitions:[], stairToNext:null,
})
const stair=(x:number,z:number,facing:Facing='north'):Staircase=>({x,z,facing})

describe('Многоэтажный архитектурный планировщик',()=>{
  it('преобразует старый чертёж без мутаций',()=>{
    const first=rect(1,1,7,7)
    const plan=fromLegacy(first)
    expect(toLegacy(plan)).toEqual({walls:first.walls,openings:first.openings})
    plan.floors[0].walls[0].a=[0,0]
    expect(first.walls[0].a).toEqual([1,1])
    expect(validate(fromLegacy(first))).toEqual([])
  })
  it('строит точно подогнанную кровлю над свободным перекрытием нижнего этажа',()=>{
    const first=rect(0,0,8,8,'a'),second=rect(2,1,6,6,'b')
    first.stairToNext=stair(2,1)
    const plan={floors:[first,second]}
    expect(validate(plan)).toEqual([])
    const all=roofs(plan)
    expect(all.filter(x=>x.kind==='setback').reduce((sum,x)=>sum+rectangleArea(x),0)).toBe(44)
    expect(all.filter(x=>x.kind==='top').reduce((sum,x)=>sum+rectangleArea(x),0)).toBe(20)
    expect(totalArea(plan)).toBe(84)
    expect(columns(plan)).toHaveLength(0)
  })
  it('добавляет наземные колонны при свесе второго этажа и учитывает стоимость',()=>{
    const first=rect(1,1,6,6,'a'),second=rect(3,1,10,6,'b')
    first.stairToNext=stair(3,1)
    const plan={floors:[first,second]}
    expect(validate(plan)).toEqual([])
    const posts=columns(plan)
    expect(posts.length).toBeGreaterThan(1)
    expect(posts.every(p=>p.fromY===0&&p.toY===STOREY_HEIGHT&&p.x>6)).toBe(true)
    expect(estimate(plan).columns).toBeGreaterThan(0)
  })
  it('разрешает опору третьего этажа на первый',()=>{
    const a=rect(1,1,10,8,'a'),b=rect(3,1,7,8,'b'),c=rect(5,1,10,8,'c')
    a.stairToNext=stair(3,1);b.stairToNext=stair(5,1)
    const supports=columns({floors:[a,b,c]})
    expect(supports.length).toBeGreaterThan(0)
    expect(supports.every(p=>p.upperFloor===2&&p.groundedOn===0)).toBe(true)
  })
  it('отклоняет этаж в воздухе и лестницу вне пересечения этажей',()=>{
    const a=rect(0,0,3,3,'a'),b=rect(7,7,10,10,'b')
    a.stairToNext=stair(0,0)
    const issues=validate({floors:[a,b]})
    expect(issues.map(p=>p.kind)).toContain('support')
    expect(issues.map(p=>p.kind)).toContain('stairs')
  })
  it('запрещает лестницу сквозь перегородку, но разрешает Т-примыкания',()=>{
    const a=rect(0,0,8,8,'a'),b=rect(2,2,6,6,'b')
    a.stairToNext=stair(2,2)
    a.partitions=[{id:'p',a:[3,1],b:[3,6]}]
    expect(validate({floors:[a,b]}).some(p=>p.kind==='stairs')).toBe(true)
    a.partitions=[{id:'p',a:[6,0],b:[6,8]}]
    expect(validate({floors:[a,b]})).toEqual([])
    expect(stairRect(stair(2,2,'east'))).toEqual({x0:2,z0:2,x1:4,z1:3})
  })
  it('различает винтовую лестницу на одну клетку и прямую на две',()=>{
    const a=rect(1,1,6,6,'a'),b=rect(3,3,7,7,'b')
    a.stairToNext={x:3,z:3,facing:'north',kind:'spiral'}
    expect(stairRect(a.stairToNext)).toEqual({x0:3,z0:3,x1:4,z1:4})
    expect(validate({floors:[a,b]})).toEqual([])
    const spiralPrice=estimate({floors:[a,b]}).stairs
    a.stairToNext={x:3,z:3,facing:'north',kind:'straight'}
    expect(stairRect(a.stairToNext)).toEqual({x0:3,z0:3,x1:4,z1:5})
    expect(validate({floors:[a,b]})).toEqual([])
    expect(spiralPrice).toBeGreaterThan(estimate({floors:[a,b]}).stairs)
    a.stairToNext={x:6,z:6,facing:'north',kind:'spiral'}
    expect(validate({floors:[a,b]}).some(x=>x.kind==='stairs')).toBe(true)
  })
  it('объединяет соседние окна в один широкий проём, разделённые — оставляет разными',()=>{
    const f=rect(1,1,8,7)
    const wall=f.walls[0]
    f.openings=[
      {wallId:wall.id,offset:1.5,kind:'window'},
      {wallId:wall.id,offset:2.5,kind:'window'},
      {wallId:wall.id,offset:4.5,kind:'window'},
      {wallId:wall.id,offset:5.5,kind:'door'},
    ]
    expect(openingRuns(wall,f.openings)).toEqual([
      {wallId:wall.id,kind:'window',offset:1.5,width:2},
      {wallId:wall.id,kind:'window',offset:4.5,width:1},
      {wallId:wall.id,kind:'door',offset:5.5,width:1},
    ])
    expect(validate({floors:[f]})).toEqual([])
  })
  it('нависающая мансарда создаёт поддерживающие столбы и открытую нижнюю зону',()=>{
    const a=rect(1,1,6,6,'a'),b=rect(3,1,10,6,'b')
    a.stairToNext={x:3,z:1,facing:'north',kind:'spiral'}
    const plan={floors:[a,b]}
    const wings=overhangs(plan)
    expect(wings).toEqual([{x0:6,z0:1,x1:10,z1:6,upperFloor:1}])
    expect(wings.reduce((sum,w)=>sum+rectangleArea(w),0)).toBe(20)
    expect(columns(plan).length).toBeGreaterThan(0)
    expect(columns(plan).every(c=>c.fromY===0&&c.toY===STOREY_HEIGHT)).toBe(true)
  })
  it('удаляет только верхний этаж с очисткой лестницы',()=>{
    const first=rect(1,1,8,8,'a')
    const plan:MultiStoreyPlan={floors:[first]}
    const two=addFloor(plan)
    expect(two.floors[1].walls).not.toBe(first.walls)
    two.floors[0].stairToNext=stair(1,1)
    expect(removeTopFloor(two).floors[0].stairToNext).toBeNull()
    expect(()=>removeTopFloor(plan)).toThrow(/первый этаж/)
  })
  it('строит 17 этажей без лимита 2–3 этажа и неизменяемой сметой',()=>{
    const floors=Array.from({length:17},(_,i)=>rect(1,1,7,7,`f${i}`))
    for(let i=0;i<16;i++)floors[i].stairToNext=stair(2,2)
    const plan={floors}
    expect(validate(plan)).toEqual([])
    expect(roofs(plan)).toHaveLength(1)
    expect(totalArea(plan)).toBe(17*36)
    expect(estimate(plan).total).toBe(estimate(plan).total)
  })
  it('точно вычитает пересечение прямоугольников',()=>{
    const a={x0:0,z0:0,x1:8,z1:8},b={x0:6,z0:3,x1:11,z1:9}
    const pieces=subtractRect(a,b)
    expect(pieces.reduce((sum,r)=>sum+rectangleArea(r),0)).toBe(54)
    expect(footprint(rect(1,1,8,7))).toEqual({x0:1,z0:1,x1:8,z1:7})
  })
})
