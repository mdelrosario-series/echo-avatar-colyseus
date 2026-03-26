/**
 * Renames animation clips inside GLB files to match their filename stem.
 * Fixes Maya's default "Root|Take 001|BaseLayer" export names.
 * No external dependencies — run with: node scripts/rename-anim-clips.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { basename, extname } from 'path';

const ANIMATIONS = [
  'public/cdn-assets/animations/idle.glb',
  'public/cdn-assets/animations/walk.glb',
  'public/cdn-assets/animations/walk2.glb',
  'public/cdn-assets/animations/run.glb',
  'public/cdn-assets/animations/run2.glb',
  'public/cdn-assets/animations/wave.glb',
  'public/cdn-assets/animations/sit.glb',
  'public/cdn-assets/animations/sitting_idle.glb',
  'public/cdn-assets/animations/idle_to_sit_floor.glb',
  'public/cdn-assets/animations/sitting_floor_idle_loop.glb',
];

function renameClipsInGlb(filePath) {
  const stem = basename(filePath, extname(filePath));
  const buf = readFileSync(filePath);

  const magic = buf.readUInt32LE(0);
  if (magic !== 0x46546C67) throw new Error(`Not a GLB file: ${filePath}`);

  const jsonChunkLen = buf.readUInt32LE(12);
  const jsonStr = buf.subarray(20, 20 + jsonChunkLen).toString('utf8').trimEnd();
  const gltf = JSON.parse(jsonStr);

  let changed = false;
  for (const anim of gltf.animations ?? []) {
    if (anim.name !== stem) {
      console.log(`  "${anim.name}" -> "${stem}"`);
      anim.name = stem;
      changed = true;
    }
  }

  if (!changed) {
    console.log(`  ${filePath}: already named "${stem}", skipping`);
    return;
  }

  // Re-encode JSON padded to 4-byte boundary (GLB requirement)
  let newJsonStr = JSON.stringify(gltf);
  const pad = (4 - (newJsonStr.length % 4)) % 4;
  newJsonStr += ' '.repeat(pad);
  const newJsonBuf = Buffer.from(newJsonStr, 'utf8');

  // Everything after the JSON chunk (binary buffer) stays unchanged
  const binaryRest = buf.subarray(20 + jsonChunkLen);
  const totalLen = 12 + 8 + newJsonBuf.length + binaryRest.length;
  const out = Buffer.alloc(totalLen);

  out.writeUInt32LE(0x46546C67, 0);       // GLB magic
  out.writeUInt32LE(2, 4);                 // version
  out.writeUInt32LE(totalLen, 8);          // total file length
  out.writeUInt32LE(newJsonBuf.length, 12); // JSON chunk length
  out.writeUInt32LE(0x4E4F534A, 16);       // chunk type = JSON
  newJsonBuf.copy(out, 20);
  binaryRest.copy(out, 20 + newJsonBuf.length);

  writeFileSync(filePath, out);
  console.log(`  Saved ${filePath}`);
}

for (const file of ANIMATIONS) {
  console.log(`\n${file}:`);
  renameClipsInGlb(file);
}
