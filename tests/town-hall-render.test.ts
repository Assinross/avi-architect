import * as T from 'three'
import { describe, expect, it } from 'vitest'
import { Artist, palettes } from '../src/rendering/art'
import { townHall } from '../src/rendering/town'

// Inspect the instanced geometry itself, not duplicated layout constants.
function transforms(a: Artist, shape: 'box' | 'cylinder') {
  return (a.batches.get(shape)?.matrices ?? []).map(matrix => {
    const position = new T.Vector3()
    const rotation = new T.Quaternion()
    const scale = new T.Vector3()
    matrix.decompose(position, rotation, scale)
    return {position, rotation, scale}
  })
}
const near = (a: number, b: number) => Math.abs(a - b) < .025

describe('Town hall roof clearance', () => {
  for (const theme of [0, 1, 2, 3]) {
    it(`keeps the tower clocks and both dormer windows clear of roof tiles (theme ${theme})`, () => {
      const artist = new Artist()
      townHall(artist, palettes[theme], theme)
      const boxes = transforms(artist, 'box')
      const cylinders = transforms(artist, 'cylinder')

      // Both pitched slabs run all the way to the building's east wall
      // (x = 9.9). The tower now joins that wall instead of cutting a roofless
      // opening into the last 1.5 metres of the attic.
      const slabs = boxes.filter(({scale}) =>
        scale.x > 10 && scale.x < 10.6 && near(scale.y, .15) && scale.z > 4)
      expect(slabs).toHaveLength(2)
      const roofRight = Math.max(...slabs.map(({position, scale}) => position.x + scale.x / 2))
      expect(roofRight).toBeGreaterThan(9.9)

      // Two 1.54-m clock rings still sit entirely outside the roof.
      const clocks = cylinders.filter(({scale}) =>
        near(scale.x, 1.54) && near(scale.y, .14) && near(scale.z, 1.54))
      expect(clocks).toHaveLength(2)
      const clockLeft = Math.min(...clocks.map(({position}) => position.x - 1.54 / 2))
      expect(roofRight).toBeLessThan(clockLeft - .3)

      // Windows have actual transparent glass, not opaque frames covering a
      // solid plaster cube. Their lower edges clear the pitched roof.
      const panes = artist.group.children.filter((obj):obj is T.Mesh =>
        obj instanceof T.Mesh && obj.name.startsWith('town-hall-attic-window-'))
      expect(panes.map(p => p.name).sort()).toEqual([
        'town-hall-attic-window-0', 'town-hall-attic-window-1',
      ])
      for (const pane of panes) {
        const mat = pane.material as T.MeshStandardMaterial
        expect(mat.transparent).toBe(true)
        expect(mat.opacity).toBeLessThan(.25)
        expect(pane.geometry).toBeInstanceOf(T.PlaneGeometry)
        const distanceFromRidge = pane.position.z - (-3)
        const roofSurface = 4.53 + 2.83 * (1 - distanceFromRidge / 3.15) + .15
        const windowBottom = pane.position.y - .77 / 2
        expect(windowBottom - roofSurface).toBeGreaterThan(.15)
      }

      // Recognizable attic miniatures: an old bear, clown's red balloon,
      // rag doll with orange hair and the pale horror mask.
      const colors = artist.batches.get('box')!.colors.map(color => color.getHex())
      for (const color of [0xb94037, 0xc16c35, 0x404849, 0x352f31])
        expect(colors).toContain(color)
    })
  }
})
