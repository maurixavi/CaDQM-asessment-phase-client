// ========== IMPORTS ==========
import { ChangeDetectorRef, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { DqModelService } from '../../services/dq-model.service';
import { ProjectDataService } from '../../services/project-data.service';
import { Router } from '@angular/router';

import { buildContextComponents, formatCtxCompCategoryName, getFirstNonIdAttribute, formatAppliedTo, getAppliedToDisplay } from '../../shared/utils/utils';

interface OrganizedMethods {
  byGranularity: {
    [granularity: string]: {
      byTable: {
        [tableName: string]: {
          byColumn: {
            [columnName: string]: {
              methods: any[],
              columnInfo: {
                data_type: string,
                column_id: number
              }
            }
          },
          tableInfo: {
            table_id: number
          }
        }
      }
    }
  }
}

// interfaz para el estado de filtros
interface FilterState {
  selectedGranularity: string | null;
  selectedTable: string | null;
  selectedColumn: string | null;
  selectedColumns: string[]; // Para tuplas
}


declare var bootstrap: any;

// ========== COMPONENT DECORATOR ==========
@Component({
  selector: 'app-dq-measurement-results',
  templateUrl: './dq-measurement-results.component.html',
  styleUrl: './dq-measurement-results.component.css',
})

// ========== COMPONENT CLASS ==========
export class DqMeasurementResultsComponent implements OnInit {
  

  // ========== UTILITY METHODS ==========
  //public formatCtxCompCategoryName = formatCtxCompCategoryName;
  //public getFirstNonIdAttribute = getFirstNonIdAttribute;
  public formatAppliedTo = formatAppliedTo;
  public getAppliedToDisplay = getAppliedToDisplay;

  // ========== COMPONENT CONFIGURATION ==========
  currentStep: number = 1;
  pageStepTitle: string = 'Results of the DQ measurement';
  phaseTitle: string = 'Phase 2: DQ Assessment';
  stageTitle: string = 'Stage 5: DQ Measurement';

  steps: { displayName: string; route: string; description: string }[] = [
    { displayName: 'A14', route: 'st5/execution', description: 'Execution of the DQ measurement' },
    { displayName: 'A15', route: 'st5/results', description: 'Results of the DQ measurement' },
  ];

  isNextStepEnabled: boolean = true;

  // ========== CONSTRUCTOR ==========
  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private modelService: DqModelService,
    private projectService: ProjectService,
    private projectDataService: ProjectDataService
  ) {}

  // ========== MAIN DATA PROPERTIES ==========
  project: any = null;
  projectId: number | null = null;
  contextComponents: any = null;
  dqProblems: any[] = [];
  dqModelVersionId: number | null = null;
  dqModel: any = null;

  dataSchema: any = null;
  dataAtHandDetails: any = null;


  // ========== LOADING STATES ==========
  isLoading: boolean = false;
  errorMessage: string | null = null;

  // ========== DQ METHODS PROPERTIES ==========
  dqMethods: any[] = [];
  appliedDQMethods: any[] = []; // Lista de applied_methods aplanados

  // ========== MODAL PROPERTIES ==========
  isModalOpen: boolean = false;
  modalTitle: string = 'DQ Method Details';
  modalMessage: string = '';
  methodDetails: any = null;

  // ========== LIFECYCLE METHODS ==========
  ngOnInit(): void {
    // Obtener el Project ID actual
    this.projectId = this.projectDataService.getProjectId();
    console.log('projectIdGet: ', this.projectId);

    // Suscribirse a los observables del servicio
    this.subscribeToData();

    // Sincronizar el paso actual con la ruta
    this.syncCurrentStepWithRoute();
  }

  // ========== NAVIGATION METHODS ==========
  syncCurrentStepWithRoute() {
    const currentRoute = this.router.url; // Obtiene la ruta actual (por ejemplo, '/st4/confirmation-stage-4')
    const stepIndex = this.steps.findIndex((step) => step.route === currentRoute);
    if (stepIndex !== -1) {
      this.currentStep = stepIndex;
    }
  }

  // ========== DATA SUBSCRIPTION METHODS ==========
  subscribeToData(): void {
    // Suscribirse al proyecto
    this.projectDataService.project$.subscribe((data) => {
      this.project = data;
      console.log('Project Data:', data);

      if (this.project.data_at_hand) {
        this.loadDataAtHandDetails(this.project.data_at_hand);
      }

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

    // Suscribirse al esquema de datos
    this.projectDataService.dataSchema$.subscribe((data) => {
      this.dataSchema = data;
      console.log('Data Schema:', data); // Ver el esquema de datos en la consola
    });

  }

  loadDataAtHandDetails(dataAtHandId: number): void {
    this.projectDataService.getDataAtHandById(dataAtHandId).subscribe(
      (data) => {
        this.dataAtHandDetails = data; // Asignar los detalles a la variable del componente
      },
      (error) => {
        console.error('Error loading data at hand details:', error);
      }
    );
  }

  
  // ========== DQ METHODS DATA METHODS ==========
  // Obtener los métodos de un DQModel y aplanar los applied_methods
  /*fetchExpandedDQMethodsData(dqmodelId: number): void {
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
  }*/
 

  // ========== MODAL METHODS ==========
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

  // ========== STEP NAVIGATION METHODS ==========
  onStepChange(step: number) {
    this.currentStep = step;
    this.navigateToStep(step);
  }
  
  navigateToStep(stepIndex: number) {
    const route = this.steps[stepIndex].route;
    this.router.navigate([route]);
  }

  // ========== EXECUTION RESULTS PROPERTIES ==========
  executionResults: any = null;
  selectedMethodResult: any = null;
  isLoadingResults: boolean = false;
  resultsError: string | null = null;

  // ========== MULTIPLE RESULTS DISPLAY PROPERTIES ==========
  showMultipleResults: boolean = false;
  maxVisibleRows: number = 8; // Puedes ajustar este valor
  showFullTable: boolean = false; // Controla si mostrar todos los resultados

  // ========== EXECUTION DETAILS METHODS ==========
  // Method to open execution details for a method
  openExecutionDetails(methodId: number): void {
    this.fetchMethodExecutionResult(methodId);
    // You might want to open a modal here to show the details
  }

  // ========== STAGE COMPLETION METHODS ==========
  // Método para manejar la finalización del stage
  onCompleteStage(): void {
    // Navegar al siguiente stage (por ejemplo, Stage 5)
    this.router.navigate(['/st6/assessment-approaches']); // Cambia '/stage5' por la ruta correcta

    // Reiniciar el contador de pasos (si es necesario)
    this.currentStep = 0;
  }

  // ========== METHOD SELECTION PROPERTIES ==========
  selectedMethodId: number | null = null;
  selectedMethodDetail: any = null;

  // ========== METHOD SELECTION METHODS ==========
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

  // ========== PAGINATION PROPERTIES ==========
  currentPage: number = 1;
  itemsPerPage: number = 20;  
  showFullPagination: boolean = false;
  //visibleRows: any[] = [];

  // ========== PAGINATION METHODS ==========
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

  updateVisibleRows(): void {
      if (!this.selectedMethodDetail?.executionResult?.tableData) return;
      
      const startIndex = (this.currentPage - 1) * this.itemsPerPage;
      const endIndex = startIndex + this.itemsPerPage;
  }

  // ========== MULTIPLE RESULTS TOGGLE ==========
  toggleMultipleResults(): void {
    this.showMultipleResults = !this.showMultipleResults;
    
    // Resetear a la primera página cuando se muestran los resultados
    if (this.showMultipleResults) {
      this.currentPage = 1;
      this.showFullTable = false;
    }
  }

  math = Math;

  // ========== EXECUTION LOADING METHODS ==========
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

  // ========== EXECUTION CHANGE HANDLERS ==========
  private executedIds: number[] = [];
  private pendingIds: number[] = [];

 

  onExecutionChange(): void {
    if (!this.selectedExecution || !this.dqModelVersionId) return;
  
    this.isLoading = true;
    this.appliedDQMethods = [];
    this.organizedMethods = null;
  
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
        console.error('Error:', err);
      }
    });
  }

  
  // ========== EXECUTED METHODS DATA ==========
  fetchExecutedMethodsData(dqmodelId: number, executedIds: number[]): void {
    this.isLoading = true;
    this.errorMessage = null;
  
    this.modelService.getMethodsByDQModel(dqmodelId).subscribe({
      next: async (methods: any[]) => {
        this.appliedDQMethods = [];
        
        try {
          // Usamos async/await para mejor legibilidad y control de errores
          for (const method of methods) {
            try {
              const metric = await this.modelService.getMetricInDQModel(dqmodelId, method.metric).toPromise();
              if (!metric) continue;
  
              const baseMetric = await this.modelService.getMetricBaseDetails(metric.metric_base).toPromise();
              if (!baseMetric) continue;
  
              const factor = await this.modelService.getFactorInDQModel(dqmodelId, metric.factor).toPromise();
              if (!factor) continue;
  
              const dimension = await this.modelService.getDimensionInDQModel(dqmodelId, factor.dimension).toPromise();
              if (!dimension) continue;
  
              // Procesar measurements
              const executedMeasurements = method.applied_methods.measurements
                .filter((m: any) => executedIds.includes(m.id))
                .map((measurement: any) => ({
                  ...measurement,
                  dqMethod: method.method_name,
                  methodBase: method.method_base,
                  dqMetric: metric.metric_name,
                  dqFactor: factor.factor_name,
                  dqDimension: dimension.dimension_name,
                  purpose: baseMetric.purpose,
                  granularity: baseMetric.granularity,
                  resultDomain: baseMetric.resultDomain,
                  method_type: 'Measurement',
                  executionStatus: 'completed'
                }));
  
              // Procesar aggregations
              const executedAggregations = method.applied_methods.aggregations
                .filter((a: any) => executedIds.includes(a.id))
                .map((aggregation: any) => ({
                  ...aggregation,
                  dqMethod: method.method_name,
                  methodBase: method.method_base,
                  dqMetric: metric.metric_name,
                  dqFactor: factor.factor_name,
                  dqDimension: dimension.dimension_name,
                  purpose: baseMetric.purpose,
                  granularity: baseMetric.granularity,
                  resultDomain: baseMetric.resultDomain,
                  method_type: 'Aggregation',
                  executionStatus: 'completed'
                }));
  
              this.appliedDQMethods.push(...executedMeasurements, ...executedAggregations);
            } catch (error) {
              console.error(`Error procesando método ${method.method_name}:`, error);
            }
          }
  
          console.log('Todos los métodos aplicados cargados:', this.appliedDQMethods);
          this.organizeMethodsByGranularity();
          this.extractDataElements();
          this.filterMethods();
        } catch (error) {
          this.errorMessage = 'Error al procesar los métodos ejecutados';
          console.error('Error general:', error);
        } finally {
          this.isLoading = false;
        }
      },
      error: (error: any) => {
        this.errorMessage = 'Error al cargar los métodos base';
        this.isLoading = false;
        console.error('Error:', error);
      }
    });
  }

  

  // ========== RESULT FETCHING METHODS ==========
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

  // ========== DETAILED ROW RESULTS ==========
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

  // ========== RESULT PROCESSING METHODS ==========
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

  // ========== ERROR HANDLING ==========
  private handleResultError(methodId: number, error: any): void {
    this.resultsError = `Error loading results for method ${methodId}`;
    this.isLoadingResults = false;
    console.error(`Error fetching execution result for method ${methodId}:`, error);
  }

  // ========== VIEW METHODS ==========
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

  // ========== GRANULARITY FILTER PROPERTIES ==========
  selectedGranularity: string | null = null;
  filteredMethods: any[] = [];  // Para almacenar los métodos filtrados

  // ========== GRANULARITY FILTER METHODS ==========
  filterMethodsByGranularity(): void {
    if (this.selectedGranularity === 'all' || !this.selectedGranularity) {
      // Caso "All" - mostrar todos los métodos sin filtrar
      this.filteredMethods = [...this.appliedDQMethods];
      return;
    }

    // Filtrar por granularidad seleccionada
    this.filteredMethods = this.appliedDQMethods.filter(method => 
      method.granularity?.toLowerCase() === this.selectedGranularity?.toLowerCase()
    );

    // Resetear la selección si el método seleccionado no está en los filtrados
    if (this.selectedMethodId && !this.filteredMethods.some(m => m.id === this.selectedMethodId)) {
      this.selectedMethodId = null;
      this.selectedMethodDetail = null;
    }
  }
  
  // ========== FILTER MODE PROPERTIES ==========
