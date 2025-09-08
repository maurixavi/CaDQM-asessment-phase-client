import { Component, OnInit, ViewEncapsulation, HostListener, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { DqModelService } from '../../../services/dq-model.service';
import { ProjectService } from '../../../services/project.service';
import { ProjectDataService } from '../../../services/project-data.service';
import { NotificationService } from '../../../services/notification.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { combineLatest } from 'rxjs';
import { filter } from 'rxjs/operators';

import { buildContextComponents, formatCtxCompCategoryName, getFirstNonIdAttribute, formatAppliedTo, getAppliedToDisplay } from '../../../shared/utils/utils';


declare var bootstrap: any;

// ----------------------------
// Interfaces
// ----------------------------
interface ColumnOption {
  table_id: any;
  table_name: any;
  column_id: any;
  column_name: any;
  data_type: any;
}

interface DataColumnOption {
  value: ColumnOption;
  label: string;
}

interface ContextComponent {
  id: string;
  type: string;
  description: string;
}

// ----------------------------
// Componente Principal
// ----------------------------
@Component({
  selector: 'app-dq-methods-definition',
  templateUrl: './dq-methods-definition.component.html',
  styleUrls: ['./dq-methods-definition.component.css'],
  //encapsulation: ViewEncapsulation.None
})
export class DqMethodsDefinitionComponent implements OnInit {
  // ----------------------------
  // Propiedades del Componente
  // ----------------------------

  // Utils
  public formatCtxCompCategoryName = formatCtxCompCategoryName;
  public getFirstNonIdAttribute = getFirstNonIdAttribute;
  public formatAppliedTo = formatAppliedTo;
  public getAppliedToDisplay = getAppliedToDisplay;
  public JSON = JSON;

  // Estado y Navegación
  isNextStepEnabled: boolean = true;
  currentStep: number = 4;
  pageStepTitle: string = 'Implementation of DQ Methods';
  phaseTitle: string = 'Phase 2: DQ Assessment';
  stageTitle: string = 'Stage 4: DQ Model Definition';
  isLoading: boolean = false;

  steps: { displayName: string, route: string, description: string }[] = [
    { displayName: 'A09.1', route: 'phase2/st4/dq-problems-priorization', description: 'Prioritization of DQ Problems' },
    { displayName: 'A09.2', route: 'phase2/st4/dq-problems-selection', description: 'Selection of DQ Problems' },
    { displayName: 'A10', route: 'phase2/st4/dq-dimensions-factors', description: 'Selection of DQ Dimensions and Factors' },
    { displayName: 'A11', route: 'phase2/st4/dq-metrics', description: 'Definition of DQ Metrics' },
    { displayName: 'A12', route: 'phase2/st4/dq-methods', description: 'Implementation of DQ Methods' },
    { displayName: 'DQ Model Confirmation', route: 'phase2/st4/dq-model', description: 'DQ Model Confirmation' }
  ];

  // Formularios
  dqMethodForm: FormGroup;
  appliedMethodForm: FormGroup;

  // Datos del Proyecto
  project: any;
  projectId: number | null = null;
  noProjectMessage: string = "";
  dataSchema: any = null;
  dataAtHandDetails: any = null;

  allDQProblems: any[] = [];

  contextVersion: any = null;

  // Modelo DQ
  dqModelId: number = 1;
  currentDQModel: any;
  noModelMessage: string = "";
  noDimensionsMessage: string = "";
  dqModelVersionId: number | null = null;
  dqModel: any = null;

  // Dimensiones y Factores
  dqmodel_dimensions: any[] = [];
  dimensionsWithFactorsInDQModel: any[] = [];
  factorsByDim: any[] = [];
  dqFactorsBase: any[] = [];
  dqFactor_measures: string = '';

  // Métricas y Métodos
  allMetricsNew: any[] = [];
  allMethodsNew: any[] = [];

  allMetrics: any[] = [];
  allMethods: any[] = [];
  currentMetric: any;
  selectedMetric: any = null;
  selectedBaseDQMethod: any = null;
  selectedMethodDQModel: any = null;
  selectedMethod: any;
  selectedMethodObject: any;
  selectedMethodDetails: any;
  selectedDQMethodDetails: any = null;
  selectedMetricBaseDetails: any;

  // Contexto
  contextComponents: ContextComponent[] = [];
  allContextComponents: any;
  //selectedComponents: ContextComponent[] = [];
  selectionCheckboxCtxComponents: { id: number; category: string; value: string }[] = [];
  selectedCtxComponents: { id: number; category: string; value: string }[] = [];
  dropdownOpen: boolean = false;
  isEditingCtxComponents: boolean = false;

  // Variables para el modal
  selectedComponentKeys: string[] = []; // Claves del componente seleccionado
  selectedComponentDetails: any = {}; // Detalles del componente seleccionado

  // Modales
  isModalOpen = false;
  isModalBaseOpen = false;
  isCreateAppliedMethodModalOpen = false;

  // Sugerencias
  suggestion: any = null;
  error: string = '';

  // Nuevo Método
  newMethod: any = {
    name: '', input: '', output: '', algorithm: '', expanded: false, metric: undefined
  };

  // Opciones de columnas de datos
  dataColumnOptions: { value: any, label: string }[] = [];
  dataAppliedToOptions: DataColumnOption[] = [];

  errorMessage: string | null = null;

  // Categorías de contexto
  categories: string[] = [
    'applicationDomain',
    'businessRule',
    'dataFiltering',
    'dqMetadata',
    'dqRequirement',
    'otherData',
    'otherMetadata',
    'systemRequirement',
    'taskAtHand',
    'userType',
  ];

  // ----------------------------
  // Constructor
  // ----------------------------
  constructor(
    private router: Router,
    private modelService: DqModelService,
    private projectService: ProjectService,
    private projectDataService: ProjectDataService,
    private notificationService: NotificationService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.dqMethodForm = this.fb.group({
      name: [''],
      inputDataType: [''],
      outputDataType: [''],
      algorithm: ['']
    });
    this.appliedMethodForm = this.fb.group({
      name: ['', Validators.required],
      appliedTo: ['', Validators.required],
      algorithm: ['', Validators.required],
      type: ['Measurement', Validators.required]
    });
  }

  // ----------------------------
  // Métodos del Ciclo de Vida
  // ----------------------------
  ngOnInit() {
    //this.getDQFactorsBase();
    this.projectId = this.projectDataService.getProjectId();
    console.log("projectIdGet: ", this.projectId);
    this.subscribeToData();
    this.syncCurrentStepWithRoute();

    
  }

  // ----------------------------
  // Métodos de Navegación
  // ----------------------------
  syncCurrentStepWithRoute() {
    const currentRoute = this.router.url;
    const stepIndex = this.steps.findIndex(step => step.route === currentRoute);
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

  // ----------------------------
  // Métodos de Datos
  // ----------------------------
  subscribeToData(): void {
    this.projectDataService.project$.subscribe((data) => {
      this.project = data;
      if (this.project) {
        this.fetchDataAtHandDetails(this.project.data_at_hand);
      }
    });

    this.projectDataService.contextVersion$.subscribe(contextVersion => {
      this.contextVersion = contextVersion;
    });

    // Combinar las suscripciones críticas
    combineLatest([
      this.projectDataService.contextComponents$,
      this.projectDataService.dqProblems$,
      this.projectDataService.dqModelVersion$.pipe(filter(Boolean)) // Filtra valores null
    ]).pipe(
      filter(([ctxComponents, dqProblems, dqModelVersionId]) => 
        ctxComponents && dqProblems.length > 0)
    ).subscribe(([ctxComponents, dqProblems, dqModelVersionId]) => {
      this.allContextComponents = ctxComponents;
      this.allDQProblems = dqProblems;
      this.dqModelVersionId = dqModelVersionId;
      
      /* se ejecuta solo cuando:
      ContextComponents y DQ Problems estan disponibles
      dqModelVersionId no es null */
      this.loadCompleteCurrentDQModel();
      this.loadDQModelMetrics();
      this.loadDQModelDimensionsForSelection();
      this.fetchExpandedDQMethodsData(this.dqModelVersionId);
    });
    
    this.projectDataService.dataSchema$.subscribe((data) => {
      this.dataSchema = data;

      if (this.dataSchema)
        this.generateAppliedToDataSchemaOptions();
    });
  }


  fetchDataAtHandDetails(dataAtHandId: number): void {
    this.projectDataService.getDataAtHandById(dataAtHandId).subscribe(
      (data) => {
        this.dataAtHandDetails = data;
      },
      (error) => {
        console.error('Error loading data at hand details:', error);
      }
    );
  }

  // ----------------------------
  // Métodos del Modelo DQ
  // ----------------------------
  getDQFactorsBase() {
    this.modelService.getAllDQFactorsBase().subscribe({
      next: (data) => {
        this.dqFactorsBase = data;
      },
      error: (err) => console.error("Error loading Factors Base:", err)
    });
  }

  loadCompleteCurrentDQModel(): void {
    this.dqModelId = this.project?.dqmodel_version ?? -1;
    if (this.dqModelId > 0) {
      this.getCurrentDQModel(this.dqModelId);
    } else {
      console.warn("No se encontró un dqModelId válido en el proyecto actual.");
    }

    //this.loadDQModelDimensionsAndFactors();
  }

  getCurrentDQModel(dqModelId: number): void {
    this.modelService.getCurrentDQModel(dqModelId).subscribe({
      next: (data) => {
        this.currentDQModel = data;
        this.noModelMessage = '';
        console.log("CURRENT DQ MODEL: ", this.currentDQModel);
      },
      error: (err) => {
        this.noModelMessage = err.status === 404
          ? "No DQ Model found with this ID. Please check and try again."
          : "An error occurred while loading the DQ Model. Please try again later.";
        this.currentDQModel = null;
      }
    });
  }

  async loadDQModelMetrics(): Promise<void> {
    try {
      const metrics = await this.modelService.getMetricsByDQModel(this.dqModelId).toPromise();
      
      if (!metrics || !Array.isArray(metrics)) {
        console.warn('No metrics received or invalid response');
        this.allMetrics = [];
        this.allMethods = [];
        return;
      }
  
      this.allMetrics = await Promise.all(metrics.map(async metric => {
        try {
          // 1. Cargar atributos base de la métrica
          const baseMetric = await this.modelService.getMetricBaseDetails(metric.metric_base).toPromise();
          metric.baseAttr = baseMetric;
  
          // 2. Cargar métodos base (disponibles)
          const baseMethodsResponse = await this.modelService.getMethodsBaseByMetricBase(metric.metric_base).toPromise();
          metric.baseMethods = baseMethodsResponse || [];
  
          // 3. Procesar métodos definidos en el modelo (si existen)
          if (metric.methods && Array.isArray(metric.methods)) {
            metric.definedMethods = await Promise.all(
              metric.methods.map(async (method: any) => {
                try {
                  const baseMethod = await this.modelService.getMethodBaseDetails(method.method_base).toPromise();
                  return { ...method, baseAttr: baseMethod };
                } catch (error) {
                  console.error(`Error loading base method ${method.method_base}:`, error);
                  return null;
                }
              })
            );
            // Filtrar métodos nulos (fallidos)
            metric.definedMethods = metric.definedMethods.filter((m: null) => m !== null);
          } else {
            metric.definedMethods = [];
          }
  
          return metric;
        } catch (error) {
          console.error(`Error processing metric ${metric.metric_name}:`, error);
          return null;
        }
      }));
  
      // Filtrar métricas nulas (por errores)
      this.allMetrics = this.allMetrics.filter(metric => metric !== null);
      this.allMethods = this.allMetrics.flatMap(metric => metric.definedMethods || []);
  
      console.log('Metrics loaded successfully:', this.allMetrics);
      console.log('Methods loaded successfully:', this.allMethods);
      
    } catch (error) {
      console.error('Error loading metrics:', error);
      this.errorMessage = 'Failed to load DQ Model metrics';
      this.allMetrics = [];
      this.allMethods = [];
    }
  }

  availableDQModelDimensions: any[] = []; // Dimensiones ya en el DQ Model
  selectedDQModelDimension: number | null = null; // Dimensión seleccionada del DQ Model

  // Método para cargar las dimensiones del DQ Model
  loadDQModelDimensionsForSelection(): void {
    console.log('Loading dimensions for DQ Model ID:', this.dqModelId); // Agrega esto
    if (this.dqModelId > 0) {
      this.modelService.getDimensionsByDQModel(this.dqModelId).subscribe({
        next: (dimensions) => {
          this.availableDQModelDimensions = dimensions;
          console.log('Dimensiones del DQ Model cargadas:', dimensions);
        },
        error: (err) => {
          console.error('Error loading DQ Model dimensions:', err);
          this.availableDQModelDimensions = [];
        }
      });
    } else {
      console.warn('dqModelId no está definido o es inválido');
    }
  }

  availableDQModelFactors: any[] = []; //base factors given dimension selected
  selectedDQModelFactor: number | null = null; // Factor seleccionado

  onDQModelDimensionChange(): void {
    /*this.clearSelectedComponents();
    this.clearDQProblemsSelection();*/
    
    if (this.selectedDQModelDimension) {
      this.loadDQModelFactorsForSelection(this.selectedDQModelDimension);
    }
    
    this.selectedDQModelFactor = null;
    this.availableDQModelFactors = []; // Limpiar factores anteriores
  }


  selectedDQModelDimension_appliedMethods: number | null = null; // Factor seleccionado

  onDQModelDimensionChange2(): void {
    /*this.clearSelectedComponents();
    this.clearDQProblemsSelection();*/
    console.log("Dimension selected for define Applied Methods", this.selectedDQModelDimension_appliedMethods);
    this.filterMethods();

    if (this.selectedDQModelDimension_appliedMethods) {
      //this.loadDQModelFactorsForSelection(this.selectedDQModelDimension_appliedMethods);
      //this.fetchExpandedDQMethodsData(this.dqModelId);
    }
    
   
  }

  filteredMethods: any[] = []; //base factors given dimension selected

  private filterMethods(): void {
    if (!this.selectedDQModelDimension_appliedMethods) {
      this.filteredMethods = [...this.dqMethods];
      console.log("this.filteredMethods", this.filteredMethods);
    } else {
      this.filteredMethods = this.dqMethods.filter(
        method => method.dimensionId === this.selectedDQModelDimension_appliedMethods
      );
      console.log("this.filteredMethods", this.filteredMethods);
    }

  }



  loadDQModelFactorsForSelection(dimensionId: number): void {
      console.log('Loading factors for DQ Model ID:', this.dqModelId, 'and Dimension ID:', dimensionId);
      
      if (this.dqModelId > 0 && dimensionId > 0) {
        this.modelService.getFactorsByDQModelAndDimension(this.dqModelId, dimensionId).subscribe({
          next: (factors) => {
            this.availableDQModelFactors = factors;
            console.log('Factores de la dimensión cargados:', factors);
          },
          error: (err) => {
            console.error('Error loading DQ Model factors:', err);
            this.availableDQModelFactors = [];
          }
        });
      } else {
        console.warn('dqModelId o dimensionId no están definidos o son inválidos');
      }
  }

  onDQModelFactorChange(): void {
    /*this.clearSelectedComponents();
    this.clearDQProblemsSelection();*/
    console.log("selectedDQModelFactor", this.selectedDQModelFactor);
    
    if (this.selectedDQModelDimension && this.selectedDQModelFactor) {
      this.loadDQModelMetricsForSelection(this.selectedDQModelDimension, this.selectedDQModelFactor);
    }
    
    this.selectedMetric = null;
    this.availableDQModelMetrics = []; // Limpiar métricas anteriores
  }

  // Variables para métricas
  availableDQModelMetrics: any[] = []; // Métricas del factor seleccionado
  //selectedMetric: number | null = null; // Métrica seleccionada

  
  loadDQModelMetricsForSelection0(dimensionId: number, factorId: number): void {
    console.log('Loading metrics for DQ Model ID:', this.dqModelId, 
                'Dimension ID:', dimensionId, 
                'and Factor ID:', factorId);
    
    if (this.dqModelId > 0 && dimensionId > 0 && factorId > 0) {
      this.modelService.getMetricsByDQModelDimensionAndFactor(
        this.dqModelId, 
        dimensionId, 
        factorId
      ).subscribe({
        next: (metrics) => {
          this.availableDQModelMetrics = metrics;
          console.log('Métricas del factor cargadas:', metrics);
        },
        error: (err) => {
          console.error('Error loading DQ Model metrics:', err);
          this.availableDQModelMetrics = [];
        }
      });
    } else {
      console.warn('dqModelId, dimensionId o factorId no están definidos o son inválidos');
    }
  }

  async loadDQModelMetricsForSelection(dimensionId: number, factorId: number): Promise<void> {
    console.log('Loading metrics for DQ Model ID:', this.dqModelId, 
                'Dimension ID:', dimensionId, 
                'and Factor ID:', factorId);
    
    try {
        if (!this.dqModelId || !dimensionId || !factorId) {
            throw new Error('Missing required IDs');
        }

        // 1. Obtener métricas básicas
        const metrics = await this.modelService.getMetricsByDQModelDimensionAndFactor(
            this.dqModelId, 
            dimensionId, 
            factorId
        ).toPromise();

        if (!metrics || !Array.isArray(metrics)) {
            console.warn('No metrics received or invalid response');
            this.availableDQModelMetrics = [];
            return;
        }

        // 2. Enriquecer cada métrica
        this.availableDQModelMetrics = await Promise.all(metrics.map(async metric => {
            try {
                // 2.1. Cargar atributos base de la métrica
                const baseMetric = await this.modelService.getMetricBaseDetails(metric.metric_base).toPromise();
                metric.baseAttr = baseMetric;

                // 2.2. Cargar métodos base (disponibles)
                //const baseMethodsResponse = await this.modelService.getMethodsBaseByMetricBase(metric.metric_base).toPromise();
                //metric.baseMethods = baseMethodsResponse || [];

                //Filtrar los metodos base eliminados (borrado logico)
                const rawBaseMethods = await this.modelService.getMethodsBaseByMetricBase(metric.metric_base).toPromise();
                const baseMethods = rawBaseMethods?.filter(method => !method.is_disabled);

                console.log("---baseMethodsResponse", baseMethods)

                metric.baseMethods = baseMethods || [];

                // 2.3. Procesar métodos definidos en el modelo (si existen)
                if (metric.methods && Array.isArray(metric.methods)) {
                    metric.definedMethods = await Promise.all(
                        metric.methods.map(async (method: any) => {
                            try {
                                const baseMethod = await this.modelService.getMethodBaseDetails(method.method_base).toPromise();
                                return { ...method, baseAttr: baseMethod };
                            } catch (error) {
                                console.error(`Error loading base method ${method.method_base}:`, error);
                                return null;
                            }
                        })
                    );
                    // Filtrar métodos nulos (fallidos)
                    metric.definedMethods = metric.definedMethods.filter((m: null) => m !== null);
                } else {
                    metric.definedMethods = [];
                }

                return metric;
            } catch (error) {
                console.error(`Error processing metric ${metric.metric_name}:`, error);
                return null;
            }
        }));

        // Filtrar métricas nulas (por errores)
        this.availableDQModelMetrics = this.availableDQModelMetrics.filter(metric => metric !== null);

        console.log('Metrics loaded successfully:', this.availableDQModelMetrics);
        
    } catch (error) {
        console.error('Error loading metrics:', error);
        this.availableDQModelMetrics = [];
    }
  }

  // ----------------------------
  // Métodos de Contexto
  // ----------------------------
  getContextComponentCategories(contextComponents: any): string[] {
    if (Array.isArray(contextComponents)) {
      const categories = new Set<string>();
      contextComponents.forEach((component) => categories.add(component.category));
      return Array.from(categories);
    } else {
      return Object.keys(contextComponents).filter(category => contextComponents[category].length > 0);
    }
  }

  getComponentsByCategory(components: any[], category: string): any[] {
    return components.filter((component) => component.category === category);
  }

  getFirstAttribute(category: string, componentId: number): string {
    const component = this.allContextComponents[category].find((comp: any) => comp.id === componentId);
    if (component) {
      const keys = Object.keys(component).filter(key => key !== 'id');
      if (keys.length > 0) {
        return `${component[keys[0]]}`;
      }
    }
    return 'No details available';
  }

  openContextComponentModal(category: string, componentId: number): void {
    const component = this.allContextComponents[category].find((comp: any) => comp.id === componentId);
    if (component) {
      this.selectedComponentKeys = Object.keys(component).filter(key => key !== 'id');
      this.selectedComponentDetails = component;
      const modalElement = document.getElementById('contextComponentModal');
      if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
      }
    }
  }

  getSelectedCategories(): string[] {
    return Object.keys(this.selectedMetric.context_components).filter(
      category => this.selectedMetric.context_components[category].length > 0
    );
  }

 

  getComponentById(category: string, id: number): any {
    const components = this.allContextComponents[category];
    if (!components || components.length === 0) {
      return null;
    }
    return components.find((c: { id: number; }) => c.id === id);
  }

  onCtxComponentsCheckboxChange(id: number, category: string, value: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const isChecked = input?.checked || false;

    if (isChecked) {
      this.selectionCheckboxCtxComponents.push({ id, category, value });
    } else {
      this.selectionCheckboxCtxComponents = this.selectionCheckboxCtxComponents.filter(
        (component) => !(component.category === category && component.value === value)
      );
    }

    console.log("selectionCheckboxCtxComponents:", this.selectionCheckboxCtxComponents)
  }

  isComponentSelected(category: string, value: string): boolean {
    return this.selectionCheckboxCtxComponents.some(
      (component) => component.category === category && component.value === value
    );
  }

  removeSelectedComponent(componentToRemove: any): void {
    this.selectionCheckboxCtxComponents = this.selectionCheckboxCtxComponents.filter(
      (component) => component !== componentToRemove
    );
  }

  toggleCtxSelectionAccordionVisibility(): void {
    this.isEditingCtxComponents = !this.isEditingCtxComponents;
  }

  hasSelectedComponents(category: string): boolean {
    return this.selectionCheckboxCtxComponents.some(
      (component) => component.category === category
    );
  }

  // ----------------------------
  // Métodos de Selección
  // ----------------------------
  onMetricSelected(): void {
    if (this.selectedMetric) {
      console.log("Selected Metric:", this.selectedMetric);
      this.selectionCheckboxCtxComponents = [];
      this.fetchDQFactorDetails(this.selectedMetric.factor);

      const contextComponents = this.selectedMetric.context_components;
      Object.keys(contextComponents).forEach((category) => {
        contextComponents[category].forEach((componentId: number) => {
          const component = this.allContextComponents[category].find(
            (comp: any) => comp.id === componentId
          );
          if (component) {
            this.selectionCheckboxCtxComponents.push({
              id: componentId,
              category: category,
              value: getFirstNonIdAttribute(component),
            });
            //console.log("selectionCheckboxCtxComponents:", this.selectionCheckboxCtxComponents)
          }
        });
      });
    }
  }

  fetchDQFactorDetails(factorId: number): void {
    if (this.dqModelId && factorId) {
      this.modelService.getFactorInDQModel(this.dqModelId, factorId).subscribe({
        next: (data) => {
          this.dqFactor_measures = data.factor_name;
        },
        error: (err) => {
          console.error('Error al cargar los detalles del factor:', err);
        },
      });
    }
  }

  onMethodSelected(): void {
    console.log("Selected Method:", this.selectedBaseDQMethod);
  }

  onMethodDQModelSelected(): void {
    const selectedId = Number(this.selectedMethodDQModel);
    console.log("Selected DQ Method DQ Model id for Applied Method(converted to number):", selectedId);
    this.getDQMethodDetails(selectedId);

    /*if(this.dqModelVersionId)
      this.fetchExpandedDQMethodsData(this.dqModelVersionId);*/
  }

  getDQMethodDetails(methodId: number): void {
    const selectedMethod = this.allMethods.find((method) => method.id === methodId);

    if (selectedMethod) {
      const methodBaseId = selectedMethod.method_base;

      if (methodBaseId) {
        this.modelService.getDQMethodBaseById(methodBaseId).subscribe(
          (methodBase) => {
            this.selectedMethodDetails = methodBase;

            if (methodBase.implements) {
              this.modelService.getMetricBaseDetails(methodBase.implements).subscribe(
                (metricBase) => {
                  this.selectedMetricBaseDetails = metricBase;
                  this.appliedMethodForm.get('appliedTo')?.setValue(
                    metricBase.granularity?.toLowerCase() === 'Column' ? '' : []
                  );
                },
                (error) => {
                  console.error("Error al obtener los detalles de la métrica base:", error);
                }
              );
            }
          },
          (error) => {
            console.error("Error al obtener los detalles del método base:", error);
          }
        );
      }
    }
  }

  getDQMethodsBaseDetails(methodBaseId: number): void {
    this.modelService.getDQMethodBaseById(methodBaseId).subscribe(
      (methodBase) => {
        console.log("Detalles del método base:", methodBase);
        this.selectedMethodDetails = methodBase;
      },
      (error) => {
        console.error("Error al obtener los detalles del método base:", error);
      }
    );
  }

  // ----------------------------
  // Métodos de Formularios
  // ----------------------------
  generateAppliedToDataSchemaOptions() {
    this.dataColumnOptions = [];
    this.dataSchema.forEach((table: any) => {
      table.columns.forEach((column: any) => {
        this.dataColumnOptions.push({
          value: {
            table_id: table.table_id,
            table_name: table.table_name,
            column_id: column.column_id,
            column_name: column.column_name,
            data_type: column.data_type
          },
          label: `${column.column_name} (${table.table_name})`
        });
      });
    });
  }

  onTypeChange() {
    const type = this.appliedMethodForm.get('type')?.value;

    if (type === 'Aggregated') {
      this.appliedMethodForm.get('appliedTo')?.setValue([]);
    } else {
      this.appliedMethodForm.get('appliedTo')?.setValue('');
    }

    this.cdr.detectChanges();
  }

  onAppliedToChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const selectedOptions = Array.from(selectElement.selectedOptions).map(option => JSON.parse(option.value));

    const groupedByTable = selectedOptions.reduce((acc, option) => {
      const tableKey = `${option.table_id}-${option.table_name}`;
      if (!acc[tableKey]) {
        acc[tableKey] = {
          table_id: option.table_id,
          table_name: option.table_name,
          columns: []
        };
      }
      acc[tableKey].columns.push({
        column_id: option.column_id,
        column_name: option.column_name,
        data_type: option.data_type
      });
      return acc;
    }, {});

    const appliedToData = Object.values(groupedByTable);
    this.appliedMethodForm?.get('appliedTo')?.setValue(appliedToData);
  }

  // ----------------------------
  // Métodos CRUD
  // ----------------------------
  openModal(metric: any) {
    this.currentMetric = metric;
    this.isModalOpen = true;
  }

  openModalBase(metric: any) {
    this.currentMetric = metric;
    this.isModalBaseOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  closeModalBase() {
    this.isModalBaseOpen = false;
  }

  onMethodChange(event: any) {
    this.selectedMethodObject = this.allMethods.find(elem => elem.id == event?.target.value);
  }

  openCreateAppliedMethodModal(dqMethodId: any) {
    
    this.selectedMethodObject = this.allMethods.find(elem => elem.id == dqMethodId);
    console.log("SELECT METHOD for APPLIED METHODS", this.selectedMethodObject);

    this.getDQMethodDetails(this.selectedMethodObject.id);

    const implementationName = `${this.selectedMethodObject.method_name}_implementation_x`;
    const appliedAlgorithm = this.selectedMethodObject.baseAttr.algorithm;

    this.appliedMethodForm.patchValue({
      name: implementationName,
      appliedTo: '',
      algorithm: appliedAlgorithm,
      type: 'Measurement'
    });

    this.isCreateAppliedMethodModalOpen = true;
  }


  closeCreateAppliedMethodModal() {
    this.isCreateAppliedMethodModalOpen = false;
    this.appliedMethodForm.reset({ type: 'Measurement' });
  }

  deleteAppliedMethod(appMethod: any) {
    if (appMethod) {
      const userConfirmed = confirm(
        "¿Está seguro que desea eliminar esta metodo aplicado del DQ Model?"
      );

      if (userConfirmed) {
        console.log(`Eliminando la metodo aplicado con ID: ${appMethod.id}`);
        let dqMethod = this.allMethods.find(elem => elem.id == appMethod.associatedTo);
        let isAggr = dqMethod.applied_methods.aggregations.find((item: any) => item === appMethod);
        if (isAggr) {
          this.modelService.deleteAggregatedMethod(appMethod.id).subscribe(
            response => {
              //alert(response?.message || "Metodo Aplicado eliminado correctamente");
              this.notificationService.showSuccess(`The Applied DQ Method was successfully removed from the DQ Model.`);
              dqMethod.definedMethods = dqMethod.applied_methods.aggregations.filter(
                (item: any) => item.id !== appMethod.id
              );
            },
            error => {
              //alert("Error al eliminar el metodo aplicado.");
              console.error("Error al eliminar el metodo aplicado:", error);
            }
          );
        } else {
          this.modelService.deleteMeasurementdMethod(appMethod.id).subscribe(
            response => {
              //alert(response?.message || "Metodo Aplicado eliminado correctamente");
              this.notificationService.showSuccess(`The Applied DQ Method was successfully removed from the DQ Model.`);
              dqMethod.definedMethods = dqMethod.applied_methods.measurements.filter(
                (item: any) => item.id !== appMethod.id
              );
            },
            error => {
              //alert("Error al eliminar el metodo aplicado.");
              console.error("Error al eliminar el metodo aplicado:", error);
            }
          );
        }
      } else {
        console.log("Eliminación de la dimensión cancelada por el usuario.");
      }
    }
  }

 

  

  //Delete Method base (disabled from DQ Method selection)
  deleteMethodBase(methodId: number): void {
    if (methodId) {
      console.log(`Metric seleccionada para eliminar: ${this.selectedBaseDQMethod}`);
      this.modelService.updateDQMethodBaseDisabledStatus(methodId, true).subscribe({
        next: (response) => {
          this.notificationService.showSuccess('DQ Method was successfully deleted.')

          // Recargar lista de metricas disponibles
          if (this.selectedDQModelDimension && this.selectedDQModelFactor)
            this.loadDQModelMetricsForSelection(this.selectedDQModelDimension, this.selectedDQModelFactor);

          this.selectedMetric = null;
          this.selectedBaseDQMethod = null;

        },
        error: (err) => {
          this.notificationService.showError('Failed to delete DQ Method.');
        }
      });
    }
  }

  createAppliedMethod() {
    if (this.appliedMethodForm.valid) {
      const appliedMethod = this.appliedMethodForm.value;

      let appliedToValue = appliedMethod.appliedTo;
      if (typeof appliedToValue === 'string') {
        try {
          appliedToValue = JSON.parse(appliedToValue);
        } catch (error) {
          console.error("Error parsing appliedTo:", error);
          alert("Invalid data in 'Applied To' field.");
          return;
        }
      }

      console.log('Applied Method Created:', appliedMethod);

      const newAppMeth = {
        name: appliedMethod.name,
        appliedTo: appliedToValue,
        algorithm: appliedMethod.algorithm,
        associatedTo: this.selectedMethodObject.id
      };

      if (appliedMethod.type === "Aggregated") {
        this.modelService.createAggregatedMethod(newAppMeth).subscribe({
          next: (data) => {
            console.log("Applied Method created:", data);

            this.notificationService.showSuccess('Applied DQ Method was successfully created and added to the DQ Model.');

            this.loadDQModelMetrics(); //Actualizar DQ Model
          },
          error: (err) => {
            console.error("Error creating the Applied Method:", err);
            this.notificationService.showError('Failed to add the Applied DQ Method to DQ Model');
          }
        });
      } else {
        this.modelService.createMeasurementMethod(newAppMeth).subscribe({
          next: (data) => {
            console.log("Applied Method created:", data);

            this.notificationService.showSuccess('Applied DQ Method was successfully created and added to the DQ Model.');

            this.loadDQModelMetrics(); //Actualizar DQ Model
          },
          error: (err) => {
            console.error("Error creating the Applied Method:", err);
            this.notificationService.showError('Failed to add the Applied DQ Method to DQ Model');
          }
        });
      }

      this.closeCreateAppliedMethodModal();
    } else {
      console.log("Formulario inválido. No se puede crear el método.");
    }
  }


  //Delete DQ Method (remove from DQ Model)
  async removeDQMethodFromDQModel(metric: any, method: any): Promise<void> {

    console.log("DELETE metric", metric);
    console.log("DELETE method", method);
  
    try {
      const response = await this.modelService.deletMethodFromDQModel(method.id).toPromise();
      
      this.notificationService.showSuccess(`"${method.method_name}" was successfully removed from the DQ Model.`);
      
      // Actualizar la lista local sin el método eliminado
      metric.definedMethods = metric.definedMethods.filter(
        (item: any) => item.id !== method.id
      );
      
      // Si el método eliminado estaba seleccionado, limpiar la selección
      if (this.selectedMethodDQModel?.id === method.id) {
        this.selectedMethodDQModel = null;
      }
      
    } catch (error) {
      console.error('Error deleting method:', error);
      this.notificationService.showError(`Failed to delete "${method.method_name}".`);
    }
  }

  async deleteMethod0(metric: any, method: any): Promise<void> {
    const confirmation = await this.confirmAction(
      `Are you sure you want to delete "${method.method_name}" from the DQ Model?\nThis will also delete all its applied methods.`
    );
  
    try {
      const response = await this.modelService.deletMethodFromDQModel(method.id).toPromise();
      
      this.notificationService.showSuccess(`"${method.method_name}" was successfully removed from the DQ Model.`);
      
      // Actualizar la lista local sin el método eliminado
      metric.definedMethods = metric.definedMethods.filter(
        (item: any) => item.id !== method.id
      );
      
      // Si el método eliminado estaba seleccionado, limpiar la selección
      if (this.selectedMethodDQModel?.id === method.id) {
        this.selectedMethodDQModel = null;
      }
      
    } catch (error) {
      console.error('Error deleting method:', error);
      this.notificationService.showError(`Failed to delete "${method.method_name}".`);
    }
  }

 

  async addMethodToDQModel(metric: any, method: any) {
    /*const confirmation = await this.confirmAction(`Are you sure you want to add the DQ Method "${method.name}" to DQ Model?`);
    if (!confirmation) return;*/

    if (!metric || !method) {
      this.notificationService.showWarning("Please select both a metric and a method.");
      return;
    }
  
    // Verificar si el método ya existe en la métrica
    const isDuplicate = this.checkForDuplicateMethod(metric, method.id);
    
    if (isDuplicate) {
      // Mostrar mensaje de advertencia
      this.notificationService.showWarning(`DQ Method "${method.name}" was already added to the DQ Model.`);
      //this.showDuplicateWarning(metric, method);
      return;
    }
  
    const context_components = buildContextComponents(this.selectionCheckboxCtxComponents);
    console.log(context_components)
  
    const methodData = {
      dq_model: metric.dq_model,
      method_base: method.id,
      dimension: metric.dimensionId,
      factorId: metric.factorId,
      metric: metric.id,
      context_components: context_components,
    };
  
    this.modelService.addMethodsToDQModel(methodData).subscribe({
      next: (response) => {
        console.log("Method added to DQ Model:", response);
        //alert("Method successfully added to DQ Model.");
        this.notificationService.showSuccess(`DQ Method "${method.name}" was successfully added to the DQ Model.`);
        // Actualizar la lista de métodos después de agregar uno nuevo
        this.loadDQModelMetrics();
      },
      error: (err) => {
        console.error("Error adding method to DQ Model:", err);
        this.notificationService.showError("Failed to add method to DQ Model.");
        //alert("An error occurred while adding the method to DQ Model.");
      }
    });
  }
  
  // Verificar si el método ya existe en la métrica
  checkForDuplicateMethod(metric: any, methodBaseId: number): boolean {
    if (!metric.definedMethods || !metric.definedMethods.length) {
      return false;
    }
    
    return metric.definedMethods.some(
      (existingMethod: any) => existingMethod.method_base === methodBaseId
    );
  }

  addMethodToDQModel_backup(metric: any, method: any) {
    if (!metric || !method) {
      alert("Please select a metric and a method.");
      return;
    }

    const context_components = buildContextComponents(this.selectionCheckboxCtxComponents);
    console.log(context_components)

    const methodData = {
      dq_model: metric.dq_model,
      method_base: method.id,
      dimension: metric.dimensionId,
      factorId: metric.factorId,
      metric: metric.id,
      context_components: context_components,
    };

    this.modelService.addMethodsToDQModel(methodData).subscribe({
      next: (response) => {
        console.log("Method added to DQ Model:", response);
        alert("Method successfully added to DQ Model.");
      },
      error: (err) => {
        console.error("Error adding method to DQ Model:", err);
        alert("An error occurred while adding the method to DQ Model.");
      }
    });
  }

  
  createMethodBase(metric: any): void {

    if (this.dqMethodForm.valid) {
      var methodData = this.dqMethodForm.value;
      methodData.implements = this.currentMetric.metric_base;

      this.modelService.createDQMethodBase(methodData).subscribe({
        next: (data) => {
          const newDQMethod = data;
          console.log('Nuevo DQ Method Base creado:', newDQMethod);
          //alert('The DQ Method was successfully created. You can now select it to add it to the DQ Model.');
          //this.notificationService.showSuccess('The DQ Method was successfully created. You can now select it to add it to the DQ Model.');
          this.notificationService.showSuccess(`DQ Method "${methodData.name}" was successfully created. Now can be selected to add it to the DQ Model.`);


          //this.loadDQModelMetrics(); 
          if (this.selectedDQModelDimension && this.selectedDQModelFactor)
            this.loadDQModelMetricsForSelection(this.selectedDQModelDimension, this.selectedDQModelFactor); //Recargar metrics con nuevo metodo
          this.selectedBaseDQMethod = newDQMethod;
          console.log("selectedBaseDQMethod", this.selectedBaseDQMethod);
       

          this.dqMethodForm.reset();
          this.closeModalBase();
          
        },
        error: (error) => {
          console.error('Error al crear el DQ Method Base:', error);
          //this.notificationService.showError("Error al crear el método base.");
          this.notificationService.showError('Failed to create DQ Method');
          //alert('Error al crear el DQ Method Base. Intenta nuevamente.');
        }
      });
    } else {
      //alert('Por favor, completa todos los campos requeridos.');
      this.notificationService.showWarning("Por favor completa todos los campos requeridos.");
    }
  }


  // ----------------------------
  // Métodos de Sugerencias
  // ----------------------------
  generateNewSuggestion() {
    this.isLoading = true;
    this.generateSuggestion();
  }

  generateSuggestion() {
    console.log('Generando sugerencia...');
    let metric = {
      id: this.currentMetric.metric_base,
      name: this.currentMetric.metric_name,
      purpose: this.currentMetric.baseAttr.purpose,
      granularity: this.currentMetric.baseAttr.granularity,
      resultDomain: this.currentMetric.baseAttr.resultDomain
    }
    this.modelService.generateDQMethodSuggestion(metric).subscribe({
      next: (response) => {
        console.log('Sugerencia recibida:', response);
        this.suggestion = response;
        this.error = '';

        if (this.dqMethodForm) {
          this.dqMethodForm.patchValue({
            name: response.name || '',
            inputDataType: response.inputDataType || '',
            outputDataType: response.outputDataType || '',
            algorithm: response.algorithm || ''
          });

          console.log('Formulario actualizado:', this.dqMethodForm.value);
        } else {
          console.error('El formulario no está inicializado');
        }

        this.isLoading = false;
        const confirmMessage = `
          Sugerencia generada:
          Nombre: ${response.name}
          Tipo de entrada: ${response.inputDataType}
          Tipo de salida: ${response.outputDataType}
          Algoritmo: ${response.algorithm}
          Implementación: ${response.implements}
        `;
        console.log(confirmMessage);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error al generar la sugerencia:', err);
        this.error = 'Error al generar la sugerencia. Por favor intente nuevamente.';
        this.suggestion = null;
      }
    });
  }

  // ----------------------------
  // Métodos Finales
  // ----------------------------
  saveMetrics() {
    this.router.navigate(['/st4/confirmation-stage-4']);
  }



  // Agrega esta función utilitaria en tu componente
  async confirmAction(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const confirmed = confirm(message);
      resolve(confirmed);
    });
  }


  // Propiedades para el modal de confirmación
  isConfirmationModalOpen: boolean = false;
  confirmationModalTitle: string = '';
  confirmationModalMessage: string = '';
  confirmedAction: () => void = () => {};


  // Handlers para el modal
  handleConfirm(): void {
    this.isConfirmationModalOpen = false;
    this.confirmedAction();
  }

  handleCancel(): void {
    this.isConfirmationModalOpen = false;

  }

  openConfirmationModal(
    title: string,
    message: string,
    actionType: 'addMethodToDQModel' | 'createDQMethodBase' | 'deleteMethodBase' | 'removeDQMethodFromDQModel' | 'defineAppliedMethod', 
    ...params: any[]
  ): void {
    this.confirmationModalTitle = title;
    this.confirmationModalMessage = message;
  
    // Configuramos la acción según el tipo
    switch (actionType) {
      case 'createDQMethodBase':
        const [metricBase] = params;
        this.confirmedAction = () => {
          this.createMethodBase(metricBase);
        };
        break;

      case 'addMethodToDQModel':
        const [metricForMethod, method] = params;
        this.confirmedAction = () => {
          this.addMethodToDQModel(metricForMethod, method);
        };
        break;

      case 'deleteMethodBase':
        const [selectedBaseDQMethodId] = params;
        this.confirmedAction = () => {
          this.deleteMethodBase(selectedBaseDQMethodId);
        };
        break;

      case 'removeDQMethodFromDQModel':
        const [metricIn, methodToRemove] = params;
        this.confirmedAction = () => {
          this.removeDQMethodFromDQModel(metricIn, methodToRemove);
        };
        break;

        case 'defineAppliedMethod':
          this.confirmedAction = () => {
            this.createAppliedMethod();
  
          };
          break;
    }
  
    this.isConfirmationModalOpen = true;
  }
    
  getAddMethodMessage(method: any): string {
    return `Are you sure you want to add the DQ Method "${method?.name || ''}" to the DQ Model?`;
  }



  // DQ Methods
  dqMethods: any[] = [];
  appliedDQMethods: any[] = []; // Lista de applied_methods aplanados

  // Obtener los métodos de un DQModel y aplanar los applied_methods
  // Versión simplificada que enriquece los métodos con información adicional
  fetchExpandedDQMethodsData(dqmodelId: number): void {
    this.isLoading = true;
    this.errorMessage = null;
    
    this.modelService.getMethodsByDQModel(dqmodelId).subscribe({
      next: async (methods: any[]) => {
        try {
          // Procesar cada método para enriquecerlo
          this.dqMethods = await Promise.all(methods.map(async method => {
            try {
              const metric = await this.modelService.getMetricInDQModel(dqmodelId, method.metric).toPromise();
              if (!metric) return method;
              
              const factor = await this.modelService.getFactorInDQModel(dqmodelId, metric.factor).toPromise();
              if (!factor) return method;
              
              const dimension = await this.modelService.getDimensionInDQModel(dqmodelId, factor.dimension).toPromise();
              if (!dimension) return method;
              
              // Retornar el método original con los campos adicionales
              return {
                ...method, // Mantiene todas las propiedades originales
                dqMethod: method.method_name,
                methodBase: method.method_base,
                dqMetric: metric.metric_name,
                metricId: metric.id,
                dqFactor: factor.factor_name,
                factorId: factor.id,
                dqDimension: dimension.dimension_name,
                dimensionId: dimension.id
              };
            } catch (error) {
              console.error(`Error processing method ${method.id}:`, error);
              return method; // Retorna el método sin enriquecer si hay error
            }
          }));
          
          console.log('Enriched DQ Methods:', this.dqMethods);
        } catch (error) {
          console.error('Error processing methods:', error);
          this.errorMessage = 'Error loading methods data';
        } finally {
          this.isLoading = false;
        }
      },
      error: (error: any) => {
        this.errorMessage = 'Error fetching DQ Methods';
        this.isLoading = false;
        console.error('Error fetching DQ Methods:', error);
      }
    });
  }

  fetchEnrichedDQMethods(dqmodelId: number): void {
    this.isLoading = true;
    this.errorMessage = null;
    
    this.modelService.getMethodsByDQModel(dqmodelId).subscribe({
      next: async (methods: any[]) => {
        try {
          // Procesar cada método para enriquecerlo con información adicional
          this.dqMethods = await Promise.all(methods.map(async method => {
            try {
              const metric = await this.modelService.getMetricInDQModel(dqmodelId, method.metric).toPromise();
              if (!metric) return method;
              
              const factor = await this.modelService.getFactorInDQModel(dqmodelId, metric.factor).toPromise();
              if (!factor) return method;
              
              const dimension = await this.modelService.getDimensionInDQModel(dqmodelId, factor.dimension).toPromise();
              if (!dimension) return method;
              
              // Retornar el método enriquecido con la información adicional
              return {
                ...method,
                metricDetails: {
                  id: metric.id,
                  name: metric.metric_name,
                  base: metric.metric_base
                },
                factorDetails: {
                  id: factor.id,
                  name: factor.factor_name,
                  dimension: factor.dimension
                },
                dimensionDetails: {
                  id: dimension.id,
                  name: dimension.dimension_name
                }
              };
            } catch (error) {
              console.error(`Error processing method ${method.id}:`, error);
              return method; // Retorna el método sin enriquecer si hay error
            }
          }));
          
          console.log('Enriched DQ Methods:', this.dqMethods);
        } catch (error) {
          console.error('Error processing methods:', error);
          this.errorMessage = 'Error loading methods data';
        } finally {
          this.isLoading = false;
        }
      },
      error: (error: any) => {
        this.errorMessage = 'Error fetching DQ Methods';
        this.isLoading = false;
        console.error('Error fetching DQ Methods:', error);
      }
    });
  }

  fetchExpandedDQMethodsData2(dqmodelId: number): void {
  
    this.modelService.getMethodsByDQModel(dqmodelId).subscribe({
      next: (methods: any[]) => {
        this.dqMethods = methods
        console.log("this.dqMethods", this.dqMethods);
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
                          dqMetric: metric.metric_name, 
                          metricId: metric.id,   
                          dqFactor: factor.factor_name,  
                          factorId: factor.id, 
                          dqDimension: dimension.dimension_name,  
                          dimensionId: dimension.id,   
                        })),
                      ];
  
                      this.appliedDQMethods = [...this.appliedDQMethods, ...appliedMethods];
                      console.log('Applied DQ Methods fecthed:', this.appliedDQMethods);

                    }
                  });
                }
              });
            }
          });
  
          return []; 
        });


      },
      error: (error: any) => {
        console.error('Error fetching DQ Methods:', error);
      },
    });
  }

  fetchExpandedDQMethodsData0(dqmodelId: number): void {
  
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
                          dqMetric: metric.metric_name, 
                          metricId: metric.id,   
                          dqFactor: factor.factor_name,  
                          factorId: factor.id, 
                          dqDimension: dimension.dimension_name,  
                          dimensionId: dimension.id,   
                          selected: false, // Inicializar el checkbox como no seleccionado
                        })),
                        ...method.applied_methods.aggregations.map((aggregation: any) => ({
                          ...aggregation,
                          dqMethod: dqMethodName,
                          methodBase: methodBase,
                          dqMetric: metric.metric_name, 
                          metricId: metric.id,   
                          dqFactor: factor.factor_name,  
                          factorId: factor.id, 
                          dqDimension: dimension.dimension_name,  
                          dimensionId: dimension.id,   
                          selected: false, // Inicializar el checkbox como no seleccionado
                        })),
                      ];
  
                      this.appliedDQMethods = [...this.appliedDQMethods, ...appliedMethods];
                      console.log('Applied DQ Methods fecthed:', this.appliedDQMethods);

                    }
                  });
                }
              });
            }
          });
  
          return []; 
        });


      },
      error: (error: any) => {
        console.error('Error fetching DQ Methods:', error);
      },
    });
  }

