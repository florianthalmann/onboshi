import * as _ from 'lodash';
import { Player, Gain, PingPongDelay, gainToDb, Destination,
  Signal, JCReverb, Chorus, Phaser } from 'tone';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Topology, TopologyConfig, SampleState, GLOBALS } from './topology';

const PATH = 'assets/sounds/full2/';
const TOPOLOGIES = 'assets/topologies/';
const RAMP_TIME = 3;

@Injectable()
export class OnboshiPlayer {
  
  private topology: Topology;
  private delay: PingPongDelay;
  private reverb: JCReverb;
  private chorus: Chorus;
  private phaser: Phaser;
  private mainSend: Gain;
  private players = new Map<string, Player>();
  private fadeoutTimeouts = new Map<string, NodeJS.Timer>();
  
  constructor(private httpClient: HttpClient) {
    this.init();
  }
  
  async init() {
    this.delay = new PingPongDelay();
    this.reverb = new JCReverb();
    this.chorus = new Chorus();
    this.phaser = new Phaser();
    this.mainSend = new Gain();
    this.mainSend.chain(this.chorus, this.delay, Destination);//this.phaser, this.chorus,
      //this.delay, this.reverb, Destination);
  }
  
  private async loadOrGenerateTopology(name: string) {
    const path = TOPOLOGIES+name+'.json';
    this.topology = new Topology();
    const loaded = <TopologyConfig>await this.loadJson(path);
    console.log(loaded);
    if (loaded) {
      this.topology = new Topology().setConfig(loaded);
    } else {
      this.topology = new Topology().generate(await this.loadAudioList());
    }
  }
  
  async setPosition(x: number, y: number) {
    if (!this.topology) await this.loadOrGenerateTopology('topo1');
    if (!isNaN(x) && !isNaN(y)) {
      const config = this.topology.getState(x, y);
      config.globals.forEach((v, k) => this.setParam(k, v));
      this.updatePlayers(config.samples);
    }
  }
  
  private setParam(name: string, value: number) {
    console.log(name, value);
    const param = this.getParam(name);
    if (param instanceof Signal) param.linearRampTo(value, RAMP_TIME);
  }
  
  private getParam(name: string): Signal<"time"> | Signal<"normalRange"> {
    if (name === GLOBALS.DELAY_TIME) return this.delay.delayTime;
    if (name === GLOBALS.DELAY_FEEDBACK) return this.delay.feedback;
    if (name === GLOBALS.DELAY_LEVEL) return this.delay.wet;
    if (name === GLOBALS.REVERB_ROOM) return this.reverb.roomSize;
    if (name === GLOBALS.REVERB_LEVEL) return this.reverb.wet;
    if (name === GLOBALS.CHORUS_LEVEL) return this.chorus.wet;
    if (name === GLOBALS.PHASER_LEVEL) return this.phaser.wet;
  }
  
  private async updatePlayers(configs: SampleState[]) {
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
      }).connect(this.mainSend));
    });
  }
  
  private removePlayer(sample: string) {
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
    return <Promise<string[]>>this.loadJson(PATH+'_content.json');
  }
  
  private async loadJson(path: string) {
    return this.httpClient.get(path).toPromise().catch(_o => undefined);
  }

}