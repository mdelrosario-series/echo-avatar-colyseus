import { useLoader } from '@react-three/fiber';
import { Loader, ObjectLoader, Scene } from 'three';
import { getCdnUrl } from '../lib/cdnAssets';
import { fixEnvMaterials } from './fixEnvMaterials';

class JsonObjectLoader extends Loader {
  load(
    url: string,
    onLoad: (result: Scene) => void,
    _onProgress: ((event: ProgressEvent) => void) | undefined,
    onError: ((event: unknown) => void) | undefined,
  ): void {
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
        return r.json();
      })
      .then((json) => { const s = new ObjectLoader().parse(json.scene ?? json) as Scene; fixEnvMaterials(s); return s; })
      .then((s) => onLoad(s))
      .catch((e) => onError?.(e));
  }
}

export function TestLevelRoom() {
  const url = getCdnUrl('LEVEL_COZY_TEST');
  const scene = useLoader(JsonObjectLoader, url) as Scene;
  return <primitive object={scene} />;
}