filterMode: 'by_granularity' | 'by_data_element' = 'by_granularity'; // Default

resultsView: 'by_method' | 'by_data_element' = 'by_method';
//availableTables: string[] = [];
availableTables: {table_name: string}[] = [];
availableColumns: {table: string, columns: string[]}[] = [];
filteredColumns: string[] = [];
selectedTable: string | null = null;
selectedColumn: string | null = null;



extractDataElements(): void {
  // Usa el dataSchema para obtener las tablas y columnas disponibles
  this.availableTables = this.dataSchema?.map((schema: any) => ({
    table_name: schema.table_name,
    // otras propiedades si son necesarias
  })) || [];
  
  this.availableColumns = this.dataSchema?.map((schema: any) => ({
    table: schema.table_name,
    columns: schema.columns.map((col: any) => col.column_name)
  })) || [];
}




resetDataElementFilters(): void {
  this.selectedTable = null;
  this.selectedColumn = null;
  this.filterMethods();
}

getColumnsForSelectedTable(): string[] {
  if (!this.selectedTable) return [];
  const tableData = this.availableColumns.find(t => t.table === this.selectedTable);
  return tableData ? tableData.columns : [];
}



// función para manejar cambios en la tabla
onTableChange(): void {
  this.selectedColumn = null; // Resetear la columna al cambiar de tabla
  this.filterMethods();
}


