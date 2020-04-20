import * as _ from 'lodash';

interface Point {
  coords: number[],
  value: number
}

interface Range {
  center: number,
  radius: number 
}

export interface Config {
  globals: Map<string, number>,
  samples: SampleConfig[]
}

export interface SampleConfig {
  sample: string,
  gain: number
}

export enum GLOBALS {
  DELAY_TIME = "delay time",
  DELAY_FEEDBACK = "delay feedback",
  DELAY_LEVEL = "delay level",
  REVERB_ROOM = "reverb room",
  REVERB_LEVEL = "reverb level",
  CHORUS_LEVEL = "chorus level",
  PHASER_LEVEL = "phaser level"
}

const DENSITY = 1; //avg sources playing simultaneously
const WIDTH_VARIATION = 0.3; //variation in area widths

const NUM_GLOBALS_POINTS = 20;

export class Topology {
  
  private gainRanges = new Map<string, Range[]>();
  private globalPoints = new Map<GLOBALS, Point[]>();
  
  constructor(private samples: string[], private size = 1.0) {
    this.samples.forEach(s => this.gainRanges.set(s,
      [this.getRandomRange(), this.getRandomRange()]));
    this.addGlobalPoints(GLOBALS.DELAY_TIME, 0, 2);
    this.addGlobalPoints(GLOBALS.DELAY_FEEDBACK, 0, 0.9);
    this.addGlobalPoints(GLOBALS.DELAY_LEVEL, -1, 1);
    this.addGlobalPoints(GLOBALS.REVERB_ROOM, 0, 1);
    this.addGlobalPoints(GLOBALS.REVERB_LEVEL, -1, 1);
    this.addGlobalPoints(GLOBALS.CHORUS_LEVEL, -1, 1);
    this.addGlobalPoints(GLOBALS.PHASER_LEVEL, -1, 1);
  }
  
  getConfig(x: number, y: number): Config {
    //avg euclidean dist * value....
    const globals = new Map<string, number>();
    this.globalPoints.forEach((v, k) => globals.set(k,
      this.getWeightedInterpOfTwoNearest([x, y], v)));
    const samples = this.samples.map(s => ({sample: s,
        gain: this.getMultiInterpolation([x, y], this.gainRanges.get(s))}))
      .filter(c => c.gain > 0);
    return {globals: globals, samples: samples};
  }
  
  private addGlobalPoints(param: GLOBALS, min: number, max: number) {
    this.globalPoints.set(param, _.range(0, NUM_GLOBALS_POINTS).map(_i =>
      ({coords: [_.random(this.size, true), _.random(this.size, true)],
        value: _.random(min, max, true)})));
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
    const distance = Math.min(absdist, this.size-absdist);
    return Math.max(0, (range.radius-distance)/range.radius);
  }
  
  private getRandomRange(): Range {
    const position = _.random(this.size, true);
    const baseRadius = this.size/Math.sqrt(this.samples.length)/2;//nonoverlapping
    const refRadius = Math.sqrt(DENSITY)*baseRadius;//density == avg num overlapping
    const variation = WIDTH_VARIATION*refRadius;
    const radius = _.random(refRadius-variation/2, refRadius+variation/2);
    //console.log(position, baseRadius, refRadius, variation, radius);
    return {center: position, radius: radius};
  }

}