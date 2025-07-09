import { ChangeDetectorRef, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProjectService } from '../../../services/project.service';
import { DqModelService } from '../../../services/dq-model.service';
import { ProjectDataService } from '../../../services/project-data.service';
import { Router } from '@angular/router';
import { buildContextComponents, formatCtxCompCategoryName, getFirstNonIdAttribute, formatAppliedTo, getAppliedToDisplay } from '../../../shared/utils/utils';
import { NotificationService } from '../../../services/notification.service';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';
declare var bootstrap: any;

@Component({
  selector: 'app-dq-assessment-approaches-definition',
  templateUrl: './dq-assessment-approaches-definition.component.html',
  styleUrl: './dq-assessment-approaches-definition.component.css'
})
export class DqAssessmentApproachesDefinitionComponent implements OnInit {
  // =============================================
  // 1. CONSTANTES Y CONFIGURACIÓN
  // =============================================
  public formatAppliedTo = formatAppliedTo;
  public getAppliedToDisplay = getAppliedToDisplay;
  public formatCtxCompCategoryName = formatCtxCompCategoryName;

  pageStepTitle = 'Definition of DQ assessment approaches';
  phaseTitle = 'Phase 2: DQ Assessment';
  stageTitle = 'Stage 6: DQ Assessment';

  steps = [
    { displayName: 'A16', route: 'phase2/st6/assessment-approaches', description: 'Definition of the DQ assessment approaches' },
    { displayName: 'A17', route: 'phase2/st6/assessment-execution', description: 'Execution of the DQ assessment approaches' }
  ];

  // =============================================
  // 2. VARIABLES DE ESTADO Y DATOS
  // =============================================
  currentStep = 0;
  isNextStepEnabled = true;
  isLoading = false;
  isLoadingResults = false;
  isModalOpen = false;
  considerContext = false;
  showMultipleResults = false;
  maxVisibleRows = 5;
  
  errorMessage: string | null = null;
  resultsError: string | null = null;
  modalTitle = 'DQ Method Details';
  modalMessage = '';

  project: any = null;
  projectId: number | null = null;
  contextComponents: any = null;
  dqProblems: any[] = [];
  dqModelVersionId: number | null = null;
  dqModel: any = null;

  dqMethods: any[] = [];
  appliedDQMethods: any[] = [];
  executedMethods: any[] = [];
  selectedMethodId: number | null = null;
  selectedMethodDetail: any = null;
  methodDetails: any = null;

  executionResults: any = null;
  selectedMethodResult: any = null;
  thresholds: any[] = [];
  selectedThresholdStatus: any = null;

  thresholdType = 'percentage';
  thresholdTypes = [
    /*{ value: 'percentage', label: 'Percentage (0-100%)', max: 100, step: 1 },*/
    { value: 'percentage', label: 'Proportion (0.0 - 1.0)', max: 1, step: 0.01 },
    { value: 'boolean', label: 'Absolute Value {0,1}', max: 1, step: 1 },
    /*{ value: 'boolean', label: 'Boolean', max: null, step: null }*/
  ];

  defaultThresholds = [
    { name: 'Excellent', minValue: 0.80, maxValue: 1, description: 'Fully meets quality requirements' },
    { name: 'Good', minValue: 0.60, maxValue: 0.79, description: 'Acceptable with minor issues' },
    { name: 'Poor', minValue: 0, maxValue: 0.59, description: 'Needs improvement' }
  ];

  getDefaultThresholds(): any[] {
    return this.thresholdType === 'boolean' 
      ? [
          { name: 'Passed', minValue: 1, maxValue: 1 },
          { name: 'Failed', minValue: 0, maxValue: 0  }
        ]
      : [
          { name: 'Excellent', minValue: 0.80, maxValue: 1  },
          { name: 'Good', minValue: 0.60, maxValue: 0.79  },
          { name: 'Poor', minValue: 0, maxValue: 0.59  }
        ];
  }