// Modificación de la función onResultsViewChange
onResultsViewChange(): void {
  // Solo resetear los filtros específicos sin tocar resultsView
  this.selectedGranularity = null;
  this.selectedTable = null;
  this.selectedColumn = null;
  this.selectedMethodId = null;
  this.selectedMethodDetail = null;
  this.filteredMethods = [];
  
  // Extraer elementos de datos si es necesario
  if (this.resultsView === 'by_data_element') {
    this.extractDataElements();
  }
}

// Asegurar que filterMethods() combine todos los filtros correctamente
filterMethods(): void {
  if (!this.resultsView) return;

  // Filtro base por granularidad
  this.filteredMethods = this.selectedGranularity === 'all' 
    ? [...this.appliedDQMethods] 
    : this.appliedDQMethods.filter(m => m.granularity?.toLowerCase() === this.selectedGranularity?.toLowerCase());

  // Filtro adicional por elemento de datos si corresponde
  if (this.resultsView === 'by_data_element') {
    this.filteredMethods = this.filteredMethods.filter(method => {
      return method.appliedTo.some((applied: any) => {
        console.log("this.filteredMethods by Granularity", this.filteredMethods);
        
        const tableMatch = !this.selectedTable || applied.tableName === this.selectedTable;
        const columnMatch = !this.selectedColumn || applied.columns.includes(this.selectedColumn);
        return tableMatch && columnMatch;
      });
    });
  }

  // Resetear selección si el método actual no está en los filtrados
  if (this.selectedMethodId && !this.filteredMethods.some(m => m.id === this.selectedMethodId)) {
    this.selectedMethodId = null;
    this.selectedMethodDetail = null;
  }
}


