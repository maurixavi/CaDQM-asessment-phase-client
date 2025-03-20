import { Component, OnInit } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

import { DqModelService } from '../../services/dq-model.service';
import { ProjectService } from '../../services/project.service';
import { ProjectDataService } from '../../services/project-data.service';

import { Router } from '@angular/router';

declare var bootstrap: any; 

export interface DataQualityProblem {
  id: number;
  name: string;
  description: string;
  contextcomp_related_to: string[];
  priority: number;
  priorityType: string;
  selectedFactors?: number[];
}

interface ContextComponent {
  id: string;
  type: string;
  description: string;
}

interface QualityDimension {
  id: number;
  name: string;
}

interface QualityFactor {
  id: number;
  dimensionId: number;
  dq_model: string;
  name: string;
  newMetric: QualityMetric;
  expanded: boolean;
  definedMetrics: QualityMetric[];
}

interface QualityMetric {
  name: string;
  purpose: string;
  granularity: string;
  domain: string;
  expanded: boolean;
  factor?: QualityFactor;
}

@Component({
  selector: 'app-dqproblems-priorization',
  templateUrl: './dqmeasurement-metric-definition.component.html',
  styleUrl: './dqmeasurement-metric-definition.component.scss'
})
export class DQMetricDefinitionComponent implements OnInit {
  currentStep: number = 3; //Step 4
  pageStepTitle: string = 'Definition of DQ metrics';
  phaseTitle: string = 'Phase 2: DQ Assessment';
  stageTitle: string = 'Stage 4: DQ Model Definition';

  steps = [
    { displayName: 'A09.1', route: 'st4/a09-1' },
    { displayName: 'A09.2', route: 'st4/a09-2' },
    { displayName: 'A10', route: 'st4/a10' },
    { displayName: 'A11', route: 'st4/a11' },
    { displayName: 'A12', route: 'st4/a12' },
    { displayName: 'DQ Model Confirmation', route: 'st4/confirmation-stage-4' }
  ];

  problems: DataQualityProblem[] = [];
  //contextComponents: ContextComponent[] = [];
  selectedProblem: DataQualityProblem | null = null;
  detailsVisible: boolean = false;
  isOrderConfirmed: boolean = false;
  


  isModalBaseOpen: boolean = false;


  constructor(private router: Router, 
    private modelService: DqModelService,
    private projectService: ProjectService,
    private projectDataService: ProjectDataService
  ) { }

  /*constructor(private router: Router) { }
  constructor(private dqProblemsService: DqProblemsService) { }*/

 

  //dqModelId: number = 1;
  currentDQModel:any;
  noModelMessage: string = "";  
  noDimensionsMessage: string = "";
  dqmodel_dimensions: any[] = [];
  dimensionsWithFactorsInDQModel: any[] = [];
  errorMessage: string | null = null;
  factorsByDim: any[] = [];
  
  dqFactorsBase: any[] = [];




  //metricFactor:QualityFactor | undefined = undefined ;

 newBaseMetric = {
  name: '',
  purpose:'',
  granularity:'',
  domain: ''
 }

  granularities: string[] = ['Celda', 'Tupla', 'Tabla'];
  domains: string[] = ['Entero', 'Real', 'Booleano'];
  newMetric: QualityMetric = {
    name: '', purpose: '', granularity: '', domain: '',factor: undefined, expanded: false };
  definedMetrics: QualityMetric[] = [];


  selectedFactor: any = null; 
  onFactorSelected_(): void {
    console.log("Selected Factor:", this.selectedFactor);
  }
  

  dqDimension_facetOf: string = '';

