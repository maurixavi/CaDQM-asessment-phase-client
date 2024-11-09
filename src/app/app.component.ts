import { Component, OnInit } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import dataQualityIssuesJson from '../assets/data-quality-problems.json';
import contextComponentsJson from '../assets/context-components.json';
import { ProjectService } from '../app/services/project.service';
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
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  constructor(
    private projectService: ProjectService
  ) { }

  //ID PROJECT inicial
  projectId: number = 1; //deberia venir desde aplicacion Phase 1
  project: any; //cargar current Project

  title = 'CaDQM-client-app';
  issues: DataQualityIssue[] = [];
  contextComponents: ContextComponent[] = [];
  selectedIssue: DataQualityIssue | null = null;
  detailsVisible: boolean = false;
  prioritizedIssues: DataQualityIssue[] = [];
  isOrderConfirmed: boolean = false;
  selectedIssues: DataQualityIssue[] = [];
  confirmedSelectedIssues: DataQualityIssue[] = [];
  isSelectionConfirmed: boolean = false;

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
    //Cargar Proyecto actual
    this.projectService.setProjectId(this.projectId);
    const projectIdSetted = this.projectService.getProjectId();
    console.log("projectIdSetted: ", projectIdSetted);

    //this.loadCurrentProject();
    //

    this.issues = dataQualityIssuesJson as DataQualityIssue[];
    this.issues.forEach(issue => {
      issue.priorityType = 'Media';
    });

    console.log(this.issues);  // Verificar los datos cargados
    this.contextComponents = contextComponentsJson as ContextComponent[];
    console.log(this.contextComponents);  // Verificar los datos cargados
  }

  loadCurrentProject(): void {
    this.projectService.getCurrentProject().subscribe({
      next: (project) => {
        this.project = project;
        console.log('Proyecto cargado en el componente:', this.project);
      },
      error: (err) => {
        console.error('Error al cargar el proyecto en el componente:', err);
      }
    });
  }



  // PRIORIZACION PROBLEMAS
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

  // MOSTRAR y SELECCIONAR PROBLEMAS PRIORIZADOS
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

  // DIMENSIONES y FACTORES

  // Método para seleccionar/deseleccionar un factor para un problema específico
  toggleFactorSelection(issue: DataQualityIssue, factorId: number) {
    if (!issue.selectedFactors) {
      issue.selectedFactors = [];
    }
    // Cambiar el estado de selección del factor
    if (issue.selectedFactors.includes(factorId)) {
      issue.selectedFactors = issue.selectedFactors.filter(f => f !== factorId);
    } else {
      issue.selectedFactors.push(factorId);
    }
  }

  // Método para confirmar la selección de factores para un problema específico
  confirmFactorsSelection(issue: DataQualityIssue) {
    console.log('Factores seleccionados confirmados para el problema:', issue);
  }

  // Método para verificar si un factor está seleccionado para un problema específico
  isFactorSelected(issue: DataQualityIssue, factorId: number): boolean {
    return issue.selectedFactors !== undefined && issue.selectedFactors.includes(factorId);
  }

  // Método para obtener los factores relacionados con una dimensión específica
  getFactorsByDimension(dimensionId: number): QualityFactor[] {
    return this.qualityFactors.filter(factor => factor.dimensionId === dimensionId);
  }

  // Método para obtener el nombre de una dimensión dado el ID de un factor
  getDimensionName(factorId: number): string {
    const factor = this.qualityFactors.find(f => f.id === factorId);
    const dimension = factor ? this.qualityDimensions.find(d => d.id === factor.dimensionId) : null;
    return dimension ? dimension.name : '';
  }

  // Método para obtener el nombre de un factor dado el ID
  getFactorName(factorId: number): string {
    const factor = this.qualityFactors.find(f => f.id === factorId);
    return factor ? factor.name : '';
  }

  
}


