import { TestBed } from '@angular/core/testing';

import { CompassSevice } from './compass-sevice';

describe('CompassSevice', () => {
  let service: CompassSevice;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CompassSevice);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
