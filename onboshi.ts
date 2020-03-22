import * as _ from 'lodash';
import fetch from 'node-fetch';
import * as https from 'https';
import * as fs from 'fs';
import { exec } from 'child_process';
import * as mm from 'music-metadata';

const URI = "https://freesound.org/apiv2/search/text/?"
const SOUNDS_URI = "https://freesound.org/apiv2/sounds/"
const KEY = "DMkQspbGpJ45afW7LgzWan8tcbOzScC262QsYgjG"
const PATH = 'sounds/'

saveStretchedFreeSound('gong');

//TODO: QUERY BY GEOLOC!!!

async function saveStretchedFreeSound(searchTerm: string) {
  const filename = await getFreeSound(searchTerm);
  console.log("stretching", filename);
  return stretchRandomPartOfSound(filename);
}

async function getFreeSound(searchTerm: string, minDuration = 1, maxDuration = 10) {
  const sounds = (await fetchJson(URI+"query="+searchTerm
    +"&filter=duration:%5B"+(minDuration)+"%20TO%20"+(maxDuration)+"%5D"
    +"&token="+KEY)).results;
  const random = _.sample(sounds);
  console.log(JSON.stringify(random));
  const info = (await fetchJson(SOUNDS_URI+random.id+"?token="+KEY))
  const preview = info.previews["preview-lq-mp3"];
  console.log(preview)
  const filename = PATH+random.id+".mp3";
  const file = fs.createWriteStream(filename);
  let stream = await new Promise<fs.WriteStream>(resolve =>
    https.get(preview, response => resolve(response.pipe(file))));
  return new Promise<string>(resolve =>
    stream.on('finish', () => resolve(filename)));
}

async function stretchRandomPartOfSound(path: string, factor = _.random(2, 10), targetLength = _.random(10)) {
  const duration = (await mm.parseFile(path)).format.duration;
  const wavpath = path.replace('.mp3', '.wav');
  await execute('sox '+path+' '+wavpath);
  const strpath = wavpath.replace('.wav', 's.wav');
  await execute('python node_modules/paulstretch_python/paulstretch_newmethod.py '
    +wavpath+' '+strpath+' -s '+factor);
  fs.unlinkSync(wavpath);
  const trimPosition = _.random((duration*factor)-targetLength, true);
  await execute('sox '+strpath+' --norm=-3 '+strpath.replace('.wav', '.mp3')
    +' trim '+trimPosition+' '+targetLength+' fade 0.01 -0 0.01');
  fs.unlinkSync(strpath);
  fs.unlinkSync(path);
}

async function execute(command: string, log = false) {
  let options = {shell: '/bin/bash'};//{stdio: ['pipe', 'pipe', 'ignore']};
  return new Promise<void>((resolve, reject) =>
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        console.log(stderr);
        reject();
      } else {
        if (log) console.log(stdout);
        resolve();
      }
    }));
}

async function fetchJson(uri: string) {
  return (await fetch(uri)).json();
}