import { Component, Input, OnInit } from '@angular/core';
// import { DataQualityProblem } from '../dqproblems-priorization/dqproblems-priorization.component'; 
import { DqProblemsService } from '../../shared/dq-problems.service';
import { Router } from '@angular/router';
import contextComponentsJson from '../../../assets/context-components.json'

interface DataQualityProblem {
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

@Component({
  selector: 'app-dqproblems-selection',
  templateUrl: './dqproblems-selection.component.html',
  styleUrl: './dqproblems-selection.component.scss'
})
export class DQProblemsSelectionComponent implements OnInit {
  prioritizedProblems: DataQualityProblem[] = [];
  selectedProblem: DataQualityProblem | null = null;
  detailsVisible: boolean = false;
  selectedProblems: DataQualityProblem[] = [];
  isSelectionConfirmed: boolean = false;

  contextComponents: ContextComponent[] = [];

  //   constructor(private problemsService: DqProblemsService) {}
  constructor(private router: Router, private problemsService: DqProblemsService) { }

  ngOnInit() {
    this.problemsService.currentProblems.subscribe(problems => this.prioritizedProblems = problems);
    this.contextComponents = contextComponentsJson;
    console.log('Context components loaded:', this.contextComponents);
  }

  showDetails(problem: DataQualityProblem) { 
    this.selectedProblem = problem;
    this.detailsVisible = true;
    console.log(problem.contextcomp_related_to)
    problem.contextcomp_related_to.forEach(contextId => {
      const description = this.getContextDescription(contextId);
      console.log(`Context ID ${contextId} - Description: ${description}`);
    });
  }

  hideDetails() {
    this.detailsVisible = false;
    this.selectedProblem = null;
  }

  addProblem(problem: DataQualityProblem) {
    if (!this.selectedProblems.includes(problem)) {
      this.selectedProblems.push(problem);
    }
  }

  removeSelectedProblem(problem: DataQualityProblem) {
    const index = this.selectedProblems.indexOf(problem);
    if (index !== -1) {
      this.selectedProblems.splice(index, 1);
    }
  }

  confirmSelectedProblems() {
    this.isSelectionConfirmed = true;

    this.problemsService.updateSelectedProblems(this.selectedProblems);
    
    console.log(this.selectedProblems);
    if (this.isSelectionConfirmed) {
      this.router.navigate(['/step3']);
    }
  }

  /*getContextDescription(contextId: string): string {
    const idNumber = parseInt(contextId, 10); // Convertir contextId a número
    const context = this.prioritizedProblems.find(problem => problem.id === idNumber);
    return context ? context.description : 'No description';
  }*/

  getContextDescription(contextId: string): string {
    const context = this.contextComponents.find(c => c.id === contextId);
    return context ? context.description : 'No description';
  }


  /*getContextDescription(contextId: string): string {
    return this.contextComponents[contextId] || 'No description';
  }*/
}
