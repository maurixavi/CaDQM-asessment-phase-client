import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DqDimensionsFactorsSelectionComponent } from './dq-dimensions-factors-selection.component';

describe('DqDimensionsFactorsSelectionComponent', () => {
  let component: DqDimensionsFactorsSelectionComponent;
  let fixture: ComponentFixture<DqDimensionsFactorsSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DqDimensionsFactorsSelectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DqDimensionsFactorsSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
