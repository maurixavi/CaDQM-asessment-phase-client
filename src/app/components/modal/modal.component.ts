import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.css']
})
export class ModalComponent {
  @Input() isOpen: boolean = false;
  @Input() title: string = '';
  @Input() message: string = '';

  @Input() autoClose: boolean = false; // Propiedad para activar el cierre automático
  @Input() autoCloseDelay: number = 3000; // Tiempo en milisegundos para cerrar automáticamente (3 segundos por defecto)
  @Output() close = new EventEmitter<void>(); 

  private autoCloseTimeout: any;

  /*onClose() {
    this.close.emit();
  }*/
  onClose(): void {
    this.isOpen = false;
    this.close.emit();
    clearTimeout(this.autoCloseTimeout); // Limpiar el timeout si el usuario cierra manualmente
  }

  // Cerrar automáticamente después del tiempo especificado
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.autoClose) {
      this.autoCloseTimeout = setTimeout(() => this.onClose(), this.autoCloseDelay);
    }
  }
}