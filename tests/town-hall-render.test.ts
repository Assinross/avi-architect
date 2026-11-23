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

      // Main hall: two pitched slabs, distinct from small dormer roofs.
      const slabs = boxes.filter(({scale}) =>
        scale.x > 8 && scale.x < 9.2 && near(scale.y, .15) && scale.z > 4)
      expect(slabs).toHaveLength(2)
      const roofRight = Math.max(...slabs.map(({position, scale}) => position.x + scale.x / 2))

      // Two 1.54-m clock rings are mounted on the front and side of the tower.
      const clocks = cylinders.filter(({scale}) =>
        near(scale.x, 1.54) && near(scale.y, .14) && near(scale.z, 1.54))
      expect(clocks).toHaveLength(2)
      const clockLeft = Math.min(...clocks.map(({position}) => position.x - 1.54 / 2))
      expect(roofRight).toBeLessThan(clockLeft - .3)

      // Dormer window frames have unique 0.71 × 0.97 × 0.14 dimensions.
      const dormers = boxes.filter(({position, scale}) =>
        near(position.y, 5.61) && near(scale.x, .71) &&
        near(scale.y, .97) && near(scale.z, .14))
      expect(dormers).toHaveLength(2)
      for (const {position} of dormers) {
        // Ridge at z=-3, front eave at z=0.15. Include tile relief.
        const distanceFromRidge = position.z - (-3)
        const roofSurface = 4.53 + 2.83 * (1 - distanceFromRidge / 3.15) + .15
        const windowBottom = position.y - .77 / 2
        expect(windowBottom - roofSurface).toBeGreaterThan(.15)
      }
    })
  }
})
