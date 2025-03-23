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
  @Input() steps: { displayName: string, route: string, description: string }[] = []; 


  @Input() currentStep: number = 0;

  // Método para obtener la ruta
  getRoute(step: { displayName: string, route: string }): string {
    return step.route; // Devuelve la ruta real
  }

  
}