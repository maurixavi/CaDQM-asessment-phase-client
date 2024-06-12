import { TestBed } from '@angular/core/testing';

import { DqProblemsService } from './dq-problems.service';

describe('DqProblemsService', () => {
  let service: DqProblemsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DqProblemsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
