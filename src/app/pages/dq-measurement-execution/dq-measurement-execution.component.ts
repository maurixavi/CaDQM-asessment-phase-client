import { ChangeDetectorRef, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { DqModelService } from '../../services/dq-model.service';
import { ProjectDataService } from '../../services/project-data.service';
import { Router } from '@angular/router';


import { buildContextComponents, formatCtxCompCategoryName, getFirstNonIdAttribute, formatAppliedTo, getAppliedToDisplay } from '../../shared/utils/utils';

declare var bootstrap: any;

@Component({
  selector: 'app-dq-measurement-execution',
  templateUrl: './dq-measurement-execution.component.html',
  styleUrl: './dq-measurement-execution.component.css',
})
export class DqMeasurementExecutionComponent implements OnInit {

  // Utils
  //public formatCtxCompCategoryName = formatCtxCompCategoryName;
  //public getFirstNonIdAttribute = getFirstNonIdAttribute;
  public formatAppliedTo = formatAppliedTo;
  public getAppliedToDisplay = getAppliedToDisplay;

  
  currentStep: number = 0;
  pageStepTitle: string = 'Execution of the DQ measurement';
  phaseTitle: string = 'Phase 2: DQ Assessment';
  stageTitle: string = 'Stage 5: DQ Measurement';

  steps: { displayName: string; route: string; description: string }[] = [
    { displayName: 'A14', route: 'st5/execution', description: 'Execution of the DQ measurement' },
    { displayName: 'A15', route: 'st5/results', description: 'Results of the DQ measurement' },
  ];

  isNextStepEnabled: boolean = true;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private modelService: DqModelService,
    private projectService: ProjectService,
    private projectDataService: ProjectDataService,
  ) {}

  // Main variables
  project: any = null;
  projectId: number | null = null;
  contextComponents: any = null;
  dqProblems: any[] = [];
  dqModelVersionId: number | null = null;
  dqModel: any = null;

  isLoading: boolean = false;
  errorMessage: string | null = null;

  isExecutionLoading: boolean = false;

  // DQ Methods
  dqMethods: any[] = [];
  appliedDQMethods: any[] = []; // Lista de applied_methods aplanados

  isModalOpen: boolean = false;
  modalTitle: string = 'DQ Method Details';
  modalMessage: string = '';
  methodDetails: any = null;

  // Variables para el ordenamiento
  sortColumn: string = ''; // Columna actualmente ordenada
  sortDirection: 'asc' | 'desc' = 'asc'; // Dirección del ordenamiento


  ngOnInit(): void {
    // Obtener el Project ID actual
    this.projectId = this.projectDataService.getProjectId();
    console.log('projectIdGet: ', this.projectId);

    // Suscribirse a los observables del servicio
    this.subscribeToData();

    // Sincronizar el paso actual con la ruta
    this.syncCurrentStepWithRoute();
  }

  syncCurrentStepWithRoute() {
    const currentRoute = this.router.url; // Obtiene la ruta actual (por ejemplo, '/st4/confirmation-stage-4')
    const stepIndex = this.steps.findIndex((step) => step.route === currentRoute);
    if (stepIndex !== -1) {
      this.currentStep = stepIndex;
    }
  }

  subscribeToData(): void {
    // Suscribirse al proyecto
    this.projectDataService.project$.subscribe((data) => {
      this.project = data;
      console.log('Project Data:', data);
    });

    // Suscribirse a los componentes del contexto
    this.projectDataService.contextComponents$.subscribe((data) => {
      this.contextComponents = data;
      //console.log('Context Components:', data);
    });

    // Suscribirse a los problemas de calidad de datos (DQ Problems)
    this.projectDataService.dqProblems$.subscribe((data) => {
      this.dqProblems = data;
      //console.log('DQ Problems:', data);
    });

    // Suscribirse a la versión del modelo de calidad de datos (DQ Model Version)
    this.projectDataService.dqModelVersion$.subscribe((dqModelVersionId) => {
      this.dqModelVersionId = dqModelVersionId;
      //console.log('DQ Model Version ID:', this.dqModelVersionId);
      if (this.dqModelVersionId) {
        this.fetchExpandedDQMethodsData(this.dqModelVersionId);

        this.loadMeasurementExecutions();
      }
    });
  }

  // 1.  propiedad para guardar los datos de ejecución
  currentExecutionData: any = null;

  // 2. Función auxiliar para determinar el estado
  setExecutionStatus(methodId: number): 'completed' | 'pending' {
    if (!this.currentExecutionData) return 'pending';
    
    if (this.currentExecutionData.applied_methods_executed?.includes(methodId)) {
      return 'completed';
    } else if (this.currentExecutionData.applied_methods_pending?.includes(methodId)) {
      return 'pending';
    }
    
    return 'pending'; // Estado por defecto
  }

  // Obtener los métodos de un DQModel y aplanar los applied_methods
  fetchExpandedDQMethodsData(dqmodelId: number): void {
    this.isLoading = true; // Activa el spinner de carga
    this.errorMessage = null; // Limpia cualquier mensaje de error previo
  
    this.modelService.getMethodsByDQModel(dqmodelId).subscribe({
      next: (methods: any[]) => {
        // Aplanar la lista de applied_methods
        this.appliedDQMethods = methods.flatMap((method) => {
          const dqMethodName = method.method_name; // Nombre del DQ Method
          const methodBase = method.method_base; // Id del DQ Method Base
          const metricId = method.metric; // ID de la métrica
  
          // Obtener los detalles de la métrica, el factor y la dimensión
          this.modelService.getMetricInDQModel(dqmodelId, metricId).subscribe((metric) => {
            if (metric) {
              const factorId = metric.factor; // ID del factor
              this.modelService.getFactorInDQModel(dqmodelId, factorId).subscribe((factor) => {
                if (factor) {
                  const dimensionId = factor.dimension; // ID de la dimensión
                  this.modelService.getDimensionInDQModel(dqmodelId, dimensionId).subscribe((dimension) => {
                    if (dimension) {
                      // Mapear los applied_methods (measurements y aggregations)
                      const appliedMethods = [
                        ...method.applied_methods.measurements.map((measurement: any) => ({
                          ...measurement,
                          dqMethod: dqMethodName,
                          methodBase: methodBase,
                          dqMetric: metric.metric_name, // Nombre de la métrica
                          dqFactor: factor.factor_name, // Nombre del factor
                          dqDimension: dimension.dimension_name, // Nombre de la dimensión
                          selected: false, // Inicializar el checkbox como no seleccionado
                          executionStatus: 'pending' // Estado inicial
                          //executionStatus: this.setExecutionStatus(measurement.id)
                        })),
                        ...method.applied_methods.aggregations.map((aggregation: any) => ({
                          ...aggregation,
                          dqMethod: dqMethodName,
                          dqMetric: metric.metric_name, // Nombre de la métrica
                          dqFactor: factor.factor_name, // Nombre del factor
                          dqDimension: dimension.dimension_name, // Nombre de la dimensión
                          selected: false, // Inicializar el checkbox como no seleccionado
                          executionStatus: 'pending' // Estado inicial
                          //executionStatus: this.setExecutionStatus(aggregation.id)
                        })),
                      ];
  
                      this.appliedDQMethods = [...this.appliedDQMethods, ...appliedMethods];
                      console.log('Applied DQ Methods fecthed:', this.appliedDQMethods);

                      //this.fetchLatestExecutionResults();
        
                    }
                  });
                }
              });
            }
          });
  
          return []; // Retornar un array vacío temporalmente
        });
  
        //this.loadMeasurementExecutions(); 
        this.isLoading = false; // Desactiva el spinner de carga

      },
      error: (error: any) => {
        this.errorMessage = 'Error al cargar los métodos. Inténtalo de nuevo.'; // Muestra un mensaje de error
        this.isLoading = false; // Desactiva el spinner de carga
        console.error('Error fetching DQ Methods:', error);
      },
    });
  }


  // Método para verificar si todos los items están seleccionados
  isAllSelected_(): boolean {
    return this.appliedDQMethods.every((item) => item.selected);
  }

  // Método para seleccionar/deseleccionar todos los items
  toggleSelectAll_(event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.appliedDQMethods.forEach((item) => (item.selected = isChecked));
  }

  isAllSelected(): boolean {
    return this.filteredMethods.length > 0 && 
           this.filteredMethods.every(item => item.selected);
  }
  
  toggleSelectAll____(event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.filteredMethods.forEach(item => item.selected = isChecked);
  }

  // Método para seleccionar/deseleccionar un item individual
  toggleSelectItem_backup(item: any): void {
    item.selected = !item.selected;
  }

  selectedMethodsObjects: any[] = [];   // Métodos seleccionados para ejecutar
  selectedMethods: number[] = [];    // IDs de los métodos seleccionados para ejecutar

  // Maneja la selección/deselección de un método aplicado
  toggleSelectItem(item: any): void {
    // Si el método está seleccionado, lo deseleccionamos
    if (item.selected) {
      const index = this.selectedMethodsObjects.findIndex(m => m.id === item.id);
      if (index !== -1) {
        this.selectedMethodsObjects.splice(index, 1);
      }
    } else {
      // Si el método no está seleccionado, lo agregamos al array
      this.selectedMethodsObjects.push(item);
      this.selectedMethods.push(item.id);  //  agregamos solo el id
    }

    // Actualizamos el estado de selección del método
    item.selected = !item.selected;

    console.log("this.selectedMethods", this.selectedMethods)
    console.log("this.selectedMethodsObjects", this.selectedMethodsObjects)
  }

  // Función para seleccionar/deseleccionar todos los métodos
  toggleSelectAll(event: any): void {
    if (event.target.checked) {
      this.selectedMethods = [...this.filteredMethods]; // Selecciona todos los métodos filtrados
    } else {
      this.selectedMethods = []; // Deselecciona todos
    }

    // Actualizamos el estado de selección de cada método
    this.filteredMethods.forEach(method => method.selected = event.target.checked);
  }

  // Lógica para seleccionar métodos
  toggleSelectItem2(item: any): void {
    item.selected = !item.selected;
    if (item.selected) {
      this.selectedMethods.push(item.appliedMethodId);  // Solo guardamos el ID del método aplicado
    } else {
      const index = this.selectedMethods.indexOf(item.appliedMethodId);
      if (index > -1) {
        this.selectedMethods.splice(index, 1);
      }
    }
    console.log("this.selectedMethods", this.selectedMethods);
  }

  //EJECUCION --------------
  executingMethods: any[] = [];  // Métodos en ejecución con su estado y tiempo
  intervalIds: any[] = [];  // Almacenamos los intervalos para detener el contador

  
  // Ejecutar los métodos seleccionados.
  executionTime: Date = new Date(0); // Inicializa en 00:00
executionTimer: any = null;
//isExecutionLoading: boolean = false;

// Modifica el método executeSelectedMethods
executeSelectedMethods(): void {
  if (!this.dqModelVersionId || this.selectedMethods.length === 0) return;

  this.isExecutionLoading = true;
  this.errorMessage = '';
  
  // Reinicia el temporizador
  this.executionTime = new Date(0);
  this.startExecutionTimer();

  // Prepara los métodos en ejecución
  this.executingMethods = this.selectedMethodsObjects.map(method => ({
    ...method,
    status: 'Executing...',
    timeElapsed: 0,
    intervalId: setInterval(() => {
      method.timeElapsed++;
      this.cdr.detectChanges();
    }, 1000)
  }));

  // Ejecuta los métodos
  this.modelService.executeMultipleAppliedMethods(
    this.dqModelVersionId, 
    this.selectedMethods
  ).subscribe({
    next: (results) => {
      this.handleExecutionSuccess(results);
    },
    error: (error) => {
      this.handleExecutionError(error);
    }
  });
}


// Método para iniciar el temporizador general
startExecutionTimer(): void {
  this.stopExecutionTimer(); // Limpia cualquier temporizador previo
  
  this.executionTimer = setInterval(() => {
    const newTime = new Date(this.executionTime.getTime() + 1000);
    this.executionTime = newTime;
    this.cdr.detectChanges();
  }, 1000);
}

// Método para detener el temporizador
stopExecutionTimer(): void {
  if (this.executionTimer) {
    clearInterval(this.executionTimer);
    this.executionTimer = null;
  }
}

// Maneja el éxito de la ejecución
private handleExecutionSuccess(results: any): void {
  this.isExecutionLoading = false;
  this.stopExecutionTimer();
  
  // Actualiza el estado de los métodos
  this.executingMethods.forEach(method => {
    method.status = 'Done';
    clearInterval(method.intervalId);
  });
  
  console.log('All methods executed:', results);
  //this.fetchLatestExecutionResults(); // Actualiza los resultados
}

// Maneja errores en la ejecución
private handleExecutionError(error: any): void {
  this.isExecutionLoading = false;
  this.stopExecutionTimer();
  this.errorMessage = 'Error executing selected methods.';
  
  // Actualiza el estado de los métodos
  this.executingMethods.forEach(method => {
    method.status = 'Failed';
    clearInterval(method.intervalId);
  });
  
  console.error('Error executing methods:', error);
}

// Limpia los temporizadores al destruir el componente
ngOnDestroy(): void {
  this.stopExecutionTimer();
  this.executingMethods.forEach(method => {
    if (method.intervalId) clearInterval(method.intervalId);
  });
}
  // Ejecutar los métodos seleccionados.
  executeSelectedMethods_RESPALDO_7abril(): void {

    if (!this.dqModelVersionId) 
      return;

    const dqModelId = this.dqModelVersionId;

    if (this.selectedMethods.length === 0) {
      this.errorMessage = 'Please select at least one method to execute.';
      return;
    }

    this.isExecutionLoading = true;
    this.errorMessage = '';

    // Preparamos los métodos en ejecución (para mostrar el progreso en la UI)
    this.executingMethods = this.selectedMethodsObjects.map(method => ({
      ...method,
      status: 'Executing...',
      timeElapsed: 0,
      intervalId: this.startTimerForExecution(method)
    }));

    // Usamos los IDs directamente para ejecutar los métodos
    const appliedMethodIds = this.selectedMethods;  // Usamos los IDs que ya tienes

    if (appliedMethodIds.length === 0) {
      this.errorMessage = 'No valid methods selected.';
      this.isExecutionLoading = false;
      return;
    }

    // Usamos el método del servicio para ejecutar los métodos aplicados pasando solo los IDs
    this.modelService.executeMultipleAppliedMethods(dqModelId, appliedMethodIds).subscribe(
      results => {
        this.isExecutionLoading = false;
        this.executingMethods.forEach(method => method.status = 'Done');
        this.intervalIds.forEach(id => clearInterval(id));  // Limpiar todos los intervalos
        console.log('All methods executed:', results);
      },
      error => {
        this.isExecutionLoading = false;
        this.errorMessage = 'Error executing selected methods.';
        console.error('Error executing methods:', error);
        this.executingMethods.forEach(method => method.status = 'Failed');
        this.intervalIds.forEach(id => clearInterval(id));  // Limpiar todos los intervalos
      }
    );
  }



  // Función para iniciar un temporizador para cada ejecución
  startTimerForExecution(method: any) {
    let elapsedTime = 0;  // Tiempo transcurrido en segundos
    const intervalId = setInterval(() => {
      elapsedTime++;
      method.timeElapsed = elapsedTime;
      this.cdr.detectChanges();
    }, 1000); // Actualiza cada segundo
    return intervalId;
  }

  // Detener todos los intervalos cuando no sean necesarios
  clearAllTimers() {
    this.intervalIds.forEach(id => clearInterval(id));
  }

  //

  //DQ Methods details
  // Método para abrir el modal y cargar los detalles del método
  openMethodDetailsModal(methodBaseId: number): void {
    this.isModalOpen = true;
    this.isLoading = true;
    this.errorMessage = '';

    this.modelService.getMethodBaseDetails(methodBaseId).subscribe(
      (data) => {
        this.methodDetails = data;
        this.isLoading = false;
        console.log("data", data);
      },
      (error) => {
        this.errorMessage = 'Failed to load method details.';
        this.isLoading = false;
      }
    );
  }

  // Método para cerrar el modal
  closeModal(): void {
    this.isModalOpen = false;
    this.methodDetails = null; // Limpiar los detalles al cerrar
  }

  //Sort table
  // Método para ordenar la tabla
  sortTable(column: string): void {
    if (this.sortColumn === column) {
      // Si ya está ordenada por esta columna, cambia la dirección
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Si es una nueva columna, ordena en orden ascendente por defecto
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    // Ordenar la lista
    this.appliedDQMethods.sort((a, b) => {
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

  //Navigation
  onStepChange(step: number) {
    this.currentStep = step;
    this.navigateToStep(step);
  }
  
  navigateToStep(stepIndex: number) {
    const route = this.steps[stepIndex].route;
    this.router.navigate([route]);
  }




  // Execution results
  executionResults: any = null;
  selectedMethodResult: any = null;
  isLoadingResults: boolean = false;
  resultsError: string | null = null;

  // Method to fetch latest execution results
  fetchLatestExecutionResults(): void {
    if (!this.dqModelVersionId) return;
    
    this.isLoadingResults = true;
    this.resultsError = null;
    
    this.modelService.getLatestExecutionResults(this.dqModelVersionId).subscribe({
      next: (results) => {
        this.executionResults = results;
        this.isLoadingResults = false;

        this.mergeExecutionResultsWithMethods();
      },
      error: (err) => {
        this.resultsError = 'Failed to load execution results';
        this.isLoadingResults = false;
        console.error('Error fetching execution results:', err);
      }
    });
  }

  // Method to fetch specific method result
  fetchMethodExecutionResult(methodId: number): void {
    if (!this.dqModelVersionId) return;
    
    this.isLoadingResults = true;
    this.modelService.getMethodExecutionResult(this.dqModelVersionId, methodId).subscribe({
      next: (result) => {
        this.selectedMethodResult = result;

        console.log("this.selectedMethodResult", this.selectedMethodResult);

        this.isLoadingResults = false;
      },
      error: (err) => {
        this.resultsError = `Failed to load results for method ${methodId}`;
        this.isLoadingResults = false;
        console.error(`Error fetching execution result for method ${methodId}:`, err);
      }
    });
  }

  // Helper method to merge execution results with applied methods
  private mergeExecutionResultsWithMethods0(): void {
    if (!this.executionResults || !this.appliedDQMethods) return;
    
    this.appliedDQMethods.forEach(method => {
      const result = this.executionResults.results.find((r: any) => r.method_id === method.id);
      if (result) {
        method.executionResult = {
          status: result.status,
          dq_value: result.dq_value,
          executed_at: result.executed_at,
          details: result.details
        };
      } else {
        method.executionResult = {
          status: 'pending'
        };
      }
    });
  }

  // Method to open execution details for a method
  openExecutionDetails(methodId: number): void {
    this.fetchMethodExecutionResult(methodId);
    // You might want to open a modal here to show the details
  }

  pendingMethods: any[] = [];
  completedMethods: any[] = [];

  separateMethodsByStatus(): void {
    if (!this.appliedDQMethods) return;
    
    this.pendingMethods = this.appliedDQMethods.filter(method => 
      !method.executionResult || method.executionResult.status === 'pending'
    );
    
    this.completedMethods = this.appliedDQMethods.filter(method => 
      method.executionResult && method.executionResult.status === 'completed'
    );
  }

  // Actualiza el método mergeExecutionResultsWithMethods
  private mergeExecutionResultsWithMethods2(): void {
    if (!this.executionResults || !this.appliedDQMethods) return;
    
    this.appliedDQMethods.forEach(method => {
      const result = this.executionResults.results.find((r: any) => r.method_id === method.id);
      method.executionResult = result ? {
        status: result.status,
        dq_value: result.dq_value,
        executed_at: result.executed_at,
        details: result.details
      } : {
        status: 'pending'
      };
    });
    
    this.separateMethodsByStatus(); 
  }


  /*fetchLatestExecutionResults(): void {
    if (!this.dqModelVersionId) return;
    
    this.isLoadingResults = true;
    this.resultsError = null;
    
    this.modelService.getLatestExecutionResults(this.dqModelVersionId).subscribe({
      next: (results) => {
        this.executionResults = results;
        this.mergeExecutionResultsWithMethods();
        this.isLoadingResults = false;
      },
      error: (err) => {
        this.resultsError = 'Failed to load execution results';
        this.isLoadingResults = false;
        console.error('Error fetching execution results:', err);
      }
    });
  }*/

  // Agrega estas propiedades a tu componente
  selectedStatus: string = 'all';
  filteredMethods: any[] = [];

  // Agrega estructura executionResult a cada Applied Method
  mergeExecutionResultsWithMethods(): void {
    if (!this.executionResults || !this.appliedDQMethods) return;
    
    this.appliedDQMethods.forEach(method => {
      const result = this.executionResults.results.find((r: any) => r.method_id === method.id);
      
      method.executionResult = result ? {
        status: result.status,
        dq_value: result.dq_value,
        executed_at: result.executed_at,
        details: result.details
      } : {
        status: 'pending'
      };
    });
    
    //console.log("this.appliedDQMethods", this.appliedDQMethods);
    this.filterMethods(); // Aplicar filtro inicial
  }

  // Agrega este método para filtrar los métodos
  filterMethods_anterior(): void {
    if (!this.appliedDQMethods) return;
    
    switch (this.selectedStatus) {
      case 'completed':
        this.filteredMethods = this.appliedDQMethods.filter(m => 
          m.executionResult?.status === 'completed'
        );
        break;
      case 'pending':
        this.filteredMethods = this.appliedDQMethods.filter(m => 
          !m.executionResult || m.executionResult.status === 'pending'
        );
        break;
      default:
        this.filteredMethods = [...this.appliedDQMethods];
    }
  }

  filterMethods0(): void {
    if (!this.appliedDQMethods) return;
    
    switch (this.selectedStatus) {
      case 'completed':
        this.filteredMethods = this.appliedDQMethods.filter(m => 
          m.executionStatus === 'completed'  // Cambio aquí
        );
        break;
      case 'pending':
        this.filteredMethods = this.appliedDQMethods.filter(m => 
          m.executionStatus === 'pending'    // Cambio aquí
        );
        break;
      default: // 'all'
        this.filteredMethods = [...this.appliedDQMethods];
    }
  }

  filterMethods(): void {
    if (!this.appliedDQMethods) return;
    
    this.filteredMethods = this.appliedDQMethods.filter(m => {
      switch (this.selectedStatus) {
        case 'completed': 
          return m.executionStatus === 'completed';
        case 'pending':
          return m.executionStatus === 'pending';
        default: // 'all'
          return true;
      }
    });
  }


  // Applied DQ Method details modal
  isAppliedMethodModalOpen: boolean = false;
  appliedMethodDetails: any = null;
  appliedMethodModalTitle: string = 'Applied DQ Method';

  /**
 * Opens a modal with details of the applied DQ method
 * @param appliedMethod The applied method object to show details for
 */
  openAppliedMethodDetailsModal(appliedMethod: any): void {
    if (!this.dqModelVersionId) return;
    
    this.isAppliedMethodModalOpen = true;
    this.isLoading = true;
    this.errorMessage = '';

    // Set basic details immediately
    this.appliedMethodDetails = {
      ...appliedMethod,
      loadingDetails: true
    };

    // Fetch additional details from the server
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

  /**
   * Closes the applied method details modal
   */
  closeAppliedMethodModal(): void {
    this.isAppliedMethodModalOpen = false;
    this.appliedMethodDetails = null;
  }

  // Edición de algoritmo
  isEditingAlgorithm: boolean = false;
  editedAlgorithm: string = '';

  /**
 * Starts editing the algorithm
 */
startEditingAlgorithm(): void {
  this.isEditingAlgorithm = true;
  this.editedAlgorithm = this.appliedMethodDetails?.algorithm || '';
}

/**
 * Saves the edited algorithm
 */
saveAlgorithm(): void {
  if (!this.dqModelVersionId || !this.appliedMethodDetails) return;

  this.isLoading = true;
  const updatedData = { algorithm: this.editedAlgorithm };

  this.modelService.patchAppliedDQMethod(
    this.dqModelVersionId, 
    this.appliedMethodDetails.id, 
    updatedData
  ).subscribe({
    next: (updatedMethod) => {
      this.appliedMethodDetails.algorithm = updatedMethod.algorithm;
      this.isEditingAlgorithm = false;
      this.isLoading = false;
      
      // Actualiza también en la lista principal
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

/**
 * Cancels editing the algorithm
 */
cancelEditingAlgorithm(): void {
  this.isEditingAlgorithm = false;
}

  measurementExecutions: any[] = [];
  selectedExecution: string | null = null;
  isLoadingExecutions: boolean = false;

  loadMeasurementExecutions(): void {
    if (!this.dqModelVersionId) return;
    
    this.isLoadingExecutions = true;
    this.modelService.getAllDQModelExecutions(this.dqModelVersionId).subscribe({
      next: (response: any) => { 
        this.measurementExecutions = response.executions || [];
        this.isLoadingExecutions = false;
        /*if(this.dqModelVersionId){
          this.fetchExpandedDQMethodsData(this.dqModelVersionId);
        }*/
        
      },
      error: (err) => {
        console.error('Error loading executions:', err);
        this.isLoadingExecutions = false;
      }
    });
  }


  
  private executedIds: number[] = [];
  private pendingIds: number[] = [];


  onExecutionChange(): void {
    if (!this.selectedExecution || !this.dqModelVersionId) return;
    console.log('Selected execution:', this.selectedExecution);

    this.isLoading = true;
    this.modelService.getSpecificDQModelExecution(
      this.dqModelVersionId, 
      this.selectedExecution
    ).subscribe({
      next: (executionDetails) => {
        console.log('Detalles de ejecución:', executionDetails);

        // 1. Guardar los IDs importantes
        this.executedIds = executionDetails.applied_methods_executed || [];
        this.pendingIds = executionDetails.applied_methods_pending || [];
        console.log('executedIds:', this.executedIds);
        console.log('pendingIds:', this.pendingIds);
        
        // 2. Actualizar solo los estados (sin recargar métodos)
        this.updateMethodsStatus();
        
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Error al cargar la ejecución';
        this.isLoading = false;
      }
    });
  }

  // Nuevo método eficiente para actualizar estados
  private updateMethodsStatus(): void {
    if (!this.appliedDQMethods) return;
    console.log("appliedDQMethods", this.appliedDQMethods);
    
    this.appliedDQMethods.forEach(method => {
      method.executionStatus = this.executedIds.includes(method.id) 
        ? 'completed' 
        : this.pendingIds.includes(method.id) 
          ? 'pending' 
          : 'pending'; // Default
    });
    
    this.filterMethods(); // Re-aplica los filtros actuales
  }

  // Filtro optimizado (sin cambios)
  filterMethodsByExecutionStatus(): void {
    if (!this.appliedDQMethods) return;
    
    this.filteredMethods = this.appliedDQMethods.filter(m => {
      switch (this.selectedStatus) {
        case 'completed': return m.executionStatus === 'completed';
        case 'pending': return m.executionStatus === 'pending';
        default: return true; // 'all'
      }
    });
  }

 

}