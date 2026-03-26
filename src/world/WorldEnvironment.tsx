import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { HomeRoom } from './HomeRoom';
import { TestLevelRoom } from './TestLevelRoom';
import { DEBUG_USE_TEST_LEVEL } from '../config/debug';
import { fixEnvMaterials } from './fixEnvMaterials';
import type { WorldDefinition } from './types';
import { getCdnUrl } from '../lib/cdnAssets';

interface WorldEnvironmentProps {
  definition: WorldDefinition;
  debugGround?: boolean;
  /** Server-assigned environment variant index (0-based) */
  environmentIndex?: number | null;
}

// Y-axis offset for the GDC environment model (tweak to align floor with y=0)
const GDC_Y_OFFSET = 0;

function GdcEnvironment({ debugGround }: { debugGround?: boolean }) {
  const { scene } = useGLTF(getCdnUrl('ENV_GDC'));
  // Clone so this instance owns its own Object3D tree (same reason as HomeRoom)
  const clonedScene = useMemo(() => { const c = scene.clone(true); fixEnvMaterials(c); return c; }, [scene]);
  return (
    <>
      <primitive object={clonedScene} position={[0, GDC_Y_OFFSET, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[200, 200]} />
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

export function WorldEnvironment({ definition, debugGround, environmentIndex }: WorldEnvironmentProps) {
  const { lighting, layout } = definition;
  return (
    <>
      <color attach="background" args={[lighting.skyColor]} />
      <fog attach="fog" args={[lighting.fogColor, lighting.fogNear, lighting.fogFar]} />
      <ambientLight color={lighting.ambientColor} intensity={lighting.ambientIntensity} />
      <directionalLight
        position={lighting.directionalPosition}
        intensity={lighting.directionalIntensity}
        color={lighting.directionalColor}
      />
      {layout.type === 'enclosed_room' ? (
        DEBUG_USE_TEST_LEVEL ? <TestLevelRoom /> : <HomeRoom debugGround={debugGround} environmentIndex={environmentIndex} />
      ) : (
        <GdcEnvironment debugGround={debugGround} />
      )}
    </>
  );
}
