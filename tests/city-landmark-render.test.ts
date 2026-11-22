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
    expect(plan).toEqual(before)
    disposeGroup(volume)
  })
})
