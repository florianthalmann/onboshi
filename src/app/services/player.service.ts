import * as _ from 'lodash';
import { Player, Gain, PingPongDelay, gainToDb, Destination,
  Signal, Param, Chorus, FeedbackDelay, Vibrato,
  Chebyshev, AutoWah, context, start } from 'tone';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SourceState } from './types';
import { PARAMS, TRANS_TIME } from './consts';
//import { Topology, GeoTopologyGenerator } from './topology';
import { SimplexTopology, GeoTopologyGenerator, SimplexTopologyConfig } from './simplex-topology';

const TOPO = 'simplex';
const PATH = 'assets/material/prod/';
const TOPOLOGIES = 'assets/topologies/';

@Injectable()
export class OnboshiPlayer {
  
  private topology: SimplexTopology;
  private delay1: FeedbackDelay;
  private delay2: PingPongDelay;
  private chorus: Chorus;
  private cheby: Chebyshev;
  private vibrato: Vibrato;
  private wah: AutoWah;
  private mainSend: Gain;
  private players = new Map<string, Player>();
  private fadeoutTimeouts = new Map<string, NodeJS.Timer>();
  
  constructor(private httpClient: HttpClient) {
    this.init();
    //context.latencyHint = 'playback';
  }
  
  async init() {
    this.chorus = new Chorus();
    this.vibrato = new Vibrato();
    this.wah = new AutoWah();
    this.cheby = new Chebyshev(50);
    this.cheby.wet.setValueAtTime(0, 0);
    this.delay1 = new FeedbackDelay();
    this.delay2 = new PingPongDelay();
    //this.reverb = new Reverb(3);
    this.mainSend = new Gain();
    this.mainSend.chain(this.chorus, this.vibrato, this.wah, this.cheby,
      this.delay1, this.delay2, Destination); //this.reverb, Destination);
  }
  
  async setPosition(x: number, y: number) {
    if (context.state === 'suspended') start();
    if (!this.topology) await this.loadOrGenerateTopology(TOPO);
    if (!isNaN(x) && !isNaN(y)) {
      const config = this.topology.getState(x, y);
      _.forEach(config.params, (v,k) => this.setParam(k, v));
      return this.updatePlayers(config.sources);
    }
  }
  
  private async loadOrGenerateTopology(name: string) {
    const path = TOPOLOGIES+name+'.json';
    const loaded = <SimplexTopologyConfig>await this.loadJson(path);
    if (loaded) console.log(loaded.samples.length)
    if (loaded) {
      this.topology = new SimplexTopology(loaded);
    } else {
      const audio = await this.loadAudioList();
      this.topology = new SimplexTopology(new GeoTopologyGenerator(audio).generate());
    }
  }
  
  private setParam(name: string, value: number) {
    console.log(name, value);
    const param = this.getParam(name);
    if (param instanceof Signal) param.linearRampTo(value, TRANS_TIME);
    //else this.reverb.decay = value;
  }
  
  private getParam(name: string): Signal<"time"> | Signal<"normalRange">
      | Signal<"frequency"> | Param<"time"> | Param<"normalRange"> {
    if (name === PARAMS.CHORUS_LEVEL.name) return this.chorus.wet;
    if (name === PARAMS.VIBRATO_LEVEL.name) return this.vibrato.wet;
    if (name === PARAMS.VIBRATO_FREQUENCY.name) return this.vibrato.frequency;
    if (name === PARAMS.WAH_LEVEL.name) return this.wah.wet;
    if (name === PARAMS.CHEBYCHEV_LEVEL.name) return this.cheby.wet;
    if (name === PARAMS.DELAY_TIME.name) return this.delay1.delayTime;
    if (name === PARAMS.DELAY_FEEDBACK.name) return this.delay1.feedback;
    if (name === PARAMS.DELAY_LEVEL.name) return this.delay1.wet;
    if (name === PARAMS.DELAY2_TIME.name) return this.delay2.delayTime;
    if (name === PARAMS.DELAY2_FEEDBACK.name) return this.delay2.feedback;
    if (name === PARAMS.DELAY2_LEVEL.name) return this.delay2.wet;
  }
  
  private async updatePlayers(configs: SourceState[]) {
    const current = [...this.players.keys()];
    const future = configs.map(c => c.sample);
    //remove disappearing
    const toRemove = _.difference(current, future);
    toRemove.map(s => this.removePlayer(s));
    //add and adjust future
    const toAdd = _.uniq(_.difference(future, current));
    await Promise.all(toAdd.map(s => this.addPlayer(s)));
    configs.forEach(c => this.adjustGain(c.sample, c.gain));
    return future.length; //current num sources
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
        player.dispose();
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