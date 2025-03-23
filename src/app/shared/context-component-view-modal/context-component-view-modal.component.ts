import { Component, Input } from '@angular/core';
declare var bootstrap: any; 

import { formatCategoryName } from '../utils/utils'


@Component({
  selector: 'app-context-component-view-modal',
  templateUrl: './context-component-view-modal.component.html',
  styleUrls: ['./context-component-view-modal.component.css']
})
export class ContextComponentViewModalComponent {
  @Input() selectedComponentKeys: string[] = []; // Claves del componente seleccionado
  @Input() selectedComponentDetails: any = {}; // Detalles del componente seleccionado

  //Utils.py
  public formatCategoryName = formatCategoryName;
  //public getFirstNonIdAttribute = getFirstNonIdAttribute

  // Función para abrir el modal
  openModal(): void {
    const modalElement = document.getElementById('contextComponentModal');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement); // Usar Bootstrap vanilla
      modal.show();
    }
  }
}