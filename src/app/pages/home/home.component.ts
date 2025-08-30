import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DqModelService } from '../../services/dq-model.service';
import { ProjectService } from '../../services/project.service';
import { ProjectDataService } from '../../services/project-data.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {

  project: any = null;
  projectId: number | null = null;
  noProjectMessage: string = ""; 
  showNewProjectButtons = false;

  contextComponents: any = null;
  dqProblems: any[] = [];

  dqModelVersionId: number | null = null;
  dqModel: any = null;
  newDQModelVersionId: number | null = null;

  dataSchema: any = null;

  // Diccionarios
  contextInfo: { [key: number]: string } = {}; // "Context name vX.X.X"
  dqModelInfo: { [key: number]: string } = {}; // "DQ Model name vX.X.X"
  dqModelNames: { [key: number]: string } = {}; 
  contextNames: { [key: number]: string } = {};

  // Pginación de proyectos
  projects: any[] = []; 
  paginatedProjects: any[] = [];
  selectedProject: any = null;
  currentPage: number = 1; 
  itemsPerPage: number = 8; 
  totalPages: number = 0; 

  // Propiedades para el modal
  isModalOpen = false;
  selectedAction: string = '';
  modalTitle: string = '';
  modalMessage: string = '';
  error: string = '';

  constructor(
    private router: Router,
    private modelService: DqModelService,
    private projectService: ProjectService,
    private projectDataService: ProjectDataService,
  ) { }

  ngOnInit() {
    this.getAllProjects();
    this.subscribeToData();
  }

  /**
   * Suscribe el componente a los observables del servicio ProjectDataService para recibir actualizaciones automáticas de los datos
   */
  subscribeToData(): void {
    this.projectDataService.project$.subscribe((data) => {
      this.project = data;
    });

    this.projectDataService.contextComponents$.subscribe((data) => {
      this.contextComponents = data;
    });

    this.projectDataService.dqProblems$.subscribe((data) => {
      this.dqProblems = data;
    });

    this.projectDataService.dqModelVersion$.subscribe((dqModelVersionId) => {
      this.dqModelVersionId = dqModelVersionId;
    });

    this.projectDataService.dataSchema$.subscribe((data) => {
      this.dataSchema = data;
    });
  
  }


  // ========== GESTIÓN DE PROYECTOS ==========

  getAllProjects(): void {
    this.projectService.getAllProjects().subscribe({
      next: (data) => {
        this.projects = data;
        this.totalPages = Math.ceil(this.projects.length / this.itemsPerPage);
        this.updatePaginatedProjects();

        // información de contextos y modelos
        this.projects.forEach((project, index) => {
          if (project.context) {
            this.loadContextInfo(project.context, index);
          }
          if (project.dqmodel_version) {
            this.loadDQModelInfo(project.dqmodel_version, index);
          }
        });

      },
      error: (err) => {
        console.error('Error al obtener proyectos:', err);
      }
    });
  }

  selectProject(project: any): void {
    this.selectedProject = project;
    this.projectId = project.id;
    this.projectDataService.setProjectId(project.id);
    this.router.navigate(['/phase2/dashboard']);
  }

  // ========== MÉTODOS DE PAGINACIÓN ==========
  
  // Actualiza la lista de proyectos mostrados en la página actual
  updatePaginatedProjects(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedProjects = this.projects.slice(startIndex, endIndex);
  }

  // Cambia a una página específica
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedProjects();
    }
  }

  // Genera un array con los números de página para la paginación
  getPages(): number[] {
    const pages = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }


  // ========== MÉTODOS DE CARGA DE DATOS ==========
 
  loadContextInfo(contextVersionId: number, projectIndex: number): void {
    if (!contextVersionId) return;

    this.projectDataService.getContextVersionById(contextVersionId).subscribe(
      (contextVersion) => {
        if (contextVersion) {
          const info = `${contextVersion.name} v${contextVersion.version}`;
          this.contextInfo[contextVersionId] = info;
          this.projects[projectIndex].contextInfo = info; 
          //console.log("info", info);
        }
      },
      (error) => {
        console.error('Error al obtener Context Version:', error);
      }
    );
  }

  loadDQModelInfo(dqmodelId: number, projectIndex: number): void {
    if (!dqmodelId) return;

    this.modelService.getDQModel(dqmodelId).subscribe(
      (dqModel) => {
        if (dqModel) {
          const info = `${dqModel.name} v${dqModel.version}`;
          this.dqModelInfo[dqmodelId] = info;
          this.projects[projectIndex].dqModelInfo = info; 
        }
      },
      (error) => {
        console.error('Error al obtener DQ Model:', error);
      }
    );
  }

  getDQModel(dqModelId: number): void {
    this.modelService.getCurrentDQModel(dqModelId).subscribe({
      next: (dqModel) => {
        this.dqModel = dqModel;
      },
      error: (err) => {
        console.error('Error al cargar el DQ Model en el componente:', err);
      },
    });
  }


  // ========== NAVIGATION METHODS ==========
  navigateCreateDQModelNext() {
    this.router.navigate(['/st4/a09-1']);
  }

  navigateToResumeDQModel() { 
    this.router.navigate(['/st4/a09-1']);
  }

  navigateToViewDQModel() {
    this.router.navigate(['/st4/confirmation-stage-4']);
  }

}