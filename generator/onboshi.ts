import * as _ from 'lodash';
import * as https from 'https';
import * as fs from 'fs';
import * as mm from 'music-metadata';
import { mapSeries, toMap, fetchJson, execute } from './util';
import { Topology } from '../src/app/services/topology';

const URI = "https://freesound.org/apiv2/search/text/?";
const SOUNDS_URI = "https://freesound.org/apiv2/sounds/";
const KEY = "DMkQspbGpJ45afW7LgzWan8tcbOzScC262QsYgjG";
const MATERIAL = 'src/assets/sounds/';
const TOPOLOGIES = 'src/assets/topologies/';

type FilterMap = Map<string, number[] | string[]>;

//createSoundMaterial('full2');
createTopology('topo1', 'full2');

async function createTopology(name: string, materialName: string) {
  const material = JSON.parse(
    fs.readFileSync(MATERIAL+materialName+'/_content.json', 'utf8'));
  const topology = new Topology().generate(material).getConfig();
  fs.writeFileSync(TOPOLOGIES+name+'.json', JSON.stringify(topology));
}

//TODO: make sure both categories are more or less equal
async function createSoundMaterial(name: string, size = 1) {
  const path = MATERIAL+name+'/';
  fs.existsSync(path) || fs.mkdirSync(path);
  //textures
  const textures = ['atmosphere', 'ambient', 'soundscape', 'abstract']//, 'electronic', 'soundscape'];
  const keys = ["A","A#","B","C","C#","D","D#","E","F","F#","G","G#"];
  const minor = keys.map(k => toMap(['ac_tonality', ['"'+k+' minor"']]));
  const major = keys.map(k => toMap(['ac_tonality', ['"'+k+' major"']]));
  const pitches: FilterMap[] = _.sampleSize(_.range(0, 127), 24).map(p =>
    toMap(['ac_note_midi', [p]]));
  const kinds: FilterMap[] = _.flatten([minor, major, pitches]);
  /*await mapSeries(textures, t => mapSeries(kinds, k =>
    saveStretchedFreeSound(t, k, _.random(2,10,true), _.random(1,5,true))));*/
  await mapSeries(kinds, k => saveStretchedFreeSound(
    _.sample(textures), k, _.random(2,10,true), _.random(1,5,true), path));
  //rhythmic elements
  const rhythm = ['percussion', 'drums', 'rhythm', 'ethnic', 'beat', 'gong',
    'bell', 'chime', 'drum', 'perc', 'shake', 'shaker', 'cymbal', 'roll',
    'bottle', 'cup', 'africa', 'indonesia', 'sound', 'tribal', ];
  const single = toMap(['ac_single_event', ['true']]);
  const multi = toMap(['ac_single_event', ['false']]);
  await mapSeries(rhythm, r => saveStretchedFreeSound(r, single,
    1, _.random(1,10,true), path));
  //less stretched, longer loops....
  await mapSeries(rhythm, r => saveStretchedFreeSound(r, multi,
    1, _.random(3,10,true), path));
  addFilenamesJson(path);
}

function addFilenamesJson(dir: string) {
  fs.writeFileSync(dir+'_content.json', JSON.stringify(
    fs.readdirSync(dir).filter(f => _.includes(f, '.mp3'))));
}

async function saveStretchedFreeSound(searchTerm: string, filters: FilterMap,
    factor: number, duration: number, path: string) {
  filters.set("duration", [1, 10]);
  const filename = await getFreeSound(searchTerm, filters, path);
  if (filename) {
    console.log("stretching", filename, factor, duration);
    return stretchRandomPartOfSound(filename, factor, duration);
  }
}

async function getFreeSound(searchTerm: string, filters: FilterMap, path: string) {
  const randomSound = _.sample(await queryFreesound(searchTerm, filters));
  if (randomSound) {
    console.log(JSON.stringify(randomSound));
    const info = (await fetchJson(SOUNDS_URI+randomSound.id+"?token="+KEY))
    const preview = info.previews["preview-lq-mp3"];
    const filename = path+searchTerm+randomSound.id+".mp3";
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