import * as _ from 'lodash';
import { Component } from '@angular/core';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { OnboshiPlayer } from '../services/player.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  protected x = 0;
  protected y = 0;
  
  constructor(private player: OnboshiPlayer, private geolocation: Geolocation) {
    //this.automove();
    this.geomove();
  }
  
  protected updatePosition() {
    console.log("pos", this.x, this.y);
    this.player.setPosition(this.x/1000, this.y/1000);
  }
  
  private geomove() {
    //35.03 35.07, 135.77 135.8
    const minLat = 35.03, maxLat = 35.07;
    const minLong = 135.77, maxLong = 135.8;
    this.geolocation.watchPosition().subscribe((data) => {
     console.log(data.coords.latitude, data.coords.longitude)
     this.x = (data.coords.longitude-minLong)/(maxLong-minLong)*1000;
     this.y = (data.coords.latitude-minLat)/(maxLat-minLat)*1000;
     console.log(this.x, this.y)
     this.updatePosition();
    });
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
