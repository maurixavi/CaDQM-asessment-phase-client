import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

interface DataQualityProblem {
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
  private problemsSource = new BehaviorSubject<DataQualityProblem[]>([]);
  currentProblems = this.problemsSource.asObservable();

  private selectedProblemsSource = new BehaviorSubject<DataQualityProblem[]>([]);
  currentSelectedProblems = this.selectedProblemsSource.asObservable();

  private confirmedFactorsSource = new BehaviorSubject<{ [key: number]: number[] }>({});
  currentConfirmedFactors = this.confirmedFactorsSource.asObservable();

  // constructor() { }
  constructor() {
    const problems = localStorage.getItem('problems');
    if (problems) {
      this.problemsSource.next(JSON.parse(problems));
    }

    const selectedProblems = localStorage.getItem('selectedProblems');
    if (selectedProblems) {
      this.selectedProblemsSource.next(JSON.parse(selectedProblems));
    }
  }

  updateProblems(problems: DataQualityProblem[]) {
    this.problemsSource.next(problems);
    localStorage.setItem('problems', JSON.stringify(problems));
  }

  getProblems(): DataQualityProblem[] {
    return this.problemsSource.getValue();
  }

  updateSelectedProblems(problems: DataQualityProblem[]) {
    this.selectedProblemsSource.next(problems);
    localStorage.setItem('selectedProblems', JSON.stringify(problems));
  }

  getSelectedProblems(): DataQualityProblem[] {
    return this.selectedProblemsSource.getValue();
  }

  private saveSelectedProblems(selectedProblems: DataQualityProblem[]) {
    localStorage.setItem('selectedProblems', JSON.stringify(selectedProblems));
  }

  private loadSelectedProblems(): DataQualityProblem[] {
    const savedSelectedProblems = localStorage.getItem('selectedProblems');
    return savedSelectedProblems ? JSON.parse(savedSelectedProblems) : [];
  }

  confirmFactorsSelection(problemId: number, factors: number[]) {
    const currentConfirmedFactors = this.confirmedFactorsSource.value;
    currentConfirmedFactors[problemId] = factors;
    this.confirmedFactorsSource.next(currentConfirmedFactors);
  }
}