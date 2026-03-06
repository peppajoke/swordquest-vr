/**
 * Mobile input singleton — MobileControls writes here, DesktopControls reads in useFrame.
 * Using a plain object (not React state) to avoid re-renders on every touch move.
 */
export const mobileInput = {
  // Movement joystick: -1..1
  moveX: 0,
  moveY: 0,
  // Look deltas injected each frame
  lookDX: 0,
  lookDY: 0,
  // Buttons
  fire: false,
  fireJustPressed: false,
  jump: false,
  jumpJustPressed: false,
  boost: false,
  // Flag: are we in mobile mode?
  active: false,
};

export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
