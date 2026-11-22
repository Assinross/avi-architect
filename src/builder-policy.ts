import { estimate, totalArea, validate, openingRuns, type MultiStoreyPlan } from './multistorey'
import { issues as legacyIssues, rules, type BuildingModel, type Purpose } from './model'
import { isCityLandmark, CITY_MAX_FLOORS } from './city-landmark'

export type BuilderMode = 'free' | Purpose | 'landmark'
export interface BuilderProfile {
  mode: BuilderMode
  title: string
  partitions: boolean
  stairs: boolean
  maxFloors: number
  live3d: boolean
  budget: number | null
  minArea: number
  windows: number
}
export const profiles: Record<BuilderMode, BuilderProfile> = {
  free: {mode:'free',title:'Свободная мастерская',partitions:true,stairs:true,
    maxFloors:400,live3d:true,budget:null,minArea:0,windows:0},
  home: {mode:'home',title:'Заказ Эммы · первый дом',partitions:false,stairs:false,
    maxFloors:1,live3d:false,budget:rules.home.budget,minArea:rules.home.minArea,windows:rules.home.windows},
  bakery: {mode:'bakery',title:'Заказ Льва · пекарня',partitions:true,stairs:false,
    maxFloors:1,live3d:false,budget:rules.bakery.budget,minArea:rules.bakery.minArea,windows:rules.bakery.windows},
  landmark: {mode:'landmark',title:'Заказ Ники · двухэтажный дом',partitions:true,stairs:true,
    maxFloors:CITY_MAX_FLOORS,live3d:false,budget:2200,minArea:60,windows:2},
}

/** The same editor and geometry, with career restrictions applied as policies. */
export function builderIssues(plan: MultiStoreyPlan, mode: BuilderMode): string[] {
  const profile=profiles[mode]
  const problems=validate(plan).map(issue=>issue.message)
  if (plan.floors.length>profile.maxFloors)
    problems.push(`Этап разрешает не более ${profile.maxFloors} этажей.`)
  if (!profile.partitions && plan.floors.some(f=>f.partitions.length))
    problems.push('Перегородки откроются после первого заказа.')
  if (!profile.stairs && (plan.floors.length>1 || plan.floors.some(f=>f.stairToNext)))
    problems.push('Лестницы и верхние этажи откроются после пекарни.')
  if (mode==='free') return problems
  if (mode==='landmark' && plan.floors.length<2)
    problems.push('Нике нужен дом минимум с двумя этажами.')
  if (totalArea(plan)<profile.minArea)
    problems.push(`Общая площадь должна быть от ${profile.minArea} м².`)
  const ground=plan.floors[0]
  const exteriorDoor=ground?.openings.some(o=>o.kind==='door' && ground.walls.some(w=>w.id===o.wallId))
  if (!exteriorDoor) problems.push('Нужна входная дверь на наружной стене первого этажа.')
  // Two adjacent glazing cells are one panoramic window for the client's brief.
  const windows=plan.floors.reduce((sum,f)=>sum+f.walls.reduce((n,w)=>
    n+openingRuns(w,f.openings).filter(run=>run.kind==='window').length,0),0)
  if (windows<profile.windows) problems.push(`Нужно минимум ${profile.windows} наружных окон.`)
  if (profile.budget!==null && estimate(plan).total>profile.budget)
    problems.push(`Превышен бюджет ${profile.budget} ◇.`)
  if (mode==='landmark' && !isCityLandmark(plan))
    problems.push('Исправь план и все лестничные переходы перед заселением.')
  if (mode==='home'||mode==='bakery') {
    const model=commissionModel(plan,mode)
    problems.push(...legacyIssues(model))
  }
  return [...new Set(problems)]
}

/** First two game commissions retain their names/quest metadata, not a second editor. */
export function commissionModel(plan:MultiStoreyPlan, purpose:Purpose):BuildingModel {
  const ground=plan.floors[0]
  const walls=ground?.walls??[]
  const ids=new Set(walls.map(w=>w.id))
  return {purpose,seed:1,
    walls:structuredClone(walls) as BuildingModel['walls'],
    openings:structuredClone((ground?.openings??[]).filter(o=>ids.has(o.wallId)))}
}
