import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { getCdnUrl, type CdnAssetKey } from '../lib/cdnAssets';
import { fixEnvMaterials } from './fixEnvMaterials';

const COZY_KEYS: CdnAssetKey[] = ['ENV_COZY01', 'ENV_COZY02', 'ENV_COZY03', 'ENV_CONFERENCE01'];

// Y-axis offset for each room model (tweak to align floor with y=0)
const COZY_Y_OFFSETS = [-0.3, -0.1, -0.2, 0] as const;

/** Must match server `BaseRoom` default so host/guest match before `roomInfo` arrives. */
const DEFAULT_COZY_INDEX = 2

interface HomeRoomProps {
  debugGround?: boolean;
  /** Server-assigned environment variant index. When provided all clients
   *  in the same room load the same cozy environment. Uses DEFAULT_COZY_INDEX
   *  until `roomInfo` arrives (never random — avoids invitees seeing a different cozy). */
  environmentIndex?: number | null;
}

export function HomeRoom({ debugGround, environmentIndex }: HomeRoomProps) {
  const idx = environmentIndex != null
    ? environmentIndex % COZY_KEYS.length
    : DEFAULT_COZY_INDEX;
  const url = getCdnUrl(COZY_KEYS[idx]!);
  const yOffset = COZY_Y_OFFSETS[idx];
  const { scene } = useGLTF(url);

  // Clone the scene so each HomeRoom instance owns its own Object3D tree.
  // useGLTF returns a cached singleton — a Three.js Object3D can only have
  // one parent, so without cloning, HomeTab and WorldTab (both always mounted)
  // would fight over the same scene object, causing it to disappear.
  const clonedScene = useMemo(() => { const c = scene.clone(true); fixEnvMaterials(c); return c; }, [scene]);

  return (
    <>
      <primitive object={clonedScene} position={[0, yOffset, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial
          visible={debugGround ?? false}
          color="#00ff88"
          opacity={0.35}
          transparent
          wireframe={false}
        />
      </mesh>
    </>
  );
}
