import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
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


    /*this.getDQMetricsBase();
    this.getDQMethodsBase();*/


    this.problems = dataQualityProblemsJson as DataQualityProblem[];
    this.problems.forEach(problem => {
      problem.priorityType = 'Media';
    });

    this.contextComponents = contextComponentsJson as ContextComponent[];


    //this.loadDQProblems();
  }

  loadCurrentProject(): void {
    this.projectService.getCurrentProject().subscribe({
      next: (project) => {
        this.project = project;
        console.log('Proyecto cargado en el componente:', this.project);

        //Load complete DQ Model (with Dimensions,Factors...) of current project
        //this.loadCurrentDQModel();
        //OBTENER ID DQMODEL
        this.dqModelId = this.project?.dqmodel_version ?? -1; 
        console.log("---DQ MODEL ID: ", this.dqModelId)
        this.loadDQProblems();

      },
      error: (err) => {
        console.error('Error al cargar el proyecto en el componente:', err);
      }
    });
  }



  // METRICS BASE
  getDQMethodsBase() {
    this.modelService.getDQMethodsBase().subscribe({
      next: (data) => {
        this.modelService.metrics = data;
        console.log('METHODS BASE obtenidos del servicio:', data); 
      },
      error: (err) => {
        console.log(err);
      },  
    });
  }

  // METHODS BASE
  getDQMetricsBase() {
    this.modelService.getDQMetricsBase().subscribe({
      next: (data) => {
        this.modelService.metrics = data;
        console.log('METHODS BASE obtenidos del servicio:', data); 
      },
      error: (err) => {
        console.log(err);
      },  
    });
  }



  drop(event: CdkDragDrop<string[]>) {
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

  getContextDescription(contextId: string): string {
    const context = this.contextComponents.find(c => c.id === contextId);
    return context && context.description ? context.description : 'No description';
  }
  

  addContextComponent(problem: DataQualityProblem, event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const contextId = selectElement.value;
    if (contextId) { // Verifica que contextId no sea nulo ni una cadena vacía
      if (!problem.contextcomp_related_to.includes(contextId)) {
        problem.contextcomp_related_to.push(contextId);
      }
    }
  }

  removeContextComponent(problem: DataQualityProblem, contextId: string) {
    const index = problem.contextcomp_related_to.indexOf(contextId);
    if (index !== -1) {
      problem.contextcomp_related_to.splice(index, 1);
    }
  }



  // DQ PROBLEMS

  dqProblems: any[] = []; // Almacenar las versiones del contexto


  loadDQProblems(): void {
    this.projectService.getDQProblems().subscribe({
      next: (dqproblems) => {
        this.dqProblems = dqproblems;
        console.log('*** Project original DQ Problems:', this.dqProblems);

        //this.createPrioritizedProblems();
        this.checkIfPrioritizedProblemsExist(this.dqModelId);

      },
      error: (err) => {
        console.error('*** Error al cargar los DQ Problems:', err);
      }
    });
  }

  checkIfPrioritizedProblemsExist(dqModelId: number): void {
    this.modelService.getPrioritizedDqProblems(dqModelId).subscribe({
      next: (prioritizedProblems) => {
        if (prioritizedProblems && prioritizedProblems.length > 0) {
          this.problems = prioritizedProblems;
          console.log('*** Prioritized problems already exist:', this.problems);
          // Aquí puedes manejar la situación si los problemas ya existen (e.g., mostrar un mensaje al usuario)
        } else {
          console.log('*** No prioritized problems found. Creating new ones.');
          this.createPrioritizedProblems(); // Crear nuevos problemas si no existen
        }
      },
      error: (err) => {
        console.error('*** Error al verificar los problemas priorizados:', err);
        // Aquí puedes manejar el error si ocurre
      }
    });
  }
  

  
  createPrioritizedProblems(): void {
    // Pasamos los problemas al servicio para crear los problemas priorizados
    this.modelService.createPrioritizedProblems(this.dqProblems, this.dqModelId).subscribe(
      response => {
        this.problems = response;
        console.log('Prioritized problems created:', this.problems);
        
      },
      error => {
        console.error('Error creating prioritized problems:', error);
      }
    );
  }

  
}
