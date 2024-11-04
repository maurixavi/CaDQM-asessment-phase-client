import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import dataQualityProblemsJson from '../../../assets/data-quality-problems.json';
import contextComponentsJson from '../../../assets/context-components.json';

import { DqProblemsService } from '../../shared/dq-problems.service';
import { Router } from '@angular/router';

import { DqModelService } from '../../services/dq-model.service';

export interface DataQualityProblem {
  id: number;
  name: string;
  description: string;
  contextcomp_related_to: string[];
  priority: number;
  priorityType: string;
  selectedFactors?: number[];
}

interface ContextComponent {
  id: string;
  type: string;
  description: string;
}

interface QualityDimension {
  id: number;
  name: string;
}

interface QualityFactor {
  id: number;
  dimensionId: number;
  name: string;
}

@Component({
  selector: 'app-dqproblems-priorization',
  templateUrl: './dqproblems-priorization.component.html',
  styleUrl: './dqproblems-priorization.component.css',
  encapsulation: ViewEncapsulation.None
})
export class DQProblemsPriorizationComponent implements OnInit {

  currentStep: number = 0;
  pageStepTitle: string = 'Prioritization of DQ problems';
  phaseTitle: string = 'Phase 2: DQ Assessment';
  stageTitle: string = 'Stage 4: DQ Model Definition';

  problems: DataQualityProblem[] = [];
  contextComponents: ContextComponent[] = [];
  selectedProblem: DataQualityProblem | null = null;
  detailsVisible: boolean = false;
  isOrderConfirmed: boolean = false;

  constructor(
    private router: Router, 
    private dqProblemsService: DqProblemsService,
    public modelService: DqModelService
  ) { }

  /*constructor(private router: Router) { }
  constructor(private dqProblemsService: DqProblemsService) { }*/

  qualityDimensions: QualityDimension[] = [
    { id: 1, name: 'Exactitud (accuracy)' },
    { id: 2, name: 'Completitud (completeness)' },
    { id: 3, name: 'Frescura (freshness)' },
    { id: 4, name: 'Consistencia (consistency)' },
    { id: 5, name: 'Unicidad (uniqueness)' }
  ];

  qualityFactors: QualityFactor[] = [
    { id: 1, dimensionId: 1, name: 'Exactitud semántica' },
    { id: 2, dimensionId: 1, name: 'Exactitud sintáctica' },
    { id: 3, dimensionId: 1, name: 'Precision' },
    { id: 4, dimensionId: 2, name: 'Coverage' },
    { id: 5, dimensionId: 2, name: 'Density' },
    { id: 6, dimensionId: 3, name: 'Actualidad (currency)' },
    { id: 7, dimensionId: 3, name: 'Oportunidad (timeliness)' },
    { id: 8, dimensionId: 3, name: 'Volatilidad (volatility)' },
    { id: 9, dimensionId: 4, name: 'Integridad de dominio' },
    { id: 10, dimensionId: 4, name: 'Integridad intra-relación' },
    { id: 11, dimensionId: 4, name: 'Integridad inter-relación' },
    { id: 12, dimensionId: 5, name: 'No-duplicación (duplication-free) ' },
    { id: 13, dimensionId: 5, name: 'No-contradicción (contradiction-free)' }
  ];

  /* METRICS, METHODS BASE variables */
  //load metrics and methods base
  dqMetricsBase: any[] = [];
  dqMethodsBase: any[] = [];

  ngOnInit() {
    this.getDQMetricsBase();
    this.getDQMethodsBase();


    this.problems = dataQualityProblemsJson as DataQualityProblem[];
    this.problems.forEach(problem => {
      problem.priorityType = 'Media';
    });

    this.contextComponents = contextComponentsJson as ContextComponent[];
  }


  // METRICS BASE
  getDQMethodsBase() {
    this.modelService.getDQMethodsBase().subscribe({
      next: (data) => {
        this.modelService.metrics = data;
        console.log('METHODS BASE obtenidos del servicio:', data); 
      },
      error: (err) => {
        console.log(err);
      },  
    });
  }

  // METHODS BASE
  getDQMetricsBase() {
    this.modelService.getDQMetricsBase().subscribe({
      next: (data) => {
        this.modelService.metrics = data;
        console.log('METHODS BASE obtenidos del servicio:', data); 
      },
      error: (err) => {
        console.log(err);
      },  
    });
  }



  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.problems, event.previousIndex, event.currentIndex);
    this.updatePriority();
  }

  updatePriority() {
    this.problems.forEach((problem, index) => {
      problem.priority = index + 1;
    });
  }

  /*saveOrder() {
    this.isOrderConfirmed = true;
    this.dqProblemsService.updateProblems(this.problems);
    console.log(this.problems); 
  }*/
  saveOrder() {
    // Lógica para guardar el orden
    this.isOrderConfirmed = true;
    this.dqProblemsService.updateProblems(this.problems); // Suponiendo que `this.problems` contiene los problemas a actualizar
    console.log(this.problems);

    // Redirigir solo si la orden se confirma
    if (this.isOrderConfirmed) {
      this.router.navigate(['/step2']);
    }
  }

  getContextDescription(contextId: string): string {
    const context = this.contextComponents.find(c => c.id === contextId);
    return context && context.description ? context.description : 'No description';
  }
  

  addContextComponent(problem: DataQualityProblem, event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const contextId = selectElement.value;
    if (contextId) { // Verifica que contextId no sea nulo ni una cadena vacía
      if (!problem.contextcomp_related_to.includes(contextId)) {
        problem.contextcomp_related_to.push(contextId);
      }
    }
  }

  removeContextComponent(problem: DataQualityProblem, contextId: string) {
    const index = problem.contextcomp_related_to.indexOf(contextId);
    if (index !== -1) {
      problem.contextcomp_related_to.splice(index, 1);
    }
  }
}
