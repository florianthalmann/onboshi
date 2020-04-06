import * as _ from 'lodash';

interface Range {
  center: number,
  radius: number 
}

export interface Config {
  sample: string,
  gain: number
}

const MIN_WIDTH = 0.2;
const MAX_WIDTH = 0.5;

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
    const radius = _.random(MIN_WIDTH/2, MAX_WIDTH/2);
    return {center: position, radius: radius};
  }

}