  // Método para cargar los detalles de la dimensión
  fetchDQDimensionDetails(dimensionId: number): void {
    if (this.dqModelId && dimensionId) {
      this.modelService.getDQDimensionDetails(this.dqModelId, dimensionId).subscribe({
        next: (data) => {
          this.dqDimension_facetOf = data.dimension_name; 
        },
        error: (err) => {
          console.error('Error al cargar los detalles de la dimensión:', err);
        },
      });
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

  onFactorSelected(): void {
    if (this.selectedFactor) {
      console.log("Selected Factor:", this.selectedFactor);
      // Limpiar la selección actual
      this.selectionCheckboxCtxComponents = [];

      //Obtener Dimension del factor
      this.fetchDQDimensionDetails(this.selectedFactor.dimension);
  
      // Cargar los componentes de contexto asociados al factor seleccionado
      const contextComponents = this.selectedFactor.context_components;
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


  selectedMetric: any = null; 
  onMetricSelected(): void {
    console.log("Selected Metric:", JSON.stringify(this.selectedMetric, null, 2));
  }


  selectedBaseMetric: any = null; // Métrica base seleccionada
  // Método llamado cuando se selecciona una métrica base
  onBaseMetricSelected(): void {
    console.log("Selected Base Metric:", this.selectedBaseMetric);
  }

  project_: any;
  allDQProblems_: any[] = [];
  allContextComponents_: any;


  // Variables de datos
  project: any;
  projectId: number | null = null;
  noProjectMessage: string = "";
  dqModelId: number = -1;
  dqModelVersionId: number | null = null;
  dqModel: any = null;

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
      if (this.projectId !== null) {
        this.loadSelectedPrioritizedDQProblems(this.projectId);
        this.getCurrentDQModel(this.projectId);
      }
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
  }

  //projectId: number | null = null;
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
          //this.getSelectedPrioritizedDqProblems(this.project.dqmodel_version);
        }

        if (this.projectId){
          this.loadDQProblems(this.projectId);
          this.loadSelectedPrioritizedDQProblems(this.projectId);
        }

        //Load complete DQ Model (with Dimensions,Factors...) of current project
        this.loadCompleteCurrentDQModel();
      },
      error: (err) => {
        console.error('Error al cargar el proyecto en el componente:', err);
      }
    });
  }

  // DQ PROBLEMS
  // Obtener todos los problemas de calidad del proyecto
  allDQProblems: any[] = [];
  dqProblemDetails: any = null; 

  loadDQProblems(projectId: number): void {
    this.projectService.getDQProblemsByProjectId(projectId).subscribe({
      next: (data) => {
        this.allDQProblems = data;
        console.log('Problemas de calidad:', data);

        this.loadSelectedPrioritizedDQProblems(projectId);
      },
      error: (err) => {
        console.error('Error al obtener los problemas de calidad:', err);
      },
    });
  }

  selectedPrioritizedProblems: any[] = []; //fetched

  // Método para cargar los problemas priorizados y los detalles del DQ Problem
  loadSelectedPrioritizedDQProblems(projectId: number): void {
    this.projectService.getSelectedPrioritizedDQProblemsByProjectId(projectId).subscribe({
      next: (data) => {
        this.selectedPrioritizedProblems = data;

        // Obtener los detalles adicionales (description y date) para cada problema
        this.selectedPrioritizedProblems.forEach((problem) => this.getDQProblemDetails(problem.dq_problem_id, problem));

        console.log('Problemas priorizados Seleccionados:', 
          this.selectedPrioritizedProblems,
        );

      },
      error: (err) => {
        console.error('Error al obtener los problemas priorizados:', err);
      },
    });
  }

  getDQProblemDetails(dqProblemId: number, problem: any): void {
    const dqProblem = this.allDQProblems.find((p) => p.id === dqProblemId);
    if (dqProblem) {
      // Actualizar los detalles del problema
      problem.description = dqProblem.description;
      problem.date = dqProblem.date;
    } else {
      console.error('Problema no encontrado:', dqProblemId);
      problem.description = 'Descripción no disponible'; // Valor por defecto
      problem.date = new Date(); // Fecha actual como valor por defecto
    }
  }

  getDQProblemsDetails(dqProblemIds: number[]): any[] {
    return this.selectedPrioritizedProblems.filter(problem => dqProblemIds.includes(problem.id));
  }

  // Función para obtener los detalles de los problemas asociados al factor seleccionado
  getDQProblemsDetails_2(dqProblemIds: number[]): any[] {
    const problemsDetails: any[] = [];

    dqProblemIds.forEach((problemId) => {
      // Buscar el problema priorizado por su ID
      const prioritizedProblem = this.selectedPrioritizedProblems.find(
        (problem) => problem.id === problemId
      );

      if (prioritizedProblem) {
        // Usar el dq_problem_id para buscar el problema en allDQProblems
        const dqProblem = this.allDQProblems.find(
          (problem) => problem.id === prioritizedProblem.dq_problem_id
        );

        if (dqProblem) {
          problemsDetails.push({
            description: dqProblem.description,
            date: dqProblem.date,
          });
        }
      }
    });

    return problemsDetails;
  }

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



  //-----------------------------


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


 
  getBaseMetricsByFactor(){
    this.factorsByDim.forEach(async item => {
      const baseMetricForFact = await this.modelService.getMetricsBaseByDimensionAndFactorId(item.dimension, item.factor_base).toPromise();
      item.baseMetrics = baseMetricForFact;
      const dqMetricForFact = await this.modelService.getMetricsByDQModelDimensionAndFactor(item.dq_model, item.dimension, item.id).toPromise();
      item.definedMetrics = dqMetricForFact;
      item.definedMetrics.forEach((dqMet:any) => {
        let baseAttr = item.baseMetrics.find((elem:any) => elem.id == dqMet.metric_base);
        dqMet.baseAttr = baseAttr;
      });
    });
  }

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.problems, event.previousIndex, event.currentIndex);
    this.updatePriority();
  }

  updatePriority() {
    this.problems.forEach((problem, index) => {
      problem.priority = index + 1;
    });
  }


  addMetricToModel(factor: any, metric: any): void {
    if (!factor || !metric) {
      alert("Please select a factor and a metric.");
      return;
    }

    const context_components = this.buildContextComponents(this.selectionCheckboxCtxComponents);
    console.log(context_components)
  
    const metricToAdd = {
      dq_model: factor.dq_model,
      metric_base: metric.id,
      factor: factor.id,
      context_components: context_components,
    };
  
    this.modelService.addMetricToDQModel(metricToAdd).subscribe({
      next: (data) => {
        console.log("Metric added to DQ Model:", data);
        alert("Metric successfully added to DQ Model.");
        this.loadDQModelDimensionsAndFactors(); 
  
        // Actualizar la lista de métricas definidas en el factor
        if (!factor.definedMetrics) {
          factor.definedMetrics = [];
        }
        factor.definedMetrics.push(data); // Asumiendo que el backend devuelve la métrica agregada
  
        // Limpiar la selección
        this.selectedBaseMetric = null;
      },
      error: (err) => {
        console.error("Error adding the metric to DQ Model:", err);
        alert("An error occurred while trying to add the metric to DQ Model.");
      }
    });
  }



  addMetric(factor: QualityFactor): void {
    if (this.newMetric.name) {
      var newFactor = this.metricFactor!;
      let dqFactor = this.factorsByDim.find(item => item.id == newFactor.id)
      //newFactor.definedMetrics.push({ ...this.newMetric });
      const metricToAdd = {
        dq_model: parseInt(dqFactor.dq_model),
        metric_base: parseInt(this.newMetric.name),
        factor: parseInt(dqFactor.id)
      };
      
      this.newMetric = { name: '', purpose: '', granularity: '', domain: '', expanded: false };
      this.modelService.addMetricToDQModel(metricToAdd).subscribe({
        next: (data) => {
          console.log("DQ Metric added:", data);
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

  deleteMetric(factor: any, metric: any): void {
    const index = factor.definedMetrics.indexOf(metric);
    if (index > -1) {
      const userConfirmed = confirm(
        "¿Está seguro que desea eliminar esta metrica del DQ Model? Esto también eliminará los metodos asociados."
      );
    
      if (userConfirmed) {
        console.log(`Eliminando la dimensión con ID: ${metric.Id}`);
        this.modelService.deletMetricFromDQModel(metric.id).subscribe(
          response => {
            alert(response?.message || "Metrica y metodos asociados eliminados exitosamente.");
            // Filtrar la dimensión eliminada sin recargar toda la lista
            factor.definedMetrics = factor.definedMetrics.filter(
              (item:any) => item.id !== metric.id
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

  addBaseMetric(factor: any): void {
    if (this.newBaseMetric.name && this.newBaseMetric.purpose &&this.newBaseMetric.granularity && this.newBaseMetric.domain){
      var newFactor = this.metricFactor!;
      let dqFactor = this.factorsByDim.find(item => item.id == newFactor.id)
      //newFactor.definedMetrics.push({ ...this.newMetric });
      const baseMetricToAdd = {
        name: this.newBaseMetric.name, 
        purpose: this.newBaseMetric.purpose,
        granularity: this.newBaseMetric.granularity,
        resultDomain:  this.newBaseMetric.domain,
        measures: dqFactor.factor_base
      };
      
      this.newBaseMetric = { name: '', purpose: '', granularity: '', domain: ''};
      this.modelService.createDQMetric(baseMetricToAdd).subscribe({
        next: (data) => {
          console.log("Base Metric created:", data);
          this.loadDQModelDimensionsAndFactors(); 
          alert('The DQ Metric was successfully created. You can now select it to add it to the DQ Model.');
        },
        error: (err) => {
          console.error("Error creating the metric:", err);
          alert("An error occurred while trying to create the metric.");
        }
      });
      this.closeModalBase();
    }
    else {
      alert("Missing fields. Please complete all.")
    }
  }



  saveMetrics(){
    var result: QualityMetric[] = [];
    // this.qualityFactors.forEach(elem => {
    //   result = result.concat(elem.definedMetrics);
    // });
    this.router.navigate(['/st4/a12']);
    
  }
  

  metricFactor: any = null;

  isModalOpen = false;

  openModal(factor:any) {
    this.metricFactor = factor;
    this.isModalOpen = true;
  }

  openModalBase(factor:any) {
    console.log("CLICKED")
    this.metricFactor = factor;
    this.isModalBaseOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  closeModalBase() {
    this.isModalBaseOpen = false;
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
