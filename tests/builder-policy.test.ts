import {describe,expect,it} from 'vitest'
import {addFloor,fromLegacy,type MultiStoreyPlan} from '../src/multistorey'
import {builderIssues,commissionModel,profiles} from '../src/builder-policy'
import {issues as legacyIssues} from '../src/model'

function sample(width=5,depth=4): MultiStoreyPlan {
  const x=2,z=2
  return fromLegacy({walls:[
    {id:'a',a:[x,z],b:[x+width,z]},
    {id:'b',a:[x+width,z],b:[x+width,z+depth]},
    {id:'c',a:[x+width,z+depth],b:[x,z+depth]},
    {id:'d',a:[x,z+depth],b:[x,z]}
  ],openings:[
    {wallId:'a',kind:'door',offset:.5},
    {wallId:'a',kind:'window',offset:1.5},
    {wallId:'a',kind:'window',offset:3.5},
  ]})
}

describe('One builder engine, capability policies',()=>{
  it('opens all tools with live 3D in free mode, and unlocks career progressively',()=>{
    expect(profiles.free).toMatchObject({partitions:true,stairs:true,live3d:true})
    expect(profiles.home).toMatchObject({partitions:false,stairs:false,maxFloors:1,live3d:false})
    expect(profiles.bakery).toMatchObject({partitions:true,stairs:false,maxFloors:1,live3d:false})
    expect(profiles.landmark).toMatchObject({partitions:true,stairs:true,live3d:false})
  })
  it('validates the same plan with distinct client rules and budgets',()=>{
    const plan=sample()
    expect(builderIssues(plan,'home')).toEqual([])
    expect(builderIssues(plan,'bakery')).toEqual([])
    expect(legacyIssues(commissionModel(plan,'bakery'))).toEqual([])
    const withPartition=structuredClone(plan)
    withPartition.floors[0].partitions.push({id:'p',a:[4,3],b:[4,5]})
    expect(builderIssues(withPartition,'home').join(' ')).toContain('Перегородки')
    expect(builderIssues(withPartition,'bakery')).toEqual([])
    expect(builderIssues(withPartition,'free')).toEqual([])
  })
  it('считает соседние стеклянные сегменты одним широким окном',()=>{
    const plan=sample()
    expect(builderIssues(plan,'bakery')).toEqual([])
    plan.floors[0].openings[2].offset=2.5
    expect(builderIssues(plan,'bakery').join(' ')).toContain('минимум 2 наружных окон')
    expect(builderIssues(plan,'free')).toEqual([])
  })
  it('unlocks stairs only for the third career commission',()=>{
    const plan=addFloor(sample(7,6))
    plan.floors[0].stairToNext={x:2,z:2,facing:'south'}
    expect(builderIssues(plan,'home').join(' ')).toContain('этажей')
    expect(builderIssues(plan,'bakery').join(' ')).toContain('этажей')
    expect(builderIssues(plan,'landmark')).toEqual([])
  })
  it('rejects missing entrances or windows and excessive project costs',()=>{
    const plan=sample()
    plan.floors[0].openings=[]
    expect(builderIssues(plan,'home').join(' ')).toContain('входная дверь')
    const oversized=sample(10,8)
    expect(builderIssues(oversized,'home').join(' ')).toContain('бюджет')
  })
})
