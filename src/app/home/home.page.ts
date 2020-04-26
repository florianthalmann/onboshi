import * as _ from 'lodash';
import { Component } from '@angular/core';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { throttleTime } from "rxjs/operators";
import { OnboshiPlayer, TRANS_TIME } from '../services/player.service';

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
    //35.03 35.07, 135.765 135.8
    //35.042 35.052, 135.782 135.792 (一乗寺)
    const minLat = 35.042, maxLat = 35.052;
    const minLong = 135.782, maxLong = 135.792;
    this.geolocation.watchPosition({timeout: 20000, enableHighAccuracy: true})
      .pipe(throttleTime(TRANS_TIME*1000))
      .subscribe(data => {
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
    }, TRANS_TIME*1000);
  }
  
  private mod(x: number, m: number) {
    return ((x%m)+m)%m;
  }

}
