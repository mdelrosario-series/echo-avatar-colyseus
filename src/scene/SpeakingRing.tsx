import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function SpeakingRing() {
  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const s = 1 + 0.12 * Math.sin(clock.getElapsedTime() * 7);
    meshRef.current?.scale.setScalar(s);
  });
  return (
    <mesh ref={meshRef} position={[0, 2.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.22, 0.025, 8, 32]} />
      <meshBasicMaterial color="#4ade80" transparent opacity={0.9} />
    </mesh>
  );
}
