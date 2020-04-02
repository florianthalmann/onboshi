import * as _ from 'lodash';
import * as Tone from 'tone';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Topology } from './topology';

const PATH = 'assets/sounds/test/';

@Injectable()
export class OnboshiPlayer {
  
  constructor(private httpClient: HttpClient) {}
  
  async play() {
    const audio = await this.loadAudioList();
    const configs = new Topology(audio).getConfigs(0.5, 0.5);
    const players = await Promise.all<Tone.Player>(
      configs.map(s =>
      new Promise(resolve => {
        const player = new Tone.Player(PATH+s.sample, () => resolve(player)).toMaster();
      })
    ));
    console.log(players)
    players.forEach((p,i) => {
      p.volume.value = Tone.gainToDb(configs[i].gain);
      p.loop = true;
      p.autostart = true;
      p.loopStart = 0.4;
      p.loopEnd = p.buffer.duration-0.4;
      p.start();
    });
  }
  
  private loadAudioList(): Promise<string[]> {
    return <Promise<string[]>>this.httpClient.get(PATH+'_contents.json')
      .toPromise();
  }

}