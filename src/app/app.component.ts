import { Component, OnInit } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import dataQualityIssuesJson from '../assets/data-quality-problems.json';
import contextComponentsJson from '../assets/context-components.json';

import { ProjectService } from '../app/services/project.service';
import { DqModelService } from '../app/services/dq-model.service';


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
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  constructor(
    private projectService: ProjectService,
    public modelService: DqModelService
  ) { }

  //ID PROJECT inicial
  //projectId: number | null | undefined = 1; //deberia venir desde aplicacion Phase 1
  projectId: number = 1;  //DQ Model (draft)
  //projectId: number = 13; Sin DQModel ni Ctx
  //projectId: number = 44;
  //projectId: number = 21; DQ Model finished

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
    //console.log(this.contextComponents);  // Verificar los datos cargados


    //Pruebas Endpoints API
    //this.getAllProjects();
    this.getProjectById(null);
  }


  // METODOS PRUEBAS SERVICE ENDPOINTS
  
  //--- PROJECTS ------------------------------------
  projects: any[] = []; 

   // Suscripcion al observable del servicio
  getAllProjects() {
    this.projectService.getAllProjects().subscribe({
      next: (data) => {
        this.projects = data; 
        console.log('*All Projects loaded:', data);
      },
      error: (err) => {
        console.error('Error al obtener proyectos:', err);
      }
    });
  }

  selectedProject: any; // proyecto seleccionado por ID

  // Método para obtener un proyecto por ID
  getProjectById(id: number | null | undefined) {
    this.projectService.getProjectById(id).subscribe({
      next: (data) => {
        this.selectedProject = data;
        console.log(`*Project with ID=${id} loaded:`, data);
      },
      error: (err) => {
        console.error(`Error al obtener proyecto con ID=${id}:`, err);
      }
    });
  }

  //------------------------------------------------


  loadCurrentProject(): void {
    this.projectService.loadCurrentProject().subscribe({
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


  
}


