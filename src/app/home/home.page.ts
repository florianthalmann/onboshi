import * as _ from 'lodash';
import { Component } from '@angular/core';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { BackgroundGeolocation, BackgroundGeolocationEvents
  } from '@ionic-native/background-geolocation/ngx';
import { throttleTime } from "rxjs/operators";
import { OnboshiPlayer, TRANS_TIME } from '../services/player.service';
import { drawCanvas } from '../services/noise';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  public x = 0;
  public y = 0;
  public geolocStatus = "";
  public playerStatus = "";
  private numGeolocUpdates = 0;
  private STEP = 0.01;
  
  constructor(private player: OnboshiPlayer, private geolocation: Geolocation,
      private backgroundGeolocation: BackgroundGeolocation) {
    //this.automove();
    this.geomove();
  }
  
  ngOnInit() {
    setTimeout(() => drawCanvas(), 1000);
  }
  
  protected async updatePosition() {
    const numSources = await this.player.setPosition(this.x/1000, this.y/1000);
    this.playerStatus = "sources: "+numSources;
  }
  
  private updateLatLong(lat: number, long: number) {
    //35.03 35.07, 135.765 135.8
    //35.042 35.052, 135.782 135.792 (一乗寺)
    const minLat = 35.042, maxLat = 35.052;
    const minLong = 135.782, maxLong = 135.792;
    this.geolocStatus = ++this.numGeolocUpdates
     + ': lat: ' + _.round(lat, 5) + ', long: ' + _.round(long, 5);
    this.x = (long-minLong)/(maxLong-minLong)*1000;
    this.y = (lat-minLat)/(maxLat-minLat)*1000;
    this.updatePosition();
  }
  
  private async geomove() {
    try {
      await this.backgroundGeolocation.configure({
        desiredAccuracy: 0,
        //stationaryRadius: 10,
        fastestInterval: 1000,
        distanceFilter: 10,
        debug: true, //  enable this hear sounds for background-geolocation life-cycle.
        stopOnTerminate: true, // enable this to clear background location settings when the app terminates
      });
      this.backgroundGeolocation.start();
      this.backgroundGeolocation.on(BackgroundGeolocationEvents.location)
        .subscribe(loc => this.updateLatLong(loc.latitude, loc.longitude));
    } catch(e) {
      console.log("failed loading background geolocation ("+e
        +"). switching to regular plugin");
      this.geolocation.watchPosition({timeout: 20000, enableHighAccuracy: true})
        .pipe(throttleTime(TRANS_TIME*1000))
        .subscribe(data =>
          this.updateLatLong(data.coords.latitude, data.coords.longitude));
    }
  }
  
  private automove() {
    setTimeout(() => {
      this.x = this.mod((this.x + _.random(-this.STEP, this.STEP)), 1000);
      this.y = this.mod((this.y + _.random(-this.STEP, this.STEP)), 1000);
      this.updatePosition();
      this.automove();
    }, TRANS_TIME*1000);
  }
  
  private mod(x: number, m: number) {
    return ((x%m)+m)%m;
  }

}
