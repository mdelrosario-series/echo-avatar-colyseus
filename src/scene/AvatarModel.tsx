// ---------------------------------------------------------------------------
// AvatarModel — loads a GLB, clones its skeleton, sets shadows.
//
// Pure rendering component — no animation, no networking.
// Returns the cloned Object3D via a ref-like pattern so animation hooks
// can bind to it.
// ---------------------------------------------------------------------------

import { useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { GLB_SCALE } from '../config/character';
import { getCdnUrl } from '../lib/cdnAssets';

interface AvatarModelProps {
  url: string;
  /** Called with the cloned Object3D once it's ready. */
  onClone?: (clone: THREE.Object3D) => void;
}

export function useAvatarModel(url: string) {
  const { scene } = useGLTF(url);

  const clone = useMemo(() => {
    const c = SkeletonUtils.clone(scene) as THREE.Object3D;
    c.traverse((child) => {
      // Strip any "namespace:" prefix from all nodes so Three.js PropertyBinding
      // can resolve animation tracks. Mesh names are never looked up by name at runtime.
      child.name = child.name.replace(/^[^:]+:/, '');
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        const replaced = mats.map((m) => {
          const src = m as THREE.MeshStandardMaterial;
          return new THREE.MeshStandardMaterial({
            map: src.map ?? null,
            flatShading: true,
            roughness: 1.0,
            metalness: 0.0,
          });
        });
        child.material = Array.isArray(child.material) ? replaced : replaced[0];
      }
    });
    return c;
  }, [scene]);

  return clone;
}

/** Renders a cloned GLB avatar model at the standard scale. */
export function AvatarModel({ url, onClone }: AvatarModelProps) {
  const clone = useAvatarModel(url);

  useEffect(() => {
    onClone?.(clone);
  }, [clone, onClone]);

  return <primitive object={clone} scale={[GLB_SCALE, GLB_SCALE, GLB_SCALE]} />;
}

/**
 * Warm drei's useGLTF cache with the default avatar GLB.
 * Called once from main.tsx after CDN URLs are resolved.
 */
export function preloadDefaultAvatar() {
  const url = getCdnUrl('DEFAULT_AVATAR');
  useGLTF.preload(url);
}
