import * as _ from 'lodash';

type Range = [number, number];
interface Config {
  sample: string,
  gain: number
}

export class Topology {
  
  private gainRanges = new Map<string, Range[]>();
  
  constructor(private samples: string[], private size = 1.0) {
    this.samples.forEach(s => this.gainRanges.set(s,
      [this.getRandomRange(), this.getRandomRange()]));
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
    return <Range>_.sortBy([_.random(this.size), _.random(this.size)]);
  }

}