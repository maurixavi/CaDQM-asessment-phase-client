import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-step-navigator',
  templateUrl: './step-navigator.component.html',
  styleUrl: './step-navigator.component.css'
})
export class StepNavigatorComponent {
  @Input() pageStepTitle: string = '';
  @Input() phaseTitle: string = '';
  @Input() stageTitle: string = '';
  //@Input() steps: string[] = [];
  steps: string[] = [
    'Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5', 'Step 6', 'Confirmation'
  ];

  @Input() currentStep: number = 0;

  // Método para generar la ruta
  getRoute(step: string): string {
    return step.toLowerCase().replace(/ /g, '-');
  }
  //@Input() currentStep: number = 0; // Índice del paso actual
}