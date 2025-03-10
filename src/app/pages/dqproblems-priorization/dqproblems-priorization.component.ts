import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem  } from '@angular/cdk/drag-drop';
import dataQualityProblemsJson from '../../../assets/data-quality-problems.json';
import contextComponentsJson from '../../../assets/context-components.json';

import { DqProblemsService } from '../../shared/dq-problems.service';
import { Router } from '@angular/router';

import { DqModelService } from '../../services/dq-model.service';

import { ProjectService } from '../../services/project.service';

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
  styleUrl: './dqproblems-priorization.component.css',
  encapsulation: ViewEncapsulation.None
})
export class DQProblemsPriorizationComponent implements OnInit {

  dqModelId = -1;

  currentStep: number = 0;
  pageStepTitle: string = 'Prioritization of DQ problems';
  phaseTitle: string = 'Phase 2: DQ Assessment';
  stageTitle: string = 'Stage 4: DQ Model Definition';

  //problems: DataQualityProblem[] = [];
  contextComponents: ContextComponent[] = [];
  selectedProblem: DataQualityProblem | null = null;
  detailsVisible: boolean = false;
  isOrderConfirmed: boolean = false;

  // PROBLEMAS PRIORIZADOS
  problems: any[] = [];

  constructor(
    private router: Router, 
    private dqProblemsService: DqProblemsService,
    public modelService: DqModelService,
    private projectService: ProjectService
  ) { }

  /*constructor(private router: Router) { }
  constructor(private dqProblemsService: DqProblemsService) { }*/

  qualityDimensions: QualityDimension[] = [
    { id: 1, name: 'Exactitud (accuracy)' },
    { id: 2, name: 'Completitud (completeness)' },
    { id: 3, name: 'Frescura (freshness)' },
    { id: 4, name: 'Consistencia (consistency)' },
    { id: 5, name: 'Unicidad (uniqueness)' }
  ];

  qualityFactors: QualityFactor[] = [
    { id: 1, dimensionId: 1, name: 'Exactitud semántica' },
    { id: 2, dimensionId: 1, name: 'Exactitud sintáctica' },
    { id: 3, dimensionId: 1, name: 'Precision' },
    { id: 4, dimensionId: 2, name: 'Coverage' },
    { id: 5, dimensionId: 2, name: 'Density' },
    { id: 6, dimensionId: 3, name: 'Actualidad (currency)' },
    { id: 7, dimensionId: 3, name: 'Oportunidad (timeliness)' },
    { id: 8, dimensionId: 3, name: 'Volatilidad (volatility)' },
    { id: 9, dimensionId: 4, name: 'Integridad de dominio' },
    { id: 10, dimensionId: 4, name: 'Integridad intra-relación' },
    { id: 11, dimensionId: 4, name: 'Integridad inter-relación' },
    { id: 12, dimensionId: 5, name: 'No-duplicación (duplication-free) ' },
    { id: 13, dimensionId: 5, name: 'No-contradicción (contradiction-free)' }
  ];

  /* METRICS, METHODS BASE variables */
  //load metrics and methods base
  dqMetricsBase: any[] = [];
  dqMethodsBase: any[] = [];

  //PROJECT
  project: any; 
  //projectId: number = 1;
  projectId: number | null = null;
  noProjectMessage: string = "";  

  ngOnInit() {
    this.projectId = this.projectService.getProjectId();
    console.log("projectIdGet: ", this.projectId);

    //this.getProjectById(this.projectId);
    /*this.projectService.getProject().subscribe({
      next: (project) => {
        this.project = project;
        console.log('Proyecto obtenido mediante el servicio:', this.project);
      },
      error: (err) => {
        console.error('Error al cargar el proyecto en el componente:', err);
      }
    });*/
    this.loadCurrentProject();


    this.problems = dataQualityProblemsJson as DataQualityProblem[];
    this.problems.forEach(problem => {
      problem.priorityType = 'Media';
    });

    this.contextComponents = contextComponentsJson as ContextComponent[];


  }

