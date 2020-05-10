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
  sources: SourceState[],
  params: {[name: string]: number}
}

export interface SourceState {
  sample: string,
  gain: number
}

export interface TopologyConfig {
  sources: Source[],
  paramPoints: ParamPoints
}

interface Source {
  sample: string,
  gainRanges: Range[]
}

interface ParamPoints {
  [name: string]: Point[]
}

interface ParamDefs {
  [key: string]: Param
}

interface Param {
  name: string,
  min: number,
  max: number
}

export const PARAMS: ParamDefs = {
  CHORUS_LEVEL: {name: "chorus level", min: -1, max: 1},
  VIBRATO_LEVEL: {name: "vibrato level", min: -1, max: 1},
  VIBRATO_FREQUENCY: {name: "vibrato frequency", min: 0, max: 2},
  WAH_LEVEL: {name: "wah level", min: -1, max: 1},
  CHEBYCHEV_LEVEL: {name: "chebychev level", min: -1, max: 0},
  DELAY_TIME: {name: "delay time", min: 0, max: 1},
  DELAY_FEEDBACK: {name: "delay feedback", min: 0, max: 0.9},
  DELAY_LEVEL: {name: "delay level", min: -1, max: 1},
  DELAY2_TIME: {name: "delay2 time", min: 0, max: 2},
  DELAY2_FEEDBACK: {name: "delay2 feedback", min: 0, max: 0.9},
  DELAY2_LEVEL: {name: "delay2 level", min: -1, max: 1},
  REVERB_ROOM: {name: "reverb room", min: 0, max: 1},
  REVERB_LEVEL: {name: "reverb level", min: -1, max: 1}
}

const NUM_SOURCES = 2000;
const DENSITY = 5; //avg sources playing simultaneously
const WIDTH_VARIATION = 0.3; //variation in area widths
const NUM_GLOBALS_POINTS = 200;

export class Topology {
  
  private config: TopologyConfig;
  
  generate(samples: string[]) {
    const sources = _.range(0, NUM_SOURCES).map(_i => ({
      sample: _.sample(samples),
      gainRanges: [this.getRandomRange(), this.getRandomRange()]
    }));
    const params = _.mapValues(_.mapKeys(PARAMS, v => v.name), g =>
      _.range(0, NUM_GLOBALS_POINTS).map(_i =>
        ({coords: [_.random(1, true), _.random(1, true)],
          value: _.random(g.min, g.max, true)})));
    this.config = {sources: sources, paramPoints: params};
    return this;
  }
  
  getState(x: number, y: number): State {
    //avg euclidean dist * value....
    const params = _.mapValues(this.config.paramPoints, v =>
      this.getWeightedInterpOfTwoNearest([x, y], v));
    //only one source per sample...
    const sources = _.uniqBy(this.config.sources.map(s => ({sample: s.sample,
        gain: this.getMultiInterpolation([x, y], s.gainRanges)}))
      .filter(c => c.gain > 0), s => s.sample);
    return {sources: sources, params: params};
  }
  
  setConfig(config: TopologyConfig) {
    this.config = config;
    return this;
  }
  
  getConfig() {
    return this.config;
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
    const distance = Math.min(absdist, 1-absdist);
    return Math.max(0, (range.radius-distance)/range.radius);
  }
  
  private getRandomRange(): Range {
    const position = _.random(1, true);
    const baseRadius = 1/Math.sqrt(NUM_SOURCES)/2;//nonoverlapping
    const refRadius = Math.sqrt(DENSITY)*baseRadius;//density == avg num overlapping
    const variation = WIDTH_VARIATION*refRadius;
    const radius = _.random(refRadius-variation/2, refRadius+variation/2);
    //console.log(position, baseRadius, refRadius, variation, radius);
    return {center: position, radius: radius};
  }

}