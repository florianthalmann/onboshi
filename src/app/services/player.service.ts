import * as _ from 'lodash';
import { Player, gainToDb } from 'tone';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Topology, Config } from './topology';

const PATH = 'assets/sounds/full2/';
const RAMP_TIME = 3;

@Injectable()
export class OnboshiPlayer {
  
  private topology: Topology;
  private players = new Map<string, Player>();
  private fadeoutTimeouts = new Map<string, NodeJS.Timer>();
  
  constructor(private httpClient: HttpClient) {
    this.init();
  }
  
  async init() {
    const audio = await this.loadAudioList();
    this.topology = new Topology(audio);
  }
  
  setPosition(x: number, y: number) {
    if (this.topology) {
      this.updatePlayers(this.topology.getConfigs(x, y));
    }
  }
  
  private async updatePlayers(configs: Config[]) {
    const current = [...this.players.keys()];
    const future = configs.map(c => c.sample);
    //remove disappearing
    const toRemove = _.difference(current, future);
    toRemove.map(s => this.removePlayer(s));
    //add and adjust future
    const toAdd = _.difference(future, current);
    await Promise.all(toAdd.map(s => this.addPlayer(s)));
    configs.forEach(c => this.adjustGain(c.sample, c.gain));
    console.log("num sources", future.length);
  }
  
  private async addPlayer(sample: string) {
    return new Promise(resolve => {
      this.players.set(sample, new Player(PATH+sample, () => {
        const player = this.players.get(sample);
        player.volume.value = gainToDb(0);
        player.loop = true;
        player.loopStart = 0.4;
        player.loopEnd = player.buffer.duration-0.4;
        player.start();
        resolve();
      }).toDestination());
    });
  }
  
  private async removePlayer(sample: string) {
    if (this.players.has(sample) && !this.fadeoutTimeouts.has(sample)) {
      this.adjustGain(sample, 0);
      this.fadeoutTimeouts.set(sample, setTimeout(() => {
        this.fadeoutTimeouts.delete(sample);
        const player = this.players.get(sample);
        this.players.delete(sample);
        player.stop().dispose();
      }, RAMP_TIME*1000));
    }
  }
  
  private adjustGain(sample: string, gain: number) {
    if (this.players.has(sample)) {
      if (this.fadeoutTimeouts.has(sample)) {
        clearTimeout(this.fadeoutTimeouts.get(sample));
        this.fadeoutTimeouts.delete(sample);
      }
      this.players.get(sample).volume.linearRampTo(gainToDb(gain), RAMP_TIME);
    }
  }
  
  private loadAudioList(): Promise<string[]> {
    return <Promise<string[]>>this.httpClient.get(PATH+'_contents.json')
      .toPromise();
  }

}