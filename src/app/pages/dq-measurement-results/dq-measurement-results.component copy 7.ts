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
        //ExpandedDQMethodsData(this.dqModelVersionId);
        this.loadMeasurementExecutions();
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

                      //this.fetchLatestExecutionResults();
        
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



  // En tu componente
showMultipleResults: boolean = false;
maxVisibleRows: number = 8; // Puedes ajustar este valor
showFullTable: boolean = false; // Controla si mostrar todos los resultados

toggleMultipleResults0(): void {
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



  // Agrega estas propiedades a tu componente
  selectedStatus: string = 'all';
  executedMethods: any[] = [];



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

    // Resetear el estado de visualización
    this.showMultipleResults = false;
    this.showFullPagination = false;
    this.currentPage = 1;

    console.log("this.selectedMethodId", this.selectedMethodId)
    // Buscar el método por ID
    this.selectedMethodDetail = this.appliedDQMethods.find(method => method.id == this.selectedMethodId);

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

  getTableByRow(row: any): string {
    return row?.tableName || '';
  }

  getColumnByRow(row: any): string {
    return row?.columnNames[0] || '';
  }


  // Agrega estas propiedades
currentPage: number = 1;
itemsPerPage: number = 20; // Puedes ajustar este valor
showFullPagination: boolean = false;
//visibleRows: any[] = [];

// Métodos para manejar la paginación
getPageRange(): number[] {
    const totalPages = this.totalPages;
    const range = [];
    const maxVisiblePages = 5; // Número máximo de páginas visibles en la paginación
    
    let start = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let end = Math.min(totalPages, start + maxVisiblePages - 1);
    
    // Ajustar si estamos cerca del final
    if (end - start + 1 < maxVisiblePages) {
        start = Math.max(1, end - maxVisiblePages + 1);
    }
    
    for (let i = start; i <= end; i++) {
        range.push(i);
    }
    
    return range;
}



changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
        this.updateVisibleRows();
    }
}


showAllWithPagination(): void {
  if (this.needsPagination) {
    this.showFullPagination = true;
    this.currentPage = 1;
    this.updateVisibleRows();
  }
}

get needsPagination0(): boolean {
  if (!this.selectedMethodDetail?.executionResult?.tableData) return false;
  return this.selectedMethodDetail.executionResult.tableData.length > this.itemsPerPage;
}

updateVisibleRows(): void {
    if (!this.selectedMethodDetail?.executionResult?.tableData) return;
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    
    if (this.showFullPagination) {
        //this.visibleRows = this.selectedMethodDetail.executionResult.tableData.slice(startIndex, endIndex);
    } else {

        //this.visibleRows = this.selectedMethodDetail.executionResult.tableData.slice(0, this.maxVisibleRows);
    }
}



toggleMultipleResults(): void {
  this.showMultipleResults = !this.showMultipleResults;
  
  // Resetear a la primera página cuando se muestran los resultados
  if (this.showMultipleResults) {
    this.currentPage = 1;
    this.showFullTable = false;
  }
}

