import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-stepper',
  templateUrl: './stepper.component.html',
  styleUrls: ['./stepper.component.css']
})
export class StepperComponent {
  @Input() currentStep: number = 0; // Paso actual
  @Input() totalSteps: number = 0; // Total de pasos
  @Input() isNextStepEnabled: boolean = false; // Nueva propiedad
  @Output() stepChange = new EventEmitter<number>(); // Evento para cambiar de paso
  @Output() completeStage = new EventEmitter<void>(); // Evento para completar la etapa

  isWarningModalOpen: boolean = false;

  // Método para ir al paso anterior
  goToPreviousStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.stepChange.emit(this.currentStep);
    }
  }

  // Método para ir al siguiente paso
  /*goToNextStep() {
    if (this.currentStep < this.totalSteps - 1) {
      this.currentStep++;
      this.stepChange.emit(this.currentStep);
    } else {
      this.completeStage.emit();
    }
  }*/
  goToNextStep() {
    if (!this.isNextStepEnabled) {
      console.warn('Please complete this activity.');
      this.isWarningModalOpen = true; 
      return;
    }

    if (this.currentStep < this.totalSteps - 1) {
      this.currentStep++;
      this.stepChange.emit(this.currentStep);
    } else {
      // Si está en el último paso, emitir el evento para completar la etapa
      this.completeStage.emit();
    }
  }

  closeWarningModal(): void {
    this.isWarningModalOpen = false;
  }


  


}