// Nuevas propiedades
tableMethods: any[] = [];

// Método para cargar métodos al seleccionar tabla
loadTableMethods(): void {
  this.selectedColumn = null;
  this.tableMethods = [];

  if (!this.selectedTable || !this.selectedGranularity) return;

  // 1. Filtrar métodos por granularidad y tabla
  this.tableMethods = this.appliedDQMethods.filter(method => 
    method.granularity === this.selectedGranularity &&
    method.appliedTo.some((applied: { table_name: string | null; }) => applied.table_name === this.selectedTable)
  );
}

// Obtener columnas con sus métodos
getTableColumnsWithMethods(): any[] {
  if (!this.selectedTable || !this.selectedGranularity || !this.organizedMethods) {
    return [];
  }

  const granularityKey = this.selectedGranularity.toLowerCase();
  const tableData = this.organizedMethods.byGranularity[granularityKey]?.byTable[this.selectedTable];

  if (!tableData) {
    console.log(`No data found for granularity ${granularityKey} and table ${this.selectedTable}`);
    return [];
  }

  // Get schema info for the table
  const tableSchema = this.dataSchema?.find((t: any) => t.table_name === this.selectedTable);
  if (!tableSchema) {
    console.log(`No schema found for table ${this.selectedTable}`);
    return [];
  }

  return tableSchema.columns.map((column: any) => {
    const columnMethods = tableData.byColumn[column.column_name]?.methods || [];
    console.log(`Found ${columnMethods.length} methods for column ${column.column_name}`);
    
    return {
      column_name: column.column_name,
      data_type: column.data_type,
      methods: columnMethods
    };
  });
}



