import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Router } from '@angular/router';

import { DqModelService } from '../../services/dq-model.service';
import { ProjectService } from '../../services/project.service';
import { ProjectDataService } from '../../services/project-data.service';

import dataQualityProblemsJson from '../../../assets/data-quality-problems.json';
import contextComponentsJson from '../../../assets/context-components.json';

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

interface ContextComponent {
  id: string;
  type: string;
  description: string;
}

interface QualityDimension {
  id: number;
  name: string;
}

interface QualityFactor {
  id: number;
  dimensionId: number;
  name: string;
}

@Component({
  selector: 'app-dqproblems-priorization',
  templateUrl: './dqproblems-priorization.component.html',
  styleUrls: ['./dqproblems-priorization.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class DQProblemsPriorizationComponent implements OnInit {

  steps = [
    { displayName: 'A09.1', route: 'st4/a09-1' },
    { displayName: 'A09.2', route: 'st4/a09-2' },
    { displayName: 'A10', route: 'st4/a10' },
    { displayName: 'A11', route: 'st4/a11' },
    { displayName: 'A12', route: 'st4/a12' },
    { displayName: 'DQ Model Confirmation', route: 'st4/confirmation-stage-4' }
  ];

  // Variables de estado del componente
  currentStep: number = 0;
  pageStepTitle: string = 'Prioritization of DQ problems';
  phaseTitle: string = 'Phase 2: DQ Assessment';
  stageTitle: string = 'Stage 4: DQ Model Definition';

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
  dqModel: any = null;

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

  constructor(
    private router: Router,
    public modelService: DqModelService,
    private projectService: ProjectService,
    private projectDataService: ProjectDataService,
  ) { }

  ngOnInit() {
    // Obtener el Project ID actual
    this.projectId = this.projectDataService.getProjectId();
    console.log("projectIdGet: ", this.projectId);

    // Suscribirse a los observables del servicio
    this.subscribeToData();


    // Sincronizar el paso actual con la ruta
    this.syncCurrentStepWithRoute();
  }

  syncCurrentStepWithRoute() {
    const currentRoute = this.router.url; // Obtiene la ruta actual (por ejemplo, '/st4/a09-1')
    const stepIndex = this.steps.findIndex(step => step.route === currentRoute);
    if (stepIndex !== -1) {
      this.currentStep = stepIndex;
    }
  }

  // Métodos de suscripción a datos
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
      this.dqProblems_ = data;
      console.log('DQ Problems:', data);

      // Una vez que los problemas están cargados, cargar los problemas priorizados
      if (this.projectId !== null) {
        this.loadPrioritizedDQProblems(this.projectId);
      }
    });

    // Suscribirse a la versión del modelo de calidad de datos (DQ Model Version)
    this.projectDataService.dqModelVersion$.subscribe((dqModelVersionId) => {
      this.dqModelVersionId = dqModelVersionId;
      console.log('DQ Model Version ID:', this.dqModelVersionId);
    });
  }

  // Métodos para manejar la priorización de problemas
  loadPrioritizedDQProblems(projectId: number): void {
    this.projectService.getPrioritizedDQProblemsByProjectId(projectId).subscribe({
      next: (data) => {
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

        console.log('Problemas priorizados:', {
          high: this.highPriorityProblems,
          medium: this.mediumPriorityProblems,
          low: this.lowPriorityProblems,
        });
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

  // Métodos para manejar el drag and drop
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
        this.mediumPriorityProblems.push(problem); // Valor por defecto
    }
  }

  // Métodos para guardar y confirmar prioridades
  savePrioritization(): void {
    console.log("HIGH PRIORITY selection:", this.highPriorityProblems);
    console.log("MEDIUM PRIORITY selection:", this.mediumPriorityProblems);
    console.log("LOW PRIORITY selection:", this.lowPriorityProblems);

    // Combinar todas las listas en una sola
    const allProblems = [
      ...this.highPriorityProblems,
      ...this.mediumPriorityProblems,
      ...this.lowPriorityProblems
    ];

    // Llamar al servicio para actualizar los problemas usando PATCH
    if (this.projectId !== null) {
      this.projectService.updatePrioritizedDQProblem(this.projectId, allProblems).subscribe({
        next: (response) => {
          console.log("Priorities updated successfully:", response);
          alert("DQ Problems prioritization was saved successfully!");
        },
        error: (error) => {
          console.error("Error updating priorities:", error);
          alert("Error updating priorities. Please try again.");
        }
      });
    }
  }

  saveOrder(): void {
    this.confirmPriorities();
    this.isOrderConfirmed = true;
    console.log(this.problems);
    alert("DQ Problems prioritization was saved");
  }

  confirmPriorities(): void {
    this.problems.forEach((problem, index) => {
      const newPriorityType = problem.priority_type;
      const updatedData = {
        priority: index + 1,
        description: problem.description,
        dq_model: problem.dq_model,
        priority_type: newPriorityType
      };

      if (!problem.dq_model) {
        console.error(`El problema con ID ${problem.id} no tiene asociado un dq_model.`);
        return;
      }

      this.modelService.updatePrioritizedProblem(problem.dq_model, problem.id, updatedData)
        .subscribe({
          next: () => console.log(`Prioridad del problema ${problem.id} actualizada correctamente.`),
          error: (err) => console.error(`Error al actualizar el problema ${problem.id}:`, err),
        });
    });
  }

  // Navegación
  nextStep(): void {
    this.router.navigate(['/st4/a09-2']);
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