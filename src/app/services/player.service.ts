import * as _ from 'lodash';
import { Player, Gain, PingPongDelay, gainToDb, Destination,
  Signal, Param, Chorus, Reverb, FeedbackDelay, Vibrato,
  Chebyshev, AutoWah, context, Time } from 'tone';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Topology, TopologyConfig, SampleState, GLOBALS } from './topology';

const PATH = 'assets/sounds/full2/';
const TOPOLOGIES = 'assets/topologies/';
export const TRANS_TIME = 3; //seconds

@Injectable()
export class OnboshiPlayer {
  
  private topology: Topology;
  private delay1: FeedbackDelay;
  private delay2: PingPongDelay;
  private reverb: Reverb;
  private chorus: Chorus;
  private cheby: Chebyshev;
  private vibrato: Vibrato;
  private wah: AutoWah;
  private mainSend: Gain;
  private players = new Map<string, Player>();
  private fadeoutTimeouts = new Map<string, NodeJS.Timer>();
  
  constructor(private httpClient: HttpClient) {
    this.init();
    context.latencyHint = 'playback';
  }
  
  async init() {
    this.chorus = new Chorus();
    this.vibrato = new Vibrato();
    this.wah = new AutoWah();
    this.cheby = new Chebyshev(50);
    this.delay1 = new FeedbackDelay();
    this.delay2 = new PingPongDelay();
    this.reverb = new Reverb(3);
    this.mainSend = new Gain();
    this.mainSend.chain(this.chorus, this.vibrato, this.wah, this.cheby,
      this.delay1, this.delay2, this.reverb, Destination);
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
    if (param instanceof Signal) param.linearRampTo(value, TRANS_TIME);
    else this.reverb.decay = value;
  }
  
  private getParam(name: string): Signal<"time"> | Signal<"normalRange">
      | Signal<"frequency"> | Param<"time"> | Param<"normalRange"> | any {
    if (name === GLOBALS.CHORUS_LEVEL) return this.chorus.wet;
    if (name === GLOBALS.VIBRATO_LEVEL) return this.vibrato.wet;
    if (name === GLOBALS.VIBRATO_FREQUENCY) return this.vibrato.frequency;
    if (name === GLOBALS.WAH_LEVEL) return this.wah.wet;
    if (name === GLOBALS.CHEBYCHEV_LEVEL) return this.cheby.wet;
    if (name === GLOBALS.DELAY_TIME) return this.delay1.delayTime;
    if (name === GLOBALS.DELAY_FEEDBACK) return this.delay1.feedback;
    if (name === GLOBALS.DELAY_LEVEL) return this.delay1.wet;
    if (name === GLOBALS.DELAY2_TIME) return this.delay2.delayTime;
    if (name === GLOBALS.DELAY2_FEEDBACK) return this.delay2.feedback;
    if (name === GLOBALS.DELAY2_LEVEL) return this.delay2.wet;
    if (name === GLOBALS.REVERB_LEVEL) return this.reverb.wet;
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
      }, TRANS_TIME*1000));
    }
  }
  
  private adjustGain(sample: string, gain: number) {
    if (this.players.has(sample)) {
      if (this.fadeoutTimeouts.has(sample)) {
        clearTimeout(this.fadeoutTimeouts.get(sample));
        this.fadeoutTimeouts.delete(sample);
      }
      this.players.get(sample).volume.linearRampTo(gainToDb(gain), TRANS_TIME);
    }
  }
  
  private loadAudioList(): Promise<string[]> {
    return <Promise<string[]>>this.loadJson(PATH+'_content.json');
  }
  
  private async loadJson(path: string) {
    return this.httpClient.get(path).toPromise().catch(_o => undefined);
  }

}