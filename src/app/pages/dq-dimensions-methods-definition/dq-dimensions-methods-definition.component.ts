import { Component, OnInit, ViewEncapsulation, HostListener } from '@angular/core';
import contextComponentsJson from '../../../assets/context-components.json';
import { Router } from '@angular/router';
import { DqModelService } from '../../services/dq-model.service';
import { ProjectService } from '../../services/project.service';
import { FormBuilder, FormGroup, Validators  } from '@angular/forms';

import { ProjectDataService } from '../../services/project-data.service';

declare var bootstrap: any; 

interface ContextComponent {
  id: string;
  type: string;
  description: string;
}

interface DataQualityProblem {
  id: number;
  name: string;
  description: string;
  contextcomp_related_to: string[];
  priority: number;
  priorityType: string;
  selectedFactors?: number[];
}

interface QualityDimension {
  id: number;
  name: string;
}

interface QualityMetric {
  name: string;
  purpose: string;
  granularity: string;
  domain: string;
  factor?: QualityFactor;
  expanded: boolean;
  definedMethods: QualityMethod[];
  newMethod: QualityMethod;
}

interface QualityFactor {
  id: number;
  dimensionId: number;
  name: string;
  newMetric: QualityMetric;
  definedMetrics: QualityMetric[];
}

interface QualityMethod {
  name: string;
  input: string;
  output: string;
  algorithm: string;
  expanded: boolean;
  metric?: QualityMetric;
}

@Component({
  selector: 'app-dq-dimensions-methods-definition',
  templateUrl: './dq-dimensions-methods-definition.component.html',
  styleUrls: ['./dq-dimensions-methods-definition.component.css'],
  //encapsulation: ViewEncapsulation.None
})
export class DqDimensionsMethodsDefinitionComponent implements OnInit {

  isNextStepEnabled: boolean = true;

  currentStep: number = 4; // Step 3
  pageStepTitle: string = 'Implementation of DQ Methods';
  phaseTitle: string = 'Phase 2: DQ Assessment';
  stageTitle: string = 'Stage 4: DQ Model Definition';

  steps: { displayName: string, route: string, description: string }[] = [
    { displayName: 'A09.1', route: 'st4/a09-1', description: 'Prioritization of DQ Problems' },
    { displayName: 'A09.2', route: 'st4/a09-2', description: 'Selection of DQ Problems' },
    { displayName: 'A10', route: 'st4/a10', description: 'Selection of DQ Dimensions and Factors' },
    { displayName: 'A11', route: 'st4/a11', description: 'Definition of DQ Metrics' },
    { displayName: 'A12', route: 'st4/a12', description: 'Implementation of DQ Methods' },
    { displayName: 'DQ Model Confirmation', route: 'st4/confirmation-stage-4', description: 'DQ Model Confirmation' }
  ];

  isLoading: boolean = false;

  dataSchema: any = null;
  
  dqMethodForm: FormGroup;
  appliedMethodForm: FormGroup;
  
  project: any;
  dqModelId: number = 1;
  currentDQModel:any;
  noModelMessage: string = "";  
  noDimensionsMessage: string = "";
  dqmodel_dimensions: any[] = [];
  dimensionsWithFactorsInDQModel: any[] = [];
  errorMessage: string | null = null;
  factorsByDim: any[] = [];
  private contextModel: any; // Para almacenar el modelo de contexto completo
  allMetrics: any[] = [];
  currentMetric: any;
  suggestion: any = null;
  error: string = '';
  isCreateAppliedMethodModalOpen = false;
  selectedMethod: any;
  allMethods: any[] = [];
  selectedMethodObject: any;
  
  
  contextComponentsGrouped: { type: string; ids: number[] }[] = [];
  
  dqFactorsBase: any[] = [];

  isModalBaseOpen = false;

  contextComponents: ContextComponent[] = [];
  selectedComponents: ContextComponent[] = []; // Para almacenar componentes seleccionados
  dropdownOpen: boolean = false; // Para manejar la apertura/cierre del dropdown

  confirmedSelectedProblems: DataQualityProblem[] = [];
  confirmedFactors: { [key: number]: number[] } = {};

  qualityDimensions: QualityDimension[] = [
    { id: 1, name: 'Exactitud (accuracy)' },
    { id: 2, name: 'Completitud (completeness)' },
    { id: 3, name: 'Frescura (freshness)' },
    { id: 4, name: 'Consistencia (consistency)' },
    { id: 5, name: 'Unicidad (uniqueness)' }
  ];


  possibleOutputs: string[] = ['Entero', 'Real', 'Booleano'];
  domains: string[] = ['Entero', 'Real', 'Booleano'];
  newMethod: any = {
    name: '', input: '', output: '', algorithm: '', expanded: false,  metric: undefined};
  definedMetrics: QualityMethod[] = [];
  qualityMetrics: QualityMetric[]= [
    {
      name: 'Metric1',
      purpose: 'Nothing',
      granularity: 'Tupla',
      domain: 'Real',
      factor: undefined,
      definedMethods: [],
      expanded:false,
      newMethod: {
        name: '', input: '', output: '', algorithm: '', expanded: false, metric: undefined}
    }
  ];