  loadCurrentProject(): void {
    this.projectService.getCurrentProject().subscribe({
      next: (project) => {
        this.project = project;
        console.log('Proyecto cargado en el componente:', this.project);
        this.projectId = project.id;

        //Load complete DQ Model (with Dimensions,Factors...) of current project
        //this.loadCurrentDQModel();
        //OBTENER ID DQMODEL
        this.dqModelId = this.project?.dqmodel_version ?? -1; 
        console.log("---DQ MODEL ID: ", this.dqModelId)

        



        this.loadDQProblems_(this.project.id);

      },
      error: (err) => {
        console.error('Error al cargar el proyecto en el componente:', err);
      }
    });
  }

  // Use string IDs for the drop lists
  highPriorityId = 'high-priority';
  mediumPriorityId = 'medium-priority';
  lowPriorityId = 'low-priority';

  drop(event: CdkDragDrop<any[]>) {
    if (event.previousContainer === event.container) {
      // Same container - reorder
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
      
      // Update the problem's priority based on destination container
      const containerData = event.container.data;
      const movedItem = containerData[event.currentIndex];
      
      if (event.container.id === this.highPriorityId) {
        movedItem.priority = 'High';
      } else if (event.container.id === this.mediumPriorityId) {
        movedItem.priority = 'Medium';
      } else if (event.container.id === this.lowPriorityId) {
        movedItem.priority = 'Low';
      }
    }

    this.updateProblemLists();
  }


  // Método para actualizar las listas de problemas
  updateProblemLists(): void {
    this.highPriorityProblems = this.highPriorityProblems.filter((problem) => problem.priority === 'High');
    this.mediumPriorityProblems = this.mediumPriorityProblems.filter((problem) => problem.priority === 'Medium');
    this.lowPriorityProblems = this.lowPriorityProblems.filter((problem) => problem.priority === 'Low');
  }

