import { Component, Input, OnInit } from '@angular/core';
// import { DataQualityIssue } from '../dqproblems-priorization/dqproblems-priorization.component'; 
import { DqProblemsService } from '../../shared/dq-problems.service';
import { Router } from '@angular/router';

interface DataQualityIssue {
  id: number;
  name: string;
  description: string;
  contextcomp_related_to: string[];
  priority: number;
  priorityType: string;
  selectedFactors?: number[];
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

  //   constructor(private issuesService: DqProblemsService) {}
  constructor(private router: Router, private issuesService: DqProblemsService) { }

  ngOnInit() {
    this.issuesService.currentIssues.subscribe(issues => this.prioritizedIssues = issues);
  }

  showDetails(issue: DataQualityIssue) {
    this.selectedIssue = issue;
    this.detailsVisible = true;
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

  getContextDescription(contextId: string): string {
    const idNumber = parseInt(contextId, 10); // Convertir contextId a número
    const context = this.prioritizedIssues.find(issue => issue.id === idNumber);
    return context ? context.description : 'No description';
  }
  
}