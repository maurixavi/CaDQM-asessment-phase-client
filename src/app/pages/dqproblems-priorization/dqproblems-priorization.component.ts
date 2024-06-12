import { Component, OnInit } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import dataQualityIssuesJson from '../../../assets/data-quality-problems.json'
'../../assets/data-quality-problems.json';
import contextComponentsJson from '../../../assets/context-components.json'

import { DqProblemsService } from '../../shared/dq-problems.service';
import { Router } from '@angular/router';

export interface DataQualityIssue {
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
  styleUrl: './dqproblems-priorization.component.scss'
})
export class DQProblemsPriorizationComponent implements OnInit {
  issues: DataQualityIssue[] = [];
  contextComponents: ContextComponent[] = [];
  selectedIssue: DataQualityIssue | null = null;
  detailsVisible: boolean = false;
  isOrderConfirmed: boolean = false;

  constructor(private router: Router, private dqProblemsService: DqProblemsService) { }

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

  ngOnInit() {
    this.issues = dataQualityIssuesJson as DataQualityIssue[];
    this.issues.forEach(issue => {
      issue.priorityType = 'Media';
    });

    this.contextComponents = contextComponentsJson as ContextComponent[];
  }

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.issues, event.previousIndex, event.currentIndex);
    this.updatePriority();
  }

  updatePriority() {
    this.issues.forEach((issue, index) => {
      issue.priority = index + 1;
    });
  }

  /*saveOrder() {
    this.isOrderConfirmed = true;
    this.dqProblemsService.updateIssues(this.issues);
    console.log(this.issues); 
  }*/
  saveOrder() {
    // Lógica para guardar el orden
    this.isOrderConfirmed = true;
    this.dqProblemsService.updateIssues(this.issues); // Suponiendo que `this.issues` contiene los problemas a actualizar
    console.log(this.issues);

    // Redirigir solo si la orden se confirma
    if (this.isOrderConfirmed) {
      this.router.navigate(['/step2']);
    }
  }

  getContextDescription(contextId: string): string {
    const context = this.contextComponents.find(c => c.id === contextId);
    return context && context.description ? context.description : 'No description';
  }
  

  addContextComponent(issue: DataQualityIssue, event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const contextId = selectElement.value;
    if (contextId) { // Verifica que contextId no sea nulo ni una cadena vacía
      if (!issue.contextcomp_related_to.includes(contextId)) {
        issue.contextcomp_related_to.push(contextId);
      }
    }
  }

  removeContextComponent(issue: DataQualityIssue, contextId: string) {
    const index = issue.contextcomp_related_to.indexOf(contextId);
    if (index !== -1) {
      issue.contextcomp_related_to.splice(index, 1);
    }
  }
}
