import { GeoTopologyOptions, ParamDefs } from './types';

export const TRANS_TIME = 3; //seconds

//35.042 35.052, 135.782 135.792 (一乗寺)
//34.97 35.13, 135.67 135.83 (京都)
//25 46, 128 147 (日本)
export const GEO_OPTIONS: GeoTopologyOptions = {
  lat: [25, 46],//[34.97, 35.13],//[35.042, 35.052],
  long: [128, 147],//[135.67, 135.83],//[135.782, 135.792],
  sourcesPerKm: 30,
  paramPointsPerKm: 20,
  density: 10,
  sizeVariation: 7
}

const MIN_LEVEL = 0;//-0.8 for old topology model....
const MAX_LEVEL = 1;

export const PARAMS: ParamDefs = {
  CHORUS_LEVEL: {name: "chorus level", min: MIN_LEVEL, max: 0.5},
  VIBRATO_LEVEL: {name: "vibrato level", min: MIN_LEVEL, max: MAX_LEVEL},
  VIBRATO_FREQUENCY: {name: "vibrato frequency", min: 0, max: 2},
  WAH_LEVEL: {name: "wah level", min: MIN_LEVEL, max: MAX_LEVEL},
  CHEBYCHEV_LEVEL: {name: "chebychev level", min: MIN_LEVEL, max: 0.05},
  DELAY_TIME: {name: "delay time", min: 0, max: 2},
  DELAY_FEEDBACK: {name: "delay feedback", min: 0.3, max: 1},
  DELAY_LEVEL: {name: "delay level", min: MIN_LEVEL, max: MAX_LEVEL},
  DELAY2_TIME: {name: "delay2 time", min: 0, max: 2},
  DELAY2_FEEDBACK: {name: "delay2 feedback", min: 0.3, max: 1},
  DELAY2_LEVEL: {name: "delay2 level", min: MIN_LEVEL, max: MAX_LEVEL},
  REVERB_LEVEL: {name: "reverb level", min: MIN_LEVEL, max: 3}
}