import { ChangeDetectorRef, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { DqModelService } from '../../services/dq-model.service';
import { ProjectDataService } from '../../services/project-data.service';
import { Router } from '@angular/router';

import { buildContextComponents, formatCtxCompCategoryName, getFirstNonIdAttribute, formatAppliedTo, getAppliedToDisplay } from '../../shared/utils/utils';

declare var bootstrap: any;

@Component({
  selector: 'app-dq-measurement-results',
  templateUrl: './dq-measurement-results.component.html',
  styleUrl: './dq-measurement-results.component.css',
})
export class DqMeasurementResultsComponent implements OnInit {

  // Utils
  //public formatCtxCompCategoryName = formatCtxCompCategoryName;
  //public getFirstNonIdAttribute = getFirstNonIdAttribute;
  public formatAppliedTo = formatAppliedTo;
  public getAppliedToDisplay = getAppliedToDisplay;

  
  currentStep: number = 1;
  pageStepTitle: string = 'Results of the DQ measurement';
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
    private projectDataService: ProjectDataService
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
      }
    });
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
                        })),
                        ...method.applied_methods.aggregations.map((aggregation: any) => ({
                          ...aggregation,
                          dqMethod: dqMethodName,
                          dqMetric: metric.metric_name, // Nombre de la métrica
                          dqFactor: factor.factor_name, // Nombre del factor
                          dqDimension: dimension.dimension_name, // Nombre de la dimensión
                          selected: false, // Inicializar el checkbox como no seleccionado
                        })),
                      ];
  
                      this.appliedDQMethods = [...this.appliedDQMethods, ...appliedMethods];
                      //console.log('Applied DQ Methods fecthed:', this.appliedDQMethods);

                      this.fetchLatestExecutionResults();
        
                    }
                  });
                }
              });
            }
          });
  
          return []; // Retornar un array vacío temporalmente
        });
  
        this.isLoading = false; // Desactiva el spinner de carga
      },
      error: (error: any) => {
        this.errorMessage = 'Error al cargar los métodos. Inténtalo de nuevo.'; // Muestra un mensaje de error
        this.isLoading = false; // Desactiva el spinner de carga
        console.error('Error fetching DQ Methods:', error);
      },
    });
  }
  
  fetchExpandedDQMethodsData2(dqmodelId: number): void {
    this.isLoading = true; // Activa el spinner de carga
    this.errorMessage = null; // Limpia cualquier mensaje de error previo

    this.modelService.getMethodsByDQModel(dqmodelId).subscribe({
      next: (methods: any[]) => {
        // Aplanar la lista de applied_methods
        this.appliedDQMethods = methods.flatMap((method) => {
          const dqMethodName = method.method_name; // Nombre del DQ Method
          const methodBase = method.method_base; // Id del DQ Method Base
          const appliedTo = method.appliedTo;
          const dqMetric = method.metric; // ID de la métrica
          const dqFactor = method.metric; // ID del factor (ajusta según tu estructura)
          const dqDimension = method.metric; // ID de la dimensión (ajusta según tu estructura)

          // Mapear los applied_methods (measurements y aggregations)
          const appliedMethods = [
            ...method.applied_methods.measurements.map((measurement: any) => ({
              ...measurement,
              dqMethod: dqMethodName,
              methodBase: methodBase,
              dqMetric: dqMetric,
              dqFactor: dqFactor,
              dqDimension: dqDimension,
              selected: false, // Inicializar el checkbox como no seleccionado
            })),
            ...method.applied_methods.aggregations.map((aggregation: any) => ({
              ...aggregation,
              dqMethod: dqMethodName,
              methodBase: methodBase,
              dqMetric: dqMetric,
              dqFactor: dqFactor,
              dqDimension: dqDimension,
              selected: false, // Inicializar el checkbox como no seleccionado
            })),
          ];

          return appliedMethods;
        });

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
    return this.executedMethods.length > 0 && 
           this.executedMethods.every(item => item.selected);
  }
  
  toggleSelectAll(event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.executedMethods.forEach(item => item.selected = isChecked);
  }

  // Método para seleccionar/deseleccionar un item individual
  toggleSelectItem(item: any): void {
    item.selected = !item.selected;
  }

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

        //console.log("this.executionResults", this.executionResults);

        // Merge execution results with applied methods
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
        
        // Clasificamos el tipo de resultado
        if (result.result_type === 'multiple') {
          this.processMultipleResults(result);
        } else {
          this.processSingleResult(result);
        }
        
        this.isLoadingResults = false;
      },
      error: (err) => {
        this.resultsError = `Failed to load results for method ${methodId}`;
        this.isLoadingResults = false;
        console.error(`Error fetching execution result for method ${methodId}:`, err);
      }
    });
  }
  
  private processSingleResult(result: any): void {
    // Para resultados simples, asignamos directamente
    if (this.selectedMethodDetail) {
      this.selectedMethodDetail.executionResult = {
        ...result,
        displayType: 'single'
      };
    }
  }
  
  private processMultipleResults(result: any): void {
    // Para resultados múltiples, preparamos los datos para la tabla
    if (this.selectedMethodDetail) {
      this.selectedMethodDetail.executionResult = {
        ...result,
        displayType: 'multiple',
        tableData: result.dq_values.rows.map((row: any) => ({
          rowId: row.row_id,
          dqValue: row.dq_value,
          // Puedes añadir más campos si es necesario
        }))
      };
    }
  }

  // En tu componente
