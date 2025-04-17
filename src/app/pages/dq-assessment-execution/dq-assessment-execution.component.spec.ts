import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DqAssessmentExecutionComponent } from './dq-assessment-execution.component';

describe('DqAssessmentExecutionComponent', () => {
  let component: DqAssessmentExecutionComponent;
  let fixture: ComponentFixture<DqAssessmentExecutionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DqAssessmentExecutionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DqAssessmentExecutionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
