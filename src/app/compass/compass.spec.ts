import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Compass } from './compass';

describe('Compass', () => {
  let component: Compass;
  let fixture: ComponentFixture<Compass>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Compass],
    }).compileComponents();

    fixture = TestBed.createComponent(Compass);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
