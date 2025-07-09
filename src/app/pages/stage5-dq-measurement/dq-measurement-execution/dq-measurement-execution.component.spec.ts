import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DqMeasurementExecutionComponent } from './dq-measurement-execution.component';

describe('DqMeasurementExecutionComponent', () => {
  let component: DqMeasurementExecutionComponent;
  let fixture: ComponentFixture<DqMeasurementExecutionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DqMeasurementExecutionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DqMeasurementExecutionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
