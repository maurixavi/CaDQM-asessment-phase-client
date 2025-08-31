import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Router } from '@angular/router';

import { DqModelService } from '../../../services/dq-model.service';
import { ProjectService } from '../../../services/project.service';
import { ProjectDataService } from '../../../services/project-data.service';
import { NotificationService } from '../../../services/notification.service';
import { combineLatest } from 'rxjs';
import { filter } from 'rxjs/operators';

// Interfaces
export interface DataQualityProblem {
  id: number;
  name: string;
  description: string;
  contextcomp_related_to: string[];
  priority: number;
  priorityType: string;
  selectedFactors?: number[];
}

@Component({
  selector: 'app-dqproblems-priorization',
  templateUrl: './dqproblems-priorization.component.html',
  styleUrls: ['./dqproblems-priorization.component.css'],
  //encapsulation: ViewEncapsulation.None
})
export class DQProblemsPriorizationComponent implements OnInit {
  
  steps: { displayName: string, route: string, description: string }[] = [
    { displayName: 'A09.1', route: 'phase2/st4/dq-problems-priorization', description: 'Prioritization of DQ Problems' },
    { displayName: 'A09.2', route: 'phase2/st4/dq-problems-selection', description: 'Selection of DQ Problems' },
    { displayName: 'A10', route: 'phase2/st4/dq-dimensions-factors', description: 'Selection of DQ Dimensions and Factors' },
    { displayName: 'A11', route: 'phase2/st4/dq-metrics', description: 'Definition of DQ Metrics' },
    { displayName: 'A12', route: 'phase2/st4/dq-methods', description: 'Implementation of DQ Methods' },
    { displayName: 'DQ Model Confirmation', route: 'phase2/st4/dq-model', description: 'DQ Model Confirmation' }
  ];

  // Variables de estado del componente
  currentStep: number = 0;
  pageStepTitle: string = 'Prioritization of DQ problems';
  phaseTitle: string = 'Phase 2: DQ Assessment';
  stageTitle: string = 'Stage 4: DQ Model Definition';

  isNextStepEnabled: boolean = false;

  // Variables de UI
  selectedProblem: DataQualityProblem | null = null;
  detailsVisible: boolean = false;
  isOrderConfirmed: boolean = false;

  // Variables de datos
  project: any;
  projectId: number | null = null;
  noProjectMessage: string = "";
  dqModelId: number = -1;
  dqModelVersionId: number | null = null;
  currentDQModel: any = null;

  // Listas de problemas
  problems: any[] = [];
  dqProblems_: any[] = [];
  prioritizedDQProblems: any[] = [];
  dqProblemDetails: any = null;

  // Listas de problemas priorizados
  highPriorityProblems: any[] = [];
  mediumPriorityProblems: any[] = [];
  lowPriorityProblems: any[] = [];

  // IDs para las listas de prioridad
  highPriorityId = 'high-priority';
  mediumPriorityId = 'medium-priority';
  lowPriorityId = 'low-priority';

  // Componentes del contexto
  contextComponents: any = null;

  // Propiedades para el modal de confirmación
  isConfirmationModalOpen: boolean = false;
  confirmationModalTitle: string = '';
  confirmationModalMessage: string = '';

  // Controlar que haya realizado la priorizacion
  hasCompletedInitialPrioritization: boolean = false;

  constructor(
    private router: Router,
    public modelService: DqModelService,
    private projectService: ProjectService,
    private projectDataService: ProjectDataService,
    private notificationService: NotificationService,
  ) { }

  ngOnInit() {
    this.projectId = this.projectDataService.getProjectId();
    this.subscribeToData();
    this.syncCurrentStepWithRoute(); // Sincronizar el paso actual con la ruta
  }

  syncCurrentStepWithRoute() {
    const currentRoute = this.router.url; 
    const stepIndex = this.steps.findIndex(step => step.route === currentRoute);
    if (stepIndex !== -1) {
      this.currentStep = stepIndex;
    }
  }

