import { Component, OnInit } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import dataQualityProblemsJson from '../../../assets/data-quality-problems.json';
import contextComponentsJson from '../../../assets/context-components.json';

import { Router } from '@angular/router';

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
  newMetric: QualityMetric;
  definedMetrics: QualityMetric[];
}

interface QualityMetric {
  name: string;
  purpose: string;
  granularity: string;
  domain: string;
  factor?: QualityFactor;
}

@Component({
  selector: 'app-dqproblems-priorization',
  templateUrl: './dqmeasurement-preview-run.component.html',
  styleUrl: './dqmeasurement-preview-run.component.scss'
})
export class DQMeasurementPreviewComponent implements OnInit {
  problems: DataQualityProblem[] = [];
  contextComponents: ContextComponent[] = [];
  selectedProblem: DataQualityProblem | null = null;
  detailsVisible: boolean = false;
  isOrderConfirmed: boolean = false;

  constructor(private router: Router) { }

  /*constructor(private router: Router) { }
  constructor(private dqProblemsService: DqProblemsService) { }*/

  qualityDimensions: QualityDimension[] = [
    { id: 1, name: 'Exactitud (accuracy)' },
    { id: 2, name: 'Completitud (completeness)' },
    { id: 3, name: 'Frescura (freshness)' },
    { id: 4, name: 'Consistencia (consistency)' },
    { id: 5, name: 'Unicidad (uniqueness)' }
  ];




  granularities: string[] = ['Celda', 'Tupla', 'Tabla'];
  domains: string[] = ['Entero', 'Real', 'Booleano'];
  newMetric: QualityMetric = {
    name: '', purpose: '', granularity: '', domain: '',factor: undefined };
  definedMetrics: QualityMetric[] = [];

  ngOnInit() {
    //this.problems = dataQualityProblemsJson as DataQualityProblem[];
    

    this.contextComponents = contextComponentsJson as ContextComponent[];
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


  addMetric(factor: QualityFactor): void {
    if (factor.newMetric.name && factor.newMetric.purpose && factor.newMetric.granularity && factor.newMetric.domain) {
      factor.definedMetrics.push({ ...factor.newMetric });
      factor.newMetric = { name: '', purpose: '', granularity: '', domain: '' };
    }
  }

  deleteMetric(factor: QualityFactor, metric: QualityMetric): void {
    const index = factor.definedMetrics.indexOf(metric);
    if (index > -1) {
      factor.definedMetrics.splice(index, 1);
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