// Variables adicionales
collapsedItems: { [key: string]: boolean } = {};

// Métodos para agrupar datos
getGroupedDimensions(): any[] {
  const dimensionsMap = new Map<number, { id: number, name: string }>();
  this.appliedDQMethods.forEach(method => {
    if (!dimensionsMap.has(method.dimensionId)) {
      dimensionsMap.set(method.dimensionId, {
        id: method.dimensionId,
        name: method.dqDimension
      });
    }
  });
  return Array.from(dimensionsMap.values());
}

getFactorsByDimension(dimensionId: number): any[] {
  const factorsMap = new Map<number, { id: number, name: string }>();
  this.appliedDQMethods
    .filter(method => method.dimensionId === dimensionId)
    .forEach(method => {
      if (!factorsMap.has(method.factorId)) {
        factorsMap.set(method.factorId, {
          id: method.factorId,
          name: method.dqFactor
        });
      }
    });
  return Array.from(factorsMap.values());
}

getMetricsByFactor(factorId: number): any[] {
  const metricsMap = new Map<number, { id: number, name: string }>();
  this.appliedDQMethods
    .filter(method => method.factorId === factorId)
    .forEach(method => {
      if (!metricsMap.has(method.metricId)) {
        metricsMap.set(method.metricId, {
          id: method.metricId,
          name: method.dqMetric
        });
      }
    });
  return Array.from(metricsMap.values());
}

