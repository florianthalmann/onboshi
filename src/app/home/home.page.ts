import * as _ from 'lodash';
import { Component } from '@angular/core';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { BackgroundGeolocation, BackgroundGeolocationEvents
  } from '@ionic-native/background-geolocation/ngx';
import { throttleTime } from "rxjs/operators";
import { OnboshiPlayer } from '../services/player.service';
import { drawCanvas } from '../services/noise';
import { GEO_OPTIONS, TRANS_TIME } from '../services/consts';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  public x = _.random(1000); //start at random spot for automove...
  public y = _.random(1000);
  public geolocStatus = "";
  public playerStatus = "";
  private numGeolocUpdates = 0;
  private STEP_SIZE = 20;
  
  constructor(private player: OnboshiPlayer, private geolocation: Geolocation,
      private backgroundGeolocation: BackgroundGeolocation) {
    this.automove();
    //this.geomove();
  }
  
  ngOnInit() {
    setTimeout(() => drawCanvas(), 1000);
  }
  
  private async updatePosition() {
    const numSources = await this.player.setPosition(this.x/1000, this.y/1000);
    this.playerStatus = "sources: "+numSources;
  }
  
  private updateLatLong(lat: number, long: number) {
    //35.03 35.07, 135.765 135.8
    //35.042 35.052, 135.782 135.792 (一乗寺)
    const minLat = GEO_OPTIONS.lat[0], maxLat = GEO_OPTIONS.lat[1];
    const minLong = GEO_OPTIONS.long[0], maxLong = GEO_OPTIONS.long[1];
    this.geolocStatus = ++this.numGeolocUpdates
     + ': lat: ' + _.round(lat, 5) + ', long: ' + _.round(long, 5);
    this.x = (long-minLong)/(maxLong-minLong)*1000;
    this.y = (lat-minLat)/(maxLat-minLat)*1000;
    this.updatePosition();
  }
  
  private async geomove() {
    const interval = (TRANS_TIME+0.5)*1000;
    try {
      await this.backgroundGeolocation.configure({
        desiredAccuracy: 0,
        //stationaryRadius: 10,
        interval: interval,
        distanceFilter: 10,
        //startForeground: true,
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
        .pipe(throttleTime(interval))
        .subscribe(data =>{console.log(data)
          this.updateLatLong(data.coords.latitude, data.coords.longitude)});
    }
  }
  
  private automove() {
    const size = (GEO_OPTIONS.lat[1]-GEO_OPTIONS.lat[0]) * 100 * 1000;//width in meters
    const step = this.STEP_SIZE / size * 1000;//+-10 meters
    setTimeout(() => {
      this.x = this.mod((this.x + _.random(-step, step)), 1000);
      this.y = this.mod((this.y + _.random(-step, step)), 1000);
      console.log(this.x, this.y)
      const s = (GEO_OPTIONS.lat[1]-GEO_OPTIONS.lat[0])
      console.log(GEO_OPTIONS.lat[0]+(s*(this.x/1000)), GEO_OPTIONS.long[0]+(s*(this.y/1000)))
      this.updatePosition();
      this.automove();
    }, (TRANS_TIME+0.5)*1000);
  }
  
  private mod(x: number, m: number) {
    return ((x%m)+m)%m;
  }

}
