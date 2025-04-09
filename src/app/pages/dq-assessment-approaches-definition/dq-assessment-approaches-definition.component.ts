import { ChangeDetectorRef, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { DqModelService } from '../../services/dq-model.service';
import { ProjectDataService } from '../../services/project-data.service';
import { Router } from '@angular/router';
import { buildContextComponents, formatCtxCompCategoryName, getFirstNonIdAttribute, formatAppliedTo, getAppliedToDisplay } from '../../shared/utils/utils';
import { NotificationService } from '../../services/notification.service';

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
  
  pageStepTitle = 'Definition of assessment approaches';
  phaseTitle = 'Phase 2: DQ Assessment';
  stageTitle = 'Stage 6: DQ Assessment';

  steps = [
    { displayName: 'A16', route: 'st6/assessment-approaches', description: 'Definition of assessment approaches' }
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
    { value: 'percentage', label: 'Percentage (0-100%)', max: 100, step: 1 },
    { value: 'percentage_decimal', label: 'Proportion (0.0 - 1.0)', max: 1, step: 0.01 },
    { value: 'absolute', label: 'Absolute Value', max: null, step: 1 },
    { value: 'boolean', label: 'Boolean', max: null, step: null }
  ];

  defaultThresholds = [
    { name: 'Excellent', minValue: 80, maxValue: 100, isPassing: true, description: 'Fully meets quality requirements' },
    { name: 'Good', minValue: 60, maxValue: 79, isPassing: true, description: 'Acceptable with minor issues' },
    { name: 'Poor', minValue: 0, maxValue: 59, isPassing: false, description: 'Needs improvement' }
  ];

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
        this.fetchExpandedDQMethodsData(this.dqModelVersionId);
      }
    });
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
              const metricBaseId = metric.metric_base;

              this.modelService.getMetricBaseDetails(metric.metric_base).subscribe((dqMetricBase) => {
                this.modelService.getFactorInDQModel(dqmodelId, factorId).subscribe((factor) => {
                  if (factor) {
                    const dimensionId = factor.dimension;
                    this.modelService.getDimensionInDQModel(dqmodelId, dimensionId).subscribe((dimension) => {
                      if (dimension) {
                        const appliedMethods = [
                          ...method.applied_methods.measurements.map((measurement: any) => ({
                            ...measurement,
                            dqMethod: dqMethodName,
                            methodBase: methodBase,
                            dqMetric: metric.metric_name,
                            metricBase: dqMetricBase,
                            dqFactor: factor.factor_name,
                            dqDimension: dimension.dimension_name,
                            selected: false,
                          })),
                          ...method.applied_methods.aggregations.map((aggregation: any) => ({
                            ...aggregation,
                            dqMethod: dqMethodName,
                            dqMetric: metric.metric_name,
                            metricBase: dqMetricBase,
                            dqFactor: factor.factor_name,
                            dqDimension: dimension.dimension_name,
                            selected: false,
                          })),
                        ];
    
                        this.appliedDQMethods = [...this.appliedDQMethods, ...appliedMethods];
                        this.fetchLatestExecutionResults();
                      }
                    });
                  }
                });
              });
            }
          });
          return [];
        });
        this.isLoading = false;
      },
      error: (error: any) => {
        this.errorMessage = 'Error al cargar los métodos. Inténtalo de nuevo.';
        this.isLoading = false;
        console.error('Error fetching DQ Methods:', error);
      },
    });
  }

  // =============================================
  // 5. MANEJO DE THRESHOLDS
  // =============================================
  hasThresholdsDefined(method: any): boolean {
    return method?.executionResult?.assessment_details?.thresholds?.length > 0;
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
    
    if (!this.selectedMethodDetail) {
      this.resetToDefaultThresholds();
      this.areThresholdsEditable = true;
      return;
    }
  
    this.fetchMethodExecutionResult(this.selectedMethodId);
  
    if (!this.selectedMethodDetail.executionResult) {
      this.selectedMethodDetail.executionResult = { assessment_details: {} };
    }
  
    const existingThresholds = this.selectedMethodDetail.executionResult.assessment_details?.thresholds;
    
    if (existingThresholds && existingThresholds.length > 0) {
      this.qualityThresholds = existingThresholds.map((t: any) => ({
        name: t.name,
        minValue: t.min,
        maxValue: t.max,
        isPassing: t.is_passing,
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

  resetToDefaultThresholds(): void {
    this.qualityThresholds = this.defaultThresholds.map(t => ({
      ...t,
      isEditable: true
    }));
  }

  saveThresholds() {
    const thresholdsToSave = this.qualityThresholds.map(t => {
      if (t.minValue === null || t.maxValue === null || !t.name) {
        throw new Error('All thresholds must have name, min and max values');
      }
      return {
        name: t.name,
        min: t.minValue,
        max: t.maxValue,
        is_passing: t.isPassing,
        description: t.description || ''
      };
    });

    if (this.selectedMethodDetail && this.dqModelVersionId) {
      const resultId = this.selectedMethodDetail.executionResult?.id || 
                      this.selectedMethodDetail.executionResult?.result_id;
      
      if (resultId) {
        this.isLoading = true;
        
        this.modelService.updateAssessmentThresholds(
          this.dqModelVersionId,
          this.selectedMethodDetail.id,
          resultId,
          thresholdsToSave
        ).subscribe({
          next: (response) => {
            if (!this.selectedMethodDetail.executionResult.assessment_details) {
              this.selectedMethodDetail.executionResult.assessment_details = {};
            }
            this.selectedMethodDetail.executionResult.assessment_details.thresholds = thresholdsToSave;
            this.isLoading = false;
            this.notificationService.showSuccess('Thresholds saved successfully');
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
      isPassing: true,
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

  filterMethodsByThresholdsDefined() {
    if (!this.selectedThresholdStatus) {
      this.filteredMethods = [];
      this.filteredMethodOptions = [];
      this.selectedMethodId = null;
      this.selectedMethodDetail = null;
      return;
    }

    if (this.selectedThresholdStatus === 'all') {
      this.filteredMethods = [...this.executedMethods];
    } else if (this.selectedThresholdStatus === 'defined') {
      this.filteredMethods = this.executedMethods.filter(method => this.hasThresholdsDefined(method));
    } else {
      this.filteredMethods = this.executedMethods.filter(method => !this.hasThresholdsDefined(method));
    }
    
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

  toggleMultipleResults(): void {
    this.showMultipleResults = !this.showMultipleResults;
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

  fetchMethodExecutionResult(methodId: number): void {
    if (!this.dqModelVersionId) return;
    
    this.isLoadingResults = true;
    this.modelService.getMethodExecutionResult(this.dqModelVersionId, methodId).subscribe({
      next: (result) => {
        this.selectedMethodResult = result;
        
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
    if (this.selectedMethodDetail) {
      this.selectedMethodDetail.executionResult = {
        ...result,
        displayType: 'single'
      };
    }
  }
  
  private processMultipleResults(result: any): void {
    if (this.selectedMethodDetail) {
      const tableData = result.dq_values.rows.map((row: any) => ({
        rowId: row.row_id,
        dqValue: row.dq_value,
        tableName: result.tables?.[0]?.table_name || 'N/A',
        columnNames: result.columns?.map((col: any) => col.column_name) || []
      }));
  
      this.selectedMethodDetail.executionResult = {
        ...result,
        displayType: 'multiple',
        tableData: tableData
      };
    }
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

  onCompleteStage(): void {
    this.router.navigate(['/st6/assessment-approaches']);
    this.currentStep = 0;
  }

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

  determineThresholdType(dqValue: any): string {
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
  }

  getDQValueType(value: any): string {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') return Number.isInteger(value) ? 'Integer' : 'Float';
    if (typeof value === 'string') return 'String';
    if (typeof value === 'boolean') return 'Boolean';
    return 'Unknown';
  }
}