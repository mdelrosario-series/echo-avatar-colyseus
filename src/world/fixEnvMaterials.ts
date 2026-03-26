import { Mesh, type Material, type Object3D } from 'three';

/** Force all environment mesh materials to be fully opaque.
 *  GLBs and Three.js Editor JSON files are sometimes exported with
 *  transparent=true / depthWrite=false, which makes geometry invisible. */
export function fixEnvMaterials(obj: Object3D) {
  obj.traverse((child) => {
    if (child instanceof Mesh) {
      const mats: Material[] = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m) => {
        m.transparent = false;
        m.depthWrite = true;
        m.needsUpdate = true;
      });
    }
  });
}
