import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-step-navigator',
  templateUrl: './step-navigator.component.html',
  styleUrls: ['./step-navigator.component.css']
})
export class StepNavigatorComponent {
  @Input() pageStepTitle: string = '';
  @Input() phaseTitle: string = '';
  @Input() stageTitle: string = '';

  // Mapeo de nombres descriptivos a rutas
  steps: { displayName: string, route: string, description: string }[] = [
    { displayName: 'A09.1', route: 'st4/a09-1', description: 'Prioritization of DQ Problems' },
    { displayName: 'A09.2', route: 'st4/a09-2', description: 'Selection of DQ Problems' },
    { displayName: 'A10', route: 'st4/a10', description: 'Selection of DQ Dimensions and Factors' },
    { displayName: 'A11', route: 'st4/a11', description: 'Definition of DQ Metrics' },
    { displayName: 'A12', route: 'st4/a12', description: 'Implementation of DQ Methods' },
    { displayName: 'DQ Model Confirmation', route: 'st4/confirmation-stage-4', description: 'DQ Model Confirmation' }
  ];

  @Input() currentStep: number = 0;

  // Método para obtener la ruta
  getRoute(step: { displayName: string, route: string }): string {
    return step.route; // Devuelve la ruta real
  }
}