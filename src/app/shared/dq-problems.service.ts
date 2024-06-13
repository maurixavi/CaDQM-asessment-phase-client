import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

interface DataQualityIssue {
  id: number;
  name: string;
  description: string;
  contextcomp_related_to: string[];
  priority: number;
  priorityType: string;
  selectedFactors?: number[];
}

@Injectable({
  providedIn: 'root'
})
export class DqProblemsService {
  private issuesSource = new BehaviorSubject<DataQualityIssue[]>([]);
  currentIssues = this.issuesSource.asObservable();

  private selectedIssuesSource = new BehaviorSubject<DataQualityIssue[]>([]);
  currentSelectedIssues = this.selectedIssuesSource.asObservable();

  // constructor() { }
  constructor() {
    const issues = localStorage.getItem('issues');
    if (issues) {
      this.issuesSource.next(JSON.parse(issues));
    }

    const selectedIssues = localStorage.getItem('selectedIssues');
    if (selectedIssues) {
      this.selectedIssuesSource.next(JSON.parse(selectedIssues));
    }
  }

  updateIssues(issues: DataQualityIssue[]) {
    this.issuesSource.next(issues);
    localStorage.setItem('issues', JSON.stringify(issues));
  }

  getIssues(): DataQualityIssue[] {
    return this.issuesSource.getValue();
  }

  updateSelectedIssues(issues: DataQualityIssue[]) {
    this.selectedIssuesSource.next(issues);
    localStorage.setItem('selectedIssues', JSON.stringify(issues));
  }

  getSelectedIssues(): DataQualityIssue[] {
    return this.selectedIssuesSource.getValue();
  }

  private saveSelectedIssues(selectedIssues: DataQualityIssue[]) {
    localStorage.setItem('selectedIssues', JSON.stringify(selectedIssues));
  }

  private loadSelectedIssues(): DataQualityIssue[] {
    const savedSelectedIssues = localStorage.getItem('selectedIssues');
    return savedSelectedIssues ? JSON.parse(savedSelectedIssues) : [];
  }
}