showMultipleResults: boolean = false;
maxVisibleRows: number = 10; // Puedes ajustar este valor

toggleMultipleResults(): void {
  this.showMultipleResults = !this.showMultipleResults;
}

/*
formatDqValue(value: any): string {
  if (value === null || value === undefined) return 'N/A';
  
  // Formateo para porcentajes
  if (typeof value === 'number' && value <= 1) {
    return `${(value * 100).toFixed(2)}%`;
  }
  
  // Formateo para booleanos
  if (typeof value === 'boolean') {
    return value ? '✓ Valid' : '✗ Invalid';
  }
  
  return value.toString();
}*/

  fetchMethodExecutionResult_RESpaldo84(methodId: number): void {
    if (!this.dqModelVersionId) return;
    
    this.isLoadingResults = true;
    this.modelService.getMethodExecutionResult(this.dqModelVersionId, methodId).subscribe({
      next: (result) => {
        this.selectedMethodResult = result;

        console.log("this.selectedMethodResult", this.selectedMethodResult);

        // Actualiza el método seleccionado con el resultado
        if (this.selectedMethodDetail) {
          this.selectedMethodDetail.executionResult = result;
        }
        console.log("*** this.selectedMethodDetail.executionResult ***", this.selectedMethodDetail.executionResult);

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
  executedMethods: any[] = [];

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
    //this.filterMethods(); // Aplicar filtro inicial
    this.getExecutedAppliedMethods();
  }

  getExecutedAppliedMethods_(): void {
    if (!this.appliedDQMethods) return;
    this.executedMethods = this.appliedDQMethods.filter(m => 
      m.executionResult?.status === 'completed'
    );

    //console.log("this.appliedDQMethods", this.appliedDQMethods);
    console.log("this.executedMethods", this.executedMethods);
  }

  // Modifica el método getExecutedAppliedMethods para asegurar que cada método tenga un ID único
  getExecutedAppliedMethods(): void {
    if (!this.appliedDQMethods) return;
    
    this.executedMethods = this.appliedDQMethods
      .filter(m => m.executionResult?.status === 'completed')
      .map((method, index) => ({
        ...method,
        // Usamos el index como ID temporal si el método no tiene un ID
        id: method.id || index 
      }));

    //console.log("this.executedMethods", this.executedMethods);
  }

  // Agrega este método para filtrar los métodos
  filterMethods(): void {
    if (!this.appliedDQMethods) return;
    
    switch (this.selectedStatus) {
      case 'completed':
        this.executedMethods = this.appliedDQMethods.filter(m => 
          m.executionResult?.status === 'completed'
        );
        break;
      case 'pending':
        this.executedMethods = this.appliedDQMethods.filter(m => 
          !m.executionResult || m.executionResult.status === 'pending'
        );
        break;
      default:
        this.executedMethods = [...this.appliedDQMethods];
    }
  }



  // Método para manejar la finalización del stage
  onCompleteStage(): void {
    // Navegar al siguiente stage (por ejemplo, Stage 5)
    this.router.navigate(['/st6/assessment-approaches']); // Cambia '/stage5' por la ruta correcta

    // Reiniciar el contador de pasos (si es necesario)
    this.currentStep = 0;
  }


  // Agrega estas propiedades a tu componente
  selectedMethodId: number | null = null;
  selectedMethodDetail: any = null;

  // Método para manejar la selección de un método
  onMethodSelected(): void {
    if (!this.selectedMethodId) {
      this.selectedMethodDetail = null;
      return;
    }

    console.log("this.selectedMethodId", this.selectedMethodId)
    // Buscar el método por ID
    this.selectedMethodDetail = this.executedMethods.find(method => method.id == this.selectedMethodId);

    // Obtiene los resultados de ejecución
    this.fetchMethodExecutionResult(this.selectedMethodId);

    // Imprimir en consola para depurar
    console.log('Selected method details:', this.selectedMethodDetail);
  }

  getRowId(row: any): number {
    return row?.rowId || 0;
  }
  
  getDqValue(row: any): number {
    return row?.dqValue || 0;
  }
  
}