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
  globals: Map<number, number>,
  samples: SampleConfig[]
}

export interface SampleConfig {
  sample: string,
  gain: number
}

export enum GLOBALS {
  DELAY_TIME
}

const DENSITY = 1;
const WIDTH_VARIATION = 0.3;

const GLOBALS_POINTS = 20;

export class Topology {
  
  private gainRanges = new Map<string, Range[]>();
  private delayTimePoints: Point[];
  
  constructor(private samples: string[], private size = 1.0) {
    this.samples.forEach(s => this.gainRanges.set(s,
      [this.getRandomRange(), this.getRandomRange()]));
    this.delayTimePoints = _.range(0, GLOBALS_POINTS).map(_i =>
      ({coords: [_.random(size, true), _.random(size, true)],
        value: _.random(2, true)}));
  }
  
  getConfig(x: number, y: number): Config {
    //avg euclidean dist * value....
    const globals = new Map<number, number>();
    globals.set(GLOBALS.DELAY_TIME,
      this.getWeightedInterpolOfTwoNearest([x, y], this.delayTimePoints));
    const samples = this.samples.map(s => ({sample: s,
        gain: this.getMultiInterpolation([x, y], this.gainRanges.get(s))}))
      .filter(c => c.gain > 0);
    return {globals: globals, samples: samples};
  }
  
  //not smooth but effective with fades... think about how to improve
  private getWeightedInterpolOfTwoNearest(coords: number[], points: Point[]) {
    const dists = points.map(p => this.getEuclideanDist(coords, p.coords));
    const nearest = _.sortBy(_.zip(points, dists), pd => pd[1]).slice(0, 2);
    const totalDist = _.sum(nearest.map(n => n[1]));
    return _.sum(nearest.map(n => n[0].value*(totalDist-n[1])/totalDist));
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