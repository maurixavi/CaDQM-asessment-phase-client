import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DQProblemsPriorizationComponent } from './dqproblems-priorization.component';

describe('DQProblemsPriorizationComponent', () => {
  let component: DQProblemsPriorizationComponent;
  let fixture: ComponentFixture<DQProblemsPriorizationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DQProblemsPriorizationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DQProblemsPriorizationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
