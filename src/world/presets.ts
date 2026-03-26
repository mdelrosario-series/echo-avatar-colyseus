import type { WorldDefinition } from './types';

export const HOME_ROOM_PRESET: WorldDefinition = {
  id: 'home_room',
  type: 'home_room',
  layout: { type: 'enclosed_room', width: 12, depth: 12, height: 4 },
  props: [
    { id: 'table', mesh: 'box', position: [0, 0.4, -1], scale: [2, 0.1, 1], color: '#6b4c2a' },
    { id: 'seat-l', mesh: 'box', position: [-1.2, 0.25, 0.8], scale: [0.8, 0.5, 0.8], color: '#3a2a1a' },
    { id: 'seat-r', mesh: 'box', position: [1.2, 0.25, 0.8], scale: [0.8, 0.5, 0.8], color: '#3a2a1a' },
    { id: 'plant', mesh: 'cylinder', position: [4.5, 0.6, -4.5], scale: [0.3, 1.2, 0.3], color: '#2d5a27' },
    { id: 'rug', mesh: 'box', position: [0, 0.01, 0], scale: [4, 0.02, 3], color: '#8b3a3a' },
  ],
  lighting: {
    ambientColor: '#ffffff',
    ambientIntensity: 0.95,
    directionalColor: '#fff8eb',
    directionalIntensity: 1.6,
    directionalPosition: [10, 20, 10],
    fogColor: '#b8d4e8',
    fogNear: 20,
    fogFar: 40,
    skyColor: '#a8d0e8',
  },
  spawnPoint: [0, 0, 2],
};

export const OPEN_PLAZA_PRESET: WorldDefinition = {
  id: 'open_plaza',
  type: 'open_plaza',
  layout: { type: 'open_field' },
  props: [],
  lighting: {
    ambientColor: '#ffffff',
    ambientIntensity: 0.95,
    directionalColor: '#fff8eb',
    directionalIntensity: 1.6,
    directionalPosition: [10, 20, 10],
    fogColor: '#b8d4e8',
    fogNear: 30,
    fogFar: 80,
    skyColor: '#a8d0e8',
  },
  spawnPoint: [0, 0, 0],
};
