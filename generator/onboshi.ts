import * as _ from 'lodash';
import * as https from 'https';
import * as fs from 'fs';
import * as mm from 'music-metadata';
import { mapSeries, toMap, fetchJson, execute } from './util';
import { GeoTopologyGenerator } from '../src/app/services/simplex-topology';

const URI = "https://freesound.org/apiv2/search/text/?";
const SOUNDS_URI = "https://freesound.org/apiv2/sounds/";
const KEY = "DMkQspbGpJ45afW7LgzWan8tcbOzScC262QsYgjG";
const TOPOLOGIES = 'src/assets/topologies/';

type FilterMap = Map<string, number[] | string[]>;

const MATERIAL_PATH = 'material/dub1/';
fs.existsSync(MATERIAL_PATH) || fs.mkdirSync(MATERIAL_PATH);

createBpmMaterial(100, 100);
//updateFilenamesJson(NAME);
//createTopology('simplex', NAME);

async function createTopology(name: string, materialName: string) {
  const material = JSON.parse(
    fs.readFileSync(MATERIAL_PATH+'_content.json', 'utf8'));
  const topology = new GeoTopologyGenerator(material).generate();
  fs.writeFileSync(TOPOLOGIES+name+'.json', JSON.stringify(topology));
}

async function createBpmMaterial(bpm: number, size = 100) {
  const beatDuration = 60/bpm;
  /*createMaterial(size, ["+dub +"+bpm+"bpm", "+dub +"+bpm], [new Map()], [1,10],
    null, beatDuration);*/
  /*createMaterial(size, ["dub", "dubby", "reggae", "ska", "rocksteady", "dancehall",
      "riddim", "dubmix", "africa", "rhythm", "offbeat"],
    [toMap(['ac_tempo', [bpm]])], [2,10], null, beatDuration);*/
  createMaterial(size, ["drums", "guitar", "horns", "piano", "organ", "bubble",
      "riddim", "bass", "percussion", "effects", "offbeat"].map(t => "+dub +"+t),
      [toMap(['ac_tempo', [bpm]])], [2,10], null, beatDuration);
}

async function createSoundMaterial(size = 100) {
  //textures
  const textures = ['atmosphere', 'ambient', 'soundscape', 'abstract',
    'harmonic', 'smooth', 'pitch', 'chord', 'vibe', 'texture',
    'harmony', 'warm', 'instrument', 'acoustic', 'synth', 'deep', 'pleasant',
    'cool', 'hot']
  await createMaterial(Math.round(size/2), textures, getKeyAndPitchFilters(),
    [1,10], [2,10]);
  //rhythmic elements
  const rhythm = ['percussion', 'drums', 'rhythm', 'ethnic', 'beat', 'gong',
    'bell', 'chime', 'drum', 'perc', 'shake', 'shaker', 'cymbal', 'roll',
    'bottle', 'cup', 'africa', 'indonesia', 'sound', 'tribal', 'china',
    'japan', 'crackle'];
  const single = toMap(['ac_single_event', ['true']]);
  const multi = toMap(['ac_single_event', ['false']]);
  await createMaterial(Math.round(size/4), rhythm, [single], [1,10]);
  //longer loops....
  await createMaterial(Math.round(size/4), rhythm, [multi], [3,20]);
  updateFilenamesJson();
}

async function createMaterial(count: number, keywords: string[],
    filters: FilterMap[], durationRange: [number, number],
    stretchRange?: [number, number], durationFactor?: number) {
  //evenly distributed search terms
  const terms = _.flatten(_.concat(
    _.times(Math.floor(count/keywords.length), _.constant(keywords)),
    _.sampleSize(keywords, modForReal(count, keywords.length))));
  return mapSeries(terms, t => saveStretchedFreeSound(
    t, _.sample(filters),
    stretchRange ? _.random(stretchRange[0], stretchRange[1], true) : 1,
    _.random(durationRange[0], durationRange[1], true), durationFactor
  ));
}

function modForReal(n: number, mod: number) {
  return ((n%mod)+mod)%mod;
}

function getKeyAndPitchFilters(): FilterMap[] {
  //24 keys
  const keys = ["A","A#","B","C","C#","D","D#","E","F","F#","G","G#"];
  const minor = keys.map(k => toMap(['ac_tonality', ['"'+k+' minor"']]));
  const major = keys.map(k => toMap(['ac_tonality', ['"'+k+' major"']]));
  //24 random pitches
  const pitches: FilterMap[] = _.sampleSize(_.range(0, 127), 24).map(p =>
    toMap(['ac_note_midi', [p]]));
  return _.flatten([minor, major, pitches]);
}

function updateFilenamesJson() {
  fs.writeFileSync(MATERIAL_PATH+'_content.json', JSON.stringify(
    fs.readdirSync(MATERIAL_PATH).filter(f => _.includes(f, '.mp3'))));
}

async function saveStretchedFreeSound(searchTerm: string, filters: FilterMap,
    factor: number, duration: number, durationFactor?: number) {
  //longer original sounds for stretched than non-stretched
  //const searchMaxDur = factor > 1 ? 4*duration/factor : 2*duration;
  if (durationFactor) duration = duration - modForReal(duration, durationFactor);
  filters.set("duration", [1, 3*duration]);
  const filename = await getFreeSound(searchTerm, filters);
  if (filename) {
    console.log("stretching", filename, factor, duration);
    return stretchRandomPartOfSound(filename, factor, duration);
  }
}

async function getFreeSound(searchTerm: string, filters: FilterMap) {
  const randomSound = _.sample(await queryFreesound(searchTerm, filters));
  if (randomSound) {
    console.log(JSON.stringify(randomSound));
    const info = (await fetchJson(SOUNDS_URI+randomSound.id+"?token="+KEY))
    const preview = info.previews["preview-lq-mp3"];
    const filename = MATERIAL_PATH
      +searchTerm.replace(/ /g, '_').replace(/\+/g, '')
      +randomSound.id+".mp3";
    const file = fs.createWriteStream(filename);
    let stream = await new Promise<fs.WriteStream>(resolve =>
      https.get(preview, response => resolve(response.pipe(file))));
    return new Promise<string>(resolve =>
      stream.on('finish', () => resolve(filename)));
  } else {
    console.log("no sound found for", searchTerm, filters);
  }
}

async function queryFreesound(searchTerm: string, filters: FilterMap) {
  const filterString = [...filters.entries()].map(([k,v]) =>
    k+":" + (v.length == 1 ? v[0] : "["+v[0]+" TO "+v[1]+"]")).join(' ');
  const uri = encodeURI(URI+"query="+searchTerm
    +"&filter="+filterString+"&page_size=150&token="+KEY);
  const response = await fetchJson(uri);
  return response.count > 0 ? response.results : [];
}

async function stretchRandomPartOfSound(path: string, factor: number,
    targetDuration: number) {
  const duration = (await mm.parseFile(path)).format.duration;
  targetDuration = Math.min(duration*factor, targetDuration);
  const wavpath = path.replace('.mp3', '.wav');
  await execute('sox '+path+' '+wavpath);
  if (factor != 1) {
    await execute('python node_modules/paulstretch_python/paulstretch_newmethod.py '
      +wavpath+' '+wavpath+' -s '+factor);
  }
  const trimPosition = _.random((duration*factor)-targetDuration, true);
  await execute('sox '+wavpath+' --norm=-3 '+wavpath.replace('.wav', '.mp3')
    +' trim '+trimPosition+' '+targetDuration);//+' fade 0.01 -0 0.01');
  fs.unlinkSync(wavpath);
}