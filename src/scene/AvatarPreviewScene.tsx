import { OrbitControls } from '@react-three/drei';
import { AvatarGlbMesh } from './AvatarGlbMesh';
import { getAnimationClipNames, getAnimationUrls } from '../lib/cdnAssets';

interface AvatarPreviewSceneProps {
  glbUrl: string;
}

/** 3D preview of the avatar for the Avatar tab (idle, orbit controls). */
export function AvatarPreviewScene({ glbUrl }: AvatarPreviewSceneProps) {
  return (
    <>
      <ambientLight intensity={1} />
      <directionalLight position={[0, 8, 5]} intensity={2} castShadow />
      <directionalLight position={[0, 4, 4]} intensity={0.8} />
      <group position={[0, -0.5, 0]}>
        <AvatarGlbMesh
          url={glbUrl}
          animationUrls={getAnimationUrls()}
          animationClipNames={getAnimationClipNames()}
          activeAnimation="idle"
        />
      </group>
      <OrbitControls
        enablePan={false}
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.45}
        minDistance={1.5}
        maxDistance={4}
      />
    </>
  );
}
