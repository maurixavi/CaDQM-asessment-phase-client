import { Component, OnInit } from '@angular/core';

import { DqModelService } from '../../../services/dq-model.service';
import { ProjectService } from '../../../services/project.service';
import { ProjectDataService } from '../../../services/project-data.service';

import { Router } from '@angular/router';

import { combineLatest } from 'rxjs';
import { filter } from 'rxjs/operators';

import { buildContextComponents, formatCtxCompCategoryName, getFirstNonIdAttribute } from '../../../shared/utils/utils';

declare var bootstrap: any; 


@Component({
  selector: 'app-dq-metrics-definition',
  templateUrl: './dq-metrics-definition.component.html',
  styleUrl: './dq-metrics-definition.component.css'
})
export class DQMetricsDefinitionComponent implements OnInit {
  currentStep: number = 3; //Step 4
  pageStepTitle: string = 'Definition of DQ metrics';
  phaseTitle: string = 'Phase 2: DQ Assessment';
  stageTitle: string = 'Stage 4: DQ Model Definition';

  isNextStepEnabled: boolean = true;

  steps: { displayName: string, route: string, description: string }[] = [
    { displayName: 'A09.1', route: 'phase2/st4/dq-problems-priorization', description: 'Prioritization of DQ Problems' },
    { displayName: 'A09.2', route: 'phase2/st4/dq-problems-selection', description: 'Selection of DQ Problems' },
    { displayName: 'A10', route: 'phase2/st4/dq-dimensions-factors', description: 'Selection of DQ Dimensions and Factors' },
    { displayName: 'A11', route: 'phase2/st4/dq-metrics', description: 'Definition of DQ Metrics' },
    { displayName: 'A12', route: 'phase2/st4/dq-methods', description: 'Implementation of DQ Methods' },
    { displayName: 'DQ Model Confirmation', route: 'st4/dq-model', description: 'DQ Model Confirmation' }
  ];


 

 
  isModalBaseOpen: boolean = false;

  //Utils.py
  public formatCtxCompCategoryName = formatCtxCompCategoryName;
  public getFirstNonIdAttribute = getFirstNonIdAttribute

  constructor(private router: Router, 
    private modelService: DqModelService,
    private projectService: ProjectService,
    private projectDataService: ProjectDataService
  ) { }


  currentDQModel:any;
  noModelMessage: string = "";  
  noDimensionsMessage: string = "";
  dqmodel_dimensions: any[] = [];
  dimensionsWithFactorsInDQModel: any[] = [];
  errorMessage: string | null = null;
  factorsByDim: any[] = [];
  
  dqFactorsBase: any[] = [];


  newBaseMetric = {
    name: '',
    purpose:'',
    granularity:'',
    domain: '',
    customResultDomain: '' // Para especificar un tipo personalizado si se elige "Otro"
  }



  selectedFactor: any = null; 


  dqDimension_facetOf: string = '';

  // Método para cargar los detalles de la dimensión
  getDQDimensionDetails(dimensionId: number): void {
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


 
  // Variables de datos
  project: any;
  projectId: number | null = null;
  noProjectMessage: string = "";
  dqModelId: number = -1;
  dqModelVersionId: number | null = null;
  dqModel: any = null;

  dataSchema: any = null;

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

  dataAtHandDetails: any = null;
  contextVersion: any = null;

  // Métodos de suscripción a datos
  subscribeToData(): void {
    // Suscribirse al proyecto
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
      this.loadDQModelDimensionsForSelection();

      // Una vez que los problemas están cargados, cargar los problemas priorizados
      if (this.projectId !== null) {
        this.loadSelectedPrioritizedDQProblems(this.projectId);
        //this.getCurrentDQModel(this.projectId);
      }
    });


