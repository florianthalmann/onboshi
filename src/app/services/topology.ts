import * as _ from 'lodash';

type Range = [number, number];

export interface Config {
  sample: string,
  gain: number
}

const MIN_WIDTH = 0.3;
const MAX_WIDTH = 0.6;

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
    return Math.max(0,
      Math.min((coord-range[0]),(range[1]-coord)) / (range[1]-range[0]/2));
  }
  
  private getRandomRange(): Range {
    const width = _.random(MIN_WIDTH, MAX_WIDTH);
    const position = _.random(0, width);
    return [position, position+width];
  }

}