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
  //selectedAction: string = '';
  /*isModalOpen = false;
  
  modalTitle: string = '';
  modalMessage: string = '';*/

 

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
      //console.log('Context Components:', data);
    });

    // Suscribirse a los problemas de calidad de datos (DQ Problems)
    this.projectDataService.dqProblems$.subscribe((data) => {
      this.dqProblems = data;
      //console.log('DQ Problems:', data);
    });

    // Suscribirse a la versión del modelo de calidad de datos (DQ Model Version)
    this.projectDataService.dqModelVersion$.subscribe((dqModelVersionId) => {
      this.dqModelVersionId = dqModelVersionId;
      console.log('DQ Model Version ID:', this.dqModelVersionId);
    });

    // Suscribirse al esquema de datos
    this.projectDataService.dataSchema$.subscribe((data) => {
      this.dataSchema = data;
      console.log('Data Schema:', data); // Ver el esquema de datos en la consola
    });
  
  
  }


  // PROJECT SIN DQ MODEL (crear DQ Model y asignar a Project existente)
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
          // alert('DQModel asignado al Project con éxito.');

          // Actualizar el BehaviorSubject con el proyecto actualizado
          this.projectDataService.setProjectId(updatedProject.id);
        },
        error: err => {
          console.error('Error al actualizar el Project:', err);
          alert('Ocurrió un error al asignar el DQModel al Project.');
        }
      });
    }
  }

  
  // CREAR NUEVO PROYECTO-DQMODEL
  createDQModel_fromScratch() {
    this.modelService.createDQModel(this.newDQModel).subscribe({
      next: response => {
        console.log('DQ Model creado exitosamente:', response);
        alert('Modelo DQ creado con éxito.');
  
        const newDQModelId = response.id;
        console.log('Id nuevo DQ Model creado:', newDQModelId);
  
        // Llamar a la función para crear un nuevo proyecto y asignar el DQModel
        this.createNewProject_withDQModel(newDQModelId);
      },
      error: err => {
        console.error('Error al crear el modelo DQ:', err);
        alert('Ocurrió un error al crear el modelo DQ.');
      }
    });
  }

  createNewProject_withDQModel(dqmodelId: number): void {
    const name = 'Nuevo Proyecto al crear nueva version DQ Model';
    const description = 'Descripción del nuevo proyecto';
    const dqmodel_version = dqmodelId; 
    const context_version = this.project?.context_version;
  
    // Verificar que los datos se están pasando correctamente
    console.log('Datos del nuevo proyecto:', { name, description, dqmodel_version, context_version });
  
    this.projectService.createProject(name, description, dqmodel_version, context_version).subscribe({
      next: (project) => {
        console.log('Proyecto creado:', project);
  
        // Verificar que el proyecto se creó con los datos correctos
        if (project) {
          console.log('Proyecto creado correctamente con los datos:', project);
  
          // Asignar el DQModel al proyecto
          //this.assignDQModelToProject(project.id, dqmodelId);
  
          // Actualizar el ID del proyecto en el servicio
          this.projectDataService.setProjectId(project.id);
          console.log('ID del proyecto actual establecido:', project.id);
  
          // Navegar a la siguiente pantalla
          //this.navigateCreateDQModelNext();
  
          alert('Proyecto creado correctamente.');
        } else {
          console.error('El proyecto no se creó correctamente.');
          alert('Hubo un problema al crear el proyecto.');
        }
      },
      error: (err) => {
        console.error('Error al crear el proyecto:', err);
        alert('Ocurrió un error al crear el proyecto.');
      }
    });
  }


  // CREAR NUEVA VERSION DQ MODEL (nuevo proyecto y nuevo dq model con copia version anterior)
  createNewVersionDQModel(dqmodelId: number): void {
    const updatedAttributes = { version: "New version" }; 
  
    this.modelService.updateDQModel(dqmodelId, updatedAttributes).subscribe({
      next: (newDQModel) => {
        console.log('DQ Model actualizado o nueva versión creada:', newDQModel);
        this.newDQModelVersionId = newDQModel.id;
        console.log("this.newDQModelId", this.newDQModelVersionId);
        if (this.newDQModelVersionId){
          this.createNewProject_withDQModel(this.newDQModelVersionId);
          alert('Operación exitosa en el DQ Model.');
          this.navigateToResumeDQModel();
        }
        
      },
      error: (err) => {
        console.error('Error al actualizar o crear nueva versión del DQ Model:', err);
        alert('Ocurrió un error al intentar actualizar el DQ Model.');
      }
    });
  }

  

  // NAVIGATION METHODS
  navigateCreateDQModelNext() {
    this.router.navigate(['/st4/a09-1']);
  }

  navigateToResumeDQModel() { 
    this.router.navigate(['/st4/a10']);
  }

  navigateToViewDQModel() {
    this.router.navigate(['/st4/confirmation-stage-4']);
  }




  showNewProjectButtons = false;

  openConfirmationModal2(action: string): void {
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

  isModalOpen: boolean = false;
  modalTitle: string = '';
  modalMessage: string = '';
  showCancelButton: boolean = true;

  openConfirmationModal(modalType: string) {
    this.isModalOpen = true;

    if (modalType === 'newProject') {
      this.modalTitle = 'New DQ Model';
      this.modalMessage = 'Are you sure you want to create a new DQ Model?';
      this.showCancelButton = true;
    } else if (modalType === 'create') {
      this.modalTitle = 'Create DQ Model';
      this.modalMessage = 'Do you want to create a DQ Model from scratch?';
      this.showCancelButton = true;
    } else if (modalType === 'edit') {
      this.modalTitle = 'Edit DQ Model';
      this.modalMessage = 'Do you want to create a new version of the DQ Model?';
      this.showCancelButton = true;
    }
  }

  onModalClose() {
    this.isModalOpen = false;
    console.log('Modal cerrado');
  }

  onModalConfirm() {
    this.isModalOpen = false;
    console.log('Modal confirmado');
  }

  // Variables para el primer modal
  isFirstModalOpen: boolean = false;
  firstModalTitle: string = '';
  firstModalMessage: string = '';

  // Variables para el segundo modal
  isSecondModalOpen: boolean = false;
  secondModalTitle: string = '';
  secondModalMessage: string = '';
  selectedAction: string = ''; // Almacena la acción seleccionada en el primer modal

  // Abre el primer modal
  openFirstModal() {
    this.isFirstModalOpen = true;
    this.firstModalTitle = 'New Project';
    this.firstModalMessage = 'Define a new DQ Model from the current Context version.';
  }

  // Cierra el primer modal
  onFirstModalClose() {
    this.isFirstModalOpen = false;
  }

  // Maneja la selección de la opción 1 en el primer modal
  onOption1Click() {
    this.isFirstModalOpen = false;
    this.selectedAction = 'create';
    this.openSecondModal();
  }

  // Maneja la selección de la opción 2 en el primer modal
  onOption2Click() {
    this.isFirstModalOpen = false;
    this.selectedAction = 'edit';
    this.openSecondModal();
  }

  // Abre el segundo modal (confirmación)
  openSecondModal() {
    this.isSecondModalOpen = true;

    if (this.selectedAction === 'create') {
      this.secondModalTitle = 'Create New DQ Model';
      this.secondModalMessage = 'Here you are about to define a new DQ Model from scratch.';
    } else if (this.selectedAction === 'edit') {
      this.secondModalTitle = 'Update and Create New DQ Model Version';
      this.secondModalMessage = 'Here you are about to edit the existing DQ Model and define a new version.';
    }
  }

  // Cierra el segundo modal
  onSecondModalClose() {
    this.isSecondModalOpen = false;
  }

  // Confirma la acción en el segundo modal
  onSecondModalConfirm() {
    this.isSecondModalOpen = false;
    if (this.selectedAction === 'create') {
      this.createDQModel_fromScratch();
      console.log('DQ Model from Scratch confirmado');
    } else if (this.selectedAction === 'edit') {
        if(this.dqModelVersionId) {
          this.createNewVersionDQModel(this.dqModelVersionId);
          console.log('New DQ Model Version confirmado');
        }
      
    }
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
      
   

        alert('Proyecto creado correctamente.');
      },
      error: (err) => {
        console.error('Error al crear el proyecto:', err);
      }
    });
  }

}