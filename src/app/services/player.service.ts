import * as _ from 'lodash';
import * as Tone from 'tone';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SourceState } from './types';
import { PARAMS, TRANS_TIME } from './consts';
//import { Topology, GeoTopologyGenerator } from './topology';
import { SimplexTopology, GeoTopologyGenerator, SimplexTopologyConfig } from './simplex-topology';

const TOPO = 'simplex2';
const PATH = 'assets/material/prod/';
const TOPOLOGIES = 'assets/topologies/';
const SYNC_PLAYERS = true;
const LOOP_PADDING = 0.1//0.4;

@Injectable()
export class OnboshiPlayer {
  
  private ready: Promise<void>;
  private topology: SimplexTopology;
  private delay1: Tone.FeedbackDelay;
  private delay2: Tone.PingPongDelay;
  private reverb: Tone.Reverb;
  private chorus: Tone.Chorus;
  private cheby: Tone.Chebyshev;
  private vibrato: Tone.Vibrato;
  private wah: Tone.AutoWah;
  private mainSend: Tone.Gain;
  private players = new Map<string, Tone.Player>();
  private fadeoutTimeouts = new Map<string, NodeJS.Timer>();
  
  constructor(private httpClient: HttpClient) {
    this.ready = this.init();
  }
  
  async init() {
    Tone.setContext(new Tone.Context({ latencyHint : "playback" }));
    //console.log("context set", Tone.getContext().latencyHint)
    console.log(Tone.context.latencyHint)
    this.chorus = new Tone.Chorus();
    this.vibrato = new Tone.Vibrato();
    this.wah = new Tone.AutoWah();
    this.cheby = new Tone.Chebyshev(50);
    this.cheby.wet.setValueAtTime(0, 0);
    this.delay1 = new Tone.FeedbackDelay();
    this.delay2 = new Tone.PingPongDelay();
    this.reverb = new Tone.PingPongDelay(0.001, 0.8);
    //this.reverb = new Tone.Gain();//Tone.context.createConvolver();//new Tone.Reverb(10);//new Tone.Convolver('assets/impulse_rev.wav');//new Tone.Reverb(20);
    /*this.reverb.buffer = await new Promise(resolve => {
      const buffer = new Tone.Buffer('assets/impulse_rev-1.wav', () => resolve(buffer.get()))
    });*/
    //await this.reverb.generate();
    //const mono = new Tone.Mono();
    this.mainSend = new Tone.Gain();
    this.mainSend.chain(this.chorus, this.vibrato, this.wah, this.cheby,
      this.delay1, this.delay2, this.reverb, Tone.Master); //this.reverb, Destination);
    //this.mainSend.chain(mono, this.reverb, Tone.Master);
  }
  
  async setPosition(x: number, y: number) {
    await this.ready;
    if (Tone.context.state === 'suspended') Tone.start();
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
    if (loaded) {
      this.topology = new SimplexTopology(loaded);
    } else {
      const audio = await this.loadAudioList();
      this.topology = new SimplexTopology(new GeoTopologyGenerator(audio).generate());
    }
  }
  
  private setParam(name: string, value: number) {
    const param = this.getParam(name);
    console.log(name, value)
    if (name === PARAMS.REVERB_LEVEL.name) value = 0;
    if (param instanceof Tone.Signal) param.linearRampTo(value, TRANS_TIME);
  }
  
  private getParam(name: string): Tone.Signal<"time"> | Tone.Signal<"normalRange">
      | Tone.Signal<"frequency"> | Tone.Param<"time"> | Tone.Param<"normalRange"> {
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
    if (name === PARAMS.REVERB_LEVEL.name) return this.reverb.wet;
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
    const longestBuffer = _.max(future.map(p => this.players.get(p).buffer.duration));
    configs.forEach(c => this.adjustPlayer(c, longestBuffer));
    return future.length; //current num sources
  }
  
  private async addPlayer(sample: string) {
    return new Promise(resolve => {
      this.players.set(sample, new Tone.Player(PATH+sample, () => {
        const player = this.players.get(sample);
        player.volume.value = Tone.gainToDb(0);
        player.loop = true;
        player.loopStart = LOOP_PADDING;
        player.loopEnd = player.buffer.duration-LOOP_PADDING;
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
  
  private adjustPlayer(state: SourceState, longestBuffer: number) {
    if (this.players.has(state.sample)) {
      const player = this.players.get(state.sample);
      //adjust period
      if (SYNC_PLAYERS) {
        const DUR = longestBuffer-(2*LOOP_PADDING);
        const dur = player.buffer.duration-(2*LOOP_PADDING);
        const times = Math.ceil(DUR/dur);
        player.loopEnd = LOOP_PADDING+(DUR/times);
      }
      //adjust gain
      this.adjustGain(state.sample, state.gain);
    }
  }
  
  private adjustGain(sample: string, value: number) {
    if (this.players.has(sample)) {
      if (this.fadeoutTimeouts.has(sample)) {
        clearTimeout(this.fadeoutTimeouts.get(sample));
        this.fadeoutTimeouts.delete(sample);
      }
      this.players.get(sample)
        .volume.linearRampTo(Tone.gainToDb(value), TRANS_TIME);
    }
  }
  
  private loadAudioList(): Promise<string[]> {
    return <Promise<string[]>>this.loadJson(PATH+'_content.json');
  }
  
  private async loadJson(path: string) {
    return this.httpClient.get(path).toPromise().catch(_o => undefined);
  }

}