import { Component, OnInit } from '@angular/core';

import { Router } from '@angular/router';

import { DqModelService } from '../../services/dq-model.service';
import { ProjectService } from '../../services/project.service';


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {

  constructor(
    private router: Router, 
    private modelService: DqModelService,
    private projectService: ProjectService
  ) { }


  // Datos iniciales para crear un DQ Model
  newDQModel = {
    version: 'DQModel APP v1.00',
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
  project: any; //cargar current Project
  projectId: number | null = null;

  noProjectMessage: string = "";  


  //DQ MODEL 
  currentDQModel: any; // almacenar Current DQModel

  //NEW DQMODEL
  newDQModelVersionId: number | null = null;

  
  //CONTEXT
  currentCtxVersion: number | null = null; // almacenar Current Context Version id
  //previousContextVersion: number | null = null;

  ngOnInit() {
    /* this.projectId = this.projectService.getProjectId();
    console.log("projectIdGet: ", this.projectId);*/
    this.loadCurrentProject();
  }

  //Carga CURRENT PROJECT, obtiene Context version y llama a Get Current DQ Model si existe
  loadCurrentProject(): void {
    this.projectService.loadCurrentProject().subscribe({
      next: (project) => {
        this.project = project;
        console.log('Proyecto cargado en el componente:', this.project);
 
        // Obtener current DQModel
        if (this.project && this.project.dqmodel_version) {
          this.loadCurrentDQModel(this.project.dqmodel_version);
        } else {
          console.warn('El proyecto cargado no tiene un dqModelId');
        }

        // Obtener version actual del Contexto
        if (this.project && this.project.context_version) {
          this.currentCtxVersion = this.project.context_version;
          console.log("Version contexto actual :", this.currentCtxVersion);
        } else {
          console.warn('El proyecto cargado no tiene un contextId');
        }

      },
      error: (err) => {
        console.error('Error al cargar el proyecto en el componente:', err);
      }
    });
  }

  loadCurrentDQModel(dqModelId: number): void {
    this.modelService.getCurrentDQModel(dqModelId).subscribe({
      next: (dqModel) => {
        this.currentDQModel = dqModel;
        console.log('DQ Model cargado en el componente:', this.currentDQModel);
      },
      error: (err) => {
        console.error('Error al cargar el DQ Model en el componente:', err);
      }
    });
  }


  /* PROYECTO SIN DQ MODEL */
  //1. Crear el DQModel desde cero y asignarlo al current Project
  createDQModel() {
    this.modelService.createDQModel(this.newDQModel).subscribe({
      next: response => {
        console.log('DQ Model creado exitosamente:', response);
        alert('Modelo DQ creado con éxito.');

        // Obtener el id del nuevo DQModel desde la respuesta
        const newDQModelId = response.id;

        // Asignar el nuevo DQModel al Project
        const projectId = this.projectId;
        console.log(projectId, newDQModelId);
        if (this.projectId !== null) {
          this.assignDQModelToProject(this.projectId, newDQModelId);
        } else {
          console.error("No se ha establecido un ID de proyecto válido.");
        }
        //this.assignDQModelToProject(projectId, newDQModelId);
        this.loadCurrentProject();
        this.navigateCreateDQModelNext();
      },
      error: err => {
        console.error('Error al crear el modelo DQ:', err);
        alert('Ocurrió un error al crear el modelo DQ.');
      }
    });
  }
  
  //2. Asignar nuevo DQ Model al Current Project (NOTA: podria usar PATCH en lugar de PUT)
  assignDQModelToProject(projectId: number | null, dqmodelId: number) {
    if (projectId === null) {
      console.error("No se ha proporcionado un ID de proyecto válido.");
      return;
    }

    if (this.project) {
      const updatedProject = {
        ...this.project, // Copia todos los datos actuales del proyecto
        dqmodel_version: dqmodelId // Actualiza solo el dqmodel_version
      };
      console.log(updatedProject);
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


  /* EDITAR DQ MODEL */
  /* SI STATUS=FINALIZADO -> New version DQModel -> NEW PROJECT */
  //1. Crear nueva version DQ Model (copia Dimensiones, Factores, etc) y llama a crear nuevo Proyecto
  createNewVersionDQModel(dqmodelId: number): void {
    //Pasarle cualquier atributo, version se genera automaticamente mediante API
    const updatedAttributes = { version: "New version" }; 
  
    this.modelService.updateDQModel(dqmodelId, updatedAttributes).subscribe({
      next: (newDQModel) => {
        console.log('DQ Model actualizado o nueva versión creada:', newDQModel);

        // Setear nuevo DQModel id para crear Proyecto nuevo
        this.newDQModelVersionId = newDQModel.id;
        console.log("this.newDQModelId", this.newDQModelVersionId);

        // Llamar a createNewProject después de que se haya obtenido el newDQModelId
        // Crea nuevo Proyecto con el nuevo DQModel y mismo context_version
        this.createNewProject();

        alert('Operación exitosa en el DQ Model.');
      },
      error: (err) => {
        console.error('Error al actualizar o crear nueva versión del DQ Model:', err);
        alert('Ocurrió un error al intentar actualizar el DQ Model.');
      }
    });
  }

  //2. Crear nuevo Proyecto para Nueva Version de DQ Model y actual Context
  createNewProject(): void {
    // Guardar el context_version del proyecto actual antes de crear el nuevo proyecto
    //this.previousContextVersion = this.project?.context_version || null;

    const name = 'Nuevo Proyecto';
    const description = 'Descripción del nuevo proyecto';
    const dqmodel_version = this.newDQModelVersionId; 
    const context_version = this.project?.context_version; //context_version del proyecto actual

    this.projectService.createProject(name, description, dqmodel_version, context_version).subscribe({
      next: (project) => {
        console.log('Proyecto creado:', project);

        //Setear New Project como Current
        this.projectService.setProjectId(project.id);
        console.log('ID del proyecto actual establecido:', project.id);
        this.loadCurrentProject();

        alert('Proyecto creado correctamente.');
      },
      error: (err) => {
        console.error('Error al crear el proyecto:', err);
      }
    });
  }


  // LOGICA INTERFAZ
  isModalOpen = false;

  openModal() {
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  // navegacion según el estado del proyecto
  //to do
  navigateCreateDQModelNext() {
    this.router.navigate(['/step1']); //Actividad 1: Priorizar Problemas de Calidad
  }

  //in progress
  navigateToResumeDQModel() { 
    this.router.navigate(['/step1']);
  }

  //stage: 4, status: done
  navigateToViewDQModel() {
    this.router.navigate(['/step7']);
  }

  /*openConfirmationModal(action: string): void {
    this.selectedAction = action;
    (document.getElementById('confirmationModal') as HTMLElement).style.display = 'block';
  }*/

  selectedAction: string = '';
  modalTitle: string = '';
  modalMessage: string = '';

  openConfirmationModal(action: string): void {
    this.selectedAction = action;
    if (action === 'create') {
      this.modalTitle = 'Create New DQ Model';
      //this.modalMessage = `Here you are about to define a new DQ Model from scratch. This action will start a fresh model.`;
      this.modalMessage = `Here you are about to <strong>define a new DQ Model from scratch</strong>. 
                         This action will start a fresh model that will be associated with this context version.`;
    } else if (action === 'edit') {
      this.modalTitle = 'Update and Create New DQ Model Version';
      //this.modalMessage = `Here you are about to edit the existing DQ Model and define a new version based on current settings.`;
      this.modalMessage = `Here you are about to <strong>edit the existing DQ Model</strong> and <strong>define a new version</strong> 
                         based on current settings. This new version will be associated with this context version.`;
    }
    (document.getElementById('confirmationModal') as HTMLElement).style.display = 'block';
  }

  closeConfirmationModal(): void {
    (document.getElementById('confirmationModal') as HTMLElement).style.display = 'none';
  }

  confirmAction(): void {
    //Create new DQModel version and assign to Curren Project
    if (this.selectedAction === 'create') {
      this.router.navigate(['/step1']); 
    } 
    else if (this.selectedAction === 'edit') {
      //Create new version
      if (this.project.dqmodel_version !== null) {
        this.createNewVersionDQModel(this.project.dqmodel_version);
      }
      
      this.router.navigate(['/step3']);
    }
    this.closeConfirmationModal();
  }
  

}
