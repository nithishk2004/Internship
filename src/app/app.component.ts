import { Component } from '@angular/core';
import { CanvasComponent } from './canvas/canvas.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CanvasComponent],
  template: `<app-canvas></app-canvas>`,
  styleUrls: ['./app.component.css']
})
export class AppComponent {}
