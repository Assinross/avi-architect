import * as T from 'three'
import { STOREY_HEIGHT, footprint, openingRuns, roofs, type MultiStoreyPlan, type Rect } from '../multistorey'
import { Artist, random, shade, type Palette } from './art'

/** The garden-facing veranda uses only the centre of the ground-floor facade.
 * The remaining perimeter remains a masonry house, not a glass pavilion.
 */
export function verandaSpan(rect:Rect):{x0:number;x1:number} {
  const width=rect.x1-rect.x0
  const glassWidth=Math.max(1,Math.floor(width*.6))
  const margin=Math.floor((width-glassWidth)/2)
  return {x0:rect.x0+margin,x1:rect.x0+margin+glassWidth}
}

/**
 * Decorative geometry stays entirely outside the saved floor plan.
 * Boxes, foliage and small fixtures are instanced by Artist; only the
 * garden-facing sliding veranda panels need separate transparent meshes.
 */
export function architecturalDetails(
  a: Artist, plan: MultiStoreyPlan, p: Palette, modern: boolean, showRoof: boolean
): { glazing: T.Mesh[]; detailCount: number } {
  const glazing: T.Mesh[] = []
  const lowDetail = plan.floors.length > 6
  const rng = random(341 + plan.floors.length * 17)
  let detailCount = 0
  const add = (...args: Parameters<Artist['put']>) => { a.put(...args); detailCount++ }
  const edge = (
    x: number, y: number, z: number, alongX: boolean, nx: number, nz: number,
    outward: number, length: number, height: number, depth: number, color: number
  ) => add('box', x + nx * outward, y, z + nz * outward,
    alongX ? length : depth, height, alongX ? depth : length, color)

  for (const [index, floor] of plan.floors.entries()) {
    const rect = footprint(floor)
    if (!rect) continue
    const base = index * STOREY_HEIGHT
    const frontZ = rect.z1
    if (modern && index === 0) {
      // Glass is limited to a central bay facing the garden, with solid
      // plaster-and-timber corner bays on either side.
      const span=verandaSpan(rect)
      const length=span.x1-span.x0
      const panels=Math.max(1,Math.ceil(length/1.25))
      const panelWidth=length/panels
      const glassMaterial=new T.MeshStandardMaterial({
        color:0xa5c9cc,transparent:true,opacity:.30,depthWrite:false,
        metalness:.07,roughness:.17,side:T.DoubleSide,
        emissive:0xffd6a4,emissiveIntensity:.03
      })
      for(let i=0;i<panels;i++){
        const x=span.x0+(i+.5)*panelWidth
        const pane=new T.Mesh(
          new T.BoxGeometry(panelWidth-.075,STOREY_HEIGHT-.43,.046),glassMaterial
        )
        pane.position.set(x,STOREY_HEIGHT/2+.065,frontZ)
        pane.receiveShadow=false
        glazing.push(pane)
      }
      const center=(span.x0+span.x1)/2
      edge(center,.27,frontZ,true,0,1,0,length,.13,.21,0x424b4d)
      edge(center,STOREY_HEIGHT-.12,frontZ,true,0,1,0,length,.22,.26,0x424b4d)
      for(let i=0;i<=panels;i++){
        const x=span.x0+i*panelWidth
        add('box',x,STOREY_HEIGHT/2+.09,frontZ,.075,STOREY_HEIGHT-.36,.15,0x394548)
      }
      // Low-profile sliding track, handle, and warm timber reveal.
      edge(center,.27,frontZ,true,0,1,.13,length-.12,.035,.09,0x9e9488)
      edge(center,1.35,frontZ,true,0,1,.14,.055,.32,.07,0xdccab3)
      for(const x of [span.x0-.12,span.x1+.12])
        add('box',x,STOREY_HEIGHT/2,frontZ+.14,.16,STOREY_HEIGHT-.20,.22,0x9a7555)
      // Warm timber flooring and a furnished seating area visible through glass.
      const cx = (rect.x0 + rect.x1) / 2, cz = (rect.z0 + rect.z1) / 2
      const w = rect.x1 - rect.x0, d = rect.z1 - rect.z0
      const loungeZ=cz+d*.15
      const seat = Math.min(2.2, w * .42)
      const depth = Math.min(1.1, d * .25)
      add('box', cx, .205, cz, w - .35, .05, d - .35, 0x9f8467)
      if (!lowDetail && w >= 3 && d >= 3) {
        // Sofa, backrest, arms, cushions, rug, coffee table, two lounge chairs.
        add('box', cx, .26, loungeZ + .32, Math.min(3.35, w * .70), .035, Math.min(2.7, d * .65), 0xd7cbb4)
        add('box', cx, .60, loungeZ - depth * .60, seat, .27, depth, 0xd7c5ad)
        add('box', cx, .94, loungeZ - depth * 1.05, seat, .57, .20, 0xe4d8c9)
        for (const s of [-1, 1]) {
          add('box', cx + s * seat * .46, .73, loungeZ - depth * .60, .16, .36, depth, 0xc4ab92)
          add('box', cx + s * seat * .25, .78, loungeZ - depth * .99, .39, .35, .18, s < 0 ? 0xd29c76 : 0xf5ebda)
        }
        add('box', cx, .49, loungeZ + depth * .67, seat * .67, .10, .63, 0x98724d)
        for (const s of [-1, 1]) for (const t of [-1, 1])
          add('cylinder', cx + s * seat * .27, .31, loungeZ + depth * .67 + t * .23, .07, .35, .07, 0x544437)
        for (const s of [-1, 1]) {
          const x = cx + s * Math.min(w * .38, seat * .78)
          add('box', x, .55, loungeZ + depth * .38, .60, .25, .64, 0xd5bda0)
          add('box', x, .88, loungeZ + depth * .07, .64, .55, .16, 0xe6dbca)
          add('box', x, .35, loungeZ + depth * .38, .68, .12, .70, 0x76563e)
        }
        // Pendant bulbs are stylized emissive-colour accents, not realtime lights.
        for (const x of [cx - .52, cx + .52]) {
          add('cylinder', x, STOREY_HEIGHT - .52, loungeZ, .025, .45, .025, 0x57483e)
          add('cone', x, STOREY_HEIGHT - .76, loungeZ, .30, .23, .30, 0xb98b53)
          add('bush', x, STOREY_HEIGHT - .88, loungeZ, .12, .12, .12, 0xffd999)
        }
        for (const [x, z] of [[rect.x0 + .55, rect.z0 + .62], [rect.x1 - .60, rect.z1 - .60]]) {
          add('cylinder', x, .37, z, .45, .35, .45, 0xb9a68b)
          add('cylinder', x, .84, z, .09, .68, .09, 0x63835a)
          for (const s of [-1, 1])
            add('bush', x + .16 * s, 1.22, z - .12 * s, .33, .63, .33, 0x527f59)
        }
      }
    }
    for (const wall of floor.walls) {
      const alongX = wall.a[1] === wall.b[1]
      const len = alongX ? Math.abs(wall.b[0] - wall.a[0]) : Math.abs(wall.b[1] - wall.a[1])
      const nx = alongX ? 0 : Math.abs(wall.a[0] - rect.x0) < .01 ? -1 : 1
      const nz = alongX ? (Math.abs(wall.a[1] - rect.z0) < .01 ? -1 : 1) : 0
      const x = (wall.a[0] + wall.b[0]) / 2, z = (wall.a[1] + wall.b[1]) / 2
      if (modern) {
        if (index > 0) {
          // Architectural facade lines and timber slats; dense only at human scale.
          edge(x, base + .22, z, alongX, nx, nz, .175, len, .095, .16, 0x9b8068)
          for (const t of [.28, .42, .56, .70]) {
            const xx = alongX ? Math.min(wall.a[0], wall.b[0]) + t : x
            const zz = alongX ? z : Math.min(wall.a[1], wall.b[1]) + t
            edge(xx, base + 1.76, zz, alongX, nx, nz, .175, .052, 2.56, .06, 0xa87851)
          }
        }
      } else {
        // Timber strip and small brackets make the supported upper floor legible.
        edge(x, base + .20, z, alongX, nx, nz, .19, len + .14, .17, .25, shade(p.wood, .12))
        if (!lowDetail) {
          for (let i = 0; i <= len; i += 1.45) {
            const xx = alongX ? Math.min(wall.a[0], wall.b[0]) + i : x
            const zz = alongX ? z : Math.min(wall.a[1], wall.b[1]) + i
            edge(xx, base + STOREY_HEIGHT - .36, zz, alongX, nx, nz, .25, .18, .52, .31, shade(p.wood, .09))
          }
        }
      }
      if (lowDetail || len === 0) continue
      const sign = alongX ? Math.sign(wall.b[0] - wall.a[0]) : Math.sign(wall.b[1] - wall.a[1])
      const gardenFace=modern && index===0 && alongX && Math.abs(z-frontZ)<.001
      const glazed=gardenFace?verandaSpan(rect):null
      const runs=openingRuns(wall,floor.openings).flatMap(run=>{
        if(!glazed)return [run]
        return Array.from({length:run.width},(_,i)=>({...run,offset:run.offset+i,width:1}))
          .filter(part=>{
            const x=wall.a[0]+sign*part.offset
            return x<glazed.x0 || x>glazed.x1
          })
      })
      for (const run of runs) {
        const t = run.offset - .5 + run.width / 2
        const xx = alongX ? wall.a[0] + sign * t : x
        const zz = alongX ? z : wall.a[1] + sign * t
        const wide = run.width
        const window = run.kind === 'window'
        const bottom = window ? 1.13 : .08
        const top = window ? 2.34 : 2.42
        const cy = base + .18 + (top + bottom) / 2
        const frameColor = modern ? 0x394342 : shade(p.wood, .12)
        const outer = .20
        // Four trim rails and cross pieces, visible on the actual outer facade.
        for (const s of [-1, 1])
          edge(xx + (alongX ? s * wide * .43 : 0), cy,
            zz + (!alongX ? s * wide * .43 : 0), alongX, nx, nz,
            outer, .075, top - bottom + .14, .065, frameColor)
        for (const h of [bottom, top])
          edge(xx, base + .18 + h, zz, alongX, nx, nz, outer,
            wide * .88, .095, .08, frameColor)
        if (window) {
          edge(xx, cy, zz, alongX, nx, nz, outer + .04, .048, top - bottom, .06, frameColor)
          edge(xx, cy, zz, alongX, nx, nz, outer + .04, wide * .84, .045, .06, frameColor)
          edge(xx, base + 1.18, zz, alongX, nx, nz, .32, wide * .92 + .18, .12, .29, modern ? 0xb2aba0 : p.stone)
          if (index < 5) {
            const planterY = base + 1.05
            edge(xx, planterY, zz, alongX, nx, nz, .42,
              Math.min(wide * .85, 2.4), .22, .35, modern ? 0x74716a : 0x8c593c)
            for (let i = 0; i < Math.min(7, Math.ceil(wide * 3)); i++) {
              const offset = (i / Math.max(1, Math.min(7, Math.ceil(wide * 3)) - 1) - .5) * Math.min(wide * .75, 2.1)
              const fx = xx + (alongX ? offset : nx * .48)
              const fz = zz + (!alongX ? offset : nz * .48)
              add('bush', fx, planterY + .19 + rng() * .12, fz,
                .16, .22, .16, rng() > .55 ? 0x4c8052 : 0x7ca65d)
              if (i % 2 === 0)
                add('bush', fx + nx * .10, planterY + .30, fz + nz * .10,
                  .09, .09, .09, modern ? 0xf3d7e0 : 0xeea0a8)
            }
          }
          if (!modern && wide < 2.5) for (const side of [-1, 1]) {
            const ox = alongX ? side * (wide * .50 + .18) : nx * .28
            const oz = alongX ? nz * .28 : side * (wide * .50 + .18)
            edge(xx + ox, cy, zz + oz, alongX, nx, nz, .14, .24,
              top - bottom + .05, .095, 0x8b633d)
            for (let j = 0; j < 5; j++)
              edge(xx + ox, cy - .42 + j * .18, zz + oz, alongX, nx, nz,
                .21, .20, .025, .05, 0x63442c)
          }
        } else if (!modern && index === 0) {
          edge(xx, base + 2.57, zz, alongX, nx, nz, .48,
            Math.min(wide + .50, 2.4), .12, .92, shade(p.roof, .08))
          edge(xx, base + 2.47, zz, alongX, nx, nz, .58,
            Math.min(wide + .30, 2.2), .13, .78, shade(p.wood, .12))
        }
      }
    }
  }

  const top = roofs(plan).filter(r => r.kind === 'top')
  if (showRoof && !lowDetail) for (const r of top) {
    // Roof edge profiles, brackets, gutters and downspouts.
    const w = r.x1 - r.x0, d = r.z1 - r.z0, y = r.y - .08
    const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2
    for (const s of [-1, 1]) {
      add('box', cx, y - .06, cz + s * (d / 2 + .24), w + .48, .12, .14,
        modern ? 0x363c3d : 0x6b5140)
      // Visible timber rafters under the roof eaves.
      if (!modern) for (let x = r.x0; x <= r.x1 + .01; x += 1.05)
        add('box', x, y - .08, cz + s * (d / 2 + .19),
          .16, .28, .56, shade(p.wood, .10))
    }
    for (const x of [r.x0, r.x1]) {
      add('box', x, y - 1.5, r.z1 + .22, .09, 2.9, .09,
        modern ? 0x3d4547 : 0x856547)
      add('cylinder', x, .19, r.z1 + .22, .12, .12, .12, 0x747069)
    }
    if (!modern) {
      const rise = Math.max(.60, Math.min(2, d * .31))
      for (let x = r.x0 - .10; x < r.x1 + .16; x += .43)
        add('cylinder', x, y + rise + .14, cz, .22, .43, .22, shade(p.roof, (rng() - .5) * .06),
          0, 0, Math.PI / 2)
    }
  }

  // Ground detailing is omitted for tall towers: important in the city view.
  const ground = footprint(plan.floors[0])
  if (ground && !lowDetail) {
    const cx = (ground.x0 + ground.x1) / 2
    const cz = (ground.z0 + ground.z1) / 2
    const w = ground.x1 - ground.x0
    for (let i = 0; i < Math.min(15, Math.floor(w * 2)); i++) {
      const x = ground.x0 + (i + .5) * w / Math.min(15, Math.floor(w * 2))
      add('box', x, .05, ground.z1 + .47, w / Math.min(15, Math.floor(w * 2)) - .055,
        .08, .73, modern ? 0xbab8aa : 0xb9a38d)
    }
    for (const [x, z] of [
      [ground.x0 - .27, ground.z0 - .22], [ground.x1 + .27, ground.z1 + .25]
    ]) {
      if (x < -.9 || z < -.9 || x > 12.9 || z > 10.9) continue
      add('cylinder', x, .20, z, .51, .38, .51, modern ? 0xc7c2b4 : 0x8e6f50)
      add('bush', x, .60, z, .39, .54, .39, modern ? 0x688a60 : p.leaf)
      for (const s of [-1, 1])
        add('bush', x + s * .24, .53, z + .10, .11, .11, .11,
          modern ? 0xf2d4db : 0xe9a3ba)
    }
    // Simple warm lanterns / facade wall washers, without dynamic point lights.
    for (const x of [ground.x0 + .36, ground.x1 - .36]) {
      add('box', x, 2.44, ground.z1 + .18, .16, .29, .16, modern ? 0x41494a : 0x5a4633)
      add('box', x, 2.44, ground.z1 + .28, .10, .17, .08, 0xffd39a)
    }
    // A visible outdoor landing adjacent to the entrance.
    add('box', cx, .035, ground.z1 + .78, Math.min(w, 3.2), .06, .48,
      modern ? 0xa9a49a : p.stone)
    // Optional: terrace steps outside the home, in addition to the designed indoor staircase.
    if (modern && plan.floors.length > 1 && plan.floors.length <= 4 && ground.x0 > 1.25) {
      const sideX = ground.x0 - .74
      for (let j = 0; j < 14; j++) {
        const progress = (j + .5) / 14
        const z = ground.z0 + .40 + progress * 3.35
        if (z > ground.z1 + .01) break
        add('box', sideX, .22 + progress * 2.83, z, .92, .14, .31, 0xa77b56)
        if (j % 2 === 0) add('box', sideX - .46, .67 + progress * 2.83, z, .055, .92, .055, 0x49565a)
      }
    }
    void cz
  }
  return { glazing, detailCount }
}
