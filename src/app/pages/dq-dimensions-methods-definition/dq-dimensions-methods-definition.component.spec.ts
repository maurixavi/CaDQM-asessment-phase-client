import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DqDimensionsMethodsDefinitionComponent } from './dq-dimensions-methods-definition.component';

describe('DqDimensionsMethodsDefinitionComponent', () => {
  let component: DqDimensionsMethodsDefinitionComponent;
  let fixture: ComponentFixture<DqDimensionsMethodsDefinitionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DqDimensionsMethodsDefinitionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DqDimensionsMethodsDefinitionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
