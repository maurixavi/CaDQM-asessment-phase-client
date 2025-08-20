import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DqModelService } from '../../services/dq-model.service';
import { ProjectService } from '../../services/project.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ProjectDataService } from '../../services/project-data.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {

  //PROJECT
  //project: any; //cargar current Project
  //projectId: number | null = null;
  noProjectMessage: string = "";  

 

  //NEW DQMODEL
  newDQModelVersionId: number | null = null;



  // Modal properties
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

  project: any = null;
  projectId: number | null = null;
  contextComponents: any = null;
  dqProblems: any[] = [];
  dqModelVersionId: number | null = null;
  dqModel: any = null;

  dataSchema: any = null;

  projects: any[] = []; // Todos los proyectos
  paginatedProjects: any[] = []; // Proyectos mostrados en la página actual
  selectedProject: any = null;
  currentPage: number = 1; // Página actual
  itemsPerPage: number = 8; // Número de elementos por página
  totalPages: number = 0; // Total de páginas


  ngOnInit() {
    //Setear y cargar Proyecto
    /*this.projectService.setProjectId(72);
    this.loadProjectData();*/

    this.getAllProjects();

    // Suscribirse a los observables del servicio ANTES de cargar los datos
    this.subscribeToData();
  }

  subscribeToData(): void {
    // Suscribirse al proyecto
    this.projectDataService.project$.subscribe((data) => {
      this.project = data;
      //console.log('Project Data:', data);
    });

    // Suscribirse a los componentes del contexto
    this.projectDataService.contextComponents$.subscribe((data) => {
      //this.contextComponents = data;
      //console.log('Context Components:', data);
    });

    // Suscribirse a los problemas de calidad de datos (DQ Problems)
    this.projectDataService.dqProblems$.subscribe((data) => {
      //this.dqProblems = data;
      //console.log('DQ Problems:', data);
    });

    // Suscribirse a la versión del modelo de calidad de datos (DQ Model Version)
    this.projectDataService.dqModelVersion$.subscribe((dqModelVersionId) => {
      this.dqModelVersionId = dqModelVersionId;

    });

    // Suscribirse al esquema de datos
    this.projectDataService.dataSchema$.subscribe((data) => {
      //this.dataSchema = data;
      //console.log('Data Schema:', data); // Ver el esquema de datos en la consola
    });
  
  
  }


  

  // Obtener todos los proyectos
  getAllProjects(): void {
    this.projectService.getAllProjects().subscribe({
      next: (data) => {
        this.projects = data;
        this.totalPages = Math.ceil(this.projects.length / this.itemsPerPage);
        this.updatePaginatedProjects();

        console.log("HERE")
        // Cargar información de contextos y modelos
        this.projects.forEach((project, index) => {
          if (project.context) {
            console.log("project.context", project.context)
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

  // Actualizar los proyectos mostrados en la página actual
  updatePaginatedProjects(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedProjects = this.projects.slice(startIndex, endIndex);
  }

  // Cambiar de página
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedProjects();
    }
  }

  // Obtener el rango de páginas para mostrar en la paginación
  getPages(): number[] {
    const pages = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }


  // Seleccionar un proyecto
  selectProject(project: any): void {
    this.selectedProject = project;
    this.projectId = project.id;
    this.projectDataService.setProjectId(project.id); // Establecer el ID del proyecto en el servicio
    this.router.navigate(['/phase2/dashboard']);

  }
 
  // Cargar Project con sus Ctx Components, DQ Problems y DQ Model si existe
  loadProjectData(): void {
    this.projectService.loadCurrentProject().subscribe({
      next: (project) => {
        this.project = project;
        this.projectId = project.id;

        if (this.projectId) {
          //Cargar Ctx Components
          const contextVersionId = this.project.context_version
          if (contextVersionId){
            this.getAllContextComponents(contextVersionId);
          } else {
            console.warn('El proyecto cargado no tiene contextVersionId');
          }

          //Cargar DQ Problems
          this.getAllDQProblems(this.projectId);

          //Cargar DQ Model si existe
          const dqModelVersionId = this.project.dqmodel_version
          if (dqModelVersionId) {
            this.getDQModel(dqModelVersionId);
          } else {
            console.warn('El proyecto cargado no tiene un dqModelId');
          }
        }
        
      },
      error: (err) => {
        console.error('Error al cargar el proyecto en el componente:', err);
      }
    });
  }

  contextInfo: { [key: number]: string } = {}; // Almacenará "Context name vX.X.X"
  dqModelInfo: { [key: number]: string } = {}; // Almacenará "DQ Model name vX.X.X"

  // Función para cargar información del contexto (nombre + versión)
  loadContextInfo(contextVersionId: number, projectIndex: number): void {
    if (!contextVersionId) return;

    this.projectDataService.getContextVersionById(contextVersionId).subscribe(
      (contextVersion) => {
        if (contextVersion) {
          const info = `${contextVersion.name} v${contextVersion.version}`;
          this.contextInfo[contextVersionId] = info;
          this.projects[projectIndex].contextInfo = info; // Opcional: asignar directamente al proyecto
          console.log("info", info);
        }
      },
      (error) => {
        console.error('Error al obtener Context Version:', error);
      }
    );
  }

  // Función para cargar información del DQ Model (nombre + versión)
  loadDQModelInfo(dqmodelId: number, projectIndex: number): void {
    if (!dqmodelId) return;

    this.modelService.getDQModel(dqmodelId).subscribe(
      (dqModel) => {
        if (dqModel) {
          const info = `${dqModel.name} v${dqModel.version}`;
          this.dqModelInfo[dqmodelId] = info;
          this.projects[projectIndex].dqModelInfo = info; // Opcional: asignar directamente al proyecto
        }
      },
      (error) => {
        console.error('Error al obtener DQ Model:', error);
      }
    );
  }



  dqModelNames: { [key: number]: string } = {}; // Diccionario para almacenar nombres de modelos por ID

  // cargar los detalles del modelo
  loadDQModelDetails(dqmodelId: number, projectIndex: number): void {
    if (!dqmodelId) {
      return; // No hacer nada si no hay ID
    }

    this.modelService.getDQModel(dqmodelId).subscribe(
      (dqModel) => {
        if (dqModel) {
          // Almacena el nombre en el diccionario usando el ID como clave
          this.dqModelNames[dqmodelId] = dqModel.name;
          
          // También puedes actualizar directamente el proyecto si lo prefieres
          this.projects[projectIndex].dqModelName = dqModel.name;
        }
      },
      (error) => {
        console.error('Error al obtener DQ Model:', error);
      }
    );
  }

  contextNames: { [key: number]: string } = {}; // Diccionario para almacenar nombres de contextos por ID

  // cargar los detalles del contexto
  loadContextDetails(contextVersionId: number, projectIndex: number): void {
    if (!contextVersionId) {
      return; // No hacer nada si no hay ID
    }

    this.projectDataService.getContextVersionById(contextVersionId).subscribe(
      (contextVersion) => {
        if (contextVersion) {
          // Almacena el nombre en el diccionario usando el ID como clave
          this.contextNames[contextVersionId] = contextVersion.name;
          
          // También puedes actualizar directamente el proyecto si lo prefieres
          this.projects[projectIndex].contextName = contextVersion.name;
        }
      },
      (error) => {
        console.error('Error al obtener Context Version:', error);
      }
    );
  }

  allContextComponents: any = null;
  allDQProblems: any[] = [];

  getAllContextComponents(contextVersionId: number): void {
    this.projectService.getContextComponents(contextVersionId).subscribe({
      next: (data) => {
        console.log('ALL CTX. COMPONENTS:', data);
        this.allContextComponents = data;
      },
      error: (err) => console.error('Error fetching context components:', err)
    });
  }

  getAllDQProblems(projectId: number): void {
    this.projectService.getDQProblemsByProjectId(projectId).subscribe({
      next: (data) => {
        this.allDQProblems = data;
      },
      error: (err) => {
        console.error('Error al obtener los problemas de calidad:', err);
      },
    });
  }

  // Cargar el DQ Model por su ID
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



  // NAVIGATION METHODS
  navigateCreateDQModelNext() {
    this.router.navigate(['/st4/a09-1']);
  }

  navigateToResumeDQModel() { 
    this.router.navigate(['/st4/a09-1']);
  }

  navigateToViewDQModel() {
    this.router.navigate(['/st4/confirmation-stage-4']);
  }




  showNewProjectButtons = false;





}