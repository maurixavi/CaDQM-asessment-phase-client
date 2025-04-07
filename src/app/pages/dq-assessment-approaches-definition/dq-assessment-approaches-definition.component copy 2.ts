import { ChangeDetectorRef, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { DqModelService } from '../../services/dq-model.service';
import { ProjectDataService } from '../../services/project-data.service';
import { Router } from '@angular/router';

import { buildContextComponents, formatCtxCompCategoryName, getFirstNonIdAttribute, formatAppliedTo, getAppliedToDisplay } from '../../shared/utils/utils';

declare var bootstrap: any;

@Component({
  selector: 'app-dq-assessment-approaches-definition',
  templateUrl: './dq-assessment-approaches-definition.component.html',
  styleUrl: './dq-assessment-approaches-definition.component.css'
})
export class DqAssessmentApproachesDefinitionComponent implements OnInit {

  // Utils
  //public formatCtxCompCategoryName = formatCtxCompCategoryName;
  //public getFirstNonIdAttribute = getFirstNonIdAttribute;
  public formatAppliedTo = formatAppliedTo;
  public getAppliedToDisplay = getAppliedToDisplay;

  
  currentStep: number = 0;
  pageStepTitle: string = 'Definition of assessment approaches';
  phaseTitle: string = 'Phase 2: DQ Assessment';
  stageTitle: string = 'Stage 6: DQ Assessment';

  steps: { displayName: string; route: string; description: string }[] = [
    { displayName: 'A16', route: 'st6/assessment-approaches', description: 'Definition of assessment approaches' },
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
  executedMethods: any[] = [];

  // Execution results
  executionResults: any = null;
  selectedMethodResult: any = null;
  isLoadingResults: boolean = false;
  resultsError: string | null = null;
  

  isModalOpen: boolean = false;
  modalTitle: string = 'DQ Method Details';
  modalMessage: string = '';
  methodDetails: any = null;

  
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


  //Navigation
  onStepChange(step: number) {
    this.currentStep = step;
    this.navigateToStep(step);
  }
  
  navigateToStep(stepIndex: number) {
    const route = this.steps[stepIndex].route;
    this.router.navigate([route]);
  }


  

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


  // Method to open execution details for a method
  openExecutionDetails(methodId: number): void {
    this.fetchMethodExecutionResult(methodId);
    // You might want to open a modal here to show the details
  }


  

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
    this.loadExecutedAppliedMethods();
  }

  loadExecutedAppliedMethods(): void {
    if (!this.appliedDQMethods) return;
    
    this.executedMethods = this.appliedDQMethods
      .filter(m => m.executionResult?.status === 'completed')
      .map((method, index) => ({
        ...method,
        // Usamos el index como ID temporal si el método no tiene un ID
        id: method.id || index 
      }));

    console.log("this.executedMethods", this.executedMethods);
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

    // Imprimir en consola para depurar
    console.log('Selected method details:', this.selectedMethodDetail);
  }




  // PRUEBA CONCEPTO THRESHODLS
  qualityRatings = [
    {
      name: 'Excellent',
      minValue: 90,
      maxValue: 100,
      isPassing: true,
      color: '#28a745',
      description: 'Fully meets quality requirements'
    },
    {
      name: 'Good',
      minValue: 80,
      maxValue: 89,
      isPassing: true,
      color: '#ffc107',
      description: 'Acceptable with minor issues'
    },
    {
      name: 'Poor',
      minValue: 0,
      maxValue: 79,
      isPassing: false,
      color: '#dc3545',
      description: 'Needs improvement'
    }
  ];

  thresholdType = 'percentage';
  considerContext = false;
  selectedUserType = [];
  selectedBusinessRules = [];
  contextNotes = '';

  addRating() {
    this.qualityRatings.push({
      name: '',
      minValue: 0,
      maxValue: 0,
      isPassing: true,
      color: '#6c757d',
      description: ''
    });
  }

  removeRating(index: number) {
    this.qualityRatings.splice(index, 1);
  }

  saveThresholds() {
    const thresholdDefinition = {
      methodId: this.selectedMethodDetail.id,
      type: this.thresholdType,
      ratings: [...this.qualityRatings],
      context: this.considerContext ? {
        userTypes: this.selectedUserType,
        businessRules: this.selectedBusinessRules,
        notes: this.contextNotes
      } : null
    };
    
    // Lógica para guardar en el backend
    console.log('Saving thresholds:', thresholdDefinition);
    // this.thresholdService.saveThresholds(thresholdDefinition).subscribe(...);
  }

  getRatingColor(value: number): string {
    if (value === undefined || value === null) return '#6c757d';
    
    const rating = this.qualityRatings.find(r => 
      value >= r.minValue && value <= r.maxValue
    );
    
    return rating ? rating.color : '#6c757d';
  }
  
  getRatingName(value: number): string {
    if (value === undefined || value === null) return '';
    
    const rating = this.qualityRatings.find(r => 
      value >= r.minValue && value <= r.maxValue
    );
    
    return rating ? rating.name : '';
  }


}