  subscribeToData(): void {
    this.projectDataService.project$.subscribe((data) => {
      this.project = data;
    });
    this.projectDataService.contextComponents$.subscribe((data) => {
      this.contextComponents = data;
    });

    combineLatest([
      this.projectDataService.dqProblems$,
      this.projectDataService.dqModelVersion$
    ])
    .pipe(
      filter(([problems, dqModelVersionId]) => problems.length > 0 && dqModelVersionId !== null)
    )
    .subscribe(([problems, dqModelVersionId]) => {
      this.dqProblems_ = problems;
      this.dqModelVersionId = dqModelVersionId;
      if (this.projectId) {
        this.loadPrioritizedDQProblems(this.projectId);
      }
      if (this.dqModelVersionId) {
        this.fetchDQModelDetails(this.dqModelVersionId);
      }
    });

  }


  // ========== CARGA DE DATOS ==========

  fetchDQModelDetails(dqmodelId: number): void {
    this.modelService.getCurrentDQModel(dqmodelId).subscribe(
      (dqModel) => {
        this.currentDQModel = dqModel;
      },
      (error) => {
        console.error('Error al obtener DQ Model:', error);
      }
    );
  }
  
  // Carga los problemas priorizados para el proyecto dado
  loadPrioritizedDQProblems(projectId: number): void {
    this.projectService.getPrioritizedDQProblemsByProjectId(projectId).subscribe({
      next: (data) => {
        console.log("Prioritized DQ Problems", data);
        // Inicializar las listas de prioridad
        this.highPriorityProblems = data.filter((problem: { priority: string; }) => problem.priority === 'High');
        this.mediumPriorityProblems = data.filter((problem: { priority: string; }) => problem.priority === 'Medium');
        this.lowPriorityProblems = data.filter((problem: { priority: string; }) => problem.priority === 'Low');

        // Verificar si this.dqProblems_ está cargado
        if (this.dqProblems_ && this.dqProblems_.length > 0) {
          // Obtener los detalles adicionales (description y date) para cada problema
          this.highPriorityProblems.forEach((problem) => this.getDQProblemDetails(problem.dq_problem_id, problem));
          this.mediumPriorityProblems.forEach((problem) => this.getDQProblemDetails(problem.dq_problem_id, problem));
          this.lowPriorityProblems.forEach((problem) => this.getDQProblemDetails(problem.dq_problem_id, problem));
        } else {
          console.error('Los problemas de calidad aún no están cargados.');
        }

        if (!this.hasEmptyInitialPrioritization()) {
          // Habilitar actividad siguiente
          this.isNextStepEnabled = true;
        }
        /*console.log('Problemas priorizados:', {
          high: this.highPriorityProblems,
          medium: this.mediumPriorityProblems,
          low: this.lowPriorityProblems,
        });*/
      },
      error: (err) => {
        console.error('Error al obtener los problemas priorizados:', err);
      },
    });
  }

  getDQProblemDetails(dqProblemId: number, problem: any): void {
    const dqProblem = this.dqProblems_.find((p) => p.id === dqProblemId);
    if (dqProblem) {
      // Actualizar los detalles del problema
      problem.description = dqProblem.description;
      problem.date = dqProblem.date;
    } else {
      console.error('Problema no encontrado:', dqProblemId);
      problem.description = 'Descripción no disponible'; // Valor por defecto
      problem.date = new Date(); // Fecha actual como valor por defecto
    }
  }


  // ========== DRAG & DROP ==========

  // Maneja el evento de drag and drop entre contenedores
  drop(event: CdkDragDrop<any[]>): void {
    if (event.previousContainer === event.container) {
      // Mismo contenedor - reordenar
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Transferir entre contenedores
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      // Actualizar la prioridad del problema según el contenedor de destino
      const movedItem = event.container.data[event.currentIndex];
      movedItem.priority = this.getPriorityFromContainerId(event.container.id);
    }

    this.updateProblemLists();
  }

  updateProblemLists(): void {
    this.highPriorityProblems = this.highPriorityProblems.filter((problem) => problem.priority === 'High');
    this.mediumPriorityProblems = this.mediumPriorityProblems.filter((problem) => problem.priority === 'Medium');
    this.lowPriorityProblems = this.lowPriorityProblems.filter((problem) => problem.priority === 'Low');
  }

  getPriorityFromContainerId(containerId: string): string {
    switch (containerId) {
      case this.highPriorityId:
        return 'High';
      case this.mediumPriorityId:
        return 'Medium';
      case this.lowPriorityId:
        return 'Low';
      default:
        return 'Medium'; // Valor por defecto
    }
  }

