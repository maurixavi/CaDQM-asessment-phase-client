import { Component, Input, OnInit, AfterViewInit, ViewEncapsulation  } from '@angular/core';
// import { DataQualityProblem } from '../dqproblems-priorization/dqproblems-priorization.component'; 
import { Router } from '@angular/router';

import { ProjectService } from '../../../services/project.service';
import { DqModelService } from '../../../services/dq-model.service';
import { ProjectDataService } from '../../../services/project-data.service';
import { NotificationService } from '../../../services/notification.service';
import { combineLatest } from 'rxjs';
import { filter } from 'rxjs/operators';

declare var bootstrap: any; 

export interface PrioritizedProblem {
  id: number;
  description: string;
  priority: number;
  priority_type: string;
  is_selected?: boolean; 
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

  steps: { displayName: string, route: string, description: string }[] = [
    { displayName: 'A09.1', route: 'phase2/st4/dq-problems-priorization', description: 'Prioritization of DQ Problems' },
    { displayName: 'A09.2', route: 'phase2/st4/dq-problems-selection', description: 'Selection of DQ Problems' },
    { displayName: 'A10', route: 'phase2/st4/dq-dimensions-factors', description: 'Selection of DQ Dimensions and Factors' },
    { displayName: 'A11', route: 'phase2/st4/dq-metrics', description: 'Definition of DQ Metrics' },
    { displayName: 'A12', route: 'phase2/st4/dq-methods', description: 'Implementation of DQ Methods' },
    { displayName: 'DQ Model Confirmation', route: 'phase2/st4/dq-model', description: 'DQ Model Confirmation' }
  ];


  //PROJECT
  project: any; 
  //projectId: number = 1;
  projectId: number | null = null;

  currentStep: number = 1; //Step 2
  pageStepTitle: string = 'Selection of prioritized DQ problems';
  phaseTitle: string = 'Phase 2: DQ Assessment';
  stageTitle: string = 'Stage 4: DQ Model Definition';

  isNextStepEnabled: boolean = false;


  //prioritizedProblems: DataQualityProblem[] = [];
  selectedProblem: DataQualityProblem | null = null;
  detailsVisible: boolean = false;
  selectedProblems: DataQualityProblem[] = [];
  isSelectionConfirmed: boolean = false;


  // Obtener los problemas de calidad del proyecto
  dqProblems_: any[] = [];
  prioritizedDQProblems: any[] = [];  
  dqProblemDetails: any = null; 

 

  highPriorityProblems: any[] = []; // Problemas de alta prioridad
  mediumPriorityProblems: any[] = []; // Problemas de media prioridad
  lowPriorityProblems: any[] = []; // Problemas de baja prioridad


  fetchedSelectedHighPriorityProblems: any[] = []; // Problemas de alta prioridad
  fetchedSelectedMediumPriorityProblems: any[] = []; // Problemas de media prioridad
  fetchedSelectedLowPriorityProblems: any[] = []; // Problemas de baja prioridad

  fetchedSelectedProblems: any[] = []; 
 
  // PROBLEMAS PRIORIZADOS
  selectedPrioritizedProblems: any[] = [];

  prioritizedProblems: any[] = [];
  //problems: any[] = [];

  isSelectedProblemVisible: boolean = false;  
  isHighPriorityProblemsVisible: boolean = true;  
  isMediumPriorityProblemsVisible: boolean = true;
  isLowPriorityProblemsVisible: boolean = true; 
  isSelectedHighPriorityProblemsVisible: boolean = true;  
  isSelectedMediumPriorityProblemsVisible: boolean = true;
  isSelectedLowPriorityProblemsVisible: boolean = true;  

  //DQ PROBLEMS
  highPriorityProblemsSelected: any[] = []; // Problemas de alta prioridad seleccionados
  mediumPriorityProblemsSelected: any[] = []; // Problemas de media prioridad seleccionados
  lowPriorityProblemsSelected: any[] = []; // Problemas de baja prioridad seleccionados