  qualityThresholds = [...this.defaultThresholds];
  areThresholdsEditable = true;
  selectedUserType = [];
  selectedBusinessRules = [];
  contextNotes = '';
  filteredMethods: any[] = [];
  filteredMethodOptions: any[] = [];

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private modelService: DqModelService,
    private projectService: ProjectService,
    private projectDataService: ProjectDataService,
    private notificationService: NotificationService
  ) {}

  // =============================================
  // 3. CICLO DE VIDA DEL COMPONENTE
  // =============================================
  ngOnInit(): void {
    this.projectId = this.projectDataService.getProjectId();
    this.subscribeToData();
    this.syncCurrentStepWithRoute();
  }

  // =============================================
  // 4. MANEJO DE DATOS Y SUSCRIPCIONES
  // =============================================
  subscribeToData(): void {
    this.projectDataService.project$.subscribe((data) => {
      this.project = data;
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
        this.loadMeasurementExecutions();
      }
    });
  }

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
          this.fetchExecutionAppliedMethods(); // Cargar los métodos de esta ejecución
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
  /*private executedIds: number[] = [];
  private pendingIds: number[] = [];*/

  fetchExecutionAppliedMethods(): void {
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

  // ========== EXECUTED METHODS DATA ==========
  getContextComponentCategories(contextComponents: any): string[] {
    return Object.keys(contextComponents).filter(category => contextComponents[category].length > 0);
  }

  getFirstAttribute(category: string, componentId: number): string {
    const component = this.contextComponents[category]?.find((comp: any) => comp.id === componentId);
    if (component) {
      const keys = Object.keys(component).filter(key => key !== 'id' && key !== 'type');
      if (keys.length > 0) {
        return `${component[keys[0]]}`;
      }
    }
    return 'No details available';
  }

  // Variables para el modal
  selectedComponentKeys: string[] = []; // Claves del componente seleccionado
  selectedComponentDetails: any = {}; // Detalles del componente seleccionado

  openContextComponentModal(category: string, componentId: number): void {
    const component = this.contextComponents[category]?.find((comp: any) => comp.id === componentId);
    if (component) {
      this.selectedComponentKeys = Object.keys(component).filter(key => key !== 'id');
      this.selectedComponentDetails = component;
      // Abrir el modal
      const modalElement = document.getElementById('contextComponentModal');
      if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
      }
    }
  }

  fetchExecutedMethodsData(dqmodelId: number, executedIds: number[]): void {
    this.isLoading = true;
    this.errorMessage = null;
    const updateObservables: Observable<any>[] = [];
  
    this.modelService.getMethodsByDQModel(dqmodelId).subscribe({
      next: (methods: any[]) => {
        this.appliedDQMethods = [];
  
        const allMethodLoaders = methods.map((method) => {
          const dqMethodName = method.method_name;
          const methodBase = method.method_base;
          const metricId = method.metric;
  
          return this.modelService.getMetricInDQModel(dqmodelId, metricId).pipe(
            switchMap((metric) => {
              const factorId = metric.factor;
              const metricBaseId = metric.metric_base;
  
              return this.modelService.getMetricBaseDetails(metricBaseId).pipe(
                switchMap((dqMetricBase) => {
                  return this.modelService.getFactorInDQModel(dqmodelId, factorId).pipe(
                    switchMap((factor) => {
                      const dimensionId = factor.dimension;
  
                      return this.modelService.getDimensionInDQModel(dqmodelId, dimensionId).pipe(
                        map((dimension) => {
                          const executedMeasurements = method.applied_methods.measurements
                            .filter((m: any) => executedIds.includes(m.id))
                            .map((measurement: any) => {
                              const methodData = {
                                ...measurement,
                                dqMethod: dqMethodName,
                                methodBase: methodBase,
                                dqMetric: metric.metric_name,
                                granularity: dqMetricBase.granularity, 
                                resultDomain: dqMetricBase.resultDomain, 
                                dqFactor: factor.factor_name,
                                dqDimension: dimension.dimension_name,
                                method_type: 'Measurement',
                                executionStatus: 'completed',
                                executionResult: null,
                                hasThresholds: false,
                                context_components: method.context_components
                              };
  
                              updateObservables.push(this.getExecutionResultObservable(methodData));
                              return methodData;
                            });
  
                          const executedAggregations = method.applied_methods.aggregations
                            .filter((a: any) => executedIds.includes(a.id))
                            .map((aggregation: any) => {
                              const methodData = {
                                ...aggregation,
                                dqMethod: dqMethodName,
                                methodBase: methodBase,
                                dqMetric: metric.metric_name,
                                granularity: dqMetricBase.granularity, 
                                resultDomain: dqMetricBase.resultDomain,  
                                dqFactor: factor.factor_name,
                                dqDimension: dimension.dimension_name,
                                method_type: 'Aggregation',
                                executionStatus: 'completed',
                                executionResult: null,
                                hasThresholds: false,
                                context_components: method.context_components
                              };
  
                              updateObservables.push(this.getExecutionResultObservable(methodData));
                              return methodData;
                            });
  
                          return [...executedMeasurements, ...executedAggregations];
                        })
                      );
                    })
                  );
                })
              );
            })
          );
        });
  
        forkJoin(allMethodLoaders).subscribe({
          next: (methodsPerLoader) => {
            this.appliedDQMethods = methodsPerLoader.flat();
            this.executedMethods = this.appliedDQMethods;
  
            forkJoin(updateObservables).subscribe({
              next: () => {
                this.isLoading = false;
                console.log('✅ Todos los executionResults actualizados');
                this.cdr.detectChanges();
  
                this.filterMethodsByThresholdsDefined();
              },
              error: (err) => {
                console.error('Error actualizando executionResults', err);
                this.isLoading = false;
              }
            });
          },
          error: (err) => {
            console.error('Error al cargar métodos', err);
            this.errorMessage = 'Error al cargar los métodos ejecutados';
            this.isLoading = false;
          }
        });
      }
    });
  }

  private getExecutionResultObservable(method: any): Observable<any> {
    if (this.dqModelVersionId == null) {
      console.warn('dqModelVersionId es null. No se puede obtener el execution result.');
      return of(method); // o throwError('ID inválido');
    }
    
    return this.modelService.getMethodExecutionResult(this.dqModelVersionId, method.id).pipe(
      map((res) => {
        const result = res?.results?.[0] || res;
  
        method.executionResult = {
          result_id: result.result_id,
          dqmodel_execution_id: result.dqmodel_execution_id,
          executed_at: result.executed_at,
          result_type: result.result_type,
          assessment: result.assessment || { thresholds: [] }
        };
        return method;
      }),
      catchError((err) => {
        console.error(`Error fetching execution result for method ${method.id}:`, err);
        method.executionResult = { error: 'Failed to load execution details' };
        return of(method);
      })
    );
  }
  

  // =============================================
  // 5. MANEJO DE THRESHOLDS
  // =============================================
  hasThresholdsDefined(method: any): boolean {
    // Verificar correctamente en assessment.thresholds
    return method?.executionResult?.assessment?.thresholds?.length > 0;
  }
  
  selectMethodForThresholds(method: any): void {
    this.selectedMethodId = method.id;
    this.onMethodSelected();
    
    setTimeout(() => {
      const element = document.getElementById('threshold-editor-section');
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  onMethodSelected(): void {
    if (!this.selectedMethodId) {
      this.selectedMethodDetail = null;
      this.resetToDefaultThresholds();
      this.areThresholdsEditable = true;
      return;
    }
  
    this.showMultipleResults = false;
    this.selectedMethodDetail = this.executedMethods.find(m => m.id == this.selectedMethodId);

    // Determinar el tipo de threshold basado SOLO en resultDomain
    this.determineThresholdType();
    
    if (!this.selectedMethodDetail) {
      this.resetToDefaultThresholds();
      this.areThresholdsEditable = true;
      return;
    }
  
    this.fetchMethodExecutionResult(this.selectedMethodId);
    console.log('Selected method details:', this.selectedMethodDetail);
  
    /*if (!this.selectedMethodDetail.executionResult) {
      this.selectedMethodDetail.executionResult = { assessment_details: {} };
    }*/
    // Inicializar executionResult.assessment si no existe
    if (!this.selectedMethodDetail.executionResult?.assessment) {
      this.selectedMethodDetail.executionResult = {
        ...this.selectedMethodDetail.executionResult,
        assessment: {
          thresholds: [],
       
        }
      };
    }
  
    //const existingThresholds = this.selectedMethodDetail.executionResult.assessment_details?.thresholds;
    const existingThresholds = this.selectedMethodDetail.executionResult.assessment?.thresholds;
  
    
    if (existingThresholds && existingThresholds.length > 0) {
      this.qualityThresholds = existingThresholds.map((t: any) => ({
        name: t.name,
        minValue: t.min,
        maxValue: t.max,
        //isPassing: t.is_passing,
        description: t.description || '',
        isEditable: false
      }));
      this.areThresholdsEditable = false;
    } else {
      this.resetToDefaultThresholds();
      this.areThresholdsEditable = true;
    }
  }

  toggleEditThresholds(): void {
    this.areThresholdsEditable = !this.areThresholdsEditable;
    
    if (this.areThresholdsEditable) {
      this.qualityThresholds = this.qualityThresholds.map(threshold => ({
        ...threshold,
        isEditable: true
      }));
    }
  }

  cancelEdit(): void {
    this.areThresholdsEditable = false;
  }

  resetToDefaultThresholds0(): void {
    this.qualityThresholds = this.defaultThresholds.map(t => ({
      ...t,
      isEditable: true
    }));
  }

  resetToDefaultThresholds(): void {
    this.qualityThresholds = this.getDefaultThresholds().map(t => ({
      ...t,
      isEditable: true
    }));
  }


  saveThresholds() {
    console.log("this.thresholdType", this.thresholdType)

    const thresholdsToSave = this.qualityThresholds.map(t => {
      if (t.minValue === null || t.maxValue === null || !t.name) {
        throw new Error('All thresholds must have name, min and max values');
      }

      return {
        name: t.name,
        min: t.minValue,
        max: t.maxValue 
      };
    });

    // Validar que haya al menos 2 thresholds
    if (thresholdsToSave.length < 2) {
      this.notificationService.showError('At least two thresholds must be defined to perform a proper assessment.');
      return;
    }

    if (this.thresholdType !== 'boolean') {
      // Validación de consistencia de rangos
      const sortedThresholds = [...thresholdsToSave].sort((a, b) => b.max - a.max); // Orden descendente por max
      for (let i = 0; i < sortedThresholds.length; i++) {
        const current = sortedThresholds[i];

        if (current.min > current.max) {
          this.notificationService.showError(`In threshold "${current.name}", min cannot be greater than max.`);
          return;
        }

        if (i > 0) {
          const previous = sortedThresholds[i - 1];
          
          // Validar continuidad: el max del actual debe ser exactamente 0.01 menos que el min del anterior
          if (current.max < previous.min - 0.01) {
            this.notificationService.showError(`Gap detected between "${previous.name}" and "${current.name}". Thresholds must be continuous.`);
            return;
          }

          // Validar que no se solapen
          if (current.max >= previous.min) {
            this.notificationService.showError(`Overlap detected between "${previous.name}" and "${current.name}". Ranges must not overlap.`);
            return;
          }
        }
      }
    }

    console.log("thresholdsToSave before sending:", thresholdsToSave); // Debug

    if (this.selectedMethodDetail && this.dqModelVersionId) {
      const resultId = this.selectedMethodDetail.executionResult?.result_id;
      
      if (resultId) {
        this.isLoading = true;
        
        this.modelService.updateAssessmentThresholds(
          this.dqModelVersionId,
          this.selectedMethodDetail.id,
          resultId,
          thresholdsToSave
        ).subscribe({
          next: (response) => {
            console.log("thresholdsToSave", thresholdsToSave)
            // Actualizar la estructura con el nuevo assessment
            this.selectedMethodDetail.executionResult = {
              ...this.selectedMethodDetail.executionResult,
              assessment: {
                thresholds: thresholdsToSave,
                //assessed_at: new Date().toISOString()
              }
            };
            /*if (!this.selectedMethodDetail.executionResult.assessment_details) {
              this.selectedMethodDetail.executionResult.assessment_details = {};
            }
            this.selectedMethodDetail.executionResult.assessment_details.thresholds = thresholdsToSave;*/
            this.isLoading = false;
            this.notificationService.showSuccess('Thresholds saved successfully');

            //Actualizar Applied Methods options
            this.selectedMethodDetail.hasThresholds = true;
            this.filterMethodsByThresholdsDefined();
          },
          error: (err) => {
            console.error('Error saving thresholds:', err);
            this.notificationService.showError('Failed to save thresholds');
            this.isLoading = false;
            this.errorMessage = 'Error saving thresholds';
          }
        });
      }
    }
  }


  addThreshold() {
    const newThreshold = {
      name: '',
      minValue: 0,
      maxValue: 0,
      //isPassing: true,
      description: ''
    };

    switch(this.thresholdType) {
      case 'percentage': newThreshold.maxValue = 100; break;
      case 'percentage_decimal': newThreshold.maxValue = 1; break;
      case 'boolean': 
        newThreshold.minValue = 0;
        newThreshold.maxValue = 1;
        break;
    }

    this.qualityThresholds.push(newThreshold);
  }

  removeThreshold(index: number) {
    this.qualityThresholds.splice(index, 1);
  }

  onThresholdTypeChange() {
    this.qualityThresholds.forEach(threshold => {
      switch(this.thresholdType) {
        case 'percentage':
          if (threshold.maxValue > 100) threshold.maxValue = 100;
          if (threshold.minValue > 100) threshold.minValue = 100;
          threshold.minValue = Math.round(threshold.minValue);
          threshold.maxValue = Math.round(threshold.maxValue);
          break;
        case 'percentage_decimal':
          if (threshold.maxValue > 1) threshold.maxValue = 1;
          if (threshold.minValue > 1) threshold.minValue = 1;
          break;
        case 'boolean':
          threshold.minValue = 0;
          threshold.maxValue = 1;
          break;
      }
    });
  }

  filterMethodsByThresholdsDefined(): void {
    if (!this.selectedThresholdStatus || !this.executedMethods) {
      this.filteredMethods = [];
      this.filteredMethodOptions = [];
      this.selectedMethodId = null;
      this.selectedMethodDetail = null;
      return;
    }
  
    console.log("Current executedMethods:", this.executedMethods); // Debug
  
    switch (this.selectedThresholdStatus) {
      case 'all':
        this.filteredMethods = [...this.executedMethods];
        break;
      case 'defined':
        this.filteredMethods = this.executedMethods.filter(method => {
          const hasThresholds = this.hasThresholdsDefined(method);
          //console.log(`Method ${method.id} thresholds:`, method.executionResult?.assessment?.thresholds, "Has:", hasThresholds); // Debug
          return hasThresholds;
        });
        break;
      case 'pending':
        this.filteredMethods = this.executedMethods.filter(method => !this.hasThresholdsDefined(method));
        break;
    }
  
    console.log("Filtered methods:", this.filteredMethods); // Debug
    
    this.filteredMethodOptions = this.filteredMethods.map(method => ({
      id: method.id,
      name: `${method.name} (${method.dqMethod})`
    }));
    
    this.selectedMethodId = null;
    this.selectedMethodDetail = null;
  }



  // =============================================
  // 6. MANEJO DE RESULTADOS DE EJECUCIÓN
  // =============================================
  // ========== RESULT FETCHING METHODS ==========
  // Método principal para cargar resultados
  fetchMethodExecutionResult(methodId: number): void {
    if (!this.dqModelVersionId) return;
    
    this.isLoadingResults = true;
    
    this.modelService.getMethodExecutionResult(this.dqModelVersionId, methodId).subscribe({
      next: (basicResult) => {
        this.selectedMethodResult = basicResult;
        console.log("Basic execution result:", basicResult);
  
        // Procesar el primer resultado (asumimos que hay al menos uno)
        const result = basicResult.results?.[0] || basicResult;
        
        if (result.result_type === 'multiple') {
          // Si es múltiple, cargar detalles por fila
          this.loadDetailedRowResults(methodId, result);
        } else {
          // Si es simple, procesar directamente
          //this.processSingleResult(result);
          // Si es simple, cargamos los resultados a nivel de columna
          this.loadColumnResults(methodId, basicResult);
        }
      },
      error: (err) => {
        console.error(`Error fetching execution result for method ${methodId}:`, err);
        this.isLoadingResults = false;
      }
    });
  }
  
  private loadDetailedRowResults(methodId: number, basicResult: any): void {
    this.modelService.getMethodExecutionRowResults(
      this.dqModelVersionId!,
      methodId
    ).subscribe({
      next: (rowResults) => {
        console.log("Detailed row results:", rowResults);
        
        // Procesar resultados múltiples
        this.processMultipleResults(basicResult, rowResults);
        this.isLoadingResults = false;
      },
      error: (err) => {
        console.warn('Could not load detailed row results, using basic result', err);
        this.processSingleResult(basicResult);
        this.isLoadingResults = false;
      }
    });
  }
  
  private processMultipleResults(basicResult: any, rowResults: any): void {
    if (!this.selectedMethodDetail) return;
  
    this.selectedMethodDetail.executionResult = {
      ...basicResult,
      displayType: 'multiple',
      tableData: rowResults.dq_values.map((item: any) => ({
        rowId: item.row_id,
        dqValue: item.dq_value,
        tableName: rowResults.table_name,
        columnName: rowResults.column_name
      })),
      total_rows: rowResults.dq_values_count, 
      tableName: rowResults.table_name,
      columnName: rowResults.column_name
    };
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
      ...this.selectedMethodDetail.executionResult, // Mantiene las propiedades existentes
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

  // Procesar resultado simple
  private processSingleResult(result: any): void {
    if (!this.selectedMethodDetail) return;
  
    // Preserva el executionResult existente y solo actualiza las propiedades necesarias
    this.selectedMethodDetail.executionResult = {
      ...this.selectedMethodDetail.executionResult, // Mantiene las propiedades existentes
      displayType: 'single',
      dq_value: result.dq_value,
      executed_at: result.executed_at,
      result_type: result.result_type,
      // Para resultados de columna, añade esta información
      ...(result.column_name && {
        columnDetails: {
          tableName: result.table_name,
          columnName: result.column_name,
          assessment: result.assessment_score
        }
      })
    };
  }

  private processSingleResult___0(result: any): void {
    if (!this.selectedMethodDetail) return;

    this.selectedMethodDetail.executionResult = {
      ...this.selectedMethodDetail.executionResult, // Mantiene las propiedades existentes
      displayType: 'single',
      dq_value: result.results?.[0]?.dq_value,
      executed_at: result.results?.[0]?.executed_at
    };
  }

  
  /*fetchLatestExecutionResults(): void {
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
  }*/

  toggleMultipleResults(): void {
    this.showMultipleResults = !this.showMultipleResults;
  }
  
  getRowId(row: any): any {
    return row?.rowId || row?.id || 'N/A';
  }
  
  getDqValue(row: any): any {
    // Verificación explícita para null/undefined, pero permite 0
    return row?.dqValue !== undefined && row?.dqValue !== null ? 
           row.dqValue : 
           (row?.dq_value !== undefined && row?.dq_value !== null ? row.dq_value : 'N/A');
  }
  
  getTableByRow(row: any): string {
    return row?.tableName || row?.table_name || '';
  }
  
  getColumnByRow(row: any): string {
    return row?.columnName || row?.column_name || '';
  }


  mergeExecutionResultsWithMethods(): void {
    if (!this.executionResults || !this.appliedDQMethods) return;
  
    this.appliedDQMethods.forEach(method => {
      const result = this.executionResults.results.find((r: any) => r.method_id === method.id);
  
      if (result) {
        let thresholds = result.assessment_details?.thresholds || [];
  
        method.executionResult = {
          status: result.status,
          dq_value: result.dq_value,
          dq_value_type: result.dq_value_type,
          executed_at: result.executed_at,
          execution_details: typeof result.details === 'string' ? JSON.parse(result.details) : result.details,
          assessment_details: {
            thresholds: thresholds,
            score: result.assessment_details?.score || null,
            is_passing: result.assessment_details?.is_passing || null,
            assessed_at: result.assessment_details?.assessed_at || null
          },
          result_id: result.execution_result_id
        };
      } else {
        method.executionResult = {
          status: 'pending',
          assessment_details: {
            thresholds: [],
            score: null,
            is_passing: null,
            assessed_at: null
          }
        };
      }
    });
  
    this.loadExecutedAppliedMethods();
  }

  loadExecutedAppliedMethods(): void {
    if (!this.appliedDQMethods) return;
    
    this.executedMethods = this.appliedDQMethods
      .filter(m => m.executionResult?.status === 'completed')
      .map((method, index) => ({
        ...method,
        id: method.id || index 
      }));
  }

  // =============================================
  // 7. MANEJO DE MÉTODOS DQ
  // =============================================
  openMethodDetailsModal(methodBaseId: number): void {
    this.isModalOpen = true;
    this.isLoading = true;
    this.errorMessage = '';

    this.modelService.getMethodBaseDetails(methodBaseId).subscribe(
      (data) => {
        this.methodDetails = data;
        this.isLoading = false;
      },
      (error) => {
        this.errorMessage = 'Failed to load method details.';
        this.isLoading = false;
      }
    );
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.methodDetails = null;
  }

  // =============================================
  // 8. NAVEGACIÓN Y FLUJO DE TRABAJO
  // =============================================
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

  /*onCompleteStage(): void {
    this.router.navigate(['/st6/assessment-approaches']);
    this.currentStep = 0;
  }*/

  // =============================================
  // 9. FUNCIONES UTILITARIAS
  // =============================================
  isAllSelected(): boolean {
    return this.executedMethods.length > 0 && 
           this.executedMethods.every(item => item.selected);
  }
  
  toggleSelectAll(event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.executedMethods.forEach(item => item.selected = isChecked);
  }

  toggleSelectItem(item: any): void {
    item.selected = !item.selected;
  }

  determineThresholdType(): void {
    if (!this.selectedMethodDetail?.resultDomain) {
      this.thresholdType = 'percentage'; // Valor por defecto
      return;
    }
  
    // Convertimos a minúsculas para hacer la comparación insensible a mayúsculas
    const domain = this.selectedMethodDetail.resultDomain.toLowerCase();
    
    this.thresholdType = domain === 'boolean' ? 'boolean' : 'percentage';
  }

  /*determineThresholdType(dqValue: any): string {
    if (dqValue === undefined || dqValue === null) return 'percentage';
    
    if (Number.isInteger(dqValue) && dqValue >= 0) {
      return 'absolute';
    }
    
    if (dqValue > 0 && dqValue <= 1) {
      return 'percentage_decimal';
    }
    
    if (typeof dqValue === 'number' && !Number.isInteger(dqValue)) {
      return dqValue > 100 ? 'absolute' : 'percentage';
    }
    
    return 'percentage';
  }*/

  getDQValueType(value: any): string {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') return Number.isInteger(value) ? 'Integer' : 'Float';
    if (typeof value === 'string') return 'String';
    if (typeof value === 'boolean') return 'Boolean';
    return 'Unknown';
  }
}