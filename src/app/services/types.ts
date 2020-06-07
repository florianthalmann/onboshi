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
  density: number, //avg sources playing simultaneously
  sizeVariation: number, //variation in area sizes, e.g. radius [r, r*v], v >= 1
  params: ParamDefs
}

export interface AreaTopologyOptions extends TopologyOptions {
  numSources: number,
  numParamPoints: number
}

export interface SimplexTopologyOptions extends TopologyOptions {
  baseFrequency: number,
  paramFrequency: number,
  paramCutoff: number
}

export interface GeoTopologyOptions {
  lat: [number, number],
  long: [number, number],
  sourcesPerKm: number, //~at 23°N/S
  paramPointsPerKm: number, //~at 23°N/S
  density: number,
  sizeVariation: number
}
