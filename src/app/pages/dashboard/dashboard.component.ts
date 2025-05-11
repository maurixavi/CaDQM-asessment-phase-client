import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DqModelService } from '../../services/dq-model.service';
import { ProjectService } from '../../services/project.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ProjectDataService } from '../../services/project-data.service';
import { NotificationService } from '../../services/notification.service';

import { combineLatest } from 'rxjs';
import { filter } from 'rxjs/operators';

declare var bootstrap: any; 

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {


  // Datos iniciales para crear un DQ Model
  newDQModel = {
    name: 'NUEVO MODELO',
    version: '1.0.0',
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



  error: string = '';

  constructor(
    private router: Router,
    private modelService: DqModelService,
    private projectService: ProjectService,
    private projectDataService: ProjectDataService,
    private notificationService: NotificationService
  ) { }

  project: any = null;
  projectId: number | null = null;

  contextVersion: any = null; 
  contextComponents: any = null;

  dqProblems: any[] = [];
  dqModelVersionId: number | null = null;

  dqModelVersionName: string | null = null;
  dqModelVersion: string | null = null;

  dqModel: any = null;

  dataSchema: any = null;
  dataAtHandDetails: any = null;


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

      if (this.project.data_at_hand) {
        this.loadDataAtHandDetails(this.project.data_at_hand);
      }

    });

    // Suscribirse a los componentes del contexto
    this.projectDataService.contextVersion$.subscribe(contextVersion => {
      this.contextVersion = contextVersion;
      console.log('Context Version:', contextVersion);
    });

    this.projectDataService.contextComponents$.subscribe((data) => {
      this.contextComponents = data;
      //console.log('Context Components:', data);
    });

    // Suscribirse a los problemas de calidad de datos (DQ Problems)
    /*this.projectDataService.dqProblems$.subscribe((data) => {
      this.dqProblems = data;
      console.log('DQ Problems:', data);
    });*/

    // Suscribirse a los problemas de calidad de datos (DQ Problems)
    combineLatest([
      this.projectDataService.dqProblems$,
    ])
    .pipe(
      filter(([problems]) => problems.length > 0)
    )
    .subscribe(([problems]) => {
      this.dqProblems = problems;
      console.log('✅ Problemas listos');
      console.log('🧩 All DQ Problems:', problems);
    
      if (this.projectId) {
        this.loadPrioritizedDQProblems(this.projectId);
        //this.loadSelectedPrioritizedDQProblems(this.projectId);
      }
    });

    // Suscribirse a la versión del modelo de calidad de datos (DQ Model Version)
    this.projectDataService.dqModelVersion$.subscribe((dqModelVersionId) => {
      this.dqModelVersionId = dqModelVersionId;
      console.log('DQ Model Version ID:', this.dqModelVersionId);
      if (this.dqModelVersionId) {
        this.loadDQModelDetails(this.dqModelVersionId);
      }

    });

    // Suscribirse al esquema de datos
    this.projectDataService.dataSchema$.subscribe((data) => {
      this.dataSchema = data;
      console.log('Data Schema:', data); // Ver el esquema de datos en la consola
    });
  
  
  }


  // SELECTED DQ PROBLEMS FETCHED
  prioritizedProblems: any[] = [];
  selectedPrioritizedProblems: any[] = [];

  //PROBLEMAS PRIORIZADOS

  loadPrioritizedDQProblems(projectId: number): void {
    this.projectService.getPrioritizedDQProblemsByProjectId(projectId).subscribe({
      next: (data) => {
        this.prioritizedProblems = data;

        console.log('All DQ Problems prioritized', this.prioritizedProblems);
        

      },
      error: (err) => {
        console.error('Error al obtener los problemas priorizados:', err);
      },
    });
  }


  // PROBLEMAS SELECCIONADOS
  loadSelectedPrioritizedDQProblems(projectId: number): Promise<any> {
    return new Promise((resolve) => {
      this.projectService.getSelectedPrioritizedDQProblemsByProjectId(projectId).subscribe({
        next: (problems: any[]) => {
          this.selectedPrioritizedProblems = problems;
          // Obtener los detalles adicionales (description y date) para cada problema
          //this.selectedPrioritizedProblems.forEach((problem) => this.getDQProblemDetails(problem.dq_problem_id, problem));
          console.log('Problemas seleccionados:', 
            this.selectedPrioritizedProblems,
          );
          resolve(problems);
        },
        error: (err: any) => {
          console.error('Error loading prioritized DQ Problems:', err);
          resolve([]);
        }
      });
    });
  }


  loadDQModelDetails(dqmodelId: number): void {
    this.modelService.getDQModel(dqmodelId).subscribe(
      (dqModel) => {
        this.dqModel = dqModel;
        console.log('DQ Model Response:', dqModel);
        if (dqModel && dqModel.version) {
          this.dqModelVersionName = dqModel.name; 
          this.dqModelVersion = dqModel.version; 
          console.log('DQ Model Name:', this.dqModelVersionName);
        } else {
          console.error('La propiedad version no está disponible en la respuesta');
        }
      },
      (error) => {
        console.error('Error al obtener DQ Model:', error);
      }
    );
  }
  

  loadDataAtHandDetails(dataAtHandId: number): void {
    this.projectDataService.getDataAtHandById(dataAtHandId).subscribe(
      (data) => {
        this.dataAtHandDetails = data; // Asignar los detalles a la variable del componente
      },
      (error) => {
        console.error('Error loading data at hand details:', error);
      }
    );
  }


  // PROJECT SIN DQ MODEL (crear DQ Model y asignar a Project existente)
  createDQModel() {
    this.modelService.createDQModel(this.newDQModel).subscribe({
      next: response => {
        console.log('DQ Model creado exitosamente:', response);
        //alert('Modelo DQ creado con éxito.');
        this.notificationService.showSuccess('DQ Model was successfully created');

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
        //alert('Ocurrió un error al crear el modelo DQ.');
        this.notificationService.showError('Failed to create DQ Model');
      }
    });
  }

  //Proyecto sin DQ Model - Asignar nuevo DQ Model
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
          //alert('Ocurrió un error al asignar el DQModel al Project.');
          this.notificationService.showError('Failed to assign new DQ Model to the Project');
        }
      });
    }
  }

  
  // CREAR NUEVO PROYECTO-DQMODEL
  // Función para incrementar versión (ej. 1.0.0 → 2.0.0)
  private incrementVersion(currentVersion: string): string {
    if (!currentVersion) return '1.0.0';
    
    const versionParts = currentVersion.split('.');
    try {
      const major = parseInt(versionParts[0]) + 1;
      return `${major}.0.0`;
    } catch (e) {
      console.warn('Error parsing version, using default');
      return '1.0.0';
    }
  }


  //Nueva version DQ Model desde cero
  createDQModelNewVersionFromScratch() {

    const currentVersion = this.dqModel?.version;
    const newVersion = this.incrementVersion(currentVersion);

    const newDQModel = {
      name: this.dqModelVersionName, //mantiene nombre DQ Model
      version: newVersion, //actualiza numero version
      status: "draft",
      model_dimensions: [],
      model_factors: [],
      model_metrics: [],
      model_methods: [],
      measurement_methods: [],
      aggregation_methods: [],
      previous_version: this.dqModelVersionId  //referencia al current DQ Model
    };

    this.modelService.createDQModel(newDQModel).subscribe({
      next: response => {
        console.log('DQ Model creado exitosamente:', response);
        //alert('Modelo DQ creado con éxito.');

        this.notificationService.showSuccess('DQ Model version was successfully created');
  
        const newDQModelId = response.id;
        console.log('Id nuevo DQ Model creado:', newDQModelId);
  
        //Create new Project for this DQ Model
        this.openProjectModal();

        this.pendingDQModelId = newDQModelId;
      
      },
      error: err => {
        console.error('Error al crear el modelo DQ:', err);
        //alert('Ocurrió un error al crear el modelo DQ.');
        this.notificationService.showError('Failed to create new DQ Model version');
      }
    });
  }

  // CREAR NUEVA VERSION DQ MODEL (nuevo proyecto y nuevo dq model con copia version anterior)
  createNewVersionDQModel(dqmodelId: number): void {

    // Al intentar actualizar un DQ Model finalizado se crea uno nuevo copiando su contenido
    const updatedAttributes = {
      name: this.dqModelVersionName, // Se mantiene DQ Model name
    };
  
    this.modelService.updateDQModel(dqmodelId, updatedAttributes).subscribe({
      next: (newDQModel) => {
        console.log('DQ Model actualizado o nueva versión creada:', newDQModel);
        this.newDQModelVersionId = newDQModel.id;
        console.log("this.newDQModelId", this.newDQModelVersionId);
        
        //alert('DQ Model creado correctamente.');
        this.notificationService.showSuccess('DQ Model version was successfully created');

        if (this.newDQModelVersionId){
          //Crear nuevo proyecto a asociar el DQ Model
          this.pendingDQModelId = this.newDQModelVersionId;
          this.openProjectModal(); // Abre modal para detalles del proyecto

          //this.navigateToResumeDQModel();
        }
        
      },
      error: (err) => {
        console.error('Error al actualizar o crear nueva versión del DQ Model:', err);
        alert('Ocurrió un error al intentar actualizar el DQ Model.');
        this.notificationService.showError('Failed to create new DQ Model version');
      }
    });
  }


  //NEW DQ MODEL VERSION ->  NEW PROJECT
  newProject: any = {
    name: '',
    description: ''
  };

  pendingDQModelId: number | null = null;

 
  isProjectModalOpen: boolean = false;

  openProjectModal(): void {
    this.newProject.name = `New Project based on ${this.dqModelVersionName || 'DQ Model'}`;
    this.isProjectModalOpen = true;
  }

  closeProjectModal(): void {
    this.isProjectModalOpen = false;
    this.pendingDQModelId = null;
    this.resetProjectForm();
  }

  // Método para crear el proyecto con los detalles
  createProjectWithDetails(): void {
    if (!this.pendingDQModelId) {
      alert('Error: No DQModel ID available');
      return;
    }
  
    this.projectService.createProject(
      this.newProject.name,
      this.newProject.description,
      this.pendingDQModelId,
      this.project?.context_version,
      this.project?.data_at_hand
    ).subscribe({
      next: (newProject) => {
        const newProjectId = newProject.id;
        //this.projectDataService.setProjectId(newProjectId);
  
        // Obtener problemas del proyecto anterior
        this.projectService.getPrioritizedDQProblemsByProjectId(newProject.id).subscribe({
          next: (newProblems) => {
            const problemsToSync = newProblems.map((newProblem: { dq_problem_id: any; }) => {
              const matchingOldProblem = this.prioritizedProblems.find(
                old => old.dq_problem_id === newProblem.dq_problem_id
              );
        
              return {
                ...newProblem,
                priority: matchingOldProblem?.priority ?? 'Medium',
                is_selected: matchingOldProblem?.is_selected ?? false
              };
            });
        
            this.projectService.syncPrioritizedDQProblems(newProject.id, problemsToSync).subscribe({
              next: () => {
                //this.notificationService.showSuccess('Project and prioritized problems were successfully created and synced.');
                this.closeProjectModal();
              },
              error: (err) => {
                console.error('Error syncing prioritized problems:', err);
                this.notificationService.showError('Project created, but failed to sync prioritized problems.');
                this.closeProjectModal();
              }
            });
          },
          error: (err) => {
            console.error('Error fetching problems of new project:', err);
            this.notificationService.showError('Failed to fetch problems for syncing.');
          }
        });
        

        this.projectDataService.setProjectId(newProjectId);
        this.notificationService.showSuccess('Project with new DQ Model version was successfully created');

      },
      error: (err) => {
        console.error('Error creating project:', err);
        this.notificationService.showError('Failed to create new Project');
      }
    });
  }
  

  createProjectWithDetails_backup(): void {
    if (!this.pendingDQModelId) {
      alert('Error: No DQModel ID available');
      return;
    }
  
    this.projectService.createProject(
      this.newProject.name,
      this.newProject.description,
      this.pendingDQModelId,
      this.project?.context_version,
      this.project?.data_at_hand
    ).subscribe({
      next: (newProject) => {
        this.projectDataService.setProjectId(newProject.id);
        this.closeProjectModal();
        //this.navigateToResumeDQModel();
        this.notificationService.showSuccess('Project with new DQ Model version was successfully created');
      },
      error: (err) => {
        console.error('Error creating project:', err);
        this.notificationService.showError('Failed to create new Project');
        //alert('Error creating project: ' + err.message);
      }
    });
  }



 

  // Resetear el formulario
  resetProjectForm() {
    this.newProject = {
      name: '',
      description: ''
    };
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
                         based on current settings. This new version will be associated with current context version.`;

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
    this.firstModalTitle = 'New DQ Model version';
    this.firstModalMessage = 'Define a new DQ Model based on the current Context version.';
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
      this.secondModalTitle = 'New DQ Model Version';
      //this.secondModalMessage = 'Here you are about to define a new DQ Model version from scratch.';
      this.secondModalMessage = `Are you sure you want to define a new DQ Model version from scratch?<br><br> 
                         This action will start a new Project associated with the current context version and an new empty DQ Model.`;
      
    } else if (this.selectedAction === 'edit') {
      this.secondModalTitle = 'New DQ Model Version';
      //this.secondModalMessage = 'Here you are about to edit the existing DQ Model and define a new version.';
      this.secondModalMessage = `Are you sure you want to define a new DQ Model version based on current settings? 
        This action will start a new Project associated with the current context version and an new DQ Model using the previous version as template.`;

    }
  }

  // Cierra el segundo modal
  onSecondModalClose() {
    this.isSecondModalOpen = false;
  }

  // ------------------------------------------
  // Confirma la acción en el segundo modal
  onSecondModalConfirm() {
    this.isSecondModalOpen = false;
    if (this.selectedAction === 'create') {
      this.createDQModelNewVersionFromScratch();

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
    const data_at_hand = this.project?.data_at_hand;

    this.projectService.createProject(name, description, dqmodel_version, context_version, data_at_hand).subscribe({
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