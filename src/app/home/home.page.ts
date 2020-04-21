import * as _ from 'lodash';
import { Component } from '@angular/core';
import { OnboshiPlayer } from '../services/player.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  protected x = 0;
  protected y = 0;
  
  constructor(private player: OnboshiPlayer) {
    this.automove();
  }
  
  protected updatePosition() {
    console.log("pos", this.x, this.y);
    this.player.setPosition(this.x/1000, this.y/1000);
  }
  
  private automove() {
    setTimeout(() => {
      this.x = this.mod((this.x + _.random(-40, 40)), 1000);
      this.y = this.mod((this.y + _.random(-40, 40)), 1000);
      this.updatePosition();
      this.automove();
    }, 3000);
  }
  
  private mod(x: number, m: number) {
    return ((x%m)+m)%m;
  }

}
