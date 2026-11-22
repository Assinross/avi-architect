import {describe,expect,it,vi} from 'vitest'
import {freshWorld,History,newModel,complete,type Purpose} from '../src/model'
import {fromLegacy,addFloor,type MultiStoreyPlan} from '../src/multistorey'
import {CITY_MAX_FLOORS,isCityLandmark,publishLandmark} from '../src/city-landmark'
import {decode,save,load,saveKey} from '../src/storage'

function home(purpose: Purpose) {
  const history=new History(newModel(purpose))
  const points: [number,number][] = purpose==='home'
    ? [[1,1],[5,1],[5,5],[1,5]]
    : [[1,1],[6,1],[6,5],[1,5]]
  for(let i=0;i<4;i++)history.addWall(points[i],points[(i+1)%4])
  const first=history.model.walls[0].id
  history.addDoor(first,.5);history.addWindow(first,1.5)
  if(purpose==='bakery')history.addWindow(first,2.5)
  return history.model
}
function doneCity() {
  const first=complete({...freshWorld(),accepted:true},home('home'))
  return complete({...first,accepted:true},home('bakery'))
}
function residence():MultiStoreyPlan {
  const base=fromLegacy(home('home'))
  const upstairs=addFloor(base)
  upstairs.floors[0].stairToNext={x:1,z:1,facing:'south'}
  return upstairs
}

describe('City landmark placement and development-only saves',()=>{
  it('requires completed city quests and a structurally valid, habitable plan',()=>{
    const plan=residence()
    expect(isCityLandmark(plan)).toBe(true)
    expect(()=>publishLandmark(freshWorld(),plan)).toThrow(/Сначала/)
    const world=doneCity(),next=publishLandmark(world,plan)
    expect(world.landmark).toBeNull()
    expect(next.landmark).toEqual(plan)
    expect(next.landmark).not.toBe(plan)
    expect(next.rewards).toBe(3)
    expect(isCityLandmark({...plan,floors:[...plan.floors,{...plan.floors[0],stairToNext:null}]})).toBe(false)
    expect(()=>publishLandmark(world,{floors:[]})).toThrow()
    expect(CITY_MAX_FLOORS).toBeGreaterThanOrEqual(10)
  })
  it('deliberately rejects old save formats instead of migrating them',()=>{
    const city=doneCity()
    expect(decode(JSON.stringify({version:1,world:city}))).toBeNull()
    expect(decode(JSON.stringify({version:2,world:city}))).toBeNull()
    expect(decode(JSON.stringify({version:3,world:city}))).toEqual(city)
  })
  it('persists the published plan in the current city save and rejects tampering',()=>{
    const memory=new Map<string,string>()
    vi.stubGlobal('localStorage',{
      getItem:(key:string)=>memory.get(key)??null,
      setItem:(key:string,value:string)=>memory.set(key,value),
      removeItem:(key:string)=>memory.delete(key),
    })
    try {
      const city=publishLandmark(doneCity(),residence())
      expect(save(city)).toBe(true)
      expect(JSON.parse(memory.get(saveKey)!).version).toBe(3)
      expect(load()).toEqual(city)
      const broken=structuredClone(city)
      broken.landmark!.floors[0].walls[0].a=[-1,1]
      expect(save(broken)).toBe(false)
      const inconsistent={...freshWorld(),landmark:residence()}
      expect(save(inconsistent)).toBe(false)
    } finally {vi.unstubAllGlobals()}
  })
})
