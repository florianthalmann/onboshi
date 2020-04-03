import { Component } from '@angular/core';
import { OnboshiPlayer } from '../services/player.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  protected x: number;
  protected y: number;
  
  constructor(private player: OnboshiPlayer) {}
  
  protected updatePosition() {
    this.player.setPosition(this.x/1000, this.y/1000);
  }

}
