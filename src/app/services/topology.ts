import * as _ from 'lodash';

interface Point {
  coords: number[],
  value: number
}

interface Range {
  center: number,
  radius: number 
}

export interface State {
  globals: Map<string, number>,
  samples: SampleState[]
}

export interface SampleState {
  sample: string,
  gain: number
}

export interface TopologyConfig {
  size: number,
  samples: string[],
  gainRanges: Ranges,
  globals: Globals
}

interface Ranges {
  [key: string]: Range[]
}

interface Globals {
  [key: string]: Point[]
}

export enum GLOBALS {
  CHORUS_LEVEL = "chorus level",
  VIBRATO_LEVEL = "vibrato level",
  VIBRATO_FREQUENCY = "vibrato frequency",
  WAH_LEVEL = "wah level",
  CHEBYCHEV_LEVEL = "chebychev level",
  DELAY_TIME = "delay time",
  DELAY_FEEDBACK = "delay feedback",
  DELAY_LEVEL = "delay level",
  DELAY2_TIME = "delay2 time",
  DELAY2_FEEDBACK = "delay2 feedback",
  DELAY2_LEVEL = "delay2 level",
  REVERB_ROOM = "reverb room",
  REVERB_LEVEL = "reverb level"
}

const DENSITY = 5; //avg sources playing simultaneously
const WIDTH_VARIATION = 0.3; //variation in area widths

const NUM_GLOBALS_POINTS = 20;

export class Topology {
  
  private config: TopologyConfig;
  
  getState(x: number, y: number): State {
    //avg euclidean dist * value....
    const globals = new Map<string, number>();
    console.log(this.config);
    [...Object.entries(this.config.globals)].forEach(([k, v]) =>
      globals.set(k, this.getWeightedInterpOfTwoNearest([x, y], v)));
    const samples = this.config.samples.map(s => ({sample: s,
        gain: this.getMultiInterpolation([x, y], this.config.gainRanges[s])}))
      .filter(c => c.gain > 0);
    return {globals: globals, samples: samples};
  }
  
  generate(samples: string[], size = 1.0) {
    this.config = {size: size, samples: samples, gainRanges: {}, globals: {}};
    samples.forEach(s => this.config.gainRanges[s] =
      [this.getRandomRange(), this.getRandomRange()]);
    this.addGlobalPoints(GLOBALS.CHORUS_LEVEL, -1, 1);
    this.addGlobalPoints(GLOBALS.VIBRATO_LEVEL, -1, 1);
    this.addGlobalPoints(GLOBALS.VIBRATO_FREQUENCY, 0, 2);
    this.addGlobalPoints(GLOBALS.WAH_LEVEL, -1, 1);
    this.addGlobalPoints(GLOBALS.CHEBYCHEV_LEVEL, -1, 1);
    this.addGlobalPoints(GLOBALS.DELAY_TIME, 0, 2);
    this.addGlobalPoints(GLOBALS.DELAY_FEEDBACK, 0, 0.9);
    this.addGlobalPoints(GLOBALS.DELAY_LEVEL, -1, 1);
    this.addGlobalPoints(GLOBALS.DELAY2_TIME, 0, 2);
    this.addGlobalPoints(GLOBALS.DELAY2_FEEDBACK, 0, 0.9);
    this.addGlobalPoints(GLOBALS.DELAY2_LEVEL, -1, 1);
    this.addGlobalPoints(GLOBALS.REVERB_ROOM, 0, 1);
    this.addGlobalPoints(GLOBALS.REVERB_LEVEL, -1, 1);
    return this;
  }
  
  setConfig(config: TopologyConfig) {
    this.config = config;
    return this;
  }
  
  getConfig() {
    return this.config;
  }
  
  private addGlobalPoints(param: GLOBALS, min: number, max: number) {
    this.config.globals[param] = _.range(0, NUM_GLOBALS_POINTS).map(_i =>
      ({coords: [_.random(this.config.size, true),
          _.random(this.config.size, true)],
        value: _.random(min, max, true)}));
  }
  
  //not smooth but effective with fades... cool that there are jumps
  private getWeightedInterpOfTwoNearest(coords: number[], points: Point[]) {
    const dists = points.map(p => this.getEuclideanDist(coords, p.coords));
    const nearest = _.sortBy(_.zip(points, dists), pd => pd[1]).slice(0, 2);
    const totalDist = _.sum(nearest.map(n => n[1]));
    return Math.max(0, 
      _.sum(nearest.map(n => n[0].value*(totalDist-n[1])/totalDist)));
  }
  
  private getEuclideanDist(p1: number[], p2: number[]) {
    return Math.sqrt(_.sum(_.zip(p1, p2).map(([a,b]) => Math.pow(a-b, 2))));
  }
  
  private getMultiInterpolation(coords: number[], ranges: Range[]) {
    return _.reduce(coords.map((c,i) =>
      this.getInterpolation(c, ranges[i])), _.multiply, 1);
  }
  
  private getInterpolation(coord: number, range: Range) {
    const absdist = Math.abs(range.center-coord);
    const distance = Math.min(absdist, this.config.size-absdist);
    return Math.max(0, (range.radius-distance)/range.radius);
  }
  
  private getRandomRange(): Range {
    const position = _.random(this.config.size, true);
    const baseRadius = this.config.size/Math.sqrt(this.config.samples.length)/2;//nonoverlapping
    const refRadius = Math.sqrt(DENSITY)*baseRadius;//density == avg num overlapping
    const variation = WIDTH_VARIATION*refRadius;
    const radius = _.random(refRadius-variation/2, refRadius+variation/2);
    //console.log(position, baseRadius, refRadius, variation, radius);
    return {center: position, radius: radius};
  }

}