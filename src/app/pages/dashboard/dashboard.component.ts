import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DqModelService } from '../../services/dq-model.service';
import { ProjectService } from '../../services/project.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ProjectDataService } from '../../services/project-data.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {


  // Datos iniciales para crear un DQ Model
  newDQModel = {
    version: 'DQ Model Nuevo Creado desde Dashboard',
    status: "draft",
    model_dimensions: [],
    model_factors: [],
    model_metrics: [],
    model_methods: [],
    measurement_methods: [],
    aggregation_methods: [],
    previous_version: null
  };

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


  ngOnInit() {
    // Obtener el Project ID actual
    this.projectId = this.projectDataService.getProjectId();
    console.log("projectIdGet: ", this.projectId);

    // Suscribirse a los observables del servicio ANTES de cargar los datos
    this.subscribeToData();
  }

  subscribeToData(): void {
    // Suscribirse al proyecto
    this.projectDataService.project$.subscribe((data) => {
      this.project = data;
      console.log('Project Data:', data);
    });

    // Suscribirse a los componentes del contexto
    this.projectDataService.contextComponents$.subscribe((data) => {
      this.contextComponents = data;
      console.log('Context Components:', data);
    });

    // Suscribirse a los problemas de calidad de datos (DQ Problems)
    this.projectDataService.dqProblems$.subscribe((data) => {
      this.dqProblems = data;
      console.log('DQ Problems:', data);
    });

    // Suscribirse a la versión del modelo de calidad de datos (DQ Model Version)
    this.projectDataService.dqModelVersion$.subscribe((dqModelVersionId) => {
      this.dqModelVersionId = dqModelVersionId;
      console.log('DQ Model Version ID:', this.dqModelVersionId);
    });
  
  
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


  createDQModel() {
    this.modelService.createDQModel(this.newDQModel).subscribe({
      next: response => {
        console.log('DQ Model creado exitosamente:', response);
        alert('Modelo DQ creado con éxito.');

        const newDQModelId = response.id;
        console.log('Id nuevo DQ Model creado:', newDQModelId);
        console.log('Proyecto antes de actualizar:', this.project);


        if (this.projectId !== null) {
          this.assignDQModelToProject(this.projectId, newDQModelId);
          console.log('Proyecto despues de actualizar:', this.project);
        } else {
          console.error("No se ha establecido un ID de proyecto válido.");
        }
        
        
        this.navigateCreateDQModelNext();

        //this.loadCurrentProject();
      },
      error: err => {
        console.error('Error al crear el modelo DQ:', err);
        alert('Ocurrió un error al crear el modelo DQ.');
      }
    });
  }

  assignDQModelToProject(projectId: number | null, dqmodelId: number) {
    if (projectId === null) {
      console.error("No se ha proporcionado un ID de proyecto válido.");
      return;
    }

    if (this.project) {
      const updatedProject = {
        ...this.project,
        dqmodel_version: dqmodelId
      };

      console.log('Proyecto antes de actualizar:', this.project);

      
      this.projectService.updateProject(projectId, updatedProject).subscribe({
        next: updatedProject => {
          console.log('Project actualizado:', updatedProject);
          alert('DQModel asignado al Project con éxito.');
        },
        error: err => {
          console.error('Error al actualizar el Project:', err);
          alert('Ocurrió un error al asignar el DQModel al Project.');
        }
      });
    }
  }

  createNewVersionDQModel(dqmodelId: number): void {
    const updatedAttributes = { version: "New version" }; 
  
    this.modelService.updateDQModel(dqmodelId, updatedAttributes).subscribe({
      next: (newDQModel) => {
        console.log('DQ Model actualizado o nueva versión creada:', newDQModel);
        this.newDQModelVersionId = newDQModel.id;
        console.log("this.newDQModelId", this.newDQModelVersionId);
        this.createNewProject();
        alert('Operación exitosa en el DQ Model.');
      },
      error: (err) => {
        console.error('Error al actualizar o crear nueva versión del DQ Model:', err);
        alert('Ocurrió un error al intentar actualizar el DQ Model.');
      }
    });
  }

  createNewProject(): void {
    const name = 'Nuevo Proyecto al crear nueva version DQ Model';
    const description = 'Descripción del nuevo proyecto';
    const dqmodel_version = this.newDQModelVersionId; 
    const context_version = this.project?.context_version;

    this.projectService.createProject(name, description, dqmodel_version, context_version).subscribe({
      next: (project) => {
        console.log('Proyecto creado:', project);
        this.projectService.setProjectId(project.id);
        console.log('ID del proyecto actual establecido:', project.id);
        //this.loadCurrentProject();
      
        this.loadProjectData();

        alert('Proyecto creado correctamente.');
      },
      error: (err) => {
        console.error('Error al crear el proyecto:', err);
      }
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

  openConfirmationModal(action: string): void {
    this.selectedAction = action;

    if (action === 'newProject') {
      this.modalTitle = 'New Project';
      this.modalMessage = `Define a new DQ Model from the current Context version.`;

      this.showNewProjectButtons = true;
    }
    else if (action === 'create') {
      this.modalTitle = 'Create New DQ Model';
      this.modalMessage = `Here you are about to <strong>define a new DQ Model from scratch</strong>. 
                         This action will start a fresh model that will be associated with this context version.`;

      this.showNewProjectButtons = false;
    } 
    else if (action === 'edit') {
      this.modalTitle = 'Update and Create New DQ Model Version';
      this.modalMessage = `Here you are about to <strong>edit the existing DQ Model</strong> and <strong>define a new version</strong> 
                         based on current settings. This new version will be associated with this context version.`;

      this.showNewProjectButtons = false;
    } 
    (document.getElementById('confirmationModal') as HTMLElement).style.display = 'block';
  }

  closeConfirmationModal(): void {
    (document.getElementById('confirmationModal') as HTMLElement).style.display = 'none';
  }

  confirmAction(): void {
    if (this.selectedAction === 'create') {
      //createNewProject()
      this.router.navigate(['/step1']); 
    } 
    else if (this.selectedAction === 'edit') {
      if (this.project.dqmodel_version !== null) {
        this.createNewVersionDQModel(this.project.dqmodel_version);
      }
      //this.router.navigate(['/step3']);
    }
    this.closeConfirmationModal();
  }

  closeProject(): void {
    this.router.navigate(['/']); 
  }



}