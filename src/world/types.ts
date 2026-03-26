export type WorldType = 'home_room' | 'open_plaza';

export type LayoutType = 'enclosed_room' | 'open_field';

export interface EnclosedRoomLayout {
  type: 'enclosed_room';
  width: number;   // X axis
  depth: number;   // Z axis
  height: number;  // Y axis
}

export interface OpenFieldLayout {
  type: 'open_field';
}

export type LayoutConfig = EnclosedRoomLayout | OpenFieldLayout;

export interface LightingConfig {
  ambientColor: string;
  ambientIntensity: number;
  directionalColor: string;
  directionalIntensity: number;
  directionalPosition: [number, number, number];
  fogColor: string;
  fogNear: number;
  fogFar: number;
  skyColor: string;   // background clear color
}

export interface SceneProp {
  id: string;
  mesh: 'box' | 'sphere' | 'cylinder';
  position: [number, number, number];
  scale: [number, number, number];
  rotationY?: number;
  color: string;
}

export interface WorldDefinition {
  id: string;
  type: WorldType;
  layout: LayoutConfig;
  props: SceneProp[];
  lighting: LightingConfig;
  spawnPoint: [number, number, number];
}
