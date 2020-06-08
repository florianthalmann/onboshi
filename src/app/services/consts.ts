import { GeoTopologyOptions, ParamDefs } from './types';

//35.042 35.052, 135.782 135.792 (一乗寺)
//34.97 35.13, 135.67 135.83 (京都)
export const GEO_OPTIONS: GeoTopologyOptions = {
  lat: [34.97, 35.13],//[35.042, 35.052],
  long: [135.67, 135.83],//[135.782, 135.792],
  sourcesPerKm: 30,
  paramPointsPerKm: 20,
  density: 8,
  sizeVariation: 20
}

const FX_OFF = -0.8;

export const PARAMS: ParamDefs = {
  CHORUS_LEVEL: {name: "chorus level", min: FX_OFF, max: 1},
  VIBRATO_LEVEL: {name: "vibrato level", min: FX_OFF, max: 1},
  VIBRATO_FREQUENCY: {name: "vibrato frequency", min: 0, max: 2},
  WAH_LEVEL: {name: "wah level", min: FX_OFF, max: 1},
  CHEBYCHEV_LEVEL: {name: "chebychev level", min: FX_OFF, max: 0},
  DELAY_TIME: {name: "delay time", min: 0, max: 1},
  DELAY_FEEDBACK: {name: "delay feedback", min: 0, max: 0.9},
  DELAY_LEVEL: {name: "delay level", min: FX_OFF, max: 1},
  DELAY2_TIME: {name: "delay2 time", min: 0, max: 2},
  DELAY2_FEEDBACK: {name: "delay2 feedback", min: 0, max: 0.9},
  DELAY2_LEVEL: {name: "delay2 level", min: FX_OFF, max: 1},
  REVERB_ROOM: {name: "reverb room", min: 0, max: 1},
  REVERB_LEVEL: {name: "reverb level", min: FX_OFF, max: 1}
}