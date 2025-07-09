import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DqMethodsDefinitionComponent } from './dq-methods-definition.component';

describe('DqDimensionsMethodsDefinitionComponent', () => {
  let component: DqMethodsDefinitionComponent;
  let fixture: ComponentFixture<DqMethodsDefinitionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DqMethodsDefinitionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DqMethodsDefinitionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
