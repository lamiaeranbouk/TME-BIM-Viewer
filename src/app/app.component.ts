/*
import {Component} from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
}
*/
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `<app-ifc-viewer></app-ifc-viewer>`,
  styles: []
})
export class AppComponent {
  title = 'angular-bim-viewer';
}
