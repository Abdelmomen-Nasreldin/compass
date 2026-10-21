import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CompassComponent } from './compass/compass';

@Component({
  selector: 'app-root',
  imports: [ CompassComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('compass');
}
