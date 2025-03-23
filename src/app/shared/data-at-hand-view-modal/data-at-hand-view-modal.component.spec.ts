import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataAtHandViewModalComponent } from './data-at-hand-view-modal.component';

describe('DataAtHandViewModalComponent', () => {
  let component: DataAtHandViewModalComponent;
  let fixture: ComponentFixture<DataAtHandViewModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DataAtHandViewModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataAtHandViewModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