  // Método para obtener la prioridad según el ID del contenedor
  getPriorityFromContainerId(containerId: string): string {
    switch (containerId) {
      case 'high-priority':
        return 'High';
      case 'medium-priority':
        return 'Medium';
      case 'low-priority':
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
  

  // Método para guardar los cambios de prioridad
  saveChanges(): void {
    const updatedProblems = [
      ...this.highPriorityProblems.map((problem) => ({ ...problem, priority: 'High' })),
      ...this.mediumPriorityProblems.map((problem) => ({ ...problem, priority: 'Medium' })),
      ...this.lowPriorityProblems.map((problem) => ({ ...problem, priority: 'Low' })),
    ];

    // Enviar los datos actualizados al backend
    /*this.projectService.updatePrioritizedProblems(updatedProblems).subscribe({
      next: (response) => {
        console.log('Prioridades guardadas:', response);
      },
      error: (err) => {
        console.error('Error al guardar las prioridades:', err);
      },
    });*/
  }






  dropProblem(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.problems, event.previousIndex, event.currentIndex);
    this.updatePriority();
  }

  updatePriority() {
    this.problems.forEach((problem, index) => {
      problem.priority = index + 1; // Actualiza la prioridad localmente
    });
  }

  confirmPriorities() {
    this.problems.forEach((problem, index) => {
      //const updatedData = { priority: index + 1 }; // Asigna la nueva prioridad
      console.log(`Problem ID: ${problem.id}, Priority Type: ${problem.priority_type}`); // Verifica el valor actualizado
      
      // valor de priority_type elegido por el usuario
      const newPriorityType = problem.priority_type; 

    
      const updatedData = { 
        priority: index + 1,   
        description: problem.description,  // mantiene la descripción original
        dq_model: problem.dq_model,  // mantiene el dq_model original
        priority_type: newPriorityType
      };
      //console.log("EACH PROBLEM: ", problem);
      console.log("UPDATED DATA: ", updatedData);
  
      if (!problem.dq_model) {
        console.error(`El problema con ID ${problem.id} no tiene asociado un dq_model.`);
        return; // O manejar el error de otra forma
      }
  
      this.modelService.updatePrioritizedProblem(problem.dq_model, problem.id, updatedData)
        .subscribe({
          next: () => console.log(`Prioridad del problema ${problem.id} actualizada correctamente.`),
          error: (err) => console.error(`Error al actualizar el problema ${problem.id}:`, err),
        });
    });
  }


  /*saveOrder() {
    this.isOrderConfirmed = true;
    this.dqProblemsService.updateProblems(this.problems);
    console.log(this.problems); 
  }*/

  savePrioritization() {

    console.log("HIGH PRIORITY selection:", this.highPriorityProblems);
    console.log("MEDIUM PRIORITY selection:",this.mediumPriorityProblems);
    console.log("LOW PRIORITY selection:",this.lowPriorityProblems);


    // Combinar todas las listas en una sola
    const allProblems = [
      ...this.highPriorityProblems,
      ...this.mediumPriorityProblems,
      ...this.lowPriorityProblems
    ];

    console.log("All problems to update:", allProblems);

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


  saveOrder() {
    this.confirmPriorities();
    // Lógica para guardar el orden
    this.isOrderConfirmed = true;
    //this.dqProblemsService.updateProblems(this.problems);
    console.log(this.problems);
    alert("DQ Problems piorizitation was saved")


  }

  nextStep() {
    this.router.navigate(['/step2']);
    // Redirigir solo si la orden se confirma
    /*if (this.isOrderConfirmed) {
      this.router.navigate(['/step2']);
    } else {
      alert("Please confirm order")
    }*/
  }

  

  // DQ PROBLEMS
  // Obtener los problemas de calidad del proyecto
  dqProblems_: any[] = [];  
  prioritizedDQProblems: any[] = [];  
  dqProblemDetails: any = null; 

  loadDQProblems_(projectId: number): void {
    this.projectService.getDQProblemsByProjectId(projectId).subscribe({
      next: (data) => {
        this.dqProblems_ = data;
        console.log('Problemas de calidad BASE:', data);

        //this.loadPrioritizedDQProblems_(projectId);
        this.loadPrioritizedDQProblems(projectId);
      },
      error: (err) => {
        console.error('Error al obtener los problemas de calidad:', err);
      },
    });
  }

  highPriorityProblems: any[] = []; // Problemas de alta prioridad
  mediumPriorityProblems: any[] = []; // Problemas de media prioridad
  lowPriorityProblems: any[] = []; // Problemas de baja prioridad


  // Método para cargar los problemas priorizados
  loadPrioritizedDQProblems(projectId: number): void {
    this.projectService.getPrioritizedDQProblemsByProjectId(projectId).subscribe({
      next: (data) => {
        // Inicializar las listas de prioridad
        this.highPriorityProblems = data.filter((problem: { priority: string; }) => problem.priority === 'High');
        this.mediumPriorityProblems = data.filter((problem: { priority: string; }) => problem.priority === 'Medium');
        this.lowPriorityProblems = data.filter((problem: { priority: string; }) => problem.priority === 'Low');

        // Obtener los detalles adicionales (description y date) para cada problema
        this.highPriorityProblems.forEach((problem) => this.getDQProblemDetails(problem.dq_problem_id, problem));
        this.mediumPriorityProblems.forEach((problem) => this.getDQProblemDetails(problem.dq_problem_id, problem));
        this.lowPriorityProblems.forEach((problem) => this.getDQProblemDetails(problem.dq_problem_id, problem));

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

  /*loadPrioritizedDQProblems_(projectId: number): void {
    this.projectService.getPrioritizedDQProblemsByProjectId(projectId).subscribe({
      next: (data) => {

        this.prioritizedDQProblems = data;
        this.prioritizedDQProblems.forEach((problem) => {
          this.getDQProblemDetails(problem.dq_problem_id, problem);
        });

        console.log('Problemas priorizados:', this.prioritizedDQProblems);

      },
      error: (err) => {
        console.error('Error al obtener los problemas de calidad priorizados:', err);
      },
    });
  }*/

  // Método para cargar los detalles de un problema de calidad (sin priorización)
  /*loadDQProblemDetails(dqProblemId: number): void { 
    this.projectService.getDQProblemById(dqProblemId).subscribe({
      next: (data) => {
        this.problemDetails = data;
        console.log(`Detalles del problema de calidad: ${dqProblemId}`, this.problemDetails);
      },
      error: (err) => {
        console.error('Error al obtener los detalles del problema de calidad:', err);
      },
    });
  }*/
  // Método para cargar los detalles de un problema de calidad
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

  getDQProblemDetails_(dqProblemId: number): void {
    const problem = this.dqProblems_.find((p) => p.id === dqProblemId);
    if (problem) {
      this.dqProblemDetails = problem;
      console.log('Detalles del problema de calidad:', this.dqProblemDetails);
    } else {
      console.error('Problema no encontrado:', dqProblemId);
      this.dqProblemDetails = null;
    }
  }




  
}
