import { Component } from '@angular/core';
import { OnboshiPlayer } from '../services/player.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  constructor(private player: OnboshiPlayer) {
    this.player.play();
  }

}