    // Suscribirse al esquema de datos
    this.projectDataService.dataSchema$.subscribe((data) => {
      this.dataSchema = data;
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

  //-----------------------
  onFactorSelected(): void {
    if (this.selectedFactor) {
      console.log("Selected Factor:", this.selectedFactor);
      // Limpiar la selección actual
      this.selectionCheckboxCtxComponents = [];

      //Obtener Dimension del factor
      //this.getDQDimensionDetails(this.selectedFactor.dimension);
  
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
            //console.log("selectionCheckboxCtxComponents:", this.selectionCheckboxCtxComponents)
          }
        });
      });

      
    }
  }


  selectedFactorDetails: any | null = null;

 

  //----------------

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
    return this.allDQProblems.filter(problem => dqProblemIds.includes(problem.id));
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

 
  getComponentsByCategory(components: any[], category: string): any[] {
    return components.filter((component) => component.category === category);
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

  
  
  

  //seleccion de componentes de contexto en agregado de metrica
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

 


  addMetricToModel(factor: any, metric: any): void {
    if (!factor || !metric) {
      alert("Please select a factor and a metric.");
      return;
    }

    const context_components = buildContextComponents(this.selectionCheckboxCtxComponents);
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
        this.selectedFactor = null;
        this.selectedBaseMetric = null;
      },
      error: (err) => {
        console.error("Error adding the metric to DQ Model:", err);
        alert("An error occurred while trying to add the metric to DQ Model.");
      }
    });
  }



  removeMetricFromDQModel(factor: any, metric: any): void {
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


  createMetricBase(factor: any): void {
    // Comprobamos que los campos requeridos no estén vacíos
    if (
      this.newBaseMetric.name && 
      this.newBaseMetric.purpose && 
      this.newBaseMetric.granularity && 
      (this.newBaseMetric.domain !== 'Other' || this.newBaseMetric.customResultDomain)
    ) {
      // Si el resultDomain es 'Other', usamos el valor del campo customResultDomain
      let resultDomainValue = this.newBaseMetric.domain;
      if (resultDomainValue === 'Other' && this.newBaseMetric.customResultDomain) {
        resultDomainValue = this.newBaseMetric.customResultDomain;
      }
  
      var newFactor = this.metricFactor!;
      let dqFactor = this.factorsByDim.find(item => item.id == newFactor.id);
  
      // Construimos el objeto baseMetricToAdd con los valores obtenidos
      const baseMetricToAdd = {
        name: this.newBaseMetric.name, 
        purpose: this.newBaseMetric.purpose,
        granularity: this.newBaseMetric.granularity,
        resultDomain: resultDomainValue,
        measures: dqFactor.factor_base
      };
  
      // Limpiamos los campos del formulario
      this.newBaseMetric = { 
        name: '', 
        purpose: '', 
        granularity: '', 
        domain: '', 
        customResultDomain: '' 
      };
  
      // Llamamos al servicio para crear la métrica
      this.modelService.createDQMetric(baseMetricToAdd).subscribe({
        next: (data) => {
          console.log("Base Metric created:", data);
          
          // 1. Actualizar las métricas base del factor seleccionado
          const factorIndex = this.factorsByDim.findIndex(item => item.id === newFactor.id);
          if (factorIndex !== -1) {
            if (!this.factorsByDim[factorIndex].baseMetrics) {
              this.factorsByDim[factorIndex].baseMetrics = [];
            }
            this.factorsByDim[factorIndex].baseMetrics.push(data);
            
            // 2. Mantener el factor seleccionado
            this.selectedFactor = this.factorsByDim[factorIndex];
            
            // 3. Seleccionar automáticamente la métrica recién creada
            this.selectedBaseMetric = data;
          }
          
          // Mostrar mensaje de éxito
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
      alert("Missing fields. Please complete all.");
    }
  }


  //Delete Metric base (disabled from DQ Metrics selection)
  deleteMetricBase(metricId: number): void {
    if (metricId) {
      console.log(`Metric seleccionada para eliminar: ${this.selectedBaseMetric}`);
      this.modelService.updateDQMetricBaseDisabledStatus(metricId, true).subscribe({
        next: (response) => {
          //this.notificationService.showSuccess('DQ Dimension was successfully deleted.');
          alert('DQ Metric was successfully deleted.')
          //this.getDQDimensionsBase(); // Recargar lista de dimensiones activas
          this.selectedBaseMetric = null;

        },
        error: (err) => {
          //this.notificationService.showError('Failed to delete DQ Dimension.');
        }
      });
    }
  }



 

  metricFactor: any = null;

  isModalOpen = false;

  openModal(factor:any) {
    this.metricFactor = factor;
    this.isModalOpen = true;
  }

  openCreateMetricModal(factor:any) {
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
  

  //Select DQ Dimension (in DQ Model)
  onDQModelDimensionChange(): void {

    if (this.selectedDQModelDimension) {
      this.loadFactorsForSelectedDimension(this.selectedDQModelDimension);
    }
    
    this.selectedFactor = null;
    this.selectedBaseMetric = null;
  }


  availableFactors: any[] = []; //Factors base given Dimension selected


  loadFactorsForSelectedDimension(selectedDQModelDimensionId: number): void {
    // Limpiar factores previos
    this.availableFactors = [];
    this.selectedFactor = null;
  
    // Encontrar la dimensión seleccionada en las disponibles
    const selectedDimension = this.availableDQModelDimensions.find(
      dim => dim.id === selectedDQModelDimensionId
    );
  
    if (!selectedDimension) {
      console.warn('No se encontró la dimensión seleccionada');
      return;
    }
  
    // Obtener los factores del DQ Model para esta dimensión, y las metricas de cada factor
    this.modelService.getFactorsByDQModelAndDimension(this.dqModelId, selectedDimension.id).subscribe({
      next: (factors) => {
        // Para cada factor, obtener sus atributos base y métricas base
        Promise.all(factors.map(async (factor) => {
          const factorBaseAttributes = await this.modelService.getFactorBaseById(factor.factor_base).toPromise();
          //const baseMetrics = await this.modelService.getMetricsBaseByDimensionAndFactorId(selectedDimension.dimension_base, factor.factor_base).toPromise();

          //Filtrar las metricas base eliminadas (borrado logico)
          const rawBaseMetrics = await this.modelService.getMetricsBaseByDimensionAndFactorId(selectedDimension.dimension_base, factor.factor_base).toPromise();
          const baseMetrics = rawBaseMetrics?.filter(metric => !metric.is_disabled);

          const definedMetrics = await this.modelService.getMetricsByDQModelDimensionAndFactor(factor.dq_model, factor.dimension, factor.id).toPromise();
          
          return { 
            ...factor, 
            baseAttributes: factorBaseAttributes,
            baseMetrics: baseMetrics,
            definedMetrics: definedMetrics 
          };
        })).then(completeFactors => {
          this.availableFactors = completeFactors;
          console.log('Factores completos cargados:', completeFactors);
        });
      },
      error: (err) => {
        console.error('Error cargando factores del DQ Model:', err);
        this.availableFactors = [];
      }
    });
  }


  /* DQ METRIC EDITING */

  //Habilitar edicion DQ Metric (ctx components)
  enableDQMetricEdition(metric: any): void {
    console.log("enableDQMetricEdition", metric)
    metric.isEditing = !metric.isEditing;
  
    // Inicializar tempContextComponents si no está definido
    if (!metric.tempContextComponents) {
      metric.tempContextComponents = JSON.parse(JSON.stringify(metric.context_components || {}));
    }
  }

  //Presetar ctx components ya existentes en DQ Metric para edicion
  isCtxComponentSelected_editing(category: string, componentId: number, tempContextComponents: any): boolean {
    return tempContextComponents[category] && tempContextComponents[category].includes(componentId);
  }

  //Chequear si categoria Ctx component tiene elementos
  categoryHasCtxComponents_editing(category: string, tempContextComponents: any): boolean {
    return tempContextComponents[category] && tempContextComponents[category].length > 0;
  }

   //Update DQ Metric- Ctx components selection
   onCtxComponentsCheckboxChange_metricEditing(componentId: number, category: string, metric: any): void {
    if (!metric.tempContextComponents[category]) {
      metric.tempContextComponents[category] = [];
    }
  
    const index = metric.tempContextComponents[category].indexOf(componentId);
    if (index === -1) {
      metric.tempContextComponents[category].push(componentId);
    } else {
      // Eliminar el componente si ya está seleccionado
      metric.tempContextComponents[category].splice(index, 1);
    }
  }

  //Update Metric ctx components
  saveMetricContextComponents(metric: any): void {
    const updatedMetric = {
      context_components: metric.tempContextComponents,
    };

    console.log("updatedMetric", updatedMetric);

    metric.context_components = JSON.parse(JSON.stringify(metric.tempContextComponents));
        metric.isEditing = false;

        console.log("Metrics actualizacion ctx components.", metric.context_components);

    this.modelService.updateDQMetricCtx(metric.id, updatedMetric).subscribe({
      next: () => {
        //this.notificationService.showSuccess(`DQ Factor was successfully updated.`);
        alert(`DQ Factor was successfully updated.`);
        //this.loadDQModelDimensionsAndFactors();

        //Actualizar componentes en vista
        metric.context_components = JSON.parse(JSON.stringify(metric.tempContextComponents));
        metric.isEditing = false;

        console.log("Metrics actualizacion ctx components.", metric.context_components);
      },
      error: (err) => {
        console.error("Error al actualizar el factor:", err);
        alert("Error updating factor context components and problems.");
      },
    });
  }

}
