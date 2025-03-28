import { Component, OnInit, ViewEncapsulation, HostListener, ChangeDetectorRef } from '@angular/core';
import contextComponentsJson from '../../../assets/context-components.json';
import { Router } from '@angular/router';
import { DqModelService } from '../../services/dq-model.service';
import { ProjectService } from '../../services/project.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProjectDataService } from '../../services/project-data.service';
import { buildContextComponents, formatCtxCompCategoryName, getFirstNonIdAttribute } from '../../shared/utils/utils';
import { NotificationService } from '../../services/notification.service';

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
  selector: 'app-dq-dimensions-methods-definition',
  templateUrl: './dq-dimensions-methods-definition.component.html',
  styleUrls: ['./dq-dimensions-methods-definition.component.css'],
  //encapsulation: ViewEncapsulation.None
})
export class DqDimensionsMethodsDefinitionComponent implements OnInit {
  // ----------------------------
  // Propiedades del Componente
  // ----------------------------

  // Utils
  public formatCtxCompCategoryName = formatCtxCompCategoryName;
  public getFirstNonIdAttribute = getFirstNonIdAttribute;

  // Estado y Navegación
  isNextStepEnabled: boolean = true;
  currentStep: number = 4;
  pageStepTitle: string = 'Implementation of DQ Methods';
  phaseTitle: string = 'Phase 2: DQ Assessment';
  stageTitle: string = 'Stage 4: DQ Model Definition';
  isLoading: boolean = false;

