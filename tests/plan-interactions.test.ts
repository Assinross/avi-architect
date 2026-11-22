import {describe,expect,it} from 'vitest'
import {footprint,validate,type FloorPlan} from '../src/multistorey'
import {
  dragExteriorWall,dragFootprint,dragRoom,dragPartition,
  dragPartitionEnd,drawPartition,dragOpeningRun,dragStaircase,
} from '../src/plan-interactions'

const room=():FloorPlan=>({
  walls:[
    {id:'north',a:[2,2],b:[7,2]},
    {id:'east',a:[7,2],b:[7,7]},
    {id:'south',a:[7,7],b:[2,7]},
    {id:'west',a:[2,7],b:[2,2]},
  ],
  partitions:[{id:'inner',a:[7,4],b:[4,4]}],
  openings:[
    {wallId:'north',offset:1.5,kind:'window'},
    {wallId:'north',offset:2.5,kind:'window'},
    {wallId:'east',offset:.5,kind:'door'},
  ],
  stairToNext:null,
})

describe('Мышь, перо и сенсор используют одинаковые чистые операции',()=>{
  it('растягивает внешнюю стену и не рвёт четыре угла комнаты',()=>{
    const initial=room(),snapshot=structuredClone(initial)
    const resized=dragExteriorWall(initial,'east',9)!
    expect(footprint(resized)).toEqual({x0:2,z0:2,x1:9,z1:7})
    expect(resized.walls.map(w=>w.id)).toEqual(initial.walls.map(w=>w.id))
    expect(resized.partitions[0].a).toEqual([9,4])
    expect(resized.partitions[0].b).toEqual([4,4])
    expect(resized.openings).toHaveLength(3)
    expect(validate({floors:[resized]})).toEqual([])
    expect(initial).toEqual(snapshot)
  })
  it('не сжимает комнату до нуля и не допускает выхода за сетку',()=>{
    const initial=room()
    expect(dragExteriorWall(initial,'west',7)).toBeNull()
    expect(dragExteriorWall(initial,'east',13)).toBeNull()
    expect(dragExteriorWall(initial,'north',8)).toBeNull()
    expect(dragFootprint(initial,[3,3],[3,8])).toBeNull()
  })
  it('переносит целую комнату с её дверью и перегородкой',()=>{
    const initial=room()
    const moved=dragRoom(initial,2,1)!
    expect(footprint(moved)).toEqual({x0:4,z0:3,x1:9,z1:8})
    expect(moved.partitions[0].a).toEqual([9,5])
    expect(moved.openings).toEqual(initial.openings)
    expect(validate({floors:[moved]})).toEqual([])
    expect(dragRoom(initial,6,0)).toBeNull()
  })
  it('изменяет прямоугольный контур перетаскиванием диагонали',()=>{
    const initial=room()
    const enlarged=dragFootprint(initial,[1,1],[10,9])!
    expect(footprint(enlarged)).toEqual({x0:1,z0:1,x1:10,z1:9})
    expect(enlarged.partitions).toHaveLength(1)
    expect(enlarged.openings).toHaveLength(3)
    expect(validate({floors:[enlarged]})).toEqual([])
  })
  it('создаёт стену одним жестом, затем перемещает и удлиняет её за конец',()=>{
    const initial:FloorPlan={...room(),partitions:[]}
    const added=drawPartition(initial,[3,3],[3,6],'new')!
    expect(added.partitions).toHaveLength(1)
    const shifted=dragPartition(added,'new',1,0)!
    expect(shifted.partitions[0].a).toEqual([4,3])
    const stretched=dragPartitionEnd(shifted,'new','b',[9,7])!
    expect(stretched.partitions[0].b).toEqual([4,7])
    expect(validate({floors:[stretched]})).toEqual([])
    expect(drawPartition(initial,[3,3],[4,4],'bad')).toBeNull()
    expect(dragPartition(added,'new',10,0)).toBeNull()
  })
  it('переносит панорамное окно как единый 2-м объект без разрыва',()=>{
    const initial=room()
    const moved=dragOpeningRun(initial,'north',1.5,2,2.5)!
    const openings=moved.openings.filter(o=>o.wallId==='north')
    expect(openings.map(o=>o.offset)).toEqual([2.5,3.5])
    expect(initial.openings.filter(o=>o.wallId==='north').map(o=>o.offset)).toEqual([1.5,2.5])
    expect(dragOpeningRun(initial,'north',1.5,2,4.5)).toBeNull()
    expect(validate({floors:[moved]})).toEqual([])
  })
  it('переносит лестницу в границах помещения',()=>{
    const initial={...room(),stairToNext:{x:3,z:3,facing:'east' as const,kind:'spiral' as const}}
    const moved=dragStaircase(initial,2,1)!
    expect(moved.stairToNext).toMatchObject({x:5,z:4,kind:'spiral'})
    expect(dragStaircase(initial,9,0)).toBeNull()
    expect(initial.stairToNext.x).toBe(3)
  })
})
