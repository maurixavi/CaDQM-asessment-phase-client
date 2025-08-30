// ========== IMPORTS ==========
import { ChangeDetectorRef, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProjectService } from '../../../services/project.service';
import { DqModelService } from '../../../services/dq-model.service';
import { ProjectDataService } from '../../../services/project-data.service';
import { Router } from '@angular/router';

import { 
  buildContextComponents, 
  formatCtxCompCategoryName, 
  getFirstNonIdAttribute, 
  formatAppliedTo, 
  getAppliedToDisplay 
} from '../../../shared/utils/utils';

declare var bootstrap: any;

// ========== COMPONENT DECORATOR ==========
@Component({
  selector: 'app-dq-measurement-execution',
  templateUrl: './dq-measurement-execution.component.html',
  styleUrl: './dq-measurement-execution.component.css',
})

// ========== COMPONENT CLASS ==========
export class DqMeasurementExecutionComponent implements OnInit {
  
  // ========== UTILITY METHODS ==========
  public formatAppliedTo = formatAppliedTo;
  public getAppliedToDisplay = getAppliedToDisplay;

  // ========== COMPONENT CONFIGURATION ==========
  currentStep: number = 0;
  pageStepTitle: string = 'Execution of the DQ measurement';
  phaseTitle: string = 'Phase 2: DQ Assessment';
  stageTitle: string = 'Stage 5: DQ Measurement';

  steps: { displayName: string; route: string; description: string }[] = [
    { displayName: 'A14', route: 'phase2/st5/measurement-execution', description: 'Execution of the DQ measurement' },
    { displayName: 'A15', route: 'phase2/st5/measurement-results', description: 'Results of the DQ measurement' },
  ];

  isNextStepEnabled: boolean = true;

