import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  CAMERA_JOYSTICK_YAW_SPEED,
  CAMERA_JOYSTICK_PITCH_HALF_DEG,
} from '../config/network';

const CAM_DISTANCE = 5;
const CAM_HEIGHT = 2.5;
const CAM_LERP = 0.12;
const CAM_JOY_DEADZONE = 0.04;
/** Smooth vertical look toward stick target (higher = snappier). */
const CAM_PITCH_SMOOTH = 14;

const _target = new THREE.Vector3();
const _lookAt = new THREE.Vector3();

interface ThirdPersonCameraProps {
  playerGroupRef: React.RefObject<THREE.Group>;
  cameraYawRef: React.MutableRefObject<number>;
  /** Look joystick: x ∈ [-1,1] yaw, y ∈ [-1,1] pitch (±CAM_JOYSTICK_PITCH_HALF_DEG each way). */
  cameraJoystickRef: React.MutableRefObject<{ x: number; y: number }>;
}

export function ThirdPersonCamera({
  playerGroupRef,
  cameraYawRef,
  cameraJoystickRef,
}: ThirdPersonCameraProps) {
  const pitchSmoothedRef = useRef(0);
  const pitchHalfRad = (CAMERA_JOYSTICK_PITCH_HALF_DEG * Math.PI) / 180;

  useFrame(({ camera }, delta) => {
    const player = playerGroupRef.current;
    if (!player) return;

    const jx = cameraJoystickRef.current.x;
    if (Math.abs(jx) > CAM_JOY_DEADZONE) {
      cameraYawRef.current -= jx * CAMERA_JOYSTICK_YAW_SPEED * delta;
    }

    const jy = cameraJoystickRef.current.y;
    const pitchDesired =
      Math.abs(jy) > CAM_JOY_DEADZONE ? jy * pitchHalfRad : 0;
    const t = 1 - Math.exp(-CAM_PITCH_SMOOTH * delta);
    pitchSmoothedRef.current += (pitchDesired - pitchSmoothedRef.current) * t;

    const px = player.position.x;
    const py = player.position.y;
    const pz = player.position.z;
    const yaw = cameraYawRef.current;
    const pitch = pitchSmoothedRef.current;

    _target.set(
      px + Math.sin(yaw) * CAM_DISTANCE,
      py + CAM_HEIGHT,
      pz + Math.cos(yaw) * CAM_DISTANCE,
    );
    camera.position.lerp(_target, CAM_LERP);
    /** Tilt look up/down: offset look target by pitch at orbit distance. */
    _lookAt.set(
      px,
      py + 0.5 + Math.tan(pitch) * CAM_DISTANCE,
      pz,
    );
    camera.lookAt(_lookAt);
  });

  return null;
}
