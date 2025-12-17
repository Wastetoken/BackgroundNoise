export enum VisualMode {
  DEFAULT = 0,
  MELT = 1,
  LIQUEFY = 2,
  SMUDGE = 3,
  RIPPLE = 4,
  LATTICE = 5,
  SPIRAL = 6,
  TURBO = 7,
  SHARD = 8,
  PLASMA = 9,
  ECHO = 10,
  VORTEX = 11,
  CYBER = 12,
  NOISE = 13,
  FLOWFIELD = 14,
  KALEIDO = 15,
  DATAMOS = 16,
  MEMBRANE = 17,
  REACTION = 18,
  MATRIX = 19,
  NEON = 20,
  CIRCUIT = 21,
  JITTER = 22,
  VOID = 23
}

export interface SynthsState {
  turbulence: number; // 0-1
  flow: number;       // 0-1 speed
  colorShift: number; // 0-1
  grain: number;      // 0-1
  sharpness: number;  // 0-1
  feedback: number;   // 0-1
  mode: VisualMode;
  colorA: string;     // Hex
  colorB: string;     // Hex
  motion: boolean;    // Added for static/dynamic toggle
}

export interface AudioData {
  bass: number;
  mid: number;
  high: number;
  vol: number;
}

export const ExportFormat = {
  PNG_4K: '4K',
  PNG_1080: '1080p',
  SQUARE: 'Square',
  MOBILE: 'Mobile'
} as const;

export type ExportFormat = typeof ExportFormat[keyof typeof ExportFormat];