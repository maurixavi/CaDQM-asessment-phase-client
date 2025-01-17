import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DqModelService } from '../../services/dq-model.service';
import { ProjectService } from '../../services/project.service';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  dqMethodForm: FormGroup;

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
  contextVersions: any[] = []; // Almacenar las versiones del contexto
  context: any; //cargar current context

  // Modal properties
  isModalOpen = false;
  selectedAction: string = '';
  modalTitle: string = '';
  modalMessage: string = '';

  // DQ Metric data
  dqMetricData = {
    id: 5,
    name: 'Syntax Error Rate',
    purpose: 'Proportion of syntactic errors detected in the data.',
    granularity: 'Attribute or record',
    resultDomain: '[0, 1]'
  };

  suggestion: any = null;
  error: string = '';

  constructor(
    private router: Router,
    private modelService: DqModelService,
    private projectService: ProjectService,
    private fb: FormBuilder
  ) {
    // Inicialización del formulario en el constructor
    this.dqMethodForm = this.fb.group({
      name: [''],
      inputDataType: [''],
      outputDataType: [''],
      algorithm: [''],
      implements: ['']
    });
  }

  ngOnInit() {
    this.loadCurrentProject();
    this.loadContextVersions();
    //this.generateSuggestion();
  }

  // CONTEXT METHODS
  loadContextVersions(): void {
    this.projectService.getContextVersions().subscribe({
      next: (versions) => {
        this.contextVersions = versions;
        console.log('*** Versiones de Contexto:', this.contextVersions);
      },
      error: (err) => {
        console.error('*** Error al cargar las versiones de contexto:', err);
      }
    });
  }

  getContextByVersionFiltering(versionId: number): void {
    if (isNaN(versionId) || versionId <= 0) {
      console.error('ID de versión de contexto no válido');
      return;
    }

    this.context = this.contextVersions.find(context => context.context_id === versionId);

    if (this.context) {
      console.log('Contexto encontrado:', this.context);
    } else {
      console.error('No se encontró un contexto con el ID:', versionId);
    }
  }

  getContextByVersion(contextVersionId: number): void {
    this.projectService.getContextByVersion(contextVersionId).subscribe({
      next: (data) => {
        this.context = data;
        console.log('Datos del contexto:', this.context);
      },
      error: (err) => {
        console.error('Error al obtener el contexto por versión:', err);
      }
    });
  }

  // PROJECT METHODS
  loadCurrentProject(): void {
    this.projectService.loadCurrentProject().subscribe({
      next: (project) => {
        this.project = project;
        console.log('Proyecto cargado en el componente:', this.project);
 
        if (this.project && this.project.dqmodel_version) {
          this.loadCurrentDQModel(this.project.dqmodel_version);
        } else {
          console.warn('El proyecto cargado no tiene un dqModelId');
        }

        if (this.project && this.project.context_version) {
          this.currentCtxVersion = this.project.context_version;
          console.log("Version contexto actual :", this.currentCtxVersion);

          if (this.currentCtxVersion !== null) {
            this.getContextByVersion(this.currentCtxVersion);
          }
        } else {
          console.warn('El proyecto cargado no tiene un contextId');
        }
      },
      error: (err) => {
        console.error('Error al cargar el proyecto en el componente:', err);
      }
    });
  }

  // DQ MODEL METHODS
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

  createDQModel() {
    this.modelService.createDQModel(this.newDQModel).subscribe({
      next: response => {
        console.log('DQ Model creado exitosamente:', response);
        alert('Modelo DQ creado con éxito.');

        const newDQModelId = response.id;

        if (this.projectId !== null) {
          this.assignDQModelToProject(this.projectId, newDQModelId);
        } else {
          console.error("No se ha establecido un ID de proyecto válido.");
        }
        
        this.loadCurrentProject();
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
    const name = 'Nuevo Proyecto';
    const description = 'Descripción del nuevo proyecto';
    const dqmodel_version = this.newDQModelVersionId; 
    const context_version = this.project?.context_version;

    this.projectService.createProject(name, description, dqmodel_version, context_version).subscribe({
      next: (project) => {
        console.log('Proyecto creado:', project);
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

  // NAVIGATION METHODS
  navigateCreateDQModelNext() {
    this.router.navigate(['/step1']);
  }

  navigateToResumeDQModel() { 
    this.router.navigate(['/step1']);
  }

  navigateToViewDQModel() {
    this.router.navigate(['/step7']);
  }

  // MODAL METHODS
  openModal() {
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  openConfirmationModal(action: string): void {
    this.selectedAction = action;
    if (action === 'create') {
      this.modalTitle = 'Create New DQ Model';
      this.modalMessage = `Here you are about to <strong>define a new DQ Model from scratch</strong>. 
                         This action will start a fresh model that will be associated with this context version.`;
    } else if (action === 'edit') {
      this.modalTitle = 'Update and Create New DQ Model Version';
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
    } 
    else if (this.selectedAction === 'edit') {
      if (this.project.dqmodel_version !== null) {
        this.createNewVersionDQModel(this.project.dqmodel_version);
      }
      this.router.navigate(['/step3']);
    }
    this.closeConfirmationModal();
  }

  // DQ METHOD SUGGESTION METHODS
  generateSuggestion() {
    console.log('Generando sugerencia...');
    this.modelService.generateDQMethodSuggestion(this.dqMetricData).subscribe({
      next: (response) => {
        console.log('Sugerencia recibida:', response);
        this.suggestion = response;
        this.error = '';

        // Asegurarse de que el formulario esté inicializado
        if (this.dqMethodForm) {
          // Actualizar el formulario con los valores de la sugerencia
          this.dqMethodForm.patchValue({
            name: response.name || '',
            inputDataType: response.inputDataType || '',
            outputDataType: response.outputDataType || '',
            algorithm: response.algorithm || '',
            implements: response.implements || ''
          });

          console.log('Formulario actualizado:', this.dqMethodForm.value);
        } else {
          console.error('El formulario no está inicializado');
        }

        // Mostrar los valores en un confirm para verificar
        const confirmMessage = `
          Sugerencia generada:
          Nombre: ${response.name}
          Tipo de entrada: ${response.inputDataType}
          Tipo de salida: ${response.outputDataType}
          Algoritmo: ${response.algorithm}
          Implementación: ${response.implements}
        `;
        console.log(confirmMessage);
      },
      error: (err) => {
        console.error('Error al generar la sugerencia:', err);
        this.error = 'Error al generar la sugerencia. Por favor intente nuevamente.';
        this.suggestion = null;
      }
    });
  }

  // Método para verificar el contenido actual del formulario
  logFormContent() {
    console.log('Contenido actual del formulario:', this.dqMethodForm.value);
  }


  private showConfirmationDialog(suggestion: any) {
    const confirmMessage = `
      ¿Deseas usar esta sugerencia como base para el nuevo DQ Method?
      Puedes editar los valores en el formulario antes de confirmar.
      
      Valores sugeridos:
      - Nombre: ${suggestion.name}
      - Algoritmo: ${suggestion.algorithm}
      - Tipo de entrada: ${suggestion.inputDataType}
      - Tipo de salida: ${suggestion.outputDataType}
    `;

    if (confirm(confirmMessage)) {
      // El usuario puede seguir editando el formulario
      // La creación final se hará con otro botón
    } else {
      this.dqMethodForm.reset();
    }
  }

  createDQMethod() {
    if (this.dqMethodForm.valid) {
      const methodData = this.dqMethodForm.value;
      
      this.modelService.createDQMethodBase(methodData).subscribe({
        next: (data) => {
          console.log('Nuevo DQ Method Base creado:', data);
          alert('DQ Method Base creado con éxito.');
        },
        error: (error) => {
          console.error('Error al crear el DQ Method Base:', error);
          alert('Error al crear el DQ Method Base. Intenta nuevamente.');
        }
      });
    } else {
      alert('Por favor, completa todos los campos requeridos.');
    }
  }


  generateNewSuggestion() {

    this.generateSuggestion();

  }

  // Método para generar sugerencia y abrir el modal
  generateSuggestionModal() {

    this.generateSuggestion();

    const modal = document.getElementById('suggestionModal');
    if (modal) {
      modal.style.display = 'block';
    }
  }

  // Método para cerrar el modal
  closeSuggestionModal() {
    const modal = document.getElementById('suggestionModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  selectedModel: string = 'llama3-8b-8192';  // Valor por defecto

  // Método para manejar la configuración del modelo
  openModelConfig() {
    // Aquí puedes agregar cualquier lógica que desees al hacer clic en el ícono de configuración.
    console.log('Current selected model: ', this.selectedModel);
  }
}