  // ========== CONSTRUCTOR ==========
  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private modelService: DqModelService,
    private projectService: ProjectService,
    private projectDataService: ProjectDataService,
  ) {}

  // ========== MAIN DATA PROPERTIES ==========
  project: any = null;
  projectId: number | null = null;
  contextComponents: any = null;
  dqProblems: any[] = [];
  dqModelVersionId: number | null = null;
  dqModel: any = null;
  dataAtHandId: number | null = null;
  dataAtHandDetails: any = null;

  // ========== LOADING STATES ==========
  isLoadingInitialData: boolean = false;
  isLoading: boolean = false;
  hasLoadedAppliedMethods: boolean = true;
  errorMessage: string | null = null;
  isExecutionLoading: boolean = false;

  // ========== DQ METHODS PROPERTIES ==========
  dqMethods: any[] = [];
  appliedDQMethods: any[] = [];
  filteredMethods: any[] = [];
  selectedMethods: number[] = [];
  selectedMethodsObjects: any[] = [];

  // ========== TABLE SORTING PROPERTIES ==========
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // ========== MODAL PROPERTIES ==========
  isModalOpen: boolean = false;
  modalTitle: string = 'DQ Method Details';
  modalMessage: string = '';
  methodDetails: any = null;

  // ========== EXECUTION PROPERTIES ==========
  measurementExecutions: any[] = [];
  selectedExecution: string | null = null;
  isLoadingExecutions: boolean = false;
  executingMethods: any[] = [];
  executionTime: Date = new Date(0);
  executionTimer: any = null;
  private executedIds: number[] = [];
  private pendingIds: number[] = [];

  // ========== EXECUTION RESULTS PROPERTIES ==========
  executionResults: any = null;
  selectedMethodResult: any = null;
  isLoadingResults: boolean = false;
  resultsError: string | null = null;

  // ========== FILTER PROPERTIES ==========
  selectedStatus: string = 'all';
  pendingMethods: any[] = [];
  completedMethods: any[] = [];

  // ========== APPLIED METHOD MODAL PROPERTIES ==========
  isAppliedMethodModalOpen: boolean = false;
  appliedMethodDetails: any = null;
  appliedMethodModalTitle: string = 'Applied DQ Method';
  isEditingAlgorithm: boolean = false;
  editedAlgorithm: string = '';

  // ========== LIFECYCLE METHODS ==========
  ngOnInit(): void {
    this.projectId = this.projectDataService.getProjectId();
    this.subscribeToData();
    this.syncCurrentStepWithRoute();
  }

  // ========== DATA SUBSCRIPTION METHODS ==========
  subscribeToData(): void {
    this.projectDataService.project$.subscribe((data) => {
      this.project = data;
      if (this.project)
        this.dataAtHandId = data.data_at_hand;
        if (this.dataAtHandId) {
          this.loadDataAtHandDetails(this.dataAtHandId);
        }
    });

    this.projectDataService.contextComponents$.subscribe((data) => {
      this.contextComponents = data;
    });

    this.projectDataService.dqProblems$.subscribe((data) => {
      this.dqProblems = data;
    });

    this.projectDataService.dqModelVersion$.subscribe((dqModelVersionId) => {
      this.dqModelVersionId = dqModelVersionId;
      if (this.dqModelVersionId) {
        this.fetchExpandedDQMethodsData(this.dqModelVersionId);
        this.loadMeasurementExecutions();
      }
    });
  }

  // ========== NAVIGATION METHODS ==========
  syncCurrentStepWithRoute() {
    const currentRoute = this.router.url;
    const stepIndex = this.steps.findIndex((step) => step.route === currentRoute);
    if (stepIndex !== -1) {
      this.currentStep = stepIndex;
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

  // ========== DQ METHODS DATA METHODS ==========
  loadDataAtHandDetails(dataAtHandId: number): void {
    this.projectDataService.getDataAtHandByIdAllDetails(dataAtHandId).subscribe(
      (data) => {
        this.dataAtHandDetails = data;
        console.log("dataAtHandDetails", this.dataAtHandDetails)
      },
      (error) => {
        console.error('Error fetching Data at hand details:', error);
      }
    );
  }

  fetchExpandedDQMethodsData(dqmodelId: number): void {
    this.isLoading = true;
    this.errorMessage = null;
  
    this.modelService.getMethodsByDQModel(dqmodelId).subscribe({
      next: (methods: any[]) => {
        this.appliedDQMethods = methods.flatMap((method) => {
          const dqMethodName = method.method_name;
          const methodBase = method.method_base;
          const metricId = method.metric;

          this.modelService.getMetricInDQModel(dqmodelId, metricId).subscribe((metric) => {
            if (metric) {
              const factorId = metric.factor;
              this.modelService.getFactorInDQModel(dqmodelId, factorId).subscribe((factor) => {
                if (factor) {
                  const dimensionId = factor.dimension;
                  this.modelService.getDimensionInDQModel(dqmodelId, dimensionId).subscribe((dimension) => {
                    if (dimension) {
                      const appliedMethods = [
                        ...method.applied_methods.measurements.map((measurement: any) => ({
                          ...measurement,
                          dqMethod: dqMethodName,
                          methodType: 'Measurement',
                          methodBase: methodBase,
                          dqMetric: metric.metric_name,
                          dqFactor: factor.factor_name,
                          dqDimension: dimension.dimension_name,
                          selected: false,
                          executionStatus: 'pending'
                        })),
                        ...method.applied_methods.aggregations.map((aggregation: any) => ({
                          ...aggregation,
                          methodType: 'Aggregation',
                          dqMethod: dqMethodName,
                          methodBase: methodBase,
                          dqMetric: metric.metric_name,
                          dqFactor: factor.factor_name,
                          dqDimension: dimension.dimension_name,
                          selected: false,
                          executionStatus: 'pending'
                        })),
                      ];
  
                      this.appliedDQMethods = [...this.appliedDQMethods, ...appliedMethods];
                    }
                  });
                }
              });
            }
          });
  
          return [];
        });
  
        this.isLoading = false;
        this.hasLoadedAppliedMethods = true;
      },
      error: (error: any) => {
        this.errorMessage = 'Error al cargar los métodos. Inténtalo de nuevo.';
        this.isLoading = false;
        console.error('Error fetching DQ Methods:', error);
      },
    });
  }

  // ========== METHOD SELECTION METHODS ==========
  isAllSelected(): boolean {
    return this.filteredMethods.length > 0 && 
           this.filteredMethods.every(item => item.selected);
  }
  
  toggleSelectAll(event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.filteredMethods.forEach(item => item.selected = isChecked);
  }

  toggleSelectItem(item: any): void {
    if (item.selected) {
      const index = this.selectedMethodsObjects.findIndex(m => m.id === item.id);
      if (index !== -1) {
        this.selectedMethodsObjects.splice(index, 1);
      }
    } else {
      this.selectedMethodsObjects.push(item);
      this.selectedMethods.push(item.id);
    }

    item.selected = !item.selected;
  }

  // ========== EXECUTION METHODS ==========
  startDQModelExecution(): void {
    if (!this.dqModelVersionId) return;

    const dqModelId = this.dqModelVersionId;
    
    this.isLoading = true;
    this.modelService.startDQModelExecution(dqModelId).subscribe({
      next: (response) => {
        this.selectedExecution = response.execution_id;
        this.loadMeasurementExecutions();
        //this.fetchExpandedDQMethodsData(dqModelId);
        this.isLoading = false;
      },
      error: (err) => console.error('Error:', err),
      complete: () => this.isLoading = false
    });
  }

  executeSelectedMethods(): void {
    if (!this.dqModelVersionId || this.selectedMethods.length === 0) return;

    this.isExecutionLoading = true;
    this.errorMessage = '';
    
    this.executionTime = new Date(0);
    this.startExecutionTimer();

    this.executingMethods = this.selectedMethodsObjects.map(method => ({
      ...method,
      status: 'Executing...',
      timeElapsed: 0,
      intervalId: setInterval(() => {
        method.timeElapsed++;
        this.cdr.detectChanges();
      }, 1000)
    }));

    const connConfig = this.dataAtHandDetails;
    console.log("connConfig:", connConfig)

    this.modelService.executeMultipleAppliedMethods(
      this.dqModelVersionId, 
      this.selectedMethods,
      connConfig
    ).subscribe({
      next: (results) => {
        this.handleExecutionSuccess(results);
        this.clearRunningMethodsDetails();
        this.updateMethodsStatus();
      },
      error: (error) => {
        this.handleExecutionError(error);
      }
    });
  }

  private handleExecutionSuccess(results: any): void {
    this.isExecutionLoading = false;
    this.stopExecutionTimer();
    
    this.executingMethods.forEach(method => {
      method.status = 'Done';
      clearInterval(method.intervalId);
    });
    
    this.clearSelectedMethods();
    this.onExecutionChange();
  }

  private handleExecutionError(error: any): void {
    this.isExecutionLoading = false;
    this.stopExecutionTimer();
    this.errorMessage = 'Error executing selected methods.';
    
    this.executingMethods.forEach(method => {
      method.status = 'Failed';
      clearInterval(method.intervalId);
    });
    
    console.error('Error executing methods:', error);
  }

  private clearRunningMethodsDetails(): void {
    this.isExecutionLoading = false;
    this.stopExecutionTimer();
    
    this.executingMethods.forEach(method => {
      method.status = 'Done';
      clearInterval(method.intervalId);
    });

    this.clearSelectedMethods();
  }

  private clearSelectedMethods(): void {
    this.selectedMethods = [];
    this.selectedMethodsObjects = [];
    this.appliedDQMethods.forEach(method => method.selected = false);
  }

  // ========== TIMER METHODS ==========
  startExecutionTimer(): void {
    this.stopExecutionTimer();
    
    this.executionTimer = setInterval(() => {
      const newTime = new Date(this.executionTime.getTime() + 1000);
      this.executionTime = newTime;
      this.cdr.detectChanges();
    }, 1000);
  }

  stopExecutionTimer(): void {
    if (this.executionTimer) {
      clearInterval(this.executionTimer);
      this.executionTimer = null;
    }
  }

  // ========== EXECUTION RESULTS METHODS ==========
  loadMeasurementExecutions(): void {
    if (!this.dqModelVersionId) return;
    
    this.isLoadingExecutions = true;
    this.modelService.getAllDQModelExecutions(this.dqModelVersionId).subscribe({
      next: (response: any) => { 
        this.measurementExecutions = response.executions || [];
        this.isLoadingExecutions = false;

        const latestExecution = this.getLatestExecution();
        this.selectedExecution = latestExecution.execution_id;
        this.onExecutionChange();
      },
      error: (err) => {
        console.error('Error loading executions:', err);
        this.isLoadingExecutions = false;
      }
    });
  }

  private getLatestExecution(): any {
    const sortedExecutions = [...this.measurementExecutions].sort((a, b) => 
      new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );
    return sortedExecutions[0];
  }

  onExecutionChange(): void {
    if (!this.selectedExecution || !this.dqModelVersionId) return;

    this.isLoading = true;
    this.modelService.getSpecificDQModelExecution(
      this.dqModelVersionId, 
      this.selectedExecution
    ).subscribe({
      next: (executionDetails) => {
        this.executedIds = executionDetails.applied_methods_executed || [];
        this.pendingIds = executionDetails.applied_methods_pending || [];
        
        this.updateMethodsStatus();
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Error al cargar la ejecución';
        this.isLoading = false;
      }
    });
  }

  private updateMethodsStatus(): void {
    if (!this.appliedDQMethods) return;
    
    this.appliedDQMethods.forEach(method => {
      method.executionStatus = this.executedIds.includes(method.id) 
        ? 'completed' 
        : this.pendingIds.includes(method.id) 
          ? 'pending' 
          : 'pending';
    });
    
    this.filterMethods();
  }

  // ========== FILTER METHODS ==========
  filterMethods(): void {
    if (!this.appliedDQMethods) return;
    
    this.filteredMethods = this.appliedDQMethods.filter(m => {
      switch (this.selectedStatus) {
        case 'completed': return m.executionStatus === 'completed';
        case 'pending': return m.executionStatus === 'pending';
        default: return true;
      }
    });
  }

  filterMethodsByExecutionStatus(): void {
    if (!this.appliedDQMethods) return;
    this.updateMethodsStatus();
    this.filteredMethods = this.appliedDQMethods.filter(m => {
      switch (this.selectedStatus) {
        case 'completed': return m.executionStatus === 'completed';
        case 'pending': return m.executionStatus === 'pending';
        default: return true;
      }
    });
  }

  // ========== MODAL METHODS ==========
  openMethodDetailsModal(methodBaseId: number): void {
    console.log("methodBaseId", methodBaseId);
    console.log("filteredMethods", this.filteredMethods);
    this.isModalOpen = true;
    this.isLoading = true;
    this.errorMessage = '';

    this.modelService.getMethodBaseDetails(methodBaseId).subscribe(
      (data) => {
        this.methodDetails = data;
        this.isLoading = false;
      },
      (error) => {
        this.errorMessage = 'Failed to load DQ Method details.';
        this.isLoading = false;
      }
    );
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.methodDetails = null;
    this.errorMessage = '';  
  }

  // ========== APPLIED METHOD MODAL METHODS ==========
  openAppliedMethodDetailsModal(appliedMethod: any): void {
    if (!this.dqModelVersionId) return;
    
    this.isAppliedMethodModalOpen = true;
    this.isLoading = true;
    this.errorMessage = '';

    this.appliedMethodDetails = {
      ...appliedMethod,
      loadingDetails: true
    };

    this.modelService.getAppliedDQMethod(this.dqModelVersionId, appliedMethod.id).subscribe(
      (details) => {
        this.appliedMethodDetails = {
          ...appliedMethod,
          ...details,
          loadingDetails: false
        };
        this.isLoading = false;
      },
      (error) => {
        this.errorMessage = 'Failed to load method details.';
        this.isLoading = false;
        this.appliedMethodDetails.loadingDetails = false;
      }
    );
  }

  closeAppliedMethodModal(): void {
    this.isAppliedMethodModalOpen = false;
    this.appliedMethodDetails = null;
  }

  // ========== ALGORITHM EDITING METHODS ==========
  startEditingAlgorithm(): void {
    this.isEditingAlgorithm = true;
    this.editedAlgorithm = this.appliedMethodDetails?.algorithm || '';
  }

  updateAppliedMethodAlgorithm(): void {
    if (!this.dqModelVersionId || !this.appliedMethodDetails) return;
  
    this.isLoading = true;
    const updatedData = { algorithm: this.editedAlgorithm };
    const methodId = this.appliedMethodDetails.id;
    const methodType = this.appliedMethodDetails.methodType;
  
    let patchObservable;

    if (methodType === 'Measurement') {
      patchObservable = this.modelService.updateMeasurementAppliedMethod(methodId, updatedData);
    } else if (methodType === 'Aggregation') {
      patchObservable = this.modelService.updateAggregationAppliedMethod(methodId, updatedData);
    } else {
      this.errorMessage = 'Unknown method type';
      this.isLoading = false;
      console.error('Unknown method type:', methodType);
      return;
    }
  
    // Realizar la suscripción y manejar la respuesta
    patchObservable.subscribe({
      next: (updatedMethod) => {
        this.appliedMethodDetails.algorithm = updatedMethod.algorithm;
        this.isEditingAlgorithm = false;
        this.isLoading = false;
  
        const index = this.appliedDQMethods.findIndex(m => m.id === this.appliedMethodDetails.id);
        if (index !== -1) {
          this.appliedDQMethods[index].algorithm = updatedMethod.algorithm;
        }
      },
      error: (err) => {
        this.errorMessage = 'Failed to update algorithm';
        this.isLoading = false;
        console.error('Error updating algorithm:', err);
      }
    });
  }


  saveAlgorithm0(): void {
    if (!this.dqModelVersionId || !this.appliedMethodDetails) return;

    this.isLoading = true;
    const updatedData = { algorithm: this.editedAlgorithm };

    console.log("appliedMethodDetails", this.appliedMethodDetails)
    console.log("updatedData", updatedData)

    this.modelService.patchAppliedDQMethod(
      this.dqModelVersionId, 
      this.appliedMethodDetails.id, 
      updatedData
    ).subscribe({
      next: (updatedMethod) => {
        this.appliedMethodDetails.algorithm = updatedMethod.algorithm;
        this.isEditingAlgorithm = false;
        this.isLoading = false;
        
        const index = this.appliedDQMethods.findIndex(m => m.id === this.appliedMethodDetails.id);
        if (index !== -1) {
          this.appliedDQMethods[index].algorithm = updatedMethod.algorithm;
        }
      },
      error: (err) => {
        this.errorMessage = 'Failed to update algorithm';
        this.isLoading = false;
        console.error('Error updating algorithm:', err);
      }
    });
  }

  cancelEditingAlgorithm(): void {
    this.isEditingAlgorithm = false;
  }

  // ========== TABLE SORTING METHODS ==========
  sortTable(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.filteredMethods.sort((a, b) => {
      const valueA = a[column];
      const valueB = b[column];

      if (valueA < valueB) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  // ========== CLEANUP METHODS ==========
  ngOnDestroy(): void {
    this.stopExecutionTimer();
    this.executingMethods.forEach(method => {
      if (method.intervalId) clearInterval(method.intervalId);
    });
  }
}