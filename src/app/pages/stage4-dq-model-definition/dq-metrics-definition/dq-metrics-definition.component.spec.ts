import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DQMetricsDefinitionComponent } from './dq-metrics-definition.component';

describe('DQMetricDefinitionComponent', () => {
  let component: DQMetricsDefinitionComponent;
  let fixture: ComponentFixture<DQMetricsDefinitionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DQMetricsDefinitionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DQMetricsDefinitionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
