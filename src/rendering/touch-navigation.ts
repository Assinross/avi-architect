import { TOUCH } from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * Touch navigation for both the city and the workshop 3D preview.
 * One finger drags the view; two fingers orbit and can still pinch to zoom.
 * Mouse controls remain unchanged.
 */
export function configureTouchNavigation(controls: Pick<OrbitControls, 'touches'>) {
  controls.touches.ONE = TOUCH.PAN
  controls.touches.TWO = TOUCH.DOLLY_ROTATE
}