math = Math;


  measurementExecutions: any[] = [];
  selectedExecution: string | null = null;
  isLoadingExecutions: boolean = false;

  loadMeasurementExecutions(): void {
    if (!this.dqModelVersionId) return;
    
    this.isLoadingExecutions = true;
    this.modelService.getAllDQModelExecutions(this.dqModelVersionId).subscribe({
      next: (response: any) => { 
        this.measurementExecutions = response.executions || [];
        
        // Ordenar ejecuciones por fecha started_at (más reciente primero)
        this.measurementExecutions.sort((a, b) => 
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
        );
        
        // Seleccionar automáticamente la más reciente
        if (this.measurementExecutions.length > 0) {
          this.selectedExecution = this.measurementExecutions[0].execution_id;
          this.onExecutionChange(); // Cargar los métodos de esta ejecución
        }
        
        this.isLoadingExecutions = false;
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
  
    this.isLoading = true;
    this.appliedDQMethods = []; // Limpiar métodos anteriores
  
    this.modelService.getSpecificDQModelExecution(
      this.dqModelVersionId, 
      this.selectedExecution
    ).subscribe({
      next: (executionDetails) => {
        const executedIds = executionDetails.applied_methods_executed || [];
        
        if (executedIds.length === 0) {
          this.errorMessage = 'No hay métodos ejecutados en esta ejecución';
          this.isLoading = false;
          return;
        }
  
        if (this.dqModelVersionId) {
          this.fetchExecutedMethodsData(this.dqModelVersionId, executedIds);
        }
      },
      error: (err) => {
        this.errorMessage = 'Error al cargar la ejecución';
        this.isLoading = false;
      }
    });
  }

  fetchExecutedMethodsData(dqmodelId: number, executedIds: number[]): void {
    this.isLoading = true;
    this.errorMessage = null;
  
    this.modelService.getMethodsByDQModel(dqmodelId).subscribe({
      next: (methods: any[]) => {
        // Aplanar la lista de applied_methods pero filtrando solo los ejecutados
        this.appliedDQMethods = methods.flatMap((method) => {
          const dqMethodName = method.method_name;
          const methodBase = method.method_base;
          const metricId = method.metric;
  
          // Obtener los detalles de la métrica, el factor y la dimensión
          this.modelService.getMetricInDQModel(dqmodelId, metricId).subscribe((metric) => {
            if (metric) {
              const factorId = metric.factor;
              this.modelService.getFactorInDQModel(dqmodelId, factorId).subscribe((factor) => {
                if (factor) {
                  const dimensionId = factor.dimension;
                  this.modelService.getDimensionInDQModel(dqmodelId, dimensionId).subscribe((dimension) => {
                    if (dimension) {
                      // Filtrar y mapear SOLO los métodos ejecutados
                      const executedMeasurements = method.applied_methods.measurements
                        .filter((m: any) => executedIds.includes(m.id))
                        .map((measurement: any) => ({
                          ...measurement,
                          dqMethod: dqMethodName,
                          methodBase: methodBase,
                          dqMetric: metric.metric_name,
                          dqFactor: factor.factor_name,
                          dqDimension: dimension.dimension_name,
                          method_type: 'Measurement',
                          executionStatus: 'completed'
                        }));
  
                      const executedAggregations = method.applied_methods.aggregations
                        .filter((a: any) => executedIds.includes(a.id))
                        .map((aggregation: any) => ({
                          ...aggregation,
                          dqMethod: dqMethodName,
                          methodBase: methodBase,
                          dqMetric: metric.metric_name,
                          dqFactor: factor.factor_name,
                          dqDimension: dimension.dimension_name,
                          method_type: 'Aggregation',
                          executionStatus: 'completed'
                        }));
  
                      // Actualizar la lista de métodos
                      this.appliedDQMethods = [
                        ...this.appliedDQMethods,
                        ...executedMeasurements,
                        ...executedAggregations
                      ];
                      console.log("this.appliedDQMethods", this.appliedDQMethods);
                    }
                  });
                }
              });
            }
          });
  
          return []; // Retornar array vacío temporalmente
        });
  
        this.isLoading = false;
      },
      error: (error: any) => {
        this.errorMessage = 'Error al cargar los métodos ejecutados';
        this.isLoading = false;
      }
    });
  }


  // Método principal para cargar resultados
  fetchMethodExecutionResult(methodId: number): void {
    if (!this.dqModelVersionId) return;
    
    this.isLoadingResults = true;
    
    // Primero obtenemos los resultados básicos del método
    this.modelService.getMethodExecutionResult(this.dqModelVersionId, methodId).subscribe({
      next: (basicResult) => {
        this.selectedMethodResult = basicResult;
        console.log("Basic execution result:", basicResult);
  
        // Verificamos el tipo de resultado
        if (basicResult.results?.[0]?.result_type === 'multiple') {
          // Si es múltiple, cargamos los detalles por fila
          this.loadDetailedRowResults(methodId, basicResult);
        } else {
          // Si es simple, cargamos los resultados a nivel de columna
          this.loadColumnResults(methodId, basicResult);
        }
      },
      error: (err) => {
        this.handleResultError(methodId, err);
      }
    });
  }

  private loadColumnResults(methodId: number, basicResult: any): void {
    this.modelService.getMethodExecutionColumnResults(
      this.dqModelVersionId!,
      methodId
    ).subscribe({
      next: (columnResults) => {
        console.log("Column results:", columnResults);
        
        // Procesamos los resultados de columna
        this.processSingleResultWithColumnData(basicResult, columnResults);
        this.isLoadingResults = false;
      },
      error: (err) => {
        console.warn(`Could not load column results for method ${methodId}, using basic result`, err);
        // Si falla, usamos el resultado básico
        this.processSingleResult(basicResult);
        this.isLoadingResults = false;
      }
    });
  }

  private processSingleResultWithColumnData(basicResult: any, columnResults: any): void {
    if (!this.selectedMethodDetail) return;
  
    // Tomamos el primer resultado de columna (asumiendo que solo hay uno para resultados 'single')
    const columnResult = columnResults.results?.[0];
    
    this.selectedMethodDetail.executionResult = {
      displayType: 'single',
      dq_value: columnResult?.dq_value || basicResult.results?.[0]?.dq_value,
      executed_at: basicResult.results?.[0]?.executed_at,
      columnDetails: columnResult ? {
        tableName: columnResult.table_name,
        columnName: columnResult.column_name,
        assessment: columnResult.assessment_score
      } : null
    };
  
    console.log("Processed single result with column data:", this.selectedMethodDetail.executionResult);
  }

  fetchMethodExecutionResult_BACKYO1604(methodId: number): void {
    if (!this.dqModelVersionId) return;
    
    this.isLoadingResults = true;
    
    // Primero obtenemos los resultados básicos del método
    this.modelService.getMethodExecutionResult(this.dqModelVersionId, methodId).subscribe({
      next: (basicResult) => {
        this.selectedMethodResult = basicResult;
        console.log("Basic execution result:", basicResult);

        // Verificamos el tipo de resultado
        if (basicResult.results?.[0]?.result_type === 'multiple') {
          // Si es múltiple, cargamos los detalles por fila
          this.loadDetailedRowResults(methodId, basicResult);
        } else {
          // Si es simple, procesamos directamente
          this.processSingleResult(basicResult);
          this.isLoadingResults = false;
        }
      },
      error: (err) => {
        this.handleResultError(methodId, err);
      }
    });
  }

  // Método para cargar resultados detallados por fila
  private loadDetailedRowResults(methodId: number, basicResult: any): void {
    this.modelService.getMethodExecutionRowResults(
      this.dqModelVersionId!,
      methodId
    ).subscribe({
      next: (rowResults) => {
        console.log("Detailed row results:", rowResults);
        
        // Combinamos ambos resultados
        this.selectedMethodResult = {
          ...basicResult,
          rowResults: rowResults
        };
        
        // Procesamos para la vista
        this.processMultipleResults(rowResults);
        this.isLoadingResults = false;
      },
      error: (err) => {
        this.handleResultError(methodId, err);
      }
    });
  }

  // Procesar resultados múltiples
  private processMultipleResults(rowResults: any): void {
    if (!this.selectedMethodDetail) return;

    this.selectedMethodDetail.executionResult = {
      displayType: 'multiple',
      tableData: rowResults.dq_values.map((item: any) => ({
        rowId: item.row_id,
        dqValue: item.dq_value,
        assessment: item.assessment_score,
        tableName: rowResults.table_name,
        columnName: rowResults.column_name
      })),
      tableName: rowResults.table_name,
      columnName: rowResults.column_name,
      totalRows: rowResults.dq_values_count, 
      dq_values: rowResults.dq_values
    };
  }

  // Procesar resultado simple
  private processSingleResult(result: any): void {
    if (!this.selectedMethodDetail) return;

    this.selectedMethodDetail.executionResult = {
      displayType: 'single',
      dq_value: result.results?.[0]?.dq_value,
      executed_at: result.results?.[0]?.executed_at
    };
  }

  // Manejo de errores común
  private handleResultError(methodId: number, error: any): void {
    this.resultsError = `Error loading results for method ${methodId}`;
    this.isLoadingResults = false;
    console.error(`Error fetching execution result for method ${methodId}:`, error);
  }

  get visibleRows(): any[] {
    if (!this.selectedMethodDetail?.executionResult?.tableData) return [];
    
    // Si showFullTable es true o hay pocos resultados, mostrar todos
    if (this.showFullTable || this.selectedMethodDetail.executionResult.tableData.length <= this.maxVisibleRows) {
      return this.selectedMethodDetail.executionResult.tableData;
    }
    
    // Mostrar solo maxVisibleRows si no se ha hecho clic en "Load more"
    return this.selectedMethodDetail.executionResult.tableData.slice(0, this.maxVisibleRows);
  }


  get totalPages(): number {
    if (!this.selectedMethodDetail?.executionResult?.totalRows) return 0;
    return Math.ceil(this.selectedMethodDetail.executionResult.totalRows / this.itemsPerPage);
  }
  
  get needsPagination(): boolean {
    return (this.selectedMethodDetail?.executionResult?.totalRows || 0) > this.itemsPerPage;
  }

  

}