// Obtener valor de resultado para un método
getMethodResultValue(methodId: number): number {
  if (!this.executionResults) return 0; // Return 0 or some default value if results not loaded
  
  const result = this.executionResults.find((r: { method_id: number; }) => r.method_id === methodId);
  return result?.dq_value || 0;
}

// Seleccionar método para ver detalles
selectMethod(method: any): void {
  this.selectedMethodId = method.id;
  this.selectedMethodDetail = method;
  this.fetchMethodExecutionResult(method.id);
  
  // Espera un breve momento para que Angular actualice la vista
  setTimeout(() => {
    const element = document.querySelector('.method-detail');
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
      
      // Opcional: añade una clase de highlight temporal
      element.classList.add('highlight-method');
      setTimeout(() => {
        element.classList.remove('highlight-method');
      }, 1000);
    }
  }, 100);
}


organizedMethods: OrganizedMethods | null = null;



organizeMethodsByGranularity(): void {
  // Inicialización segura
  this.organizedMethods = { byGranularity: {} };

  if (!this.appliedDQMethods?.length) {
    console.error('No hay métodos para organizar');
    return;
  }

  console.log(`Organizando ${this.appliedDQMethods.length} métodos...`);

  for (const method of this.appliedDQMethods) {
    if (!method?.granularity || !Array.isArray(method.appliedTo)) {
      console.warn('Método inválido omitido:', method);
      continue;
    }

    const granularity = method.granularity.toLowerCase();

    // Verificación e inicialización segura de granularity
    if (!this.organizedMethods.byGranularity[granularity]) {
      this.organizedMethods.byGranularity[granularity] = { byTable: {} };
    }
    const currentGranularity = this.organizedMethods.byGranularity[granularity];

    for (const applied of method.appliedTo) {
      if (!applied?.table_name || !applied?.column_name) {
        console.warn('Entrada appliedTo inválida:', applied);
        continue;
      }

      const tableName = applied.table_name;
      const columnName = applied.column_name;

      // Verificación e inicialización segura de tabla
      if (!currentGranularity.byTable[tableName]) {
        currentGranularity.byTable[tableName] = {
          byColumn: {},
          tableInfo: {
            table_id: applied.table_id || 0
          }
        };
      }
      const currentTable = currentGranularity.byTable[tableName];

      // Verificación e inicialización segura de columna
      if (!currentTable.byColumn[columnName]) {
        currentTable.byColumn[columnName] = {
          methods: [],
          columnInfo: {
            data_type: applied.data_type || 'unknown',
            column_id: applied.column_id || 0
          }
        };
      }

      // Agregar método (100% seguro que todo existe)
      currentTable.byColumn[columnName].methods.push(method);
    }
  }

  console.log('Organización completada con éxito', this.organizedMethods);
}


// Get unique DQ Method names from an array of methods
getUniqueDQMethods(methods: any[]): string[] {
  const uniqueMethods = new Set<string>();
  methods.forEach(method => uniqueMethods.add(method.dqMethod));
  return Array.from(uniqueMethods);
}

// Filter methods by DQ Method name
getMethodsByDQMethod(methods: any[], dqMethod: string): any[] {
  return methods.filter(method => method.dqMethod === dqMethod);
}


getColumnGroups(): any[] {
  if (this.selectedGranularity !== 'tuple') {
    // Para granularidad no-tuple, devolver cada columna individualmente
    return this.getTableColumnsWithMethods().map(column => ({
      columns: [column],
      methods: column.methods
    }));
  }

  // Para tuple, agrupar por conjuntos de métodos idénticos
  const columnGroups: any[] = [];
  const methodGroups = new Map<string, {columns: any[], methods: any[]}>();

  this.getTableColumnsWithMethods().forEach(column => {
    const methodKey = JSON.stringify(column.methods.map((m: { id: any; }) => m.id).sort());
    
    if (!methodGroups.has(methodKey)) {
      methodGroups.set(methodKey, {
        columns: [],
        methods: column.methods
      });
    }
    
    // Versión segura con verificación de undefined
    const group = methodGroups.get(methodKey);
    if (group) {
      group.columns.push(column);
    }
  });

  methodGroups.forEach(group => {
    columnGroups.push(group);
  });

  return columnGroups;
}

}