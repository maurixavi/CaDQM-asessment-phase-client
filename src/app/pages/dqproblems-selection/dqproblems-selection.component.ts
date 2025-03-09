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

  removeSelectedProblem_OLD(problem: any) {
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

        this.projectId = project.id;

        //Load complete DQ Model (with Dimensions,Factors...) of current project
        //this.loadCurrentDQModel();
        //OBTENER ID DQMODEL
        this.dqModelId = this.project?.dqmodel_version ?? -1; 
        console.log("---DQ MODEL ID: ", this.dqModelId)
        this.getPrioritizedDqProblems(this.dqModelId);
        //this.getSelectedPrioritizedDqProblems(this.dqModelId);
        this.fetchSelectedProblems(this.dqModelId);


        this.loadDQProblems_(this.project.id);
        

      },
      error: (err) => {
        console.error('Error al cargar el proyecto en el componente:', err);
      }
    });
  }

    // DQ PROBLEMS
  highPriorityProblemsSelected: any[] = []; // Problemas de alta prioridad seleccionados
  mediumPriorityProblemsSelected: any[] = []; // Problemas de media prioridad seleccionados
  lowPriorityProblemsSelected: any[] = []; // Problemas de baja prioridad seleccionados

  selectedPrioritizedDQProblems: any[] = [];  

  removeSelectedProblem__(problem: any): void {
    const priority = problem.priority;

    // Comprobar la prioridad y eliminar el problema del array correspondiente
    if (priority === 'High') {
      // Eliminar de highPriorityProblemsSelected
      const index = this.highPriorityProblemsSelected.findIndex(p => p.id === problem.id);
      if (index !== -1) {
        this.highPriorityProblemsSelected.splice(index, 1); // Eliminar problema
        console.log('Problema eliminado de High Priority:', problem);
      }
    } else if (priority === 'Medium') {
      // Eliminar de mediumPriorityProblemsSelected
      const index = this.mediumPriorityProblemsSelected.findIndex(p => p.id === problem.id);
      if (index !== -1) {
        this.mediumPriorityProblemsSelected.splice(index, 1); // Eliminar problema
        console.log('Problema eliminado de Medium Priority:', problem);
      }
    } else if (priority === 'Low') {
      // Eliminar de lowPriorityProblemsSelected
      const index = this.lowPriorityProblemsSelected.findIndex(p => p.id === problem.id);
      if (index !== -1) {
        this.lowPriorityProblemsSelected.splice(index, 1); // Eliminar problema
        console.log('Problema eliminado de Low Priority:', problem);
      }
    }
  
    // Actualizar la lista general de problemas seleccionados
    const allProblemsSelected = [
      ...this.highPriorityProblemsSelected,
      ...this.mediumPriorityProblemsSelected,
      ...this.lowPriorityProblemsSelected
    ];
  
    this.selectedPrioritizedDQProblems = allProblemsSelected;
  
    console.log('Problemas seleccionados actualizados:', this.selectedPrioritizedDQProblems);
  }
  

  addAllProblems(problems: any[], priority: string): void {
    // Dependiendo de la prioridad, agrega todos los problemas a la lista correspondiente
    if (priority === 'High') {
      this.highPriorityProblemsSelected.push(...problems);
    } else if (priority === 'Medium') {
      this.mediumPriorityProblemsSelected.push(...problems);
    } else if (priority === 'Low') {
      this.lowPriorityProblemsSelected.push(...problems);
    }
  
    // Actualiza la lista de todos los problemas seleccionados
    const allProblemsSelected = [
      ...this.highPriorityProblemsSelected,
      ...this.mediumPriorityProblemsSelected,
      ...this.lowPriorityProblemsSelected
    ];
  
    this.selectedPrioritizedDQProblems = allProblemsSelected;
  
    console.log("Problemas seleccionados:", this.selectedPrioritizedDQProblems);
  }

  removeAllProblems(problems: any[], priority: string): void {
  // Dependiendo de la prioridad, elimina todos los problemas de la lista correspondiente
  if (priority === 'High') {
    // Filtra los problemas seleccionados de alta prioridad y los elimina
    this.highPriorityProblemsSelected = this.highPriorityProblemsSelected.filter(problem => !problems.includes(problem));
  } else if (priority === 'Medium') {
    // Filtra los problemas seleccionados de media prioridad y los elimina
    this.mediumPriorityProblemsSelected = this.mediumPriorityProblemsSelected.filter(problem => !problems.includes(problem));
  } else if (priority === 'Low') {
    // Filtra los problemas seleccionados de baja prioridad y los elimina
    this.lowPriorityProblemsSelected = this.lowPriorityProblemsSelected.filter(problem => !problems.includes(problem));
  }

  // Actualiza la lista de todos los problemas seleccionados
  const allProblemsSelected = [
    ...this.highPriorityProblemsSelected,
    ...this.mediumPriorityProblemsSelected,
    ...this.lowPriorityProblemsSelected
  ];

  this.selectedPrioritizedDQProblems = allProblemsSelected;

  console.log("Problemas seleccionados después de eliminar:", this.selectedPrioritizedDQProblems);
}

  isProblemSelected(problem: any): boolean {
    return this.selectedPrioritizedDQProblems.some(p => p.id === problem.id);
  }

  // Método para eliminar un problema de la selección
  removeSelectedProblem(problem: any): void {
    // Eliminar el problema de la lista correspondiente según su prioridad
    if (problem.priority === 'High') {
      this.highPriorityProblemsSelected = this.highPriorityProblemsSelected.filter(p => p.id !== problem.id);
    } else if (problem.priority === 'Medium') {
      this.mediumPriorityProblemsSelected = this.mediumPriorityProblemsSelected.filter(p => p.id !== problem.id);
    } else if (problem.priority === 'Low') {
      this.lowPriorityProblemsSelected = this.lowPriorityProblemsSelected.filter(p => p.id !== problem.id);
    }
  
    // Actualizar la lista general de problemas seleccionados
    this.selectedPrioritizedDQProblems = [
      ...this.highPriorityProblemsSelected,
      ...this.mediumPriorityProblemsSelected,
      ...this.lowPriorityProblemsSelected
    ];
  
    console.log('Problema eliminado:', problem);
  }
  

  addProblemToSelection(problem: any): void {
    // Verificar si el problema ya está seleccionado
    if (this.isProblemSelected(problem)) {
      console.log('El problema ya está seleccionado.');
      this.removeSelectedProblem(problem);
    } else {
      // Marcar el problema como seleccionado
      problem.is_selected = true;
    
      // Agregar el problema a la lista correspondiente según su prioridad
      if (problem.priority === 'High') {
        // Verificar que no esté ya en la lista de problemas seleccionados de alta prioridad
        if (!this.highPriorityProblemsSelected.find(p => p.id === problem.id)) {
          this.highPriorityProblemsSelected.push(problem);
        }
      } else if (problem.priority === 'Medium') {
        // Verificar que no esté ya en la lista de problemas seleccionados de media prioridad
        if (!this.mediumPriorityProblemsSelected.find(p => p.id === problem.id)) {
          this.mediumPriorityProblemsSelected.push(problem);
        }
      } else if (problem.priority === 'Low') {
        // Verificar que no esté ya en la lista de problemas seleccionados de baja prioridad
        if (!this.lowPriorityProblemsSelected.find(p => p.id === problem.id)) {
          this.lowPriorityProblemsSelected.push(problem);
        }
      }
    }
  
    
  
    // Actualizar la lista general de problemas seleccionados
    const allProblemsSelected = [
      ...this.highPriorityProblemsSelected,
      ...this.mediumPriorityProblemsSelected,
      ...this.lowPriorityProblemsSelected
    ];
  
    this.selectedPrioritizedDQProblems = allProblemsSelected;
  
    console.log('Problemas SELECCIONADOS:', {
      high: this.highPriorityProblemsSelected,
      medium: this.mediumPriorityProblemsSelected,
      low: this.lowPriorityProblemsSelected,
    });
  
    console.log("selectedPrioritizedDQProblems", this.selectedPrioritizedDQProblems);
  }
  
  

  addProblemToSelection_BACKUP(problem: any) {

    if (problem.priority === 'High') {
      // Chequear que no haya sido agregado previamente
      if (!this.fetchedSelectedHighPriorityProblems.find(p => p.id === problem.id)) {
        problem.is_selected = true; // Marcar el problema como seleccionado
        this.highPriorityProblemsSelected.push(problem);
      } else {
        console.log('El problema ya está en fetchedHighPriorityProblemsSelected');
      }
    } 
    else if (problem.priority === 'Medium') {
      if (!this.fetchedSelectedMediumPriorityProblems.find(p => p.id === problem.id)) {
        problem.is_selected = true; 
        this.mediumPriorityProblemsSelected.push(problem);
      }
    } 
    else if (problem.priority === 'Low') {
      if (!this.fetchedSelectedLowPriorityProblems.find(p => p.id === problem.id)) {
        problem.is_selected = true; 
        this.lowPriorityProblemsSelected.push(problem);
      }
    }

    console.log('Problemas SELECCIONADOS:', {
      high: this.highPriorityProblemsSelected,
      medium: this.mediumPriorityProblemsSelected,
      low: this.lowPriorityProblemsSelected,
    });

    const allProblemsSelected = [
      ...this.highPriorityProblemsSelected,
      ...this.mediumPriorityProblemsSelected,
      ...this.lowPriorityProblemsSelected
    ];

    console.log("console.log(this.highPriorityProblemsSelected);", this.highPriorityProblemsSelected);
    console.log("console.log(this.mediumPriorityProblemsSelected);", this.mediumPriorityProblemsSelected);
    console.log("console.log(this.lowPriorityProblemsSelected);", this.lowPriorityProblemsSelected);

    this.selectedPrioritizedDQProblems = allProblemsSelected;


    console.log("selectedPrioritizedDQProblems", this.selectedPrioritizedDQProblems)
    
  }



  saveSelection() {

    console.log("HIGH PRIORITY selection:", this.highPriorityProblemsSelected);
    console.log("MEDIUM PRIORITY selection:",this.mediumPriorityProblemsSelected);
    console.log("LOW PRIORITY selection:",this.lowPriorityProblemsSelected);


    console.log("All problems to update:", this.selectedPrioritizedDQProblems);

    // Llamar al servicio para actualizar los problemas usando PATCH
    if (this.projectId !== null) {
      this.projectService.updateIsSelectedFieldPrioritizedDQProblem(this.projectId, this.selectedPrioritizedDQProblems).subscribe({
        next: (response) => {
          console.log("is_selected field updated successfully:", response);
          alert("DQ Problems selection was saved successfully!");
        },
        error: (error) => {
          console.error("Error updating is_selected field:", error);
          alert("Error updating is_selected field. Please try again.");
        }
      });
    }
    

  }

  deleteDQProblemFromSelection(problem: any) {
    
    const isConfirmed = window.confirm("Are you sure you want to remove this problem from the selection?");
  
    if (isConfirmed) {
      const problemsToRemove = [];
      problemsToRemove.push(problem);

      if (this.projectId !== null) {
        this.projectService.removeSelectedPrioritizedDQProblem(this.projectId, problemsToRemove).subscribe({
          next: (response) => {
            console.log("is_selected field updated successfully:", response);
            alert("DQ Problem was deleted successfully");
  
            // Eliminar el problema de la lista de problemas seleccionados según la prioridad
            this.removeProblemFromFetchedList(problem);
          },
          error: (error) => {
            console.error("Error deleting DQ Problem:", error);
            alert("Error deleting DQ Problem. Please try again.");
          }
        });
      }
    } else {
      console.log("Deletion canceled by the user.");
    }
  }

   // Método para eliminar el problema de las listas correspondientes por prioridad
   removeProblemFromFetchedList(problem: any): void {
    if (problem.priority === 'High') {
      this.fetchedSelectedHighPriorityProblems = this.fetchedSelectedHighPriorityProblems.filter(p => p.id !== problem.id);
      this.highPriorityProblems.push(problem);
    } else if (problem.priority === 'Medium') {
      this.fetchedSelectedMediumPriorityProblems = this.fetchedSelectedMediumPriorityProblems.filter(p => p.id !== problem.id);
      this.mediumPriorityProblems.push(problem);
    } else if (problem.priority === 'Low') {
      this.fetchedSelectedLowPriorityProblems = this.fetchedSelectedLowPriorityProblems.filter(p => p.id !== problem.id);
      this.lowPriorityProblems.push(problem);
    }
  }



  // Obtener los problemas de calidad del proyecto
  dqProblems_: any[] = [];
  prioritizedDQProblems: any[] = [];  
  dqProblemDetails: any = null; 

  loadDQProblems_(projectId: number): void {
    this.projectService.getDQProblemsByProjectId(projectId).subscribe({
      next: (data) => {
        this.dqProblems_ = data;
        console.log('Problemas de calidad:', data);

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


  fetchedSelectedHighPriorityProblems: any[] = []; // Problemas de alta prioridad
  fetchedSelectedMediumPriorityProblems: any[] = []; // Problemas de media prioridad
  fetchedSelectedLowPriorityProblems: any[] = []; // Problemas de baja prioridad

  fetchedSelectedProblems: any[] = []; 

  // Método para cargar los problemas priorizados
  loadPrioritizedDQProblems_backup(projectId: number): void {
    this.projectService.getPrioritizedDQProblemsByProjectId(projectId).subscribe({
      next: (data) => {
        // Inicializar las listas de prioridad
        this.highPriorityProblems = data.filter((problem: { priority: string; }) => problem.priority === 'High');
        //this.highPriorityProblems = data
        //.filter((problem: any) => problem.priority === 'High' && problem.is_selected === false);
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

        // Filtrar los problemas tales que is_selected = true
      this.fetchSelectedPrioritizedDQProblems(data);

        
      },
      error: (err) => {
        console.error('Error al obtener los problemas priorizados:', err);
      },
    });
  }

  loadPrioritizedDQProblems(projectId: number): void {
    this.projectService.getPrioritizedDQProblemsByProjectId(projectId).subscribe({
      next: (data) => {
        // Filtrar los problemas no seleccionados (is_selected === false)
        const nonSelectedProblems = data.filter((problem: any) => problem.is_selected === false);

        // Filtrar los problemas seleccionados (is_selected === true)
        const selectedProblems = data.filter((problem: any) => problem.is_selected === true);

        // Organizar los problemas no seleccionados por prioridad
        this.highPriorityProblems = nonSelectedProblems.filter((problem: any) => problem.priority === 'High');
        this.mediumPriorityProblems = nonSelectedProblems.filter((problem: any) => problem.priority === 'Medium');
        this.lowPriorityProblems = nonSelectedProblems.filter((problem: any) => problem.priority === 'Low');

        // Inicializar las listas de prioridad
        /*this.highPriorityProblems = data.filter((problem: { priority: string; }) => problem.priority === 'High');
        this.mediumPriorityProblems = data.filter((problem: { priority: string; }) => problem.priority === 'Medium');
        this.lowPriorityProblems = data.filter((problem: { priority: string; }) => problem.priority === 'Low');*/

        // Obtener los detalles adicionales (description y date) para cada problema
        this.highPriorityProblems.forEach((problem) => this.getDQProblemDetails(problem.dq_problem_id, problem));
        this.mediumPriorityProblems.forEach((problem) => this.getDQProblemDetails(problem.dq_problem_id, problem));
        this.lowPriorityProblems.forEach((problem) => this.getDQProblemDetails(problem.dq_problem_id, problem));

        
        // Obtener los detalles adicionales (description y date) para cada problema seleccionado
        selectedProblems.forEach((problem: any) => this.getDQProblemDetails(problem.dq_problem_id, problem));


        // Organizar los problemas seleccionados por prioridad
        this.fetchSelectedPrioritizedDQProblems(selectedProblems);

        // Imprimir los problemas cargados
        console.log('Problemas priorizados (no seleccionados):', {
          high: this.highPriorityProblems,
          medium: this.mediumPriorityProblems,
          low: this.lowPriorityProblems,
        });

        console.log('Problemas seleccionados:', {
          selectedHigh: this.fetchedSelectedHighPriorityProblems,
          selectedMedium: this.fetchedSelectedMediumPriorityProblems,
          selectedLow: this.fetchedSelectedLowPriorityProblems,
        });

        /*console.log('Problemas priorizados:', {
          high: this.highPriorityProblems,
          medium: this.mediumPriorityProblems,
          low: this.lowPriorityProblems,
        });

        // Filtrar los problemas tales que is_selected = true
      this.fetchSelectedPrioritizedDQProblems(data);*/

        
      },
      error: (err) => {
        console.error('Error al obtener los problemas priorizados:', err);
      },
    });
  }

  // Método para filtrar los problemas seleccionados por prioridad
  fetchSelectedPrioritizedDQProblems(allProblems: any[]): void {
    // Filtrar problemas seleccionados
    const selectedProblems = allProblems.filter((problem: any) => problem.is_selected === true);

    console.log("selectedProblems", selectedProblems)

    // Organizar los problemas seleccionados por prioridad
    this.fetchedSelectedHighPriorityProblems = selectedProblems.filter((problem: any) => problem.priority === 'High');
    console.log("this.fetchedSelectedHighPriorityProblems", this.fetchedSelectedHighPriorityProblems)
    this.fetchedSelectedMediumPriorityProblems = selectedProblems.filter((problem: any) => problem.priority === 'Medium');
    this.fetchedSelectedLowPriorityProblems = selectedProblems.filter((problem: any) => problem.priority === 'Low');

    const allFetchedSelectedProblems = [
      ...this.fetchedSelectedHighPriorityProblems,
      ...this.fetchedSelectedMediumPriorityProblems,
      ...this.fetchedSelectedLowPriorityProblems,
    ];

    this.fetchedSelectedProblems = allFetchedSelectedProblems;
    console.log('this.fetchedSelectedProblems', this.fetchedSelectedProblems);
  }

  fetchSelectedPrioritizedDQProblems_backup(allProblems: any[]): void {
    // Filtrar problemas seleccionados
    const selectedProblems = allProblems.filter((problem: any) => problem.is_selected === true);
  
    // Organizar los problemas seleccionados por prioridad
    this.fetchedSelectedHighPriorityProblems = selectedProblems.filter((problem: any) => problem.priority === 'High');
    this.fetchedSelectedMediumPriorityProblems = selectedProblems.filter((problem: any) => problem.priority === 'Medium');
    this.fetchedSelectedLowPriorityProblems = selectedProblems.filter((problem: any) => problem.priority === 'Low');

    const allFetchedSelectedProblems = [
      ...this.fetchedSelectedHighPriorityProblems,
      ...this.fetchedSelectedMediumPriorityProblems,
      ...this.fetchedSelectedLowPriorityProblems
    ];

    this.fetchedSelectedProblems = allFetchedSelectedProblems;
    console.log("this.fetchedSelectedProblems", this.fetchedSelectedProblems);
  }

  


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


  addProblemToSelectionOld(problem: any): void {
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

  isProblemSelected_Old(problem: any): boolean {
    return this.loadedSelectedPrioritizedProblems.some(p => p.id === problem.id) || 
           this.selectedPrioritizedProblems.some(p => p.id === problem.id);
  }


  getFilteredProblems(): any[] {
    return this.prioritizedProblems.filter(problem => 
      !this.loadedSelectedPrioritizedProblems.some(p => p.id === problem.id) &&
      !this.selectedPrioritizedProblems.some(p => p.id === problem.id)
    );
  }


  isHighPriorityProblemsVisible: boolean = true;  
  isMediumPriorityProblemsVisible: boolean = true;
  isLowPriorityProblemsVisible: boolean = true;  

  togglePriorityVisibility(priority: string): void {
    if (priority === 'High') {
      this.isHighPriorityProblemsVisible = !this.isHighPriorityProblemsVisible;
    } else if (priority === 'Medium') {
      this.isMediumPriorityProblemsVisible = !this.isMediumPriorityProblemsVisible;
    } else if (priority === 'Low') {
      this.isLowPriorityProblemsVisible = !this.isLowPriorityProblemsVisible;
    }
  }

  isSelectedHighPriorityProblemsVisible: boolean = true;  
  isSelectedMediumPriorityProblemsVisible: boolean = true;
  isSelectedLowPriorityProblemsVisible: boolean = true;  

  toggleSelectedProblemsPriorityVisibility(priority: string): void {
    if (priority === 'High') {
      this.isSelectedHighPriorityProblemsVisible = !this.isSelectedHighPriorityProblemsVisible;
    } else if (priority === 'Medium') {
      this.isSelectedMediumPriorityProblemsVisible = !this.isSelectedMediumPriorityProblemsVisible;
    } else if (priority === 'Low') {
      this.isSelectedLowPriorityProblemsVisible = !this.isSelectedLowPriorityProblemsVisible;
    }
  }

  
}
