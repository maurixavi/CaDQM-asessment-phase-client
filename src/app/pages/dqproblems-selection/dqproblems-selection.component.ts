import { Component, Input, OnInit, AfterViewInit, ViewEncapsulation  } from '@angular/core';
// import { DataQualityProblem } from '../dqproblems-priorization/dqproblems-priorization.component'; 
import { DqProblemsService } from '../../shared/dq-problems.service';
import { Router } from '@angular/router';

import { ProjectService } from '../../services/project.service';
import { DqModelService } from '../../services/dq-model.service';

declare var bootstrap: any; 

export interface PrioritizedProblem {
  id: number;
  description: string;
  priority: number;
  priority_type: string;
  is_selected?: boolean; // Opcional si aún no lo usas en todos lados
}

interface DataQualityProblem {
  id: number;
  name: string;
  description: string;
  contextcomp_related_to: string[];
  priority: number;
  priorityType: string;
  selectedFactors?: number[];
}



@Component({
  selector: 'app-dqproblems-selection',
  templateUrl: './dqproblems-selection.component.html',
  styleUrl: './dqproblems-selection.component.css',
  encapsulation: ViewEncapsulation.None
})
export class DQProblemsSelectionComponent implements OnInit {
  dqModelId = -1;

  //PROJECT
  project: any; 
  //projectId: number = 1;
  projectId: number | null = null;

  currentStep: number = 1; //Step 2
  pageStepTitle: string = 'Selection of prioritized DQ problems';
  phaseTitle: string = 'Phase 2: DQ Assessment';
  stageTitle: string = 'Stage 4: DQ Model Definition';


  //prioritizedProblems: DataQualityProblem[] = [];
  selectedProblem: DataQualityProblem | null = null;
  detailsVisible: boolean = false;
  selectedProblems: DataQualityProblem[] = [];
  isSelectionConfirmed: boolean = false;



 
  // PROBLEMAS PRIORIZADOS
  selectedPrioritizedProblems: any[] = [];

  prioritizedProblems: any[] = [];
  //problems: any[] = [];

  constructor(
    private router: Router, 
    private problemsService: DqProblemsService,
    public modelService: DqModelService,
    private projectService: ProjectService
  ) { }

  ngOnInit() {
    this.problemsService.currentProblems.subscribe(problems => this.prioritizedProblems = problems);
    //this.contextComponents = contextComponentsJson;



    this.loadCurrentProject();
  }


