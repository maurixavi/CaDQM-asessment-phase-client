import { Component, OnInit } from '@angular/core';

import { Router } from '@angular/router';

import { DqModelService } from '../../services/dq-model.service';


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {

  constructor(
    private router: Router, 
    public modelService: DqModelService
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
  project: any; 
  projectId: number = 4; //deberia venir desde aplicacion Phase 1
  noProjectMessage: string = "";  

  ngOnInit() {
    this.getProjectById(this.projectId);

    //this.createDQModel();
  }

  // PROJECT
  getProjectById(projectId: number): void {
    this.modelService.getProject(projectId).subscribe({
      next: (data) => {
        this.project = data; 
        this.noProjectMessage = ""; 
        console.log("Project obtenido:", data); 
      },
      error: (err) => {
        if (err.status === 404) {
          this.project = null; 
          this.noProjectMessage = "No Project found with this ID. Please check and try again.";  
        } else {
          console.error("Error loading Project:", err);
          this.project = null;
          this.project = "An error occurred while loading the Project. Please try again later.";  
        }
      }
    });
  }

  //Update Project
  updateProjectAttributes(projectId: number, updatedAttributes: any) {
    this.modelService.updateProject(projectId, updatedAttributes).subscribe({
      next: updatedProject => {
        console.log('Project actualizado:', updatedProject);
      },
      error: err => {
        console.error('Error al actualizar el Project:', err);
      }
    });
  }

  assignDQModelToProject(projectId: number, dqmodelId: number) {
    if (this.project) {
      const updatedProject = {
        ...this.project, // Copia todos los datos actuales del proyecto
        dqmodel_version: dqmodelId // Actualiza solo el dqmodel_version
      };
      console.log(updatedProject);
      this.modelService.updateProject(projectId, updatedProject).subscribe({
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

  assignDqModelToProjectPATCH(projectId: number, dqmodelId: number) {
    if (this.project) {
      const updatedField = { dqmodel_version: dqmodelId }; //solo incluye dqmodel_version en el payload
      console.log("Actualizando solo dqmodel_version:", updatedField);
      
      this.modelService.patchProject(projectId, updatedField).subscribe({
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

  //DQ MODEL
  // Función para crear el DQModel
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
        this.assignDQModelToProject(projectId, newDQModelId);
        this.navigateToCreateDQModel();
      },
      error: err => {
        console.error('Error al crear el modelo DQ:', err);
        alert('Ocurrió un error al crear el modelo DQ.');
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
  navigateToCreateDQModel() {
    this.router.navigate(['/step1']);
  }

  //in progress
  navigateToResumeDQModel() { 
    this.router.navigate(['/step3']);
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
    if (this.selectedAction === 'create') {
      this.router.navigate(['/step1']);
    } else if (this.selectedAction === 'edit') {
      this.router.navigate(['/step3']);
    }
    this.closeConfirmationModal();
  }

}