getMethodsByMetric(metricId: number): any[] {
  return this.appliedDQMethods.filter(method => method.metricId === metricId);
}

getMethodsCountByMetric(metricId: number): number {
  return this.getMethodsByMetric(metricId).length;
}

// Control de colapsado
toggleCollapse(id: string): void {
  this.collapsedItems[id] = !this.collapsedItems[id];
}

isCollapsed(id: string): boolean {
  return !!this.collapsedItems[id];
}


  /* DQ METHOD EDITING */

  //Habilitar edicion DQ Method (ctx components)
  enableDQMethodEdition(method: any): void {
    console.log("enableDQMethodEdition", method)
    method.isEditing = !method.isEditing;
  
    // Inicializar tempContextComponents si no está definido
    if (!method.tempContextComponents) {
      method.tempContextComponents = JSON.parse(JSON.stringify(method.context_components || {}));
    }
  }

  //Presetar ctx components ya existentes en DQ Method para edicion
  isCtxComponentSelected_editing(category: string, componentId: number, tempContextComponents: any): boolean {
    return tempContextComponents[category] && tempContextComponents[category].includes(componentId);
  }


  //Chequear si categoria Ctx component tiene elementos
  categoryHasCtxComponents_editing(category: string, tempContextComponents: any): boolean {
    return tempContextComponents[category] && tempContextComponents[category].length > 0;
  }

  //Update DQ Method - Ctx components selection
  onCtxComponentsCheckboxChange_methodEditing(componentId: number, category: string, method: any): void {
    if (!method.tempContextComponents[category]) {
      method.tempContextComponents[category] = [];
    }

    console.log("method.tempContextComponents", method.tempContextComponents)
  
    const index = method.tempContextComponents[category].indexOf(componentId);
    if (index === -1) {
      method.tempContextComponents[category].push(componentId);
    } else {
      // Eliminar el componente si ya está seleccionado
      method.tempContextComponents[category].splice(index, 1);
    }
  }

  //Update Metric ctx components
  saveMethodContextComponents(method: any): void {
    const updatedMethod = {
      context_components: method.tempContextComponents,
    };

    console.log("updatedMethod", updatedMethod);

    method.context_components = JSON.parse(JSON.stringify(method.tempContextComponents));
    method.isEditing = false;

        console.log("Method  actualizacion ctx components.", method.context_components);

    this.modelService.updateDQMethodCtx(method.id, updatedMethod).subscribe({
      next: () => {
        this.notificationService.showSuccess(`DQ Method was successfully updated.`);
        //this.loadDQModelDimensionsAndFactors();

        //Actualizar componentes en vista
        method.context_components = JSON.parse(JSON.stringify(method.tempContextComponents));
        method.isEditing = false;

        console.log("Metrics actualizacion ctx components.", method.context_components);
      },
      error: (err) => {
        console.error("Error al actualizar el factor:", err);
        alert("Error updating factor context components and problems.");
      },
    });
  }

  // VISTA: Componentes de Contexto Asociados
  // Guarda el estado expandido por categoría de componente de contexto para cada elemento del modelo
  ctxCategoryStates: { [elementId: string]: { [category: string]: boolean } } = {};

  toggleCategory(elementId: string, category: string): void {
    // Inicializar estructura si no existe
    if (!this.ctxCategoryStates[elementId]) {
      this.ctxCategoryStates[elementId] = {};
    }
    
    // Si el estado es undefined (primera vez), establecerlo como false (cerrado)
    if (this.ctxCategoryStates[elementId][category] === undefined) {
      this.ctxCategoryStates[elementId][category] = false;
    } else {
      // Si ya tiene un estado, invertirlo
      this.ctxCategoryStates[elementId][category] = !this.ctxCategoryStates[elementId][category];
    }
  }
  
  isCategoryExpanded(elementId: string, category: string): boolean {
    // Si el estado es undefined (primera vez), devolver true (abierto por defecto)
    // Si ya tiene estado, devolver ese valor
    return this.ctxCategoryStates[elementId]?.[category] ?? true;
  }

}