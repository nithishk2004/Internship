import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CanvasComponent } from './canvas.component';

describe('CanvasComponent', () => {
  let component: CanvasComponent;
  let fixture: ComponentFixture<CanvasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CanvasComponent], // This works for standalone component
    }).compileComponents();

    fixture = TestBed.createComponent(CanvasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should add a rectangle', () => {
    const initialLength = component.elements.length;
    component.addShape('rect');
    expect(component.elements.length).toBe(initialLength + 1);
    expect(component.elements[initialLength].type).toBe('rect');
  });

  it('should add a circle', () => {
    const initialLength = component.elements.length;
    component.addShape('circle');
    expect(component.elements.length).toBe(initialLength + 1);
    expect(component.elements[initialLength].type).toBe('circle');
  });
  
});
