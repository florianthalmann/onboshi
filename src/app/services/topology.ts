import * as _ from 'lodash';
import { TopologyConfig, Point, Range, State, TopologyOptions } from './types';
import { PARAMS, GEO_OPTIONS } from './consts';


export class Topology {
  
  constructor(private config: TopologyConfig) {}
  
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

}

export class TopologyGenerator {
  
  constructor(private options: TopologyOptions) {}
  
  generate(): TopologyConfig {
    const sources = _.range(0, this.options.numSources).map(_i => ({
      sample: _.sample(this.options.samples),
      gainRanges: [this.getRandomRange(), this.getRandomRange()]
    }));
    const params = _.mapValues(_.mapKeys(this.options.params, v => v.name), g =>
      _.range(0, this.options.numParamPoints).map(_i =>
        ({coords: [_.random(1, true), _.random(1, true)],
          value: _.random(g.min, g.max, true)})));
    return {sources: sources, paramPoints: params};
  }
  
  private getRandomRange(): Range {
    const position = _.random(1, true);
    const baseRadius = 1/Math.sqrt(this.options.numSources)/2;//nonoverlapping
    const refRadius = Math.sqrt(this.options.density)*baseRadius//density == avg num overlapping
      / ((1+this.options.radiusVariation)/2);
    const radius = refRadius * _.random(1, this.options.radiusVariation);
    //console.log(position, baseRadius, refRadius, radius);
    return {center: position, radius: radius};
  }

}

export class GeoTopologyGenerator {
  
  constructor(private samples: string[], private options = GEO_OPTIONS) {}
  
  generate(): TopologyConfig {
    const width = this.options.long[1]-this.options.long[0];
    const height = this.options.lat[1]-this.options.lat[0];
    const squareKms = width * height / 0.0001;
    const numSources = squareKms * Math.pow(this.options.sourcesPerKm, 2);
    const numPoints = squareKms * Math.pow(this.options.paramPointsPerKm, 2);
    console.log("squareKms", squareKms, "numSources", numSources, "numPoints", numPoints);
    return new TopologyGenerator({
      samples: this.samples,
      numSources: numSources,
      density: this.options.density,
      radiusVariation: this.options.radiusVariation,
      params: PARAMS,
      numParamPoints: numPoints
    }).generate();
  }
  
}