  selectedPrioritizedDQProblems: any[] = [];  

  constructor(
    private router: Router, 
    public modelService: DqModelService,
    private projectService: ProjectService,
    private projectDataService: ProjectDataService,
    private notificationService: NotificationService,
  ) { }

  dqModelVersionId: number | null = null;
  contextComponents: any = null;

  ngOnInit() {
    // Obtener el Project ID actual
    this.projectId = this.projectDataService.getProjectId();

    this.subscribeToData();

    // Sincronizar el paso actual con la ruta
    this.syncCurrentStepWithRoute();
  }

  syncCurrentStepWithRoute() {
    const currentRoute = this.router.url;
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
      this.dqProblems_ = problems;
      this.dqModelVersionId = dqModelVersionId;
    
      if (this.projectId) {
        this.loadPrioritizedDQProblems(this.projectId);
      }

      if (this.dqModelVersionId){
        this.loadFullDQModel(this.dqModelVersionId);
      }
    });
  }



  ngAfterViewInit() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }


  // Full DQ Model
  completeDQModel: any; 

  async loadFullDQModel(dqModelId: number): Promise<void> {
    try {
      const data = await this.modelService.getFullDQModel(dqModelId).toPromise();
      this.completeDQModel = data;
      console.log(this.completeDQModel);
    } catch (err) {
      console.error('Error al cargar el DQModel.', err);
    }
  }

  getProblemUsageCount(dqProblemId: number): number {
    let count = 0;

    this.completeDQModel?.dimensions?.forEach((dimension: { dq_problems: number[]; factors: any[]; }) => {
      if (dimension.dq_problems?.includes(dqProblemId)) {
        count++;
      }

      dimension.factors?.forEach((factor: { dq_problems: number[]; }) => {
        if (factor.dq_problems?.includes(dqProblemId)) {
          count++;
        }
      });
    });

    return count;
  }


  // Método para cargar los problemas priorizados
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

        // Obtener los detalles adicionales (description y date) para cada problema
        this.highPriorityProblems.forEach((problem) => this.getDQProblemDetails(problem.dq_problem_id, problem));
        this.mediumPriorityProblems.forEach((problem) => this.getDQProblemDetails(problem.dq_problem_id, problem));
        this.lowPriorityProblems.forEach((problem) => this.getDQProblemDetails(problem.dq_problem_id, problem));

        // Obtener los detalles adicionales (description y date) para cada problema seleccionado
        selectedProblems.forEach((problem: any) => this.getDQProblemDetails(problem.dq_problem_id, problem));

        // Organizar los problemas seleccionados por prioridad
        this.loadSelectedPrioritizedDQProblems(selectedProblems);

        /*console.log('Problemas priorizados (no seleccionados):', {
          high: this.highPriorityProblems,
          medium: this.mediumPriorityProblems,
          low: this.lowPriorityProblems,
        });

        console.log('Problemas seleccionados:', {
          selectedHigh: this.fetchedSelectedHighPriorityProblems,
          selectedMedium: this.fetchedSelectedMediumPriorityProblems,
          selectedLow: this.fetchedSelectedLowPriorityProblems,
        });*/

      },
      error: (err) => {
        console.error('Error al obtener los problemas priorizados:', err);
      },
    });
  }

  // Método para filtrar los problemas seleccionados por prioridad
  loadSelectedPrioritizedDQProblems(allProblems: any[]): void {
    // Filtrar problemas seleccionados
    const selectedProblems = allProblems.filter((problem: any) => problem.is_selected === true);

    // Organizar los problemas seleccionados por prioridad
    this.fetchedSelectedHighPriorityProblems = selectedProblems.filter((problem: any) => problem.priority === 'High');
    this.fetchedSelectedMediumPriorityProblems = selectedProblems.filter((problem: any) => problem.priority === 'Medium');
    this.fetchedSelectedLowPriorityProblems = selectedProblems.filter((problem: any) => problem.priority === 'Low');

    const allFetchedSelectedProblems = [
      ...this.fetchedSelectedHighPriorityProblems,
      ...this.fetchedSelectedMediumPriorityProblems,
      ...this.fetchedSelectedLowPriorityProblems,
    ];

    this.fetchedSelectedProblems = allFetchedSelectedProblems;

    if (this.fetchedSelectedProblems.length > 0) {
      //Actity completed at least once, enable next step
      this.isNextStepEnabled = true;
      console.log("this.isNextStepEnabled", this.isNextStepEnabled)
    }

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



  isProblemSelected(problem: any): boolean {
    return this.selectedPrioritizedDQProblems.some(p => p.id === problem.id);
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
          // Remover el problema de la lista de problemas no seleccionados de alta prioridad
          this.highPriorityProblems = this.highPriorityProblems.filter(p => p.id !== problem.id);
          console.log(this.highPriorityProblemsSelected)
        }
      } else if (problem.priority === 'Medium') {
        // Verificar que no esté ya en la lista de problemas seleccionados de media prioridad
        if (!this.mediumPriorityProblemsSelected.find(p => p.id === problem.id)) {
          this.mediumPriorityProblemsSelected.push(problem);
          // Remover el problema de la lista de problemas no seleccionados de media prioridad
          this.mediumPriorityProblems = this.mediumPriorityProblems.filter(p => p.id !== problem.id);
        }
      } else if (problem.priority === 'Low') {
        // Verificar que no esté ya en la lista de problemas seleccionados de baja prioridad
        if (!this.lowPriorityProblemsSelected.find(p => p.id === problem.id)) {
          this.lowPriorityProblemsSelected.push(problem);
          // Remover el problema de la lista de problemas no seleccionados de baja prioridad
          this.lowPriorityProblems = this.lowPriorityProblems.filter(p => p.id !== problem.id);
        }
      }
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

  removeSelectedProblem(problem: any): void {
    // Eliminar el problema de la lista correspondiente según su prioridad
    if (problem.priority === 'High') {
      this.highPriorityProblemsSelected = this.highPriorityProblemsSelected.filter(p => p.id !== problem.id);
      // Agregar el problema a la lista de problemas no seleccionados de alta prioridad
      this.highPriorityProblems.push(problem);

    } else if (problem.priority === 'Medium') {
      this.mediumPriorityProblemsSelected = this.mediumPriorityProblemsSelected.filter(p => p.id !== problem.id);
      // Agregar el problema a la lista de problemas no seleccionados de media prioridad
      this.mediumPriorityProblems.push(problem);

    } else if (problem.priority === 'Low') {
      this.lowPriorityProblemsSelected = this.lowPriorityProblemsSelected.filter(p => p.id !== problem.id);
      // Agregar el problema a la lista de problemas no seleccionados de baja prioridad
      this.lowPriorityProblems.push(problem);

    }
  
    // Actualizar la lista general de problemas seleccionados
    this.selectedPrioritizedDQProblems = [
      ...this.highPriorityProblemsSelected,
      ...this.mediumPriorityProblemsSelected,
      ...this.lowPriorityProblemsSelected
    ];
  
    console.log('Problema eliminado:', problem);
  }

  addAllProblems(problems: any[], priority: string): void {
    // Marcar todos los problemas como seleccionados
    problems.forEach(problem => {
      problem.is_selected = true; // Asegurar que is_selected sea true
    });
    
    // Dependiendo de la prioridad, agrega todos los problemas a la lista correspondiente
    if (priority === 'High') {
      // Agregar problemas a la lista de seleccionados de alta prioridad
      this.highPriorityProblemsSelected.push(...problems);
      // Remover los problemas de la lista de no seleccionados de alta prioridad
      this.highPriorityProblems = this.highPriorityProblems.filter(
        problem => !problems.some(p => p.id === problem.id)
      );
    } else if (priority === 'Medium') {
      // Agregar problemas a la lista de seleccionados de media prioridad
      this.mediumPriorityProblemsSelected.push(...problems);
      // Remover los problemas de la lista de no seleccionados de media prioridad
      this.mediumPriorityProblems = this.mediumPriorityProblems.filter(
        problem => !problems.some(p => p.id === problem.id)
      );
    } else if (priority === 'Low') {
      // Agregar problemas a la lista de seleccionados de baja prioridad
      this.lowPriorityProblemsSelected.push(...problems);
      // Remover los problemas de la lista de no seleccionados de baja prioridad
      this.lowPriorityProblems = this.lowPriorityProblems.filter(
        problem => !problems.some(p => p.id === problem.id)
      );
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
      // Recorre todos los problemas seleccionados de alta prioridad y los elimina
      this.highPriorityProblemsSelected.forEach(problem => {
        if (problems.includes(problem)) {
          this.removeSelectedProblem(problem);
        }
      });
      // Agregar problemas a la lista de no seleccionados de alta prioridad
      this.highPriorityProblems.push(...problems);
  
    } else if (priority === 'Medium') {
      // Recorre todos los problemas seleccionados de media prioridad y los elimina
      this.mediumPriorityProblemsSelected.forEach(problem => {
        if (problems.includes(problem)) {
          this.removeSelectedProblem(problem);
        }
      });
      // Agregar problemas a la lista de no seleccionados de media prioridad
      this.mediumPriorityProblems.push(...problems);
  
    } else if (priority === 'Low') {
      // Recorre todos los problemas seleccionados de baja prioridad y los elimina
      this.lowPriorityProblemsSelected.forEach(problem => {
        if (problems.includes(problem)) {
          this.removeSelectedProblem(problem);
        }
      });
      // Agregar problemas a la lista de no seleccionados de baja prioridad
      this.lowPriorityProblems.push(...problems);
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

  deleteDQProblemFromSelection(problem: any) {
    
    const problemsToRemove = [];
    problemsToRemove.push(problem);

    if (this.projectId !== null) {
      this.projectService.removeSelectedPrioritizedDQProblem(this.projectId, problemsToRemove).subscribe({
        next: (response) => {
          console.log("is_selected field updated successfully:", response);
        
          this.notificationService.showSuccess('DQ Problem was successfully removed.');

          // Eliminar el problema de la lista de problemas seleccionados según la prioridad
          this.removeProblemFromFetchedList(problem);

       

          
        },
        error: (error) => {
          console.error("Error deleting DQ Problem:", error);
          this.notificationService.showError('Failed to remove DQ Problem.');
        }
      });
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

  
  saveSelection() {
    
    /*console.log("HIGH PRIORITY selection:", this.highPriorityProblemsSelected);
    console.log("MEDIUM PRIORITY selection:", this.mediumPriorityProblemsSelected);
    console.log("LOW PRIORITY selection:", this.lowPriorityProblemsSelected);
    console.log("All problems to update:", this.selectedPrioritizedDQProblems);*/

    if (this.projectId !== null) {
      this.projectService.updateIsSelectedFieldPrioritizedDQProblem(this.projectId, this.selectedPrioritizedDQProblems).subscribe({
        next: (response) => {
          this.isNextStepEnabled = true;
          this.notificationService.showSuccess('Prioritized DQ Problems selection was successfully saved');
        },
        error: (error) => {
          this.notificationService.showError('Failed to save Prioritized DQ Problems selection.');
        }
      });
    }
  
  }



  toggleSelectedProblemVisibility() {
    this.isSelectedProblemVisible = !this.isSelectedProblemVisible;  
  }

  togglePriorityVisibility(priority: string): void {
    if (priority === 'High') {
      this.isHighPriorityProblemsVisible = !this.isHighPriorityProblemsVisible;
    } else if (priority === 'Medium') {
      this.isMediumPriorityProblemsVisible = !this.isMediumPriorityProblemsVisible;
    } else if (priority === 'Low') {
      this.isLowPriorityProblemsVisible = !this.isLowPriorityProblemsVisible;
    }
  }

  toggleSelectedProblemsPriorityVisibility(priority: string): void {
    if (priority === 'High') {
      this.isSelectedHighPriorityProblemsVisible = !this.isSelectedHighPriorityProblemsVisible;
    } else if (priority === 'Medium') {
      this.isSelectedMediumPriorityProblemsVisible = !this.isSelectedMediumPriorityProblemsVisible;
    } else if (priority === 'Low') {
      this.isSelectedLowPriorityProblemsVisible = !this.isSelectedLowPriorityProblemsVisible;
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

  

  // Propiedades para el modal de confirmación
  private getPrioritySelectionWarning(): string | null {
    const hasSelectedLow = this.lowPriorityProblemsSelected.length > 0;
    const hasSelectedMedium = this.mediumPriorityProblemsSelected.length > 0;
  
    const hasAvailableMedium = this.mediumPriorityProblems.length > 0;
    const hasAvailableHigh = this.highPriorityProblems.length > 0;
  
    if (hasSelectedLow && (hasAvailableMedium || hasAvailableHigh)) {
      return "You selected low-priority problems while higher-priority ones are still available. You may want to review your selection or adjust the prioritization if needed.";
    }
  
    if ((!hasSelectedLow && hasSelectedMedium) && hasAvailableHigh) {
      return "You selected medium-priority problems while high-priority ones are still available. You may want to review your selection or adjust the prioritization if needed.";
    }
  
    if ((hasSelectedLow && hasSelectedMedium) && hasAvailableHigh) {
      return "You selected low and medium-priority problems while high-priority ones are still available. You may want to review your selection or adjust the prioritization if needed.";
    }
  
    return null;
  }


  isConfirmationModalOpen: boolean = false;
  confirmationModalTitle: string = '';
  confirmationModalMessage: string = '';

  currentActionType: 'save' | 'remove' | null = null;
  problemToRemove: any;

  openConfirmationModal(actionType: 'save' | 'remove', problemId?: any): void {
    this.isConfirmationModalOpen = true;
    this.currentActionType = actionType;

    if (actionType === 'save') {
      this.confirmationModalTitle = 'Prioritized DQ Problems selection';

      // Agregar advertencia primero si existe
      const warning = this.getPrioritySelectionWarning();
      if (warning) {
        this.confirmationModalMessage = '<b> ⚠️ ' + warning + '</b><br><br>';  // Mensaje de advertencia primero
      }

      // Luego el mensaje de confirmación
      this.confirmationModalMessage += '\n\nAre you sure you want to confirm this selection? The selected data quality problems will be available to support the DQ Model definition.';
    
    
    } else if (actionType === 'remove') {

      this.problemToRemove = problemId;
      //console.log("this.problemToRemove", this.problemToRemove)


      const problem = this.problemToRemove;
      const usageCount = this.getProblemUsageCount(problem.dq_problem_id);
      this.problemToRemove = {
        ...problem,
        count: usageCount
      };
      //console.log("usageCount", usageCount)

      //console.log("this.problemToRemove", this.problemToRemove)
      
      if (usageCount > 0) {
        this.isConfirmationModalOpen = false;
        this.notificationService.showWarning(
          'This DQ Problem is associated with the DQ Model and cannot be removed. If you wish to delete it, you must first unassign it from all related dimensions and factors.'
        );
      } else {
        
        this.confirmationModalTitle = 'Remove DQ Problem from selection';
        this.confirmationModalMessage = 'Are you sure you want to remove this DQ problem? It will no longer be available for use in the DQ Model definition.';
      }
    }
  }

  handleConfirm(): void {
    this.isConfirmationModalOpen = false;
    
    if (this.currentActionType === 'save') {
      this.saveSelection();
    } else if (this.currentActionType === 'remove') {
      this.deleteDQProblemFromSelection(this.problemToRemove);
    }
    
    this.currentActionType = null;
    this.confirmationModalTitle = '';
    this.confirmationModalMessage = '';
  }

  handleCancel(): void {
    this.isConfirmationModalOpen = false;
    this.confirmationModalTitle = '';
    this.confirmationModalMessage = '';
  }



}
