import * as _ from 'lodash';
import { Player, gainToDb } from 'tone';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Topology, Config } from './topology';

const PATH = 'assets/sounds/full/';
const RAMP_TIME = 3;

@Injectable()
export class OnboshiPlayer {
  
  private topology: Topology;
  private players = new Map<string, Player>();
  
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
    const toAdd = _.difference(future, current);
    const toRemove = _.difference(current, future);
    console.log(current, toAdd, toRemove)
    await Promise.all(toAdd.map(s => this.addPlayer(s)));
    //change gains and wait
    configs.forEach(c => this.adjustGain(c.sample, c.gain));
    toRemove.forEach(s => this.adjustGain(s, 0));
    await new Promise(resolve => setTimeout(resolve, RAMP_TIME*1000));
    //remove
    await Promise.all(toRemove.map(s => this.removePlayer(s)));
  }
  
  private async addPlayer(sample: string) {
    const player = await new Promise<Player>(resolve => {
      const p = new Player(PATH+sample, () => resolve(p)).toDestination()});
    player.volume.value = gainToDb(0);
    player.loop = true;
    player.loopStart = 0.4;
    player.loopEnd = player.buffer.duration-0.4;
    player.start();
    this.players.set(sample, player);
  }
  
  private adjustGain(sample: string, gain: number) {
    if (this.players.has(sample)) {
      this.players.get(sample).volume.linearRampTo(gainToDb(gain), RAMP_TIME);
    }
  }
  
  private removePlayer(sample: string) {
    if (this.players.has(sample)) {
      this.players.get(sample).stop().dispose();
      this.players.delete(sample);
    }
  }
  
  private loadAudioList(): Promise<string[]> {
    return <Promise<string[]>>this.httpClient.get(PATH+'_contents.json')
      .toPromise();
  }

}