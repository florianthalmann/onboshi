import * as _ from 'lodash';

interface Range {
  center: number,
  radius: number 
}

export interface Config {
  sample: string,
  gain: number
}

const DENSITY = 5;
const WIDTH_VARIATION = 0.1;

export class Topology {
  
  private gainRanges = new Map<string, Range[]>();
  
  constructor(private samples: string[], private size = 1.0) {
    this.samples.forEach(s => this.gainRanges.set(s,
      [this.getRandomRange(), this.getRandomRange()]));
    console.log([...this.gainRanges.keys()].map(k => k+" "+this.gainRanges.get(k).join(' ')))
  }
  
  getConfigs(x: number, y: number): Config[] {
    const configs = this.samples.map(s => ({sample: s,
      gain: this.getMultiInterpolation([x, y], this.gainRanges.get(s))}));
    return configs.filter(c => c.gain > 0);
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
    console.log(position, baseRadius, refRadius, variation, radius);
    return {center: position, radius: radius};
  }

}