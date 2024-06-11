import { Component, OnInit } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import dataQualityIssuesJson from '../assets/data-quality-problems2.json';
import contextComponentsJson from '../assets/context-components.json';

interface DataQualityIssue {
  id: number;
  name: string;
  description: string;
  contextcomp_related_to: string[];
  priority: number;
  priorityType: string;
}

interface ContextComponent {
  id: string;
  type: string;
  description: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'kanban-angular-app';
  issues: DataQualityIssue[] = [];
  contextComponents: ContextComponent[] = [];
  

  ngOnInit() {
    this.issues = dataQualityIssuesJson as DataQualityIssue[];
    this.issues.forEach(issue => {
      issue.priorityType = 'Media'; // Inicializar el tipo de prioridad como "Media"
    });

    console.log(this.issues);  // Verificar los datos cargados
    this.contextComponents = contextComponentsJson as ContextComponent[];
    console.log(this.contextComponents);  // Verificar los datos cargados
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

  saveOrder() {
    this.downloadJSON(this.issues, 'updated-data-quality-issues.json');
  }

  downloadJSON(data: any, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  getContextDescription(contextId: string): string {
    const context = this.contextComponents.find(c => c.id === contextId);
    return context ? context.description : 'No description';
  }

  addContextComponent(issue: DataQualityIssue, event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const contextId = selectElement.value;
    if (!issue.contextcomp_related_to.includes(contextId)) {
      issue.contextcomp_related_to.push(contextId);
    }
  }

  removeContextComponent(issue: DataQualityIssue, contextId: string) {
    const index = issue.contextcomp_related_to.indexOf(contextId);
    if (index !== -1) {
      issue.contextcomp_related_to.splice(index, 1);
    }
  }
  
}


