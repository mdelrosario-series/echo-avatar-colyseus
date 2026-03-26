import { useGLTF } from '@react-three/drei';
import { getCdnUrl } from '../lib/cdnAssets';

export function Ground() {
  const url = getCdnUrl('ENV_COZY02');
  const { scene } = useGLTF(url);

  return <primitive object={scene} />;
}
