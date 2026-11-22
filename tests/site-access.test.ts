import {describe,expect,it} from 'vitest'
import {type Wall,type Opening} from '../src/model'
import {planSiteAccess,nearestPublicTrail,publicTrail,siteCenters, type Point2, type SiteId} from '../src/site-access'
import {renderSite} from '../src/rendering/site'
import {terrain} from '../src/rendering/land'
import {palettes,disposeGroup} from '../src/rendering/art'

const walls:Wall[]=[
  {id:'north',a:[2,2],b:[7,2]},
  {id:'east',a:[7,2],b:[7,6]},
  {id:'south',a:[7,6],b:[2,6]},
  {id:'west',a:[2,6],b:[2,2]},
]
const distance=(a:Point2,b:Point2)=>Math.hypot(a.x-b.x,a.z-b.z)
const distanceToSegment=(p:Point2,a:Point2,b:Point2)=>{
  const dx=b.x-a.x,dz=b.z-a.z,len2=dx*dx+dz*dz
  const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/len2))
  return distance(p,{x:a.x+dx*t,z:a.z+dz*t})
}
const onPublicTrail=(point:Point2)=>publicTrail.slice(1)
  .some((p,i)=>distanceToSegment(point,publicTrail[i],p)<1e-7)

describe('Пешеходные дорожки и участки возле готовых домов',()=>{
  it.each([
    ['north',.5,'back'],['east',.5,'right'],
    ['south',1.5,'front'],['west',2.5,'left'],
  ] as const)('ведёт от основной тропинки к двери %s (%s), не проходя через стены',(
    wallId,offset,side,
  )=>{
    for(const site of ['home','bakery','landmark'] as const){
      const plan={walls,openings:[{wallId,offset,kind:'door' as const}]}
      const original=structuredClone(plan)
      const found=planSiteAccess(site,plan)!
      expect(found.site).toBe(site)
      expect(found.route.length).toBeGreaterThanOrEqual(3)
      expect(found.route[0]).toEqual(found.junction)
      expect(found.route.at(-1)).toEqual(found.threshold)
      expect(onPublicTrail(found.junction)).toBe(true)
      // No route segment crosses through the house's rectangular interior,
      // including the case where the entry is at the rear.
      for(let i=0;i<found.route.length-1;i++){
        const a=found.route[i],b=found.route[i+1]
        for(let t=0;t<=100;t++){
          const p={x:a.x+(b.x-a.x)*t/100,z:a.z+(b.z-a.z)*t/100}
          const interior=p.x>found.footprint.x0+.001&&p.x<found.footprint.x1-.001&&
            p.z>found.footprint.z0+.001&&p.z<found.footprint.z1-.001
          expect(interior).toBe(false)
        }
      }
      const f=found.footprint
      if(side==='back')expect(found.door.z).toBeCloseTo(f.z0)
      if(side==='front')expect(found.door.z).toBeCloseTo(f.z1)
      if(side==='left')expect(found.door.x).toBeCloseTo(f.x0)
      if(side==='right')expect(found.door.x).toBeCloseTo(f.x1)
      expect(found.parcel.x0).toBeLessThan(f.x0)
      expect(found.parcel.x1).toBeGreaterThan(f.x1)
      expect(found.parcel.z0).toBeLessThan(f.z0)
      expect(found.parcel.z1).toBeGreaterThan(f.z1)
      expect(plan).toEqual(original)
    }
  })

  it('пересчитывает дорожку при изменении двери, а не хранит её в сохранении',()=>{
    const first=planSiteAccess('home',{walls,openings:[{wallId:'south',offset:.5,kind:'door'}]})!
    const second=planSiteAccess('home',{walls,openings:[{wallId:'south',offset:3.5,kind:'door'}]})!
    expect(first.door).not.toEqual(second.door)
    expect(first.threshold).not.toEqual(second.threshold)
    expect(first.route.at(-1)).toEqual(first.threshold)
    expect(second.route.at(-1)).toEqual(second.threshold)
    expect(onPublicTrail(second.junction)).toBe(true)
    expect(onPublicTrail(nearestPublicTrail({x:14,z:6}))).toBe(true)
  })

  it('не создаёт дорожку без наружной двери',()=>{
    expect(planSiteAccess('home',{walls,openings:[{wallId:'north',offset:.5,kind:'window'}]})).toBeNull()
  })

  it('показывает цветной участок и мощёную дорожку без мутации строительного плана',()=>{
    for(const site of Object.keys(siteCenters) as SiteId[]){
      const plan={walls,openings:[{wallId:'north',offset:1.5,kind:'door' as const}]}
      const access=planSiteAccess(site,plan)!
      const before=structuredClone(access)
      const result=renderSite(access,palettes[0])
      expect(result.name).toBe('building-site-'+site)
      expect(result.userData.connectedToTrail).toBe(true)
      expect(result.userData.route[0]).toEqual(access.junction)
      expect(result.userData.parcel).toEqual(access.parcel)
      expect(result.children.length).toBeGreaterThan(2)
      expect(result.getObjectByName('path-surface')).toBeDefined()
      expect(access).toEqual(before)
      disposeGroup(result)
    }
  })

  it('выравнивает землю под участками, не обнуляя весь природный рельеф',()=>{
    for(const site of Object.values(siteCenters))
      expect(terrain(site.x,site.z)).toBeCloseTo(0,10)
    // Beyond the site limits, the town keeps its rolling hills.
    expect(Math.abs(terrain(-33,-13))).toBeGreaterThan(.01)
  })
})