  steps: { displayName: string, route: string, description: string }[] = [
    { displayName: 'A09.1', route: 'st4/a09-1', description: 'Prioritization of DQ Problems' },
    { displayName: 'A09.2', route: 'st4/a09-2', description: 'Selection of DQ Problems' },
    { displayName: 'A10', route: 'st4/a10', description: 'Selection of DQ Dimensions and Factors' },
    { displayName: 'A11', route: 'st4/a11', description: 'Definition of DQ Metrics' },
    { displayName: 'A12', route: 'st4/a12', description: 'Implementation of DQ Methods' },
    { displayName: 'DQ Model Confirmation', route: 'st4/confirmation-stage-4', description: 'DQ Model Confirmation' }
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
      type: ['Aggregated', Validators.required]
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
      console.log('Project Data:', data);

      if (this.project.data_at_hand) {
        this.loadDataAtHandDetails(this.project.data_at_hand);
      }
    });

    this.projectDataService.contextComponents$.subscribe((data) => {
      this.allContextComponents = data;
    });

    this.projectDataService.dqProblems$.subscribe((data) => {
      this.allDQProblems = data;
    });

    this.projectDataService.dqModelVersion$.subscribe((dqModelVersionId) => {
      this.dqModelVersionId = dqModelVersionId;

      if (this.dqModelVersionId !== null) {
        this.loadCompleteCurrentDQModel();
        this.loadDQModelMetrics();
      }
    });

    this.projectDataService.dataSchema$.subscribe((data) => {
      this.dataSchema = data;
      this.generateAppliedToDataSchemaOptions();
    });
  }

  loadDataAtHandDetails(dataAtHandId: number): void {
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
    console.log("CurrentProject dqModelId:", this.dqModelId);

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
  
  async loadDQModelMetrics_0(): Promise<void> {
    try {
      if (!this.dqModelId) {
        console.error('dqModelId is not defined');
        return;
      }
  
      const metrics = await this.modelService.getMetricsByDQModel(this.dqModelId).toPromise();
      
      if (!metrics || metrics.length === 0) {
        console.log('No metrics found for this DQ Model.'); 
        this.allMetrics = [];
        this.allMethods = [];
        return;
      }
    
      this.allMetrics = await Promise.all(metrics.map(async metric => {
        try {
          const baseMetric = await this.modelService.getMetricBaseDetails(metric.metric_base).toPromise();
          metric.baseAttr = baseMetric;
  
          if (metric.methods && metric.methods.length > 0) {
            // Procesar métodos y asignar a ambas propiedades
            metric.definedMethods = await Promise.all(metric.methods.map(async (method: any) => {
              const baseMethod = await this.modelService.getMethodBaseDetails(method.method_base).toPromise();
              method.baseAttr = baseMethod;
              return method;
            }));
            
            // Asegurar que methods también tenga los datos actualizados
            metric.methods = metric.definedMethods;
          } else {
            metric.definedMethods = [];
            metric.methods = [];
          }
  
          return metric;
        } catch (error) {
          console.error(`Error processing metric ${metric.metric_name}:`, error);
          return null;
        }
      }));
    
      this.allMetrics = this.allMetrics.filter(metric => metric !== null);
      this.allMethods = this.allMetrics.flatMap(metric => metric.definedMethods || []);
  
      console.log("Final allMetrics:", this.allMetrics);
      console.log("Final allMethods:", this.allMethods);
    
    } catch (error) {
      console.error('Error in loadDQModelMetrics:', error);
      this.errorMessage = 'Failed to load DQ Model metrics.';
    }
  }

  async loadDQModelMetrics___(): Promise<void> {
    
    try {
      
      if (!this.dqModelId) {
        console.error('dqModelId is not defined');
        return;
      }

      const metrics = await this.modelService.getMetricsByDQModel(this.dqModelId).toPromise();
      
      if (!metrics || metrics.length === 0) {
        console.log('No metrics found for this DQ Model.'); 
        this.allMetrics = [];
        this.allMethods = [];
        return;
      }
    
      this.allMetrics = await Promise.all(metrics.map(async metric => {
        //console.log('Processing metric:', metric.metric_name); 
        
        try {
          const baseMetric = await this.modelService.getMetricBaseDetails(metric.metric_base).toPromise();
          //console.log('Base metric loaded:', baseMetric); 
          metric.baseAttr = baseMetric;
    
          if (metric.methods && metric.methods.length > 0) {
            //console.log(`Processing ${metric.methods.length} methods...`); 
            metric.definedMethods = await Promise.all(metric.methods.map(async (method: any) => {
              const baseMethod = await this.modelService.getMethodBaseDetails(method.method_base).toPromise();
              method.baseAttr = baseMethod;
              return method;
            }));
          } else {
            metric.definedMethods = [];
          }
    
          return metric;
        } catch (error) {
          console.error(`Error processing metric ${metric.metric_name}:`, error);
          return null;
        }
      }));
    
      // Filtrar métricas nulas (por si hubo errores)
      this.allMetrics = this.allMetrics.filter(metric => metric !== null);
      
      this.allMethods = this.allMetrics.flatMap(metric => 
        metric.definedMethods || []
      );

      console.log("Final allMetricsNew:", this.allMetrics);
      console.log("Final allMethodsNew:", this.allMethods);
    
    } catch (error) {
      console.error('Error in loadDQModelMetrics:', error);
      this.errorMessage = 'Failed to load DQ Model metrics.';
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
      console.log("Selected Factor:", this.selectedMetric);
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
            console.log("selectionCheckboxCtxComponents:", this.selectionCheckboxCtxComponents)
          }
        });
      });
    }
  }

  fetchDQFactorDetails(factorId: number): void {
    if (this.dqModelId && factorId) {
      this.modelService.getDQDimensionDetails(this.dqModelId, factorId).subscribe({
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

  openCreateAppliedMethodModal(method: any) {
    this.selectedMethodObject = this.allMethods.find(elem => elem.id == method);
    console.log("SELECT METHOD for APPLIED METHODS", this.selectedMethodObject);

    this.getDQMethodDetails(this.selectedMethodObject.id);

    const implementationName = `${this.selectedMethodObject.method_name}_implementation_x`;
    const appliedAlgorithm = this.selectedMethodObject.baseAttr.algorithm;

    this.appliedMethodForm.patchValue({
      name: implementationName,
      appliedTo: '',
      algorithm: appliedAlgorithm,
      type: 'Aggregated'
    });

    this.isCreateAppliedMethodModalOpen = true;
  }


  closeCreateAppliedMethodModal() {
    this.isCreateAppliedMethodModalOpen = false;
    this.appliedMethodForm.reset({ type: 'Aggregated' });
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
              alert("Error al eliminar el metodo aplicado.");
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
              alert("Error al eliminar el metodo aplicado.");
              console.error("Error al eliminar el metodo aplicado:", error);
            }
          );
        }
      } else {
        console.log("Eliminación de la dimensión cancelada por el usuario.");
      }
    }
  }

 

  public JSON = JSON;

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

            alert("Applied Method successfully created");
          },
          error: (err) => {
            console.error("Error creating the Applied Method:", err);
            alert("Error creating the Applied Method.");
          }
        });
      } else {
        this.modelService.createMeasurementMethod(newAppMeth).subscribe({
          next: (data) => {
            console.log("Applied Method created:", data);
   
            alert("Applied Method successfully created");
          },
          error: (err) => {
            console.error("Error creating the Applied Method:", err);
            alert("Error creating the Applied Method.");
          }
        });
      }

      this.closeCreateAppliedMethodModal();
    } else {
      console.log("Formulario inválido. No se puede crear el método.");
    }
  }

  async deleteMethod(metric: any, method: any): Promise<void> {
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

  deleteMethod1(metric: any, method: any): void {
    const index = metric.definedMethods.indexOf(method);
    if (index > -1) {
      const userConfirmed = confirm(
        "¿Está seguro que desea eliminar esta metrica del DQ Model? Esto también eliminará los metodos asociados."
      );

      if (userConfirmed) {
        console.log(`Eliminando la dimensión con ID: ${method.id}`);
        this.modelService.deletMethodFromDQModel(method.id).subscribe(
          response => {
            //alert(response?.message || "Metrica y metodos asociados eliminados exitosamente.");
            this.notificationService.showSuccess(`DQ Method was successfully removed from the DQ Model.`);
            metric.definedMethods = metric.definedMethods.filter(
              (item: any) => item.id !== method.id
            );
          },
          error => {
            alert("Error al eliminar la metrica.");
            console.error("Error al eliminar la metrica:", error);
          }
        );
      } else {
        console.log("Eliminación de la dimensión cancelada por el usuario.");
      }
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

  
  addBaseMethod(factor: any): void {
    if (this.dqMethodForm.valid) {
      var methodData = this.dqMethodForm.value;
      methodData.implements = this.currentMetric.metric_base;

      this.modelService.createDQMethodBase(methodData).subscribe({
        next: (data) => {
          console.log('Nuevo DQ Method Base creado:', data);
          //alert('The DQ Method was successfully created. You can now select it to add it to the DQ Model.');
          //this.notificationService.showSuccess('The DQ Method was successfully created. You can now select it to add it to the DQ Model.');
          this.notificationService.showSuccess(`DQ Method "${methodData.name}" was successfully created. Now can be selected to add it to the DQ Model.`);
          this.loadDQModelMetrics();
          this.dqMethodForm.reset();
          this.closeModalBase();
        },
        error: (error) => {
          console.error('Error al crear el DQ Method Base:', error);
          this.notificationService.showError("Error al crear el método base.");
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
    actionType: 'addMethodToDQModel' | 'createDQMethod', 
    ...params: any[]
  ): void {
    this.confirmationModalTitle = title;
    this.confirmationModalMessage = message;
  
    // Configuramos la acción según el tipo
    switch (actionType) {
      case 'createDQMethod':
        const [metric] = params;
        this.confirmedAction = () => {
          this.addBaseMethod(metric);
        };
        break;

      case 'addMethodToDQModel':
        const [metricForMethod, method] = params;
        this.confirmedAction = () => {
          this.addMethodToDQModel(metricForMethod, method);
        };
        break;
    }
  
    this.isConfirmationModalOpen = true;
  }
    
  getAddMethodMessage(method: any): string {
    return `Are you sure you want to add the DQ Method "${method?.name || ''}" to the DQ Model?`;
  }


  formatAppliedTo(appliedTo: any): string {
    if (!appliedTo) return 'Not specified';
    
    // Si es un array de objetos
    if (Array.isArray(appliedTo)) {
      // Agrupar por table_name
      const tablesMap = new Map<string, string[]>();
      
      appliedTo.forEach(item => {
        if (!tablesMap.has(item.table_name)) {
          tablesMap.set(item.table_name, []);
        }
        tablesMap.get(item.table_name)?.push(item.column_name);
      });
      
      // Construir el string formateado
      let result = '';
      tablesMap.forEach((columns, tableName) => {
        result += `Table: ${tableName}\nColumns: ${columns.join(', ')}\n\n`;
      });
      
      return result.trim();
    }
    
    // Si es un solo objeto
    else if (typeof appliedTo === 'object') {
      return `Table: ${appliedTo.table_name}\nColumn: ${appliedTo.column_name}`;
    }
    
    // Si ya es un string
    return appliedTo;
  }

  getAppliedToDisplay(appliedTo: any): {tableName: string, columns: string[]}[] {
    if (!appliedTo) return [];
    
    if (Array.isArray(appliedTo)) {
      const tablesMap = new Map<string, string[]>();
      
      appliedTo.forEach(item => {
        if (!tablesMap.has(item.table_name)) {
          tablesMap.set(item.table_name, []);
        }
        tablesMap.get(item.table_name)?.push(item.column_name);
      });
      
      return Array.from(tablesMap.entries()).map(([tableName, columns]) => ({
        tableName,
        columns
      }));
    }
    
    return [{
      tableName: appliedTo.table_name,
      columns: [appliedTo.column_name]
    }];
  }
}