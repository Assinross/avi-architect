import {describe,expect,it} from 'vitest'
import {fromLegacy,addFloor} from '../src/multistorey'
import {cityLandmark} from '../src/rendering/city-landmark'
import {palettes,disposeGroup} from '../src/rendering/art'

describe('Town multi-storey mesh',()=>{
  it('builds instanced volume from every level without changing the floor plan',()=>{
    const ground={
      walls:[
        {id:'a',a:[1,1] as [number,number],b:[7,1] as [number,number]},
        {id:'b',a:[7,1] as [number,number],b:[7,7] as [number,number]},
        {id:'c',a:[7,7] as [number,number],b:[1,7] as [number,number]},
        {id:'d',a:[1,7] as [number,number],b:[1,1] as [number,number]},
      ],
      openings:[{wallId:'a',offset:0.5,kind:'door' as const},{wallId:'a',offset:1.5,kind:'window' as const},{wallId:'a',offset:2.5,kind:'window' as const}],
    }
    const plan=addFloor(fromLegacy(ground))
    // Raised two-metre wing to the east, with a spiral staircase in the overlap.
    plan.floors[1].walls=[
      {id:'u0',a:[3,1],b:[9,1]},{id:'u1',a:[9,1],b:[9,7]},
      {id:'u2',a:[9,7],b:[3,7]},{id:'u3',a:[3,7],b:[3,1]},
    ]
    plan.floors[0].stairToNext={x:3,z:2,facing:'south',kind:'spiral'}
    const before=structuredClone(plan)
    const volume=cityLandmark(plan,palettes[0],0)
    expect(volume.children.length).toBeGreaterThan(0)
    expect(volume.userData.openingGroups).toBe(2) // door + ONE panoramic window
    expect(volume.userData.overhangSections).toBe(1)
    expect(volume.userData.spiralStairs).toBe(1)
    expect(volume.userData.floorSlabThickness).toBe(volume.userData.wallBottom)
    expect(volume.userData.wallTop).toBe(3.2)
    expect(plan).toEqual(before)
    disposeGroup(volume)
  })

  it('supports two facade styles without altering the floor geometry',()=>{
    const floor={
      walls:[
        {id:'a',a:[2,2] as [number,number],b:[8,2] as [number,number]},
        {id:'b',a:[8,2] as [number,number],b:[8,7] as [number,number]},
        {id:'c',a:[8,7] as [number,number],b:[2,7] as [number,number]},
        {id:'d',a:[2,7] as [number,number],b:[2,2] as [number,number]},
      ],
      openings:[{wallId:'a',offset:.5,kind:'door' as const},
        {wallId:'b',offset:1.5,kind:'window' as const}],
    }
    const original=fromLegacy(floor)
    const modern={...original,style:'modern' as const}
    const before=structuredClone(modern)
    const contemporary=cityLandmark(modern,palettes[0],0)
    expect(contemporary.userData.architecturalStyle).toBe('modern')
    expect(contemporary.userData.glass).toHaveLength(3)
    expect(contemporary.userData.verandaGlassWidth).toBe(3)
    expect(contemporary.userData.verandaGlassWidth).toBeLessThan(contemporary.userData.groundWallPerimeter/4)
    expect(contemporary.userData.glass.every((pane: {position:{z:number}})=>pane.position.z===7)).toBe(true)
    expect(contemporary.userData.decorativeParts).toBeGreaterThan(20)
    expect(modern).toEqual(before)
    disposeGroup(contemporary)

    const traditional=cityLandmark({...original,style:'classic'},palettes[0],0)
    expect(traditional.userData.architecturalStyle).toBe('classic')
    expect(traditional.userData.glass).toHaveLength(0)
    expect(traditional.userData.decorativeParts).toBeGreaterThan(20)
    disposeGroup(traditional)

    const withoutRoof=cityLandmark(modern,palettes[0],0,{showRoof:false})
    expect(withoutRoof.userData.glass).toHaveLength(3)
    expect(withoutRoof.userData.decorativeParts).toBeLessThan(1000)
    disposeGroup(withoutRoof)
    expect(addFloor(modern).style).toBe('modern')
  })

  it('keeps masonry on three sides, with just one garden-facing glass bay',()=>{
    const ground=fromLegacy({
      walls:[
        {id:'a',a:[1,1] as [number,number],b:[9,1] as [number,number]},
        {id:'b',a:[9,1] as [number,number],b:[9,6] as [number,number]},
        {id:'c',a:[9,6] as [number,number],b:[1,6] as [number,number]},
        {id:'d',a:[1,6] as [number,number],b:[1,1] as [number,number]},
      ],
      openings:[
        {wallId:'a',offset:1.5,kind:'door' as const},
        {wallId:'b',offset:2.5,kind:'window' as const},
        {wallId:'c',offset:.5,kind:'window' as const},
        {wallId:'c',offset:3.5,kind:'door' as const},
      ],
    })
    const before=structuredClone(ground)
    const result=cityLandmark({...ground,style:'modern'},palettes[0],0)
    expect(result.userData.verandaGlassWidth).toBe(4)
    expect(result.userData.groundWallPerimeter).toBe(26)
    expect(result.userData.glass).toHaveLength(4)
    expect(result.userData.glass.every((pane: {position:{z:number}})=>pane.position.z===6)).toBe(true)
    expect(ground).toEqual(before)
    disposeGroup(result)
  })
})
