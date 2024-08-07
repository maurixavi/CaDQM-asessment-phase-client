import { Component, OnInit } from '@angular/core';
import { DqProblemsService } from '../../shared/dq-problems.service';
import contextComponentsJson from '../../../assets/context-components.json';
import { Router } from '@angular/router';

interface ContextComponent {
  id: string;
  type: string;
  description: string;
}

interface DataQualityProblem {
  id: number;
  name: string;
  description: string;
  contextcomp_related_to: string[];
  priority: number;
  priorityType: string;
  selectedFactors?: number[];
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
  selector: 'app-dq-dimensions-factors-selection',
  templateUrl: './dq-dimensions-factors-selection.component.html',
  styleUrls: ['./dq-dimensions-factors-selection.component.scss']
})
export class DqDimensionsFactorsSelectionComponent implements OnInit {

  contextComponents: ContextComponent[] = [];


  confirmedSelectedProblems: DataQualityProblem[] = [];

  confirmedFactors: { [key: number]: number[] } = {};

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
  

  constructor(private router: Router, private problemsService: DqProblemsService) { }

  ngOnInit() {
    this.contextComponents = contextComponentsJson as ContextComponent[];
    this.problemsService.currentSelectedProblems.subscribe(problems => {
      this.confirmedSelectedProblems = problems;
    });

    this.problemsService.currentConfirmedFactors.subscribe(factors => {
      this.confirmedFactors = factors;
    });
  }

  getContextDescription(contextId: string): string {
    const context = this.contextComponents.find(c => c.id === contextId);
    return context ? context.description : 'No description';
  }

  getFactorsByDimension(dimensionId: number): QualityFactor[] {
    return this.qualityFactors.filter(factor => factor.dimensionId === dimensionId);
  }

  getFactorNameById(factorId: number): string | undefined {
    const factor = this.qualityFactors.find(f => f.id === factorId);
    return factor ? factor.name : undefined;
  }

  getProblemsForFactor(factorId: number): string[] {
    return this.confirmedSelectedProblems
      .filter(problem => this.confirmedFactors[problem.id]?.includes(factorId))
      .map(problem => problem.name);
  }
  
  

  isFactorSelected(problem: DataQualityProblem, factorId: number): boolean {
    return problem.selectedFactors !== undefined && problem.selectedFactors.includes(factorId);
  }

  toggleFactorSelection(problem: DataQualityProblem, factorId: number) {
    if (!problem.selectedFactors) {
      problem.selectedFactors = [];
    }
    if (problem.selectedFactors.includes(factorId)) {
      problem.selectedFactors = problem.selectedFactors.filter(f => f !== factorId);
    } else {
      problem.selectedFactors.push(factorId);
    }
  }

  showDimensionsFactorsTitle = false;
  showDimensionsFactorsTable = false;
  /*confirmFactorsSelection(problem: DataQualityProblem) {
    console.log('Factores seleccionados confirmados para el problema:', problem);
  }*/
  confirmFactorsSelection(problem: DataQualityProblem) {
    this.problemsService.confirmFactorsSelection(problem.id, problem.selectedFactors || []);
    this.showDimensionsFactorsTitle = true;
    this.showDimensionsFactorsTable = true;
  }

  getSelectedDimensionsWithFactors(): { dimension: QualityDimension, factors: { factor: QualityFactor, problems: string[] }[] }[] {
    return this.qualityDimensions
      .map(dimension => {
        const factorsWithProblems = this.getFactorsByDimension(dimension.id)
          .map(factor => ({
            factor,
            problems: this.getProblemsForFactor(factor.id)
          }))
          .filter(factorWithProblems => factorWithProblems.problems.length > 0);
  
        return { dimension, factors: factorsWithProblems };
      })
      .filter(dimensionWithFactors => dimensionWithFactors.factors.length > 0);
  }

  confirmAllFactors() {
    this.router.navigate(['/step4']);
  }
  
}
