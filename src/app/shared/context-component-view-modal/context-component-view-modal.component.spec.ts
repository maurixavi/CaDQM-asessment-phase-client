import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContextComponentViewModalComponent } from './context-component-view-modal.component';

describe('ContextComponentViewModalComponent', () => {
  let component: ContextComponentViewModalComponent;
  let fixture: ComponentFixture<ContextComponentViewModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ContextComponentViewModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContextComponentViewModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
