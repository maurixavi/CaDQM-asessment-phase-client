import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DQProblemsSelectionComponent } from './dqproblems-selection.component';

describe('DQProblemsSelectionComponent', () => {
  let component: DQProblemsSelectionComponent;
  let fixture: ComponentFixture<DQProblemsSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DQProblemsSelectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DQProblemsSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