  ngAfterViewInit() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }

  /*showDetails(problem: DataQualityProblem) { 
    this.selectedProblem = problem;
    this.detailsVisible = true;
    console.log(problem.contextcomp_related_to)
    problem.contextcomp_related_to.forEach(contextId => {
      const description = this.getContextDescription(contextId);
      console.log(`Context ID ${contextId} - Description: ${description}`);
    });
  }*/

  hideDetails() {
    this.detailsVisible = false;
    this.selectedProblem = null;
  }

  /*addProblem(problem: DataQualityProblem) {
    const index = this.selectedProblems.indexOf(problem);
    if (index === -1) {
      this.selectedProblems.push(problem);
    } else {
      this.selectedProblems.splice(index, 1);
    }
  }*/

  removeSelectedProblem(problem: any) {
    const index = this.selectedPrioritizedProblems.indexOf(problem);
    if (index !== -1) {
      this.selectedPrioritizedProblems.splice(index, 1);
    }
  }

  confirmSelectedProblems() {
    this.isSelectionConfirmed = true;

    this.problemsService.updateSelectedProblems(this.selectedProblems);
    this.saveSelectedPrioritizedProblems()
    
    console.log(this.selectedPrioritizedProblems);
    
    if (this.isSelectionConfirmed) {
      this.router.navigate(['/step3']);
    }
  }

  /*getContextDescription(contextId: string): string {
    const idNumber = parseInt(contextId, 10); // Convertir contextId a número
    const context = this.prioritizedProblems.find(problem => problem.id === idNumber);
    return context ? context.description : 'No description';
  }*/

  


  /*getContextDescription(contextId: string): string {
    return this.contextComponents[contextId] || 'No description';
  }*/
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
        this.getPrioritizedDqProblems(this.dqModelId);
        //this.getSelectedPrioritizedDqProblems(this.dqModelId);
        this.fetchSelectedProblems(this.dqModelId);
        

      },
      error: (err) => {
        console.error('Error al cargar el proyecto en el componente:', err);
      }
    });
  }


  getPrioritizedDqProblems(dqModelId: number): void {
    this.modelService.getPrioritizedDqProblems(dqModelId).subscribe({
      next: (prioritizedProblems) => {
        if (prioritizedProblems && prioritizedProblems.length > 0) {
          this.prioritizedProblems = prioritizedProblems;
          console.log('*Prioritized problems Loaded:', this.prioritizedProblems);


        } else {
          console.log('*** No prioritized problems found.');
        }
      },
      error: (err) => {
        console.error('*Error al verificar los problemas priorizados:', err);
        // Aquí puedes manejar el error si ocurre
      }
    });
  }


  addProblemToSelection(problem: any): void {
    // Agregar solo si no está ya en ninguna de las listas
    const existsInLoaded = this.loadedSelectedPrioritizedProblems.some((p) => p.id === problem.id);
    const existsInNewlySelected = this.selectedPrioritizedProblems.some((p) => p.id === problem.id);
  
    if (!existsInLoaded && !existsInNewlySelected) {
      this.selectedPrioritizedProblems.push(problem);
      console.log(`Problema agregado: ${problem.description}`);
      console.log("PROBLEMS ADDED: ", this.selectedPrioritizedProblems)
    } else {
      console.log(`El problema ${problem.description} ya está en la selección.`);
    }
  }
  
  removeProblemFromSelection(problem: any): void {
    // Elimina de la lista dinámica
    this.selectedPrioritizedProblems = this.selectedPrioritizedProblems.filter((p) => p.id !== problem.id);
  }

  addProblemToSelection2(problem: PrioritizedProblem): void {
    // Verifica si ya está en la selección para evitar duplicados
    const exists = this.selectedPrioritizedProblems.some(p => p.id === problem.id);
    if (!exists) {
      this.selectedPrioritizedProblems.push(problem);
      console.log(`Problema agregado: ${problem.description}`);
      console.log("PROBLEMS ADDED: ", this.selectedPrioritizedProblems)
    } else {
      console.log(`El problema ${problem.description} ya está en la selección.`);
    }
  }

  saveSelectedPrioritizedProblems(): void {
    this.selectedPrioritizedProblems.forEach((problem) => {
      if (!problem.dq_model || !problem.id) {
        console.error(`El problema ${problem.description} no tiene dq_model o id.`);
        return;
      }
  
      const updatedData = { is_selected: true }; // Cambia el valor según sea necesario
      this.modelService.updatePrioritizedProblemAttribute(problem.dq_model, problem.id, updatedData)
        .subscribe({
          next: () => console.log(`Problema ${problem.id} actualizado correctamente.`),
          error: (err) => console.error(`Error al actualizar el problema ${problem.id}:`, err),
        });
    });
  }



  // CARGAR PROBLEMAS PRIORIZADOS SELECCIONADOS
  loadedSelectedPrioritizedProblems: any[] = [];

  fetchSelectedProblems(dqModelId: number): void {
    this.modelService.getSelectedPrioritizedDqProblems(dqModelId).subscribe({
      next: (fetchedSelectedProblems) => {
        if (fetchedSelectedProblems && fetchedSelectedProblems.length > 0) {
          this.loadedSelectedPrioritizedProblems = fetchedSelectedProblems;
          console.log('*LOAD SELECTED Prioritized problems:', this.loadedSelectedPrioritizedProblems);

          //this.selectedPrioritizedProblems = [...fetchedSelectedProblems];

        } else {
          console.log('*** No selected problems found.');
        }
      },
      error: (err) => {
        console.error('*Error al cargar problemas seleccionados:', err);
      }
    });
  }


  
  
  isSelectedProblemVisible: boolean = false;  

  toggleSelectedProblemVisibility() {
    this.isSelectedProblemVisible = !this.isSelectedProblemVisible;  
  }

  isProblemSelected(problem: any): boolean {
    return this.loadedSelectedPrioritizedProblems.some(p => p.id === problem.id) || 
           this.selectedPrioritizedProblems.some(p => p.id === problem.id);
  }
}