  onPriorityChange(problem: any): void {
    // Remover el problema de la lista actual
    this.highPriorityProblems = this.highPriorityProblems.filter((p) => p.id !== problem.id);
    this.mediumPriorityProblems = this.mediumPriorityProblems.filter((p) => p.id !== problem.id);
    this.lowPriorityProblems = this.lowPriorityProblems.filter((p) => p.id !== problem.id);

    // Agregar el problema a la lista correspondiente según su nueva prioridad
    switch (problem.priority) {
      case 'High':
        this.highPriorityProblems.push(problem);
        break;
      case 'Medium':
        this.mediumPriorityProblems.push(problem);
        break;
      case 'Low':
        this.lowPriorityProblems.push(problem);
        break;
      default:
        this.mediumPriorityProblems.push(problem); 
    }
  }

  // Métodos para guardar y confirmar prioridades
  savePrioritization(): void {
    // Combinar todas las listas en una sola
    const allProblems = [
      ...this.highPriorityProblems,
      ...this.mediumPriorityProblems,
      ...this.lowPriorityProblems
    ];

    // Actualizar problemas
    if (this.projectId !== null) {
      this.projectService.updatePrioritizedDQProblem(this.projectId, allProblems).subscribe({
        next: (response) => {
          //console.log("Priorities updated successfully:", response);
          // Marcar como completado solo si había cambios desde el estado inicial
          if (this.isInitialPrioritization()) {
            this.hasCompletedInitialPrioritization = true;
          }
          this.notificationService.showSuccess('DQ Problems prioritization was successfully saved');

          if (this.projectId)
            this.loadPrioritizedDQProblems(this.projectId);

        },
        error: (error) => {
          console.error("Error updating priorities:", error);
          this.notificationService.showError('Failed to save DQ Problems prioritization.');
        }
      });
    }
  }


  // ========== VALIDACIONES DE PRIORIZACIÓN ==========

  // Determina si la priorización actual es la inicial (sin cambios del usuario)
  isInitialPrioritization(): boolean {
    if (!this.highPriorityProblems.length && 
        !this.mediumPriorityProblems.length && 
        !this.lowPriorityProblems.length) {
      return true;
    }
    if (this.mediumPriorityProblems.length > 0 && 
        this.highPriorityProblems.length === 0 && 
        this.lowPriorityProblems.length === 0) {
      return true;
    }
  
    return false;
  }

  // Verifica si la priorización está vacía o en estado inicial
  // No existe priorización si no hay problemas o todos están en prioridad media
  hasEmptyInitialPrioritization(): boolean {
    // No hay problemas
    if (!this.highPriorityProblems.length && 
        !this.mediumPriorityProblems.length && 
        !this.lowPriorityProblems.length) {
      return true;
    }

    // Todos están en Medium 
    if (this.mediumPriorityProblems.length > 0 && 
        this.highPriorityProblems.length === 0 && 
        this.lowPriorityProblems.length === 0) {
      return true;
    }
  
    return false;
  }


  // ========== CONFIRMAR PRIORIZACION ==========

  openSaveConfirmationModal(): void {
    this.isConfirmationModalOpen = true;
    this.confirmationModalTitle = 'DQ Problems Prioritization';
    this.confirmationModalMessage = 'Are you sure you want to save these priority changes? This will update the prioritization of your data quality problems.';
  }

  handleConfirm(): void {
    this.isConfirmationModalOpen = false;
    this.savePrioritization();
  }

  handleCancel(): void {
    this.isConfirmationModalOpen = false;
  }

  // ========== NAVEGACIÓN ==========

  //Navega al siguiente paso si se cumplen las validaciones
  nextStep(): void {
    //Permitir avanzar si realizo priorizacion al menos una vez
    if (this.hasCompletedInitialPrioritization || !this.isInitialPrioritization()) {
      this.router.navigate(['/st4/a09-2']);
      //isNextStepEnabled: true;
    } else {
      this.confirmationModalTitle = 'Priorización Requerida';
      this.confirmationModalMessage = 'Debes realizar y guardar una priorización inicial antes de continuar';
      this.isConfirmationModalOpen = true;
    }
  }

  onStepChange(step: number) {
    this.currentStep = step;
    this.navigateToStep(step);
  }
  
  navigateToStep(stepIndex: number) {
    const route = this.steps[stepIndex].route;
    this.router.navigate([route]);
  }

}