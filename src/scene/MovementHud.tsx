// ---------------------------------------------------------------------------
// MovementHud — walk joystick + look joystick always shown together.
// ---------------------------------------------------------------------------

import { Joystick } from './Joystick';
import { CameraJoystick } from './CameraJoystick';

interface MovementHudProps {
  joystickRef: React.MutableRefObject<{ x: number; y: number }>;
  cameraJoystickRef: React.MutableRefObject<{ x: number; y: number }>;
}

export function MovementHud({ joystickRef, cameraJoystickRef }: MovementHudProps) {
  return (
    <>
      <Joystick joystickRef={joystickRef} />
      <CameraJoystick cameraJoystickRef={cameraJoystickRef} />
    </>
  );
}
