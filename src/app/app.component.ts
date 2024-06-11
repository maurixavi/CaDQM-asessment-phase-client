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
  selectedFactors?: { [key: string]: string[] };
}

interface ContextComponent {
  id: string;
  type: string;
  description: string;
}

interface QualityDimension {
  name: string;
  factors: string[];
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

  selectedIssue: DataQualityIssue | null = null; // Declarar la propiedad selectedIssue
  detailsVisible: boolean = false; // Nueva propiedad

  prioritizedIssues: DataQualityIssue[] = []; // Nueva propiedad para problemas priorizados

  isOrderConfirmed: boolean = false; // Nueva propiedad

  selectedIssues: DataQualityIssue[] = []; // Nueva propiedad
  
  confirmedSelectedIssues: DataQualityIssue[] = [];
  isSelectionConfirmed: boolean = false;

  qualityDimensions: QualityDimension[] = [
    {
      name: 'Exactitud (accuracy)',
      factors: ['Exactitud semántica', 'Precisión']
    },
    {
      name: 'Completitud (completeness)',
      factors: ['Coverage', 'Density']
    },
    {
      name: 'Frescura (freshness)',
      factors: ['Actualidad (currency)', 'Oportunidad (timeliness)', 'Volatilidad (volatility)']
    },
    {
      name: 'Consistencia (consistency)',
      factors: ['Integridad de dominio', 'Integridad intra-relación', 'Integridad inter-relación']
    },
    {
      name: 'Unicidad (uniqueness)',
      factors: ['No-duplicación (duplication-free)', 'No-contradicción (contradiction-free)']
    }
  ];

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
    this.prioritizeIssues(); // Llamar a prioritizeIssues después de guardar el JSON
    this.isOrderConfirmed = true; // Establecer isOrderConfirmed a true
  }

  downloadJSON(data: any, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    /*a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);*/
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
  
  prioritizeIssues() {
    this.prioritizedIssues = this.issues.slice().sort((a, b) => {
      if (a.priorityType < b.priorityType) return -1;
      if (a.priorityType > b.priorityType) return 1;
      return 0;
    });
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
    this.confirmedSelectedIssues = [...this.selectedIssues];
    this.isSelectionConfirmed = true;
  }

   // Método para seleccionar/deseleccionar un factor para un problema específico
   // Método para seleccionar/deseleccionar un factor para un problema específico
   toggleFactorSelection(issue: DataQualityIssue, dimension: string, factor: string) {
    if (!issue.selectedFactors) {
      issue.selectedFactors = {};
    }
    // Cambiar el estado de selección del factor
    const selectedFactorsForDimension = issue.selectedFactors[dimension] || [];
    if (selectedFactorsForDimension.includes(factor)) {
      issue.selectedFactors[dimension] = selectedFactorsForDimension.filter(f => f !== factor);
    } else {
      selectedFactorsForDimension.push(factor);
      issue.selectedFactors[dimension] = selectedFactorsForDimension;
    }
  }

  // Método para confirmar la selección de factores para un problema específico
  confirmFactorsSelection(issue: DataQualityIssue) {
    // Aquí podrías agregar lógica adicional, como guardar en la base de datos o realizar otras acciones
    console.log('Factores seleccionados confirmados para el problema:', issue);
  }

  // Método para verificar si un factor está seleccionado para un problema específico
  isFactorSelected(issue: DataQualityIssue, dimension: string, factor: string): boolean {
    return (
      issue.selectedFactors !== undefined &&
      issue.selectedFactors[dimension] !== undefined &&
      issue.selectedFactors[dimension].includes(factor)
    );
  }

  
}


