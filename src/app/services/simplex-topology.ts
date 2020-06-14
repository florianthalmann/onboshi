import * as _ from 'lodash';
import { SimplexTopologyOptions, State } from './types';
import { getNoiseCutoffs, Noise } from './noise';
import { GEO_OPTIONS, PARAMS } from './consts';

interface SimplexNoiseConfig {
  seed: number,
  frequency: number,
  cutoff: number
}

export interface SimplexTopologyConfig {
  samples: {[name: string]: SimplexNoiseConfig},
  params: {[name: string]: SimplexNoiseConfig}
}

export class SimplexTopology {
  
  private sampleNoises: {[name: string]: Noise};
  private paramNoises: {[name: string]: Noise};
  
  constructor(private config: SimplexTopologyConfig) {
    this.sampleNoises = _.mapValues(this.config.samples, s => new Noise(s.seed));
    this.paramNoises = _.mapValues(this.config.params, p => new Noise(p.seed));
  }
  
  getState(x: number, y: number): State {
    const params = _.mapValues(this.config.params, (v,k) =>
      this.paramNoises[k].getValue(x, y, v.frequency, v.cutoff));
    const sources = _.values(_.mapValues(this.config.samples, (v,k) => ({
      sample: k,
      gain: this.sampleNoises[k].getValue(x, y, v.frequency, v.cutoff)
    }))).filter(c => c.gain > 0);
    return {sources: sources, params: params};
  }

}

export class SimplexTopologyGenerator {
  
  constructor(private options: SimplexTopologyOptions) {}
  
  generate(): SimplexTopologyConfig {
    const sampleProb = this.options.density / this.options.samples.length;
    //maybe introduce cutoff variation...
    const cutoff = getNoiseCutoffs([sampleProb])[0];
    const sampleTopos = _.zipObject(this.options.samples, this.options.samples
      .map(_s => ({
        seed: _.random(1000000000000),
        frequency: _.random(this.options.baseFrequency,
          this.options.baseFrequency*this.options.sizeVariation),
        cutoff: cutoff
      })));
    const paramTopos = _.mapValues(_.mapKeys(this.options.params, v => v.name),
      _g => ({
        seed: _.random(1000000000000),
        frequency: this.options.paramFrequency,
        cutoff: this.options.paramCutoff
      }));
    return {samples: sampleTopos, params: paramTopos};
  }

}

export class GeoTopologyGenerator {
  
  constructor(private samples: string[], private options = GEO_OPTIONS) {}
  
  generate(): SimplexTopologyConfig {
    const width = this.options.long[1]-this.options.long[0];
    const height = this.options.lat[1]-this.options.lat[0];
    const squareKms = width * 100 * height * 100;
    const baseFrequency = Math.sqrt(squareKms);
    console.log("squareKms", squareKms, "baseFreq", baseFrequency);
    return new SimplexTopologyGenerator({
      samples: this.samples,
      density: this.options.density,
      sizeVariation: this.options.sizeVariation,
      params: PARAMS,
      baseFrequency: baseFrequency,
      paramFrequency: baseFrequency*this.options.sizeVariation/2,
      paramCutoff: 0.5
    }).generate();
  }
  
}