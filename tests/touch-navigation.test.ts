import { describe, expect, it } from 'vitest'
import { TOUCH } from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { configureTouchNavigation } from '../src/rendering/touch-navigation'

describe('Mobile 3D navigation', () => {
  it('changes the default OrbitControls mapping to one-finger pan and two-finger orbit/zoom', () => {
    const controls: Pick<OrbitControls, 'touches'> = {
      touches: { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }
    }
    configureTouchNavigation(controls)
    expect(controls.touches.ONE).toBe(TOUCH.PAN)
    expect(controls.touches.TWO).toBe(TOUCH.DOLLY_ROTATE)
  })
})
