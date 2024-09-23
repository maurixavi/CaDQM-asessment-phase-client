import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-dqmodel-confirmation',
  templateUrl: './dqmodel-confirmation.component.html',
  styleUrl: './dqmodel-confirmation.component.css'
})

export class DQModelConfirmationComponent implements OnInit {
  /*steps: string[] = [
    'Step 1',
    'Step 2',
    'Step 3',
    'Step 4',
    'Step 5',
    'Step 6',
    'Confirmation'
  ];*/
  
  currentStep: number = 6; // Confirmación es el paso 6
  pageStepTitle: string = 'DQ Model confirmation';
  phaseTitle: string = 'Phase 2: DQ Assessment';
  stageTitle: string = 'Stage 4: DQ Model Definition';

  constructor() {}

  ngOnInit(): void {
    // No es necesario hacer nada más aquí, ya que currentStep ya está definido
  }
}