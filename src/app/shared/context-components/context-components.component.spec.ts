import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContextComponentsComponent } from './context-components.component';

describe('ContextComponentsComponent', () => {
  let component: ContextComponentsComponent;
  let fixture: ComponentFixture<ContextComponentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ContextComponentsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContextComponentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
