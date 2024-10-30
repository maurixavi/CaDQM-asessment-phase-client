import { TestBed } from '@angular/core/testing';

import { DqModelService } from './dq-model.service';

describe('DqModelService', () => {
  let service: DqModelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DqModelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
