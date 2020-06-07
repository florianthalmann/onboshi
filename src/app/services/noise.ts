import * as _ from 'lodash';
import { makeNoise2D, Noise2D } from 'open-simplex-noise';

export class Noise {
  
  private noise: Noise2D;
  
  constructor(seed: number) {
    this.noise = makeNoise2D(seed);
  }
  
  getValue(x: number, y: number, frequency: number, cutoff: number) {
    let value = this.noise(x*frequency, y*frequency); 
    value = (value+1)/2; //normalize
    return (Math.max(cutoff, value)-cutoff)*(1/(1-cutoff)); //cut off
  }
  
}

export function drawCanvas() {
  const container = document.getElementById('container');
  const width = container.clientWidth;
  const height = container.clientHeight;
  console.log(width, height)
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(width, height);
  
  const FREQ = 8;
  const CUTOFF = 0.0;
  
  const noise = new Noise(Date.now());
  const values = [];
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const i = (x + y * width) * 4;
      let value = noise.getValue(x/width, y/height, FREQ, CUTOFF);
      values.push(value)
      value = value * 256;
      imageData.data[i] = value;
      imageData.data[i + 1] = value;
      imageData.data[i + 2] = value;
      imageData.data[i + 3] = 255;
    }
  }
  //console.log(values.slice(1,200))
  console.log("max", _.max(values))
  console.log("mean", _.mean(values.filter(v => v != 0)))
  console.log("prob", values.filter(v => v != 0).length/values.length);
  
  /*console.log(getNoiseCutoffs([0.01, 0.1, 0.3, 0.5, 0.7, 0.9], 10))
  console.log(getNoiseCutoffs([0.01, 0.1, 0.3, 0.5, 0.7, 0.9], 50))*/
  //console.log(getNoiseCutoffs([0.01, 0.1, 0.3, 0.5, 0.7, 0.9], 100))
  
  ctx.putImageData(imageData, 0, 0);
  
  container.appendChild(canvas);
  //return noises;
}

export function getNoiseCutoffs(probabilities: number[], frequency = 100) {
  const sampleNoise = makeNoise2D(Date.now());
  const size = 1000;
  const values = _.flatten(_.range(0, size).map(x => _.range(0, size).map(y =>
    (sampleNoise(x/size*frequency, y/size*frequency)+1)/2)));
  const sorted = _.sortBy(values);
  return probabilities.map(p => sorted[Math.round((1-p)*sorted.length)]);
}