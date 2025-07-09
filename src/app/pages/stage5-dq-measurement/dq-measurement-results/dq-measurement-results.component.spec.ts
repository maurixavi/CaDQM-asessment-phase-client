import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DqMeasurementResultsComponent } from './dq-measurement-results.component';

describe('DqMeasurementResultsComponent', () => {
  let component: DqMeasurementResultsComponent;
  let fixture: ComponentFixture<DqMeasurementResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DqMeasurementResultsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DqMeasurementResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
