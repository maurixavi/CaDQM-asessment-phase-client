import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DQModelConfirmationComponent } from './dqmodel-confirmation.component';

describe('DQModelConfirmationComponent', () => {
  let component: DQModelConfirmationComponent;
  let fixture: ComponentFixture<DQModelConfirmationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DQModelConfirmationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DQModelConfirmationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
