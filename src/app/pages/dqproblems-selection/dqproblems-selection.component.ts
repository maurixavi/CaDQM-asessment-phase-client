import { Component, Input, OnInit } from '@angular/core';
// import { DataQualityIssue } from '../dqproblems-priorization/dqproblems-priorization.component'; 
import { DqProblemsService } from '../../shared/dq-problems.service';
import { Router } from '@angular/router';
import contextComponentsJson from '../../../assets/context-components.json'

interface DataQualityIssue {
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
  prioritizedIssues: DataQualityIssue[] = [];
  selectedIssue: DataQualityIssue | null = null;
  detailsVisible: boolean = false;
  selectedIssues: DataQualityIssue[] = [];
  isSelectionConfirmed: boolean = false;

  contextComponents: ContextComponent[] = [];

  //   constructor(private issuesService: DqProblemsService) {}
  constructor(private router: Router, private issuesService: DqProblemsService) { }

  ngOnInit() {
    this.issuesService.currentIssues.subscribe(issues => this.prioritizedIssues = issues);
    this.contextComponents = contextComponentsJson;
    console.log('Context components loaded:', this.contextComponents);
  }

  showDetails(issue: DataQualityIssue) { 
    this.selectedIssue = issue;
    this.detailsVisible = true;
    console.log(issue.contextcomp_related_to)
    issue.contextcomp_related_to.forEach(contextId => {
      const description = this.getContextDescription(contextId);
      console.log(`Context ID ${contextId} - Description: ${description}`);
    });
  }

  hideDetails() {
    this.detailsVisible = false;
    this.selectedIssue = null;
  }

  addIssue(issue: DataQualityIssue) {
    if (!this.selectedIssues.includes(issue)) {
      this.selectedIssues.push(issue);
    }
  }

  removeSelectedIssue(issue: DataQualityIssue) {
    const index = this.selectedIssues.indexOf(issue);
    if (index !== -1) {
      this.selectedIssues.splice(index, 1);
    }
  }

  confirmSelectedIssues() {
    this.isSelectionConfirmed = true;

    this.issuesService.updateSelectedIssues(this.selectedIssues);
    // Aquí puedes manejar lo que sucede cuando se confirman los problemas seleccionados.
    console.log(this.selectedIssues);
    if (this.isSelectionConfirmed) {
      this.router.navigate(['/step3']);
    }
  }

  /*getContextDescription(contextId: string): string {
    const idNumber = parseInt(contextId, 10); // Convertir contextId a número
    const context = this.prioritizedIssues.find(issue => issue.id === idNumber);
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