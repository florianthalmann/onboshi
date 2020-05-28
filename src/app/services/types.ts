export interface Point {
  coords: number[],
  value: number
}

export interface Range {
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

export interface ParamDefs {
  [key: string]: Param
}

interface Param {
  name: string,
  min: number,
  max: number
}

export interface TopologyOptions {
  samples: string[],
  numSources: number,
  density: number, //avg sources playing simultaneously
  radiusVariation: number, //variation in area radiuses [r, r*v], v >= 1
  params: ParamDefs,
  numParamPoints: number,
}

export interface GeoTopologyOptions {
  lat: [number, number],
  long: [number, number],
  sourcesPerKm: number, //~at 23°N/S
  paramPointsPerKm: number, //~at 23°N/S
  density: number,
  radiusVariation: number
}