  dqFactor_measures: string = '';

  selectedMetric: any = null; 
  onMetricSelected_(): void {
    console.log("Selected Metric:", this.selectedMetric);
  }

  // Método para cargar los detalles de la dimensión
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

  onMetricSelected(): void {
    if (this.selectedMetric) {
      console.log("Selected Factor:", this.selectedMetric);
      // Limpiar la selección actual
      this.selectionCheckboxCtxComponents = [];

      //Obtener Dimension del factor
      this.fetchDQFactorDetails(this.selectedMetric.factor);
  
      // Cargar los componentes de contexto asociados al factor seleccionado
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
              value: this.getFirstNonIdAttribute(component),
            });
            console.log("selectionCheckboxCtxComponents:", this.selectionCheckboxCtxComponents)
          }
        });
      });

      
    }
  }

  hasSelectedComponents(category: string): boolean {
    return this.selectionCheckboxCtxComponents.some(
      (component) => component.category === category
    );
  }

  selectedBaseDQMethod: any = null; 
  onMethodSelected(): void {
    console.log("Selected Method:", this.selectedBaseDQMethod);
  }

  selectedMethodDQModel: any = null; 
  onMethodDQModelSelected2(): void {
    console.log("Selected Method DQ Model:", JSON.stringify(this.selectedMethodDQModel, null, 2));
    console.log("All methods:", this.allMethods);

    const selectedMethodId = Number(this.selectedMethodDQModel);
  
    // Busca el método seleccionado en allMethods
    const selectedMethod = this.allMethods.find((method) => method.id === selectedMethodId);
  
    if (selectedMethod) {
      console.log("Método seleccionado encontrado:", selectedMethod);
  
      // Obtiene el method_base del método seleccionado
      const methodBaseId = selectedMethod.method_base;
  
      if (methodBaseId) {
        console.log("ID del método base:", methodBaseId);
  
        // Llama al servicio para obtener los detalles del método base
        this.getDQMethodsBaseDetails(methodBaseId);
      } else {
        console.warn("El método seleccionado no tiene un method_base definido.");
      }
    } else {
      console.warn("No se encontró el método seleccionado en allMethods.");
    }
  }

  onMethodDQModelSelected(): void {
    // Convierte el valor seleccionado a número
    const selectedId = Number(this.selectedMethodDQModel);
  
    console.log("Selected Method DQ Model (converted to number):", selectedId);
  
    // Llama a la función para obtener los detalles del método
    this.getDQMethodDetails(selectedId);
  }

  selectedMethodDetails: any;

  // En tu componente
  selectedDQMethodDetails: any = null; // Almacena los detalles del método base

  // Función para obtener los detalles del método seleccionado y su método base
  getDQMethodDetails(methodId: number): void {
    // Busca el método seleccionado en allMethods
    const selectedMethod = this.allMethods.find((method) => method.id === methodId);

    if (selectedMethod) {
      console.log("Método seleccionado encontrado:", selectedMethod);

      // Obtiene el method_base del método seleccionado
      const methodBaseId = selectedMethod.method_base;

      if (methodBaseId) {
        console.log("ID del método base:", methodBaseId);

        // Llama al servicio para obtener los detalles del método base
        this.getDQMethodsBaseDetails(methodBaseId);
      } else {
        console.warn("El método seleccionado no tiene un method_base definido.");
      }
    } else {
      console.warn("No se encontró el método seleccionado en allMethods.");
    }
  }

  // Función para obtener los detalles del método base
  getDQMethodsBaseDetails(methodBaseId: number): void {
    this.modelService.getDQMethodBaseById(methodBaseId).subscribe(
      (methodBase) => {
        console.log("Detalles del método base:", methodBase);
        this.selectedMethodDetails = methodBase; // Almacena los detalles del método base
      },
      (error) => {
        console.error("Error al obtener los detalles del método base:", error);
      }
    );
  }

  // Función para obtener los detalles del método base
  /*getDQMethodsBaseDetails(methodBaseId: number): void {
    this.modelService.getDQMetricBaseById(methodBaseId).subscribe(
      (methodBase) => {
        console.log("Detalles del método base:", methodBase);
        this.selectedMethodDetails = methodBase; // Almacena los detalles del método base
      },
      (error) => {
        console.error("Error al obtener los detalles del método base:", error);
      }
    );
  }*/

  constructor(
    private router: Router, 
    private modelService: DqModelService,
    private projectService: ProjectService,  
    private projectDataService: ProjectDataService, 
    private fb:FormBuilder
  ) { 
    // Inicialización del formulario en el constructor
    this.dqMethodForm = this.fb.group({
      name: [''],
      inputDataType: [''],
      outputDataType: [''],
      algorithm: ['']
    });
    this.appliedMethodForm = this.fb.group({
      name: ['', Validators.required],
      appliedTo: ['', Validators.required],
      type: ['Aggregated', Validators.required]
    });
  }

  ngOnInit() {
    this.getDQFactorsBase();

    //this.loadCurrentProject();


    // Obtener el Project ID actual
    this.projectId = this.projectDataService.getProjectId();
    console.log("projectIdGet: ", this.projectId);

    // Suscribirse a los observables del servicio
    this.subscribeToData();

    // Sincronizar el paso actual con la ruta
    this.syncCurrentStepWithRoute();

    }

    syncCurrentStepWithRoute() {
      const currentRoute = this.router.url; // Obtiene la ruta actual (por ejemplo, '/st4/a09-1')
      const stepIndex = this.steps.findIndex(step => step.route === currentRoute);
      if (stepIndex !== -1) {
        this.currentStep = stepIndex;
      }
    }

  project_: any;
  allDQProblems: any[] = [];
  allContextComponents_: any;


  // Variables de datos

  projectId: number | null = null;
  noProjectMessage: string = "";

  dqModelVersionId: number | null = null;
  dqModel: any = null;

  // Métodos de suscripción a datos
  subscribeToData(): void {
    // Suscribirse al proyecto
    this.projectDataService.project$.subscribe((data) => {
      this.project = data;
      console.log('Project Data:', data);
    });

    // Suscribirse a los componentes del contexto
    this.projectDataService.contextComponents$.subscribe((data) => {
      this.allContextComponents = data;
      console.log('Context Components:', data);
    });

    // Suscribirse a los problemas de calidad de datos (DQ Problems)
    this.projectDataService.dqProblems$.subscribe((data) => {
      this.allDQProblems = data;
      console.log('DQ Problems:', data);

      // Una vez que los problemas están cargados, cargar los problemas priorizados
      /*if (this.projectId !== null) {
        this.loadSelectedPrioritizedDQProblems(this.projectId);
        this.getCurrentDQModel(this.projectId);
      }*/
    });

    // Suscribirse a la versión del modelo de calidad de datos (DQ Model Version)
    this.projectDataService.dqModelVersion$.subscribe((dqModelVersionId) => {
      this.dqModelVersionId = dqModelVersionId;
      console.log('DQ Model Version ID:', this.dqModelVersionId);

      if (this.dqModelVersionId !== null) {
        //Load complete DQ Model (with Dimensions,Factors...) of current project
        this.loadCompleteCurrentDQModel();
        //this.loadDQModelDimensionsAndFactors();
      }
    });

    // Suscribirse al esquema de datos
    this.projectDataService.dataSchema$.subscribe((data) => {
      this.dataSchema = data;
      console.log('Data Schema:', data); // Ver el esquema de datos en la consola
    });

  }


  
  
  // projectId: number | null = null;
  contextVersionId: number | null = null;

  loadCurrentProject(): void {
    this.projectService.loadCurrentProject().subscribe({
      next: (project) => {
        this.project = project;
        console.log('Proyecto cargado en el componente:', this.project);

        this.projectId = project.id;

        this.contextVersionId = project.context_version;

        if (this.contextVersionId){
          this.getAllContextComponents(this.contextVersionId);
        }

        //Load complete DQ Model (with Dimensions,Factors...) of current project
        this.loadCompleteCurrentDQModel();
      },
      error: (err) => {
        console.error('Error al cargar el proyecto en el componente:', err);
      }
    });
  }

  /* ------------- CONTEXTO  ---------- */
  // CONTEXT

  allContextComponents: any; // Variable para almacenar el contexto obtenido

  getAllContextComponents(contextVersionId: number): void {
    this.projectService.getContextComponents(contextVersionId).subscribe({
      next: (data) => {
        console.log('ALL CTX. COMPONENTS:', data);
        this.allContextComponents = data;
      },
      error: (err) => console.error('Error fetching context components:', err)
    });
  }

  // Método para obtener las categorías de los componentes de contexto
  /*getContextComponentCategories(contextComponents: any): string[] {
    return Object.keys(contextComponents).filter(category => contextComponents[category].length > 0);
  }*/

  getContextComponentCategories(contextComponents: any): string[] {
    if (Array.isArray(contextComponents)) {
      // Si es un array (selectionCheckboxCtxComponents)
      const categories = new Set<string>();
      contextComponents.forEach((component) => categories.add(component.category));
      return Array.from(categories);
    } else {
      // Si es un objeto (contextComponents)
      return Object.keys(contextComponents).filter(category => contextComponents[category].length > 0);
    }
  }

  /*getContextComponentCategoriesFromArray(components: { id: number; category: string; value: string }[]): string[] {
    const categories = new Set<string>();
    components.forEach((component) => categories.add(component.category));
    return Array.from(categories);
  }*/
  
  getComponentsByCategory(components: any[], category: string): any[] {
    return components.filter((component) => component.category === category);
  }


  // Método para formatear el nombre de la categoría
  formatCategoryName(category: string): string {
    // Reemplazar camelCase o snake_case con espacios
    const formatted = category
      .replace(/([A-Z])/g, ' $1') // Separar camelCase
      .replace(/_/g, ' ') // Separar snake_case
      .trim(); // Eliminar espacios al inicio y al final

    // Capitalizar la primera letra de cada palabra
    return formatted
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Método para obtener el primer atributo no 'id' de un componente
  getFirstAttribute(category: string, componentId: number): string {
    const component = this.allContextComponents[category].find((comp: any) => comp.id === componentId);
    if (component) {
      const keys = Object.keys(component).filter(key => key !== 'id'); // Excluir 'id'
      if (keys.length > 0) {
        return `${component[keys[0]]}`; // Devolver solo el valor del primer atributo
      }
    }
    return 'No details available';
  }


  // Variables para el modal
  selectedComponentKeys: string[] = []; // Claves del componente seleccionado
  selectedComponentDetails: any = {}; // Detalles del componente seleccionado

  // Método para abrir el modal con todos los atributos
  openContextComponentModal(category: string, componentId: number): void {
    const component = this.allContextComponents[category].find((comp: any) => comp.id === componentId);
    if (component) {
      this.selectedComponentKeys = Object.keys(component).filter(key => key !== 'id'); // Excluir 'id'
      this.selectedComponentDetails = component;
      // Abrir el modal
      const modalElement = document.getElementById('contextComponentModal');
      if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
      }
    }
  }

  

  //**** CTX ACCORDION ***** */
  // En el componente TypeScript
  getSelectedCategories(): string[] {
    return Object.keys(this.selectedMetric.context_components).filter(
      category => this.selectedMetric.context_components[category].length > 0
    );
  }

  getComponentById(category: string, id: number): any {
    const components = this.allContextComponents[category];
    if (!components || components.length === 0) {
      return null; // Si la categoría no tiene componentes, retorna null
    }
    return components.find((c: { id: number; }) => c.id === id);
  }

  getFirstNonIdAttribute(item: any): string {
    const keys = Object.keys(item);
    const firstNonIdKey = keys.find((key) => key !== 'id');
    return firstNonIdKey ? item[firstNonIdKey] : '';
  }

  selectedCtxComponents: { id: number; category: string; value: string }[] = [];
  
  onCtxComponentsCheckboxChange(id: number, category: string, value: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const isChecked = input?.checked || false;
  
    if (isChecked) {
      // Agregar el componente seleccionado
      this.selectionCheckboxCtxComponents.push({ id, category, value });
    } else {
      // Eliminar el componente desmarcado
      this.selectionCheckboxCtxComponents = this.selectionCheckboxCtxComponents.filter(
        (component) => !(component.category === category && component.value === value)
      );
    }

    console.log("selectionCheckboxCtxComponents:", this.selectionCheckboxCtxComponents)

  }

  
  

  //seleccion de componentes de contexto
  selectionCheckboxCtxComponents: { id: number; category: string; value: string }[] = [];


  // Validar si un componente está seleccionado
  isComponentSelected(category: string, value: string): boolean {
    return this.selectionCheckboxCtxComponents.some(
      (component) => component.category === category && component.value === value
    );
  }

  removeSelectedComponent(componentToRemove: any): void {
    // Filtra la lista para excluir el componente a eliminar
    this.selectionCheckboxCtxComponents = this.selectionCheckboxCtxComponents.filter(
      (component) => component !== componentToRemove
    );
  }

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

  // Seleccion de Componentes de CONTEXTO
  isCtxSelectionAccordionVisible = false;
  isEditingCtxComponents: boolean = false;

  toggleCtxSelectionAccordionVisibility(): void {
    this.isEditingCtxComponents = !this.isEditingCtxComponents;
  }









  /* ---------- */

  getDQFactorsBase() {
    this.modelService.getAllDQFactorsBase().subscribe({
      next: (data) => {
        this.dqFactorsBase = data;
        //console.log('*All FACTORS BASE loaded:', data);
      },
      error: (err) => console.error("Error loading Factors Base:", err)
    });
  }

  loadCompleteCurrentDQModel(): void {
    // Asigna el dqModelId desde el proyecto, o -1 si no existe DQ Model asociado a Project
    this.dqModelId = this.project?.dqmodel_version ?? -1; 
    console.log("CurrentProject dqModelId:", this.dqModelId);

    // Llama a getDQModelById si dqModelId es válido
    if (this.dqModelId > 0) {
      this.getCurrentDQModel(this.dqModelId);
    } else {
      console.warn("No se encontró un dqModelId válido en el proyecto actual.");
    }

    // Cargar Dimensiones y Factores del DQ Model
    this.loadDQModelDimensionsAndFactors();

    // CARGAR CONTEXTO 
    // this.getContext();
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


  loadDQModelDimensionsAndFactors(): void {
    this.modelService.getDimensionsByDQModel(this.dqModelId).subscribe(
      async (dimensions) => {
        if (dimensions.length === 0) {
          this.noDimensionsMessage = 'No dimensions found for this DQ Model.';
          this.dqmodel_dimensions = [];
          this.dimensionsWithFactorsInDQModel = [];
          return;
        }
  
        this.dqmodel_dimensions = dimensions;
        this.dimensionsWithFactorsInDQModel = [];
        this.factorsByDim = [];
        this.allMetrics = [];
        this.allMethods = [];
  
        const dimensionsData = await Promise.all(dimensions.map(async (dimension) => {
          try {
            // Obtener factores de la dimensión
            const factors = await this.modelService.getFactorsByDQModelAndDimension(this.dqModelId, dimension.id).toPromise();
  
            // Verificar que 'factors' no sea 'undefined' antes de procesarlo
            if (!factors) {
              throw new Error(`Factors not found for dimension ${dimension.dimension_name}`);
            }
  
            // Obtener detalles de la dimensión base
            const baseAttributes = await this.modelService.getDQDimensionBaseById(dimension.dimension_base).toPromise();
  
            // Obtener los detalles del factor base para cada factor
            const factorsWithBaseAttributes = await Promise.all(factors.map(async (factor) => {
              const factorBaseAttributes = await this.modelService.getFactorBaseById(factor.factor_base).toPromise();
              return { ...factor, baseAttributes: factorBaseAttributes };
            }));
  
            return {
              dimension,
              baseAttributes,
              factors: factorsWithBaseAttributes
            };
          } catch (error) {
            console.error(`Error loading data for dimension ${dimension.dimension_name}:`, error);
            this.errorMessage = `Failed to load data for dimension ${dimension.dimension_name}.`;
            return null;
          }
        }));
  
        // Filtrar cualquier entrada nula debido a errores y luego asignar los datos completos
        this.dimensionsWithFactorsInDQModel = dimensionsData.filter((dim) => dim !== null);
        let that = this;
        this.dimensionsWithFactorsInDQModel.forEach(item => {
          that.factorsByDim = that.factorsByDim.concat(item.factors);
        }); 
        this.getBaseMetricsByFactor();
      },
      (error) => {
        if (error.status === 404) {
          this.noDimensionsMessage = 'No dimensions found for this DQ Model.';
        } else {
          this.noDimensionsMessage = 'Failed to load the dimensions of the DQ Model.';
        }
      }
    );
  }

  getContext() {
    this.modelService.getCtxComponents().subscribe({
      next: (data) => {
        console.log("Context components loaded:", data);
        this.contextModel = data.context_model;
        this.contextComponents = [];
  
        if (this.contextModel) {
          this.groupContextComponents(this.contextModel);
        }
      },
      error: (err) => console.error("Error loading context components:", err)
    });
  }

  groupContextComponents(contextModel: any) {
    this.contextComponentsGrouped = [];
  
    for (const key in contextModel) {
      if (contextModel.hasOwnProperty(key)) {
        const items = contextModel[key];
  
        if (Array.isArray(items)) {
          items.forEach(item => {
            const type = key;
            const id = item.id;
  
            const existingGroup = this.contextComponentsGrouped.find(group => group.type === type);
            
            if (existingGroup) {
              existingGroup.ids.push(id);
            } else {
              this.contextComponentsGrouped.push({ type: type, ids: [id] });
            }
          });
        }
      }
    }
  
    console.log("Grouped Context Components:", this.contextComponentsGrouped);
  }

  getBaseMetricsByFactor(){
    let that = this;
    this.factorsByDim.forEach(async item => {
      const baseMetricForFact = await this.modelService.getMetricsBaseByDimensionAndFactorId(item.baseAttributes.facetOf, item.factor_base).toPromise();
      item.baseMetrics = baseMetricForFact;
      const dqMetricForFact = await this.modelService.getMetricsByDQModelDimensionAndFactor(item.dq_model, item.dimension, item.id).toPromise();
      item.definedMetrics = dqMetricForFact;
      item.definedMetrics.forEach(async (metric:any) => {
        let baseAttrMetric = item.baseMetrics.find((elem:any) => elem.id == metric.metric_base);
        metric.baseAttr = baseAttrMetric;
        const dqBaseMethods = await this.modelService.getMethodsBaseByDimensionFactorAndMetricId(item.dimension, item.factor_base, metric.metric_base).toPromise();
        metric.baseMethods = dqBaseMethods;
        const dqMethods = await this.modelService.getMethodsByDQModelDimensionFactorAndMetric(item.dq_model,item.dimension, item.id, metric.id).toPromise();
        if (dqMethods) {
          that.allMethods = that.allMethods.concat(dqMethods);
          metric.definedMethods = dqMethods;
          metric.definedMethods.forEach((dqMeth:any) => {
            let baseAttr = metric.baseMethods.find((elem:any)=> elem.id == dqMeth.method_base);
            dqMeth.baseAttr = baseAttr;
          });
        }
        
      });
      this.allMetrics = this.allMetrics.concat(item.definedMetrics);
    });

    
  }


  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen; // Cambia el estado del dropdown
  }

  selectComponent(component: ContextComponent) {
    if (!this.selectedComponents.includes(component)) {
      this.selectedComponents.push(component); // Añade el componente seleccionado
    }
    this.dropdownOpen = false; // Cierra el dropdown después de seleccionar
  }

  getContextDescription(contextId: string): string {
    const context = this.contextComponents.find(c => c.id === contextId);
    return context ? context.description : 'No description';
  }

  // getFactorsByDimension(dimensionId: number): QualityFactor[] {
  //   return this.qualityFactors.filter(factor => factor.dimensionId === dimensionId);
  // }

  // getFactorNameById(factorId: number): string | undefined {
  //   const factor = this.qualityFactors.find(f => f.id === factorId);
  //   return factor ? factor.name : undefined;
  // }

  getProblemsForFactor(factorId: number): string[] {
    return this.confirmedSelectedProblems
      .filter(problem => this.confirmedFactors[problem.id]?.includes(factorId))
      .map(problem => problem.name);
  }

  isFactorSelected(problem: DataQualityProblem, factorId: number): boolean {
    return problem.selectedFactors !== undefined && problem.selectedFactors.includes(factorId);
  }

  toggleFactorSelection(problem: DataQualityProblem, factorId: number) {
    if (!problem.selectedFactors) {
      problem.selectedFactors = [];
    }
    if (problem.selectedFactors.includes(factorId)) {
      problem.selectedFactors = problem.selectedFactors.filter(f => f !== factorId);
    } else {
      problem.selectedFactors.push(factorId);
    }
  }

  showDimensionsFactorsTitle = false;
  showDimensionsFactorsTable = false;



  // getSelectedDimensionsWithFactors(): { dimension: QualityDimension, factors: { factor: QualityFactor, problems: string[] }[] }[] {
  //   return this.qualityDimensions
  //     .map(dimension => {
  //       const factorsWithProblems = this.getFactorsByDimension(dimension.id)
  //         .map(factor => ({
  //           factor,
  //           problems: this.getProblemsForFactor(factor.id)
  //         }))
  //         .filter(factorWithProblems => factorWithProblems.problems.length > 0);

  //       return { dimension, factors: factorsWithProblems };
  //     })
  //     .filter(dimensionWithFactors => dimensionWithFactors.factors.length > 0);
  // }

  confirmAllFactors() {
    this.router.navigate(['/step4']);
  }

  removeComponent(component: ContextComponent) {
    this.selectedComponents = this.selectedComponents.filter(selected => selected.id !== component.id);
  }

  isModalOpen = false;

  openModal(metric:any) {
    this.currentMetric = metric;
    this.isModalOpen = true;
  }
  openModalBase(metric:any) {
    this.currentMetric = metric;
    this.isModalBaseOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  onMethodChange(event:any){
    this.selectedMethodObject = this.allMethods.find(elem=> elem.id == event?.target.value);
  }

  openCreateAppliedMethodModal(method: any){
    this.selectedMethodObject = this.allMethods.find(elem=> elem.id == method);
    this.isCreateAppliedMethodModalOpen = true;
  }

  closeCreateAppliedMethodModal(){
    this.isCreateAppliedMethodModalOpen = false;
    this.appliedMethodForm.reset({ type: 'Aggregated' });
  }

  deleteAppliedMethod(appMethod: any){
    if (appMethod) {
      const userConfirmed = confirm(
        "¿Está seguro que desea eliminar esta metodo aplicado del DQ Model?"
      );
    
      if (userConfirmed) {
        console.log(`Eliminando la metodo aplicado con ID: ${appMethod.id}`);
        let dqMethod = this.allMethods.find(elem => elem.id == appMethod.associatedTo);
        let isAggr = dqMethod.applied_methods.aggregations.find((item: any) => item === appMethod);
        if (isAggr){
          this.modelService.deleteAggregatedMethod(appMethod.id).subscribe(
            response => {
              alert(response?.message || "Metodo Aplicado eliminado correctamente");
              // Filtrar la dimensión eliminada sin recargar toda la lista
                dqMethod.definedMethods = dqMethod.applied_methods.aggregations.filter(
                  (item:any) => item.id !== appMethod.id
                );
              //this.loadDQModelDimensionsAndFactors();
            },
            error => {
              alert("Error al eliminar el metodo aplicado.");
              console.error("Error al eliminar el metodo aplicado:", error);
            }
          );
        } else {
          this.modelService.deleteMeasurementdMethod(appMethod.id).subscribe(
            response => {
              alert(response?.message || "Metodo Aplicado eliminado correctamente");
              // Filtrar la dimensión eliminada sin recargar toda la lista
              dqMethod.definedMethods = dqMethod.applied_methods.measurements.filter(
                (item:any) => item.id !== appMethod.id
              );
              //this.loadDQModelDimensionsAndFactors();
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

  createAppliedMethod(){
    if (this.appliedMethodForm.valid) {
      const appliedMethod = this.appliedMethodForm.value;
      console.log('Applied Method Created:', appliedMethod);
      const newAppMeth = {
        name: this.appliedMethodForm.get("name")?.value,
        appliedTo: this.appliedMethodForm.get("appliedTo")?.value,
        associatedTo: this.selectedMethodObject.id
      }
      if( this.appliedMethodForm.get("type")?.value === "Aggregated"){
        this.modelService.createAggregatedMethod(newAppMeth).subscribe({
          next: (data) => {
            console.log("Applied Method created:", data);
            this.loadDQModelDimensionsAndFactors(); 
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
            this.loadDQModelDimensionsAndFactors(); 
            alert("Applied Method successfully created");
          },
          error: (err) => {
            console.error("Error creating the Applied Method:", err);
            alert("Error creating the Applied Method.");
          }
        });
      }
      
      this.closeCreateAppliedMethodModal();
    }

  }

  deleteMethod(metric: any, method: any): void {
    const index = metric.definedMethods.indexOf(method);
    if (index > -1) {
      const userConfirmed = confirm(
        "¿Está seguro que desea eliminar esta metrica del DQ Model? Esto también eliminará los metodos asociados."
      );
    
      if (userConfirmed) {
        console.log(`Eliminando la dimensión con ID: ${method.id}`);
        this.modelService.deletMethodFromDQModel(method.id).subscribe(
          response => {
            alert(response?.message || "Metrica y metodos asociados eliminados exitosamente.");
            // Filtrar la dimensión eliminada sin recargar toda la lista
            metric.definedMethods = metric.definedMethods.filter(
              (item:any) => item.id !== method.id
            );
            //this.loadDQModelDimensionsAndFactors();
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

  buildContextComponents(selectedComponents: { id: number; category: string; value: string }[]): any {
    const contextComponents = {
      applicationDomain: selectedComponents
        .filter((comp) => comp.category === "applicationDomain")
        .map((comp) => comp.id),
      businessRule: selectedComponents
        .filter((comp) => comp.category === "businessRule")
        .map((comp) => comp.id),
      dataFiltering: selectedComponents
        .filter((comp) => comp.category === "dataFiltering")
        .map((comp) => comp.id),
      dqMetadata: selectedComponents
        .filter((comp) => comp.category === "dqMetadata")
        .map((comp) => comp.id),
      dqRequirement: selectedComponents
        .filter((comp) => comp.category === "dqRequirement")
        .map((comp) => comp.id),
      otherData: selectedComponents
        .filter((comp) => comp.category === "otherData")
        .map((comp) => comp.id),
      otherMetadata: selectedComponents
        .filter((comp) => comp.category === "otherMetadata")
        .map((comp) => comp.id),
      systemRequirement: selectedComponents
        .filter((comp) => comp.category === "systemRequirement")
        .map((comp) => comp.id),
      taskAtHand: selectedComponents
        .filter((comp) => comp.category === "taskAtHand")
        .map((comp) => comp.id),
      userType: selectedComponents
        .filter((comp) => comp.category === "userType")
        .map((comp) => comp.id),
    };
  
    return contextComponents;
  }

  // Función para agregar el método al DQ Model
  addMethodToDQModel(metric: any, method: any) {
    if (!metric || !method) {
      alert("Please select a metric and a method.");
      return;
    }

    const context_components = this.buildContextComponents(this.selectionCheckboxCtxComponents);
    console.log(context_components)
  
    // Preparar los datos para el servicio
    const methodData = {
      dq_model: metric.dq_model,
      method_base: method.id, // ID del método base
      dimension: metric.dimensionId, // ID de la dimensión (ajusta según tu estructura)
      factorId: metric.factorId, // ID del factor (ajusta según tu estructura)
      metric: metric.id, // ID de la métrica
      context_components: context_components,
    };
  
    // Llamada al servicio para agregar el método al DQ Model
    this.modelService.addMethodsToDQModel(methodData).subscribe({
      next: (response) => {
        console.log("Method added to DQ Model:", response);
        alert("Method successfully added to DQ Model.");
        this.loadDQModelDimensionsAndFactors(); 
      },
      error: (err) => {
        console.error("Error adding method to DQ Model:", err);
        alert("An error occurred while adding the method to DQ Model.");
      }
    });
  }

  addMethod(metric: QualityMetric){
    //this.openModal();
    if (this.newMethod.name) {
      var newMetric = this.currentMetric!;
      let dqMetric = this.allMetrics.find(item => item.id == newMetric.id)
      let dqFactor = this.factorsByDim.find(item => item.id == dqMetric.factor);
      //metric.definedMethods.push({ ...metric.newMethod });
      const methodToAdd = {
        dq_model: parseInt(dqMetric.dq_model),
        method_base: parseInt(this.newMethod.name),
        metric: parseInt(dqMetric.id),
        dimension: parseInt(dqFactor.baseAttributes.dimension),
        factorId: parseInt(dqMetric.factor)

      };
      this.newMethod = { name: '', input: '', output: '', algorithm: '', expanded:false };
      this.modelService.addMethodsToDQModel(methodToAdd).subscribe({
        next: (data) => {
          console.log("Metric added:", data);
          this.loadDQModelDimensionsAndFactors(); 
          alert("Metric successfully added to DQ Model.");
        },
        error: (err) => {
          console.error("Error adding the metric:", err);
          alert("An error occurred while trying to add the metric.");
        }
      });
      this.closeModal();
    }
    else {
      alert("Missing fields. Please complete all.")
    }
  }


  // addBaseMethod(factor: any): void {
  //   if (this.newMethod.name && this.newMethod.output &&this.newMethod.input && this.newMethod.algorithm){
  //     var newMetric = this.currentMetric!;
  //     let dqMetric = this.allMetrics.find(item => item.id == newMetric.id)
  //     //newFactor.definedMetrics.push({ ...this.newMetric });
  //     const methodBaseToAdd = {
  //       implements: parseInt(dqMetric.baseAttr.id),
  //       name: this.newMethod.name,
  //       inputDataType: this.newMethod.input,
  //       outputDataType: this.newMethod.output,
  //       algorithm: this.newMethod.algorithm
  //     };
  //     this.newMethod = {
  //       name: '', input: '', output: '', algorithm: '', expanded: false,  metric: undefined}
  //     this.modelService.createDQMethod(methodBaseToAdd).subscribe({
  //       next: (data) => {
  //         console.log("Base Metric created:", data);
  //         this.loadDQModelDimensionsAndFactors(); 
  //         alert("Base Metric successfully created.");
  //       },
  //       error: (err) => {
  //         console.error("Error creating the metric:", err);
  //         alert("An error occurred while trying to create the metric.");
  //       }
  //     });
  //     this.closeModalBase();
  //   }
  //   else {
  //     alert("Missing fields. Please complete all.")
  //   }
  // }

  addBaseMethod(factor: any) : void {
    if (this.dqMethodForm.valid) {
      var methodData = this.dqMethodForm.value;
      methodData.implements = this.currentMetric.metric_base;
      
      this.modelService.createDQMethodBase(methodData).subscribe({
        next: (data) => {
          console.log('Nuevo DQ Method Base creado:', data);
          
          this.loadDQModelDimensionsAndFactors(); 
          alert('The DQ Method was successfully created. You can now select it to add it to the DQ Model.');
          this.dqMethodForm.reset();
          this.closeModalBase();
        },
        error: (error) => {
          console.error('Error al crear el DQ Method Base:', error);
          alert('Error al crear el DQ Method Base. Intenta nuevamente.');
        }
      });
    } else {
      alert('Por favor, completa todos los campos requeridos.');
    }
  }

  generateNewSuggestion() {

    // Activar el spinner
    this.isLoading = true;  
    this.generateSuggestion();

  }
  // DQ METHOD SUGGESTION METHODS
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

        // Asegurarse de que el formulario esté inicializado
        if (this.dqMethodForm) {
          // Actualizar el formulario con los valores de la sugerencia
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

        // Desactivar el spinner cuando la solicitud finalice (éxito o error)
        this.isLoading = false;
        // Mostrar los valores en un confirm para verificar
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
        // Desactivar el spinner cuando la solicitud finalice (éxito o error)
        this.isLoading = false;
        console.error('Error al generar la sugerencia:', err);
        this.error = 'Error al generar la sugerencia. Por favor intente nuevamente.';
        this.suggestion = null;
        
      }
    });
  }

  closeModalBase() {
    this.isModalBaseOpen = false;
  }
  
  saveMetrics(){
    this.router.navigate(['/st4/confirmation-stage-4']);
  }

  // Navegación
  onStepChange(step: number) {
    this.currentStep = step;
    this.navigateToStep(step);
  }
  
  navigateToStep(stepIndex: number) {
    const route = this.steps[stepIndex].route;
    this.router.navigate([route]);
  }

}
