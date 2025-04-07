import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DqAssessmentApproachesDefinitionComponent } from './dq-assessment-approaches-definition.component';

describe('DqAssessmentApproachesDefinitionComponent', () => {
  let component: DqAssessmentApproachesDefinitionComponent;
  let fixture: ComponentFixture<DqAssessmentApproachesDefinitionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DqAssessmentApproachesDefinitionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DqAssessmentApproachesDefinitionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
