import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DQMetricDefinitionComponent } from './dqmeasurement-metric-definition.component';

describe('DQMetricDefinitionComponent', () => {
  let component: DQMetricDefinitionComponent;
  let fixture: ComponentFixture<DQMetricDefinitionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DQMetricDefinitionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DQMetricDefinitionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
