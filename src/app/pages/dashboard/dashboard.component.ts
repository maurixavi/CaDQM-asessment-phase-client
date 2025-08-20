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

  // =============================================
  // 1. CONSTANTES Y CONFIGURACIÓN
  // =============================================
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

  isDQModelModalOpen: boolean = false;
  newDQModelName: string = '';

  isLoading: boolean = false;

  // =============================================
  // 2. VARIABLES DE ESTADO Y DATOS
  // =============================================
  // PROJECT
  project: any = null;
  projectId: number | null = null;
  noProjectMessage: string = "";

  // CONTEXT
  contextVersion: any = null;
  contextComponents: any = null;

  // DQ PROBLEMS
  dqProblems: any[] = [];
  prioritizedProblems: any[] = [];
  selectedPrioritizedProblems: any[] = [];

  // DQ MODEL
  dqModelVersionId: number | null = null;
  dqModelVersionName: string | null = null;
  dqModelVersion: string | null = null;
  dqModel: any = null;
  newDQModelVersionId: number | null = null;

  dqModelPreviousVersionNumber: string | null = null;

  // DATA AT HAND
  dataSchema: any = null;
  dataAtHandDetails: any = null;

  // NEW PROJECT
  newProject: any = {
    name: '',
    description: ''
  };
  pendingDQModelId: number | null = null;
  isProjectModalOpen: boolean = false;

  // MODALS
  selectedAction: string = '';

  isNewDQModelVersionModalOpen: boolean = false;
  newDQModelVersionOptionsModalTitle: string = '';
  newDQModelVersionOptionsModalMessage: string = '';
  isConfirmationDQModelVersionModalOpen: boolean = false;
  confirmationNewDQModelVersionModalTitle: string = '';
  confirmationNewDQModelVersionModalMessage: string = '';


  // DQ MODEL PREVIOUS-NEXT VERSION
  projectPreviousDQModelVersion: any = null;
  projectNextDQModelVersion: any = null;
  dqModelNextVersion: any = null;

  constructor(
    private router: Router,
    private modelService: DqModelService,
    private projectService: ProjectService,
    private projectDataService: ProjectDataService,
    private notificationService: NotificationService
  ) { }


  // =============================================
  // 3. CICLO DE VIDA DEL COMPONENTE
  // =============================================
  ngOnInit() {
    // Obtener el Project ID actual
    this.projectId = this.projectDataService.getProjectId();

    // Suscribirse a los observables del servicio ANTES de cargar los datos
    this.subscribeToData();
  }

  // =============================================
  // 4. MANEJO DE DATOS Y SUSCRIPCIONES
  // =============================================
  subscribeToData(): void {
    // Suscribirse al proyecto
    this.projectDataService.project$.subscribe((data) => {
      this.project = data;
      if (this.project) {
        this.fetchDataAtHandDetails(this.project.data_at_hand);
      }
    });

    this.projectDataService.dqModelVersion$.subscribe((dqModelVersionId) => {
      this.dqModelVersionId = dqModelVersionId;
      if (this.dqModelVersionId) {
        this.fetchDQModelDetails(this.dqModelVersionId);
      }
    });

    // Suscribirse a los componentes del contexto
    this.projectDataService.contextVersion$.subscribe(contextVersion => {
      this.contextVersion = contextVersion;
    });

    this.projectDataService.contextComponents$.subscribe((data) => {
      this.contextComponents = data;
      console.log("this.contextComponents (db)", this.contextComponents)
    });

    // Suscribirse a los problemas de calidad de datos (DQ Problems)
    combineLatest([
      this.projectDataService.dqProblems$,
      this.projectDataService.dqModelVersion$
    ])
    .pipe(
      filter(([problems, dqModelVersionId]) => problems.length > 0 && dqModelVersionId !== null)
    )
    .subscribe(([problems, dqModelVersionId]) => {
      this.dqProblems = problems;
      this.dqModelVersionId = dqModelVersionId;

      console.log("this.dqProblems", this.dqProblems)
      if (this.projectId) {
        this.fetchPrioritizedDQProblems(this.projectId);
      }

      /*if (this.dqModelVersionId) {
        this.fetchDQModelDetails(this.dqModelVersionId);
      }*/
    });


    // Suscribirse al esquema de datos
    this.projectDataService.dataSchema$.subscribe((data) => {
      this.dataSchema = data;
    });
  }

  // =============================================
  // 5. MÉTODOS DE CARGA DE DATOS
  // =============================================
  fetchPrioritizedDQProblems(projectId: number): void {
    this.projectService.getPrioritizedDQProblemsByProjectId(projectId).subscribe({
      next: (data) => {
        this.prioritizedProblems = data;
      },
      error: (err) => {
        console.error('Error al obtener los problemas priorizados:', err);
      },
    });
  }

  fetchDQModelDetails(dqmodelId: number): void {
    this.modelService.getCurrentDQModel(dqmodelId).subscribe(
      (dqModel) => {
        this.dqModel = dqModel;
        if (dqModel && dqModel.version) {
          this.dqModelVersionName = dqModel.name; 
          this.dqModelVersion = dqModel.version; 
          console.log("dqModel", dqModel)

          //Load Project DQ Model previous version
          if (dqModel.previous_version) {
            const previousDQModelId = dqModel.previous_version;
            this.dqModelPreviousVersionNumber = this.decrementVersion(dqModel.version)
            this.fetchProjectByDQModelVersion(previousDQModelId, 'previous');
          }

          //Load DQ Model next version if exists
          this.fetchNextDQModelVersion(dqModel.id);

        } else {
          console.error('La propiedad version no está disponible en la respuesta');
        }
        
      },
      (error) => {
        console.error('Error al obtener DQ Model:', error);
      }
    );
  }
  
  fetchDataAtHandDetails(dataAtHandId: number): void {
    this.projectDataService.getDataAtHandById(dataAtHandId).subscribe(
      (data) => {
        this.dataAtHandDetails = data; 
      },
      (error) => {
        console.error('Error loading data at hand details:', error);
      }
    );
  }

  //Get Project from  DQ Model Previous or Next version
  fetchProjectByDQModelVersion(dqmodelId: number, type: 'previous' | 'next'): void {
    this.projectService.getProjectByDQModelVersion(dqmodelId).subscribe(
      (project) => {
        if (type === 'previous') {
          this.projectPreviousDQModelVersion = project;
        } else if (type === 'next') {
          this.projectNextDQModelVersion = project;
        }
        console.log(`Project (${type} version):`, project);
      },
      (error) => {
        console.error(`Error al obtener el proyecto por dqmodel_version (${type}):`, error);
      }
    );
  }

  //Obtiene la siguiente versión del DQModel actual (si existe)  
  fetchNextDQModelVersion(dqModelId: number): void {
    this.modelService.getNextDQModelVersion(dqModelId).subscribe(
      (dqModel) => {
        this.dqModelNextVersion = dqModel;
        if (this.dqModelNextVersion) {
          //console.log('Next DQModel version:', this.dqModelNextVersion);
          this.fetchProjectByDQModelVersion(this.dqModelNextVersion.id, 'next')
        } 
      },
      (error) => {
        console.warn('No se encontró una siguiente versión del DQModel:', error);
        this.dqModelNextVersion = null;
      }
    );
  }

  //Seleccionar Proyecto con version previa o siguiente del DQ Model  
  selectProjectWithDQModelVersion(type: 'previous' | 'next'): void {
    const selectedProject =
      type === 'previous' ? this.projectPreviousDQModelVersion :
      type === 'next' ? this.projectNextDQModelVersion : null;
  
    if (!selectedProject) {
      console.warn(`No project found for DQ Model ${type} version`);
      return;
    }
  
    console.log("selectedProject", selectedProject)
    this.projectDataService.setProjectId(selectedProject.id);
    console.log("Navigating to confirmation with projectId:", selectedProject.id);
    //this.router.navigate(['/st4/confirmation-stage-4']);
    //this.router.navigate(['/phase2/dashboard']);
    
  }

  selectProjectWithDQModelVersion2(type: 'previous' | 'next'): void {
    const selectedProject =
      type === 'previous' ? this.projectPreviousDQModelVersion :
      type === 'next' ? this.projectNextDQModelVersion : null;
  
    if (!selectedProject) {
      console.warn(`No project found for DQ Model ${type} version`);
      return;
    }
  
    console.log("selectedProject", selectedProject);
    
    // Primero establecer el nuevo projectId
    this.projectDataService.setProjectId(selectedProject.id);
    
    // Esperar a que se complete la carga de datos
    this.projectDataService.loadProjectAndComponents().subscribe({
      next: () => {
        console.log("Data loaded, navigating to confirmation with projectId:", selectedProject.id);
        this.router.navigate(['/st4/confirmation-stage-4']);
      },
      error: (err) => {
        console.error("Error loading project data:", err);
        this.notificationService.showError('Failed to load project data');
      }
    });
  }

  
  // =============================================
  // 6. MÉTODOS DE CREACIÓN DE DQ MODELS
  // =============================================

  // DQ MODEL - NUEVO (Proyecto sin DQ Model)
  
  // Proyecto sin DQ Model: 
  // Crear DQ Model y asignar a Project existente
  createDQModel() {
    const dqModelData = {
      name: this.newDQModelName,
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

    this.modelService.createDQModel(dqModelData).subscribe({
      next: response => {
        console.log('DQ Model creado exitosamente:', response);
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
 
        this.closeDQModelModal();

      },
      error: err => {
        console.error('Error al crear el modelo DQ:', err);
        //alert('Ocurrió un error al crear el modelo DQ.');
        this.notificationService.showError('Failed to create DQ Model');
      }
    });
  }

  // Métodos para manejar el modal del DQ Model
  openDQModelModal(): void {
    this.newDQModelName = 'New DQ Model';
    this.isDQModelModalOpen = true;
  }

  closeDQModelModal(): void {
    this.isDQModelModalOpen = false;
    this.newDQModelName = '';
  }

  createDQModel_backup() {
    this.modelService.createDQModel(this.newDQModel).subscribe({
      next: response => {
        console.log('DQ Model creado exitosamente:', response);
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
 
        //Go to first DQ Model definition Activity
        this.router.navigate(['/st4/dq-problems-priorization']);

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

  // DQ MODEL - NUEVA VERSION

  // Crea nueva version de DQ Model desde cero + Nuevo Proyecto
  // Incrementa numero version
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
        this.openNewProjectModal();

        this.pendingDQModelId = newDQModelId;
      
      },
      error: err => {
        console.error('Error al crear el modelo DQ:', err);
        //alert('Ocurrió un error al crear el modelo DQ.');
        this.notificationService.showError('Failed to create new DQ Model version');
      }
    });
  }

  // Crea nueva version de DQ Model + Nuevo Proyecto
  // Realiza copia completa de modelo anterior, desde Dimensiones hasta Metodos Aplicados, y seleccion de DQ Problems priorizados
  // Incrementa numero version
  createDQModelNewVersionFullCopy(dqmodelId: number): void {
    // Al actualizar un DQ Model finalizado se crea uno nuevo copiando su contenido
    const updatedAttributes = {
      name: this.dqModelVersionName, // Se mantiene DQ Model name
    };
  
    this.modelService.updateDQModel(dqmodelId, updatedAttributes).subscribe({
      next: (newDQModel) => {
        console.log('DQ Model actualizado o nueva versión creada:', newDQModel);
        this.newDQModelVersionId = newDQModel.id;
        console.log("this.newDQModelId", this.newDQModelVersionId);
        
        this.notificationService.showSuccess('DQ Model version was successfully created');

        if (this.newDQModelVersionId){
          //Crear nuevo Proyecto para nueva version de DQ Model
          this.pendingDQModelId = this.newDQModelVersionId;
          this.openNewProjectModal(); 
        }
        
      },
      error: (err) => {
        console.error('Error al actualizar o crear nueva versión del DQ Model:', err);
        alert('Ocurrió un error al intentar actualizar el DQ Model.');
        this.notificationService.showError('Failed to create new DQ Model version');
      }
    });
  }

  // Incrementar versión DQ Model (ej. 1.0.0 → 2.0.0)
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

  // Obtener versión DQ Model anterior (ej. 2.0.0 → 1.0.0)
  private decrementVersion(currentVersion: string): string {
    if (!currentVersion) return '0.0.0';
  
    const versionParts = currentVersion.split('.');
    try {
      let major = parseInt(versionParts[0]);
      major = isNaN(major) ? 1 : major;
  
      // Evita que el major sea menor que 0
      major = Math.max(major - 1, 0);
  
      return `${major}.0.0`;
    } catch (e) {
      console.warn('Error parsing version, using default');
      return '0.0.0';
    }
  }
  


  // =============================================
  // 7. MÉTODOS DE ASIGNACIÓN Y PROYECTOS
  // =============================================


  //-------------------------------

  // Crea Proyecto y asocia a la nueva version del DQ Model creado
  createProjectWithDQModel(): void {
    if (!this.pendingDQModelId) {
      alert('Error: No DQModel ID available');
      return;
    }
  
    this.isLoading = true; 

    this.projectService.createProject(
      this.newProject.name,
      this.newProject.description,
      this.pendingDQModelId,
      //this.project?.context_version,
      this.project?.context,
      this.project?.user,
      this.project?.data_at_hand,
     // this.project?.estimation

    ).subscribe({
      next: (newProject) => {
        const newProjectId = newProject.id;
  
        // Copia los problemas del proyecto actual al nuevo proyecto
        this.projectService.copyPrioritizedProblems(this.project.id, newProjectId).subscribe({
          next: () => {
            this.isLoading = false;
            this.projectDataService.setProjectId(newProjectId);
            this.closeNewProjectModal();
          },
          error: (err) => {
            this.isLoading = false;
            console.error('Error copying problems:', err);
            this.notificationService.showError(
              'Project created, but failed to copy prioritized problems.'
            );
          }
        });
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error creating project:', err);
        this.notificationService.showError('Failed to create new Project');
      }
    });
  }

  createProjectWithDQModel_backup(): void {
    if (!this.pendingDQModelId) {
      alert('Error: No DQModel ID available');
      return;
    }
  
    this.isLoading = true; 

    this.projectService.createProject(
      this.newProject.name,
      this.newProject.description,
      this.pendingDQModelId,
      this.project?.context_version,
      this.project?.context,
      this.project?.data_at_hand,
      //this.project?.estimation
    ).subscribe({
      next: (newProject) => {
        this.isLoading = true; 
        const newProjectId = newProject.id;
        //this.projectDataService.setProjectId(newProjectId);
  
        // Obtiene y copia DQ Problems del proyecto actual
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
                this.closeNewProjectModal();
              },
              error: (err) => {
                console.error('Error syncing prioritized problems:', err);
                this.notificationService.showError('Project created, but failed to sync prioritized problems.');
                this.closeNewProjectModal();
              }
            });
          },
          error: (err) => {
            console.error('Error fetching problems of new project:', err);
            this.notificationService.showError('Failed to fetch problems for syncing.');
          }
        });
        
        this.isLoading = false; 
        this.projectDataService.setProjectId(newProjectId);
        this.notificationService.showSuccess('Project with new DQ Model version was successfully created');
        this.closeNewProjectModal();

      },
      error: (err) => {
        this.isLoading = false; 
        console.error('Error creating project:', err);
        this.notificationService.showError('Failed to create new Project');
      }
    });
  }

  // =============================================
  // 8. MANEJO DE MODALES
  // =============================================

  // NEW DQ MODEL VERSION MODALS
  openFirstNewDQModelVersionModal() {
    this.isNewDQModelVersionModalOpen = true;
    this.newDQModelVersionOptionsModalTitle = 'New DQ Model version';
    this.newDQModelVersionOptionsModalMessage = 'Define a new DQ Model based on the current Context version.';
  }

  handleFirstNewDQModelVersionModalAction(actionType: 'create' | 'edit'): void {
    this.isNewDQModelVersionModalOpen = false;
    this.selectedAction = actionType;
    this.openConfirmationNewDQModelVersionModal();
  }

  // DQ Model New Version: From Scratch or Copy Options
  openConfirmationNewDQModelVersionModal() {
    this.isConfirmationDQModelVersionModalOpen = true;

    if (this.selectedAction === 'create') {
      this.confirmationNewDQModelVersionModalTitle = 'New DQ Model Version';
      this.confirmationNewDQModelVersionModalMessage = `Are you sure you want to define a new DQ Model version from scratch?<br><br> 
                         This action will start a new Project associated with the current context version and an new empty DQ Model.`;
      
    } else if (this.selectedAction === 'edit') {
      this.confirmationNewDQModelVersionModalTitle = 'New DQ Model Version';
      this.confirmationNewDQModelVersionModalMessage = `Are you sure you want to define a new DQ Model version based on current settings? 
        This action will start a new Project associated with the current context version and an new DQ Model using the previous version as template.`;
    }
  }

  // DQ Model New Version: From Scratch or Copy Confirmation
  onDQModelNewVersionOptionConfirm() {
    this.isConfirmationDQModelVersionModalOpen = false;
    if (this.selectedAction === 'create') {
      this.createDQModelNewVersionFromScratch();
    } else if (this.selectedAction === 'edit') {
        if(this.dqModelVersionId) {
          this.createDQModelNewVersionFullCopy(this.dqModelVersionId);
        }
    }
  }

  closeConfirmationNewDQModelVersionModal() {
    this.isConfirmationDQModelVersionModalOpen = false;
  }

  
  // NEW PROJECT MODAL
  openNewProjectModal(): void {
    this.newProject.name = '';
    this.isProjectModalOpen = true;
  }

  closeNewProjectModal(): void {
    this.isProjectModalOpen = false;
    this.pendingDQModelId = null;
    this.resetNewProjectForm();
  }

  resetNewProjectForm() {
    this.newProject = {
      name: '',
      description: ''
    };
  }


  // =============================================
  // 9. NAVEGACIÓN
  // =============================================
  navigateToResume() {
    if (!this.project?.current_stage?.stage) {
      console.error('No se pudo determinar la etapa actual del proyecto');
      return;
    }

    const stage = this.project.current_stage.stage;
    const stageRoutes: {[key: string]: string} = {
      'ST4': 'phase2/st4/dq-problems-priorization', 
      'ST5': 'phase2/st5/measurement-execution',
      'ST6': 'phase2/st6/assessment-approaches'
    };

    this.router.navigate([stageRoutes[stage]]);
  }

  navigateToDQModelView() {
    this.router.navigate(['phase/st4/dq-model']); 
  }

  // Close Project -> Navigate to Homepage
  closeProject(): void {
    const projectName = this.project?.name || ''; 
    this.projectDataService.setProjectId(null);
    this.notificationService.showSuccess(`Project "${projectName}" has been closed.`);
    this.router.navigate(['/']);
  }

}