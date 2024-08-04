import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DQMeasurementPreviewComponent } from './dqmeasurement-preview-run.component';

describe('DQMeasurementPreviewComponent', () => {
  let component: DQMeasurementPreviewComponent;
  let fixture: ComponentFixture<DQMeasurementPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DQMeasurementPreviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DQMeasurementPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
