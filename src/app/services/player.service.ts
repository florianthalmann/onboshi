import * as _ from 'lodash';
import * as Tone from 'tone';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const PATH = 'assets/sounds/test/';

@Injectable()
export class OnboshiPlayer {
  
  constructor(private httpClient: HttpClient) {}
  
  async play() {
    const audio = await this.loadAudioList();
    const samples = _.sampleSize(audio, 3);
    console.log(samples)
    const players = await Promise.all<Tone.Player>(samples.map(s =>
      new Promise(resolve => {
        const player = new Tone.Player(PATH+s, () => resolve(player)).toMaster();
      })
    ));
    console.log(players)
    players.forEach(p => {
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