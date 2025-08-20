import { Component, Input } from '@angular/core';

declare var bootstrap: any; 

@Component({
  selector: 'app-data-at-hand-view-modal',
  templateUrl: './data-at-hand-view-modal.component.html',
  styleUrls: ['./data-at-hand-view-modal.component.css']
})
export class DataAtHandViewModalComponent {
  @Input() dataAtHandDetails: any; // Detalles del data_at_hand
  @Input() dataSchema: any; // Esquema de datos

  ceil = Math.ceil;

  constructor() {}

  // Función para abrir el modal
  openModal(): void {
    const modalElement = document.getElementById('dataAtHandModal');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement); // Usar Bootstrap vanilla
      modal.show();
    }
  }

  getFirstHalf(columns: any[]): any[] {
    return columns.slice(0, Math.ceil(columns.length / 2));
  }
  
  getSecondHalf(columns: any[]): any[] {
    return columns.slice(Math.ceil(columns.length / 2));
  }
}