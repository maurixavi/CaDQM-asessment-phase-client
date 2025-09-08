import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { combineLatest } from 'rxjs';
import { filter } from 'rxjs/operators';

import { DqModelService } from '../../../services/dq-model.service';
import { ProjectService } from '../../../services/project.service';
import { ProjectDataService } from '../../../services/project-data.service';
import { NotificationService } from '../../../services/notification.service';

import { contextComponentCategories, buildContextComponents, formatCtxCompCategoryName, getFirstNonIdAttribute, getCategoryAbbreviation } from '../../../shared/utils/utils';

declare var bootstrap: any; 

@Component({
  selector: 'app-dq-metrics-definition',
  templateUrl: './dq-metrics-definition.component.html',
  styleUrl: './dq-metrics-definition.component.css'
})
export class DQMetricsDefinitionComponent implements OnInit {

  steps: { displayName: string, route: string, description: string }[] = [
    { displayName: 'A09.1', route: 'phase2/st4/dq-problems-priorization', description: 'Prioritization of DQ Problems' },
    { displayName: 'A09.2', route: 'phase2/st4/dq-problems-selection', description: 'Selection of DQ Problems' },
    { displayName: 'A10', route: 'phase2/st4/dq-dimensions-factors', description: 'Selection of DQ Dimensions and Factors' },
    { displayName: 'A11', route: 'phase2/st4/dq-metrics', description: 'Definition of DQ Metrics' },
    { displayName: 'A12', route: 'phase2/st4/dq-methods', description: 'Implementation of DQ Methods' },
    { displayName: 'DQ Model Confirmation', route: 'st4/dq-model', description: 'DQ Model Confirmation' }
  ];

  currentStep: number = 3; //Step 4
  pageStepTitle: string = 'Definition of DQ metrics';
  phaseTitle: string = 'Phase 2: DQ Assessment';
  stageTitle: string = 'Stage 4: DQ Model Definition';
  isNextStepEnabled: boolean = true;

 
  isModalBaseOpen: boolean = false;

  // ========== UTILIDADES ==========
  public formatCtxCompCategoryName = formatCtxCompCategoryName;
  public getFirstNonIdAttribute = getFirstNonIdAttribute;
  public getCategoryAbbreviation = getCategoryAbbreviation;
  categories = contextComponentCategories;

  // ========== PROPIEDADES DEL PROYECTO ==========
  project: any;
  projectId: number | null = null;
  noProjectMessage: string = "";
  dqModelId: number = -1;
  dqModelVersionId: number | null = null;
  dqModel: any = null;
  dataSchema: any = null;
  dataAtHandDetails: any = null;
  contextVersionId: number | null = null;
  contextVersion: any = null;
  allDQProblems: any[] = [];
  dqProblemDetails: any = null; 
  selectedPrioritizedProblems: any[] = [];
  allContextComponents: any;

  // ========== PROPIEDADES DQ MODEL ==========
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
  selectedFactorDetails: any | null = null;
  dqDimension_facetOf: string = '';
  selectedMetric: any = null; 
  selectedBaseMetric: any = null; 

  metricFactor: any = null;
  isModalOpen = false;

  // ========== COMPONENTES DE CONTEXTO ==========
  selectedCtxComponents: { id: number; category: string; value: string }[] = [];
  selectionCheckboxCtxComponents: { id: number; category: string; value: string }[] = [];

  constructor(private router: Router, 
    private modelService: DqModelService,
    private projectService: ProjectService,
    private projectDataService: ProjectDataService,
    private notificationService: NotificationService
  ) { }

  ngOnInit() {
    this.getDQFactorsBase();
    this.projectId = this.projectDataService.getProjectId();
    this.subscribeToData();
    this.syncCurrentStepWithRoute();
  }

  syncCurrentStepWithRoute() {
    const currentRoute = this.router.url; 
    const stepIndex = this.steps.findIndex(step => step.route === currentRoute);
    if (stepIndex !== -1) {
      this.currentStep = stepIndex;
    }
  }

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
      this.projectDataService.dqModelVersion$.pipe(filter(Boolean)) 
    ]).pipe(
      filter(([ctxComponents, dqProblems, dqModelVersionId]) => 
        ctxComponents && dqProblems.length > 0)
    ).subscribe(([ctxComponents, dqProblems, dqModelVersionId]) => {
      this.allContextComponents = ctxComponents;
      this.allDQProblems = dqProblems;
      this.dqModelVersionId = dqModelVersionId;

      // se ejecuta solo cuando: ContextComponents y DQ Problems estan disponibles
      this.loadCompleteCurrentDQModel();
      this.loadDQModelDimensionsForSelection();

      // Una vez que los problemas están cargados, cargar los problemas priorizados
      if (this.projectId !== null) {
        this.loadSelectedPrioritizedDQProblems(this.projectId);
        //this.getCurrentDQModel(this.projectId);
      }
    });

    this.projectDataService.dataSchema$.subscribe((data) => {
      this.dataSchema = data;
    });
  }


  // ========== CARGA DE DATOS DEL PROYECTO ==========

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

  // ========== GESTIÓN DE FACTORES ==========
  // Obtiene todos los factores base
  getDQFactorsBase() {
    this.modelService.getAllDQFactorsBase().subscribe({
      next: (data) => {
        this.dqFactorsBase = data;
        //console.log('*All FACTORS BASE loaded:', data);
      },
      error: (err) => console.error("Error loading Factors Base:", err)
    });
  }

  //Maneja la selección de un factor
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

  // ========== SELECCIÓN METRICAS ==========

  // 1. SELECCIONAR DIMENSION EN DQ MODEL

  availableDQModelDimensions: any[] = []; // Dimensiones en DQ Model
  selectedDQModelDimension: number | null = null; // Dimensión seleccionada del DQ Model

  // Cargar las dimensiones del DQ Model
  loadDQModelDimensionsForSelection(): void {
    console.log('Loading dimensions for DQ Model ID:', this.dqModelId);
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
  
  // Selecciona Dimension en DQ Model
  onDQModelDimensionChange(): void {
    if (this.selectedDQModelDimension) {
      this.loadFactorsForSelectedDimension(this.selectedDQModelDimension);
    }
    this.selectedFactor = null;
    this.selectedBaseMetric = null;
  }


  // 2. SELECCIONAR FACTOR EN DQ MODEL
  availableFactors: any[] = []; // Factores para Dimension seleccionada

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

  // 3. SELECCIONAR/CREAR METRICA BASE PARA AGREGAR
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

  onBaseMetricSelected(): void {
    console.log("Metrica base seleccionada", this.selectedBaseMetric);
  }

  createMetricBase(factor: any): void {
    // campos requeridos no estén vacíos
    if (
      this.newBaseMetric.name && 
      this.newBaseMetric.purpose && 
      this.newBaseMetric.granularity && 
      (this.newBaseMetric.domain !== 'Other' || this.newBaseMetric.customResultDomain)
    ) {
      // Si resultDomain es 'Other', usar el valor del campo customResultDomain
      let resultDomainValue = this.newBaseMetric.domain;
      if (resultDomainValue === 'Other' && this.newBaseMetric.customResultDomain) {
        resultDomainValue = this.newBaseMetric.customResultDomain;
      }
  
      var newFactor = this.metricFactor!;
      let dqFactor = this.factorsByDim.find(item => item.id == newFactor.id);
  
      const baseMetricToAdd = {
        name: this.newBaseMetric.name, 
        purpose: this.newBaseMetric.purpose,
        granularity: this.newBaseMetric.granularity,
        resultDomain: resultDomainValue,
        measures: dqFactor.factor_base
      };
  
      // Limpiar los campos del formulario
      this.newBaseMetric = { 
        name: '', 
        purpose: '', 
        granularity: '', 
        domain: '', 
        customResultDomain: '' 
      };
  
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
          this.notificationService.showSuccess(`DQ Metric "${data.name}" was successfully created. Now can be selected to add it to the DQ Model.`);
        },
        error: (err) => {
          console.error("Error creating the metric:", err);
          this.notificationService.showError('Failed to create DQ Metric');
        }
      });
  
      this.closeModalBase();
    }
    else {
      alert("Missing fields. Please complete all.");
    }
  }

  // Deshabilitar Metrica base
  deleteMetricBase(metricId: number): void {
    if (metricId) {
      console.log(`Metric seleccionada para eliminar: ${this.selectedBaseMetric}`);
      this.modelService.updateDQMetricBaseDisabledStatus(metricId, true).subscribe({
        next: (response) => {
          this.notificationService.showSuccess('DQ Metric was successfully deleted.');
          //this.getDQDimensionsBase();
          this.selectedBaseMetric = null;

        },
        error: (err) => {
          this.notificationService.showError('Failed to delete DQ Metric.');
        }
      });
    }
  }

  addMetricToModel(factor: any, metric: any): void {
    const context_components = buildContextComponents(this.selectionCheckboxCtxComponents);
  
    // Verificar si la métrica ya existe en el factor
    if (factor.definedMetrics && factor.definedMetrics.some((m: { metric_base: any; }) => m.metric_base === metric.id)) {
        this.notificationService.showError(`DQ Metric "${metric.metric_name}" has already been added to the DQ Model.`);
        return;
    }

    const metricToAdd = {
        dq_model: factor.dq_model,
        metric_base: metric.id,
        factor: factor.id,
        context_components: context_components,
    };
    //console.log("factor.definedMetrics", factor.definedMetrics);
    this.modelService.addMetricToDQModel(metricToAdd).subscribe({
        next: (data) => {
            console.log("Metric added to DQ Model:", data);
            this.notificationService.showSuccess(`DQ Metric "${data.metric_name}" was successfully added to the DQ Model.`);
            this.loadDQModelDimensionsAndFactors(); 
    
            // Actualizar la lista de métricas definidas en el factor
            if (!factor.definedMetrics) {
                factor.definedMetrics = [];
            }
            factor.definedMetrics.push(data);
    
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

  // Asociacion componentes de contexto
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
  }

  
  
  // ========== CARGA PROBLEMAS / CONTEXTO ==========

  // Obtener todos los problemas de calidad del proyecto
  // Cargar los problemas priorizados y los detalles del DQ Problem
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

  // Utilidades para vista componentes de contexto

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

  // ========== DQ MODEL (VISTA PARCIAL) ==========

  loadCompleteCurrentDQModel(): void {
    this.dqModelId = this.project?.dqmodel_version ?? -1; 
    if (this.dqModelId > 0) {
      this.getCurrentDQModel(this.dqModelId);
    } else {
      console.warn("No se encontró un dqModelId válido en el proyecto actual.");
    }
    this.loadDQModelDimensionsAndFactors();
  }

  getCurrentDQModel(dqModelId: number): void {
    this.modelService.getCurrentDQModel(dqModelId).subscribe({
      next: (data) => {
        this.currentDQModel = data;
        this.noModelMessage = '';
        console.log("DQ Model", this.currentDQModel);
      },
      error: (err) => {
        this.noModelMessage = err.status === 404
          ? "No DQ Model found with this ID. Please check and try again."
          : "An error occurred while loading the DQ Model. Please try again later.";
        this.currentDQModel = null;
      }
    });
  }

  getDimensionNameById(dimensionId: number): string {
    const dimension = this.dqmodel_dimensions.find(d => d.id === dimensionId);
    return dimension ? dimension.dimension_name : '';
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

  removeMetricFromDQModel(factor: any, metric: any): void {
    const index = factor.definedMetrics.indexOf(metric);
    if (index > -1) {
      console.log(`Eliminando la dimensión con ID: ${metric.Id}`);
      this.modelService.deletMetricFromDQModel(metric.id).subscribe(
        response => {
          this.notificationService.showSuccess('DQ Metric was successfully removed from the DQ Model.');
          factor.definedMetrics = factor.definedMetrics.filter(
            (item:any) => item.id !== metric.id
          );
          //this.loadDQModelDimensionsAndFactors();
        },
        error => {
          this.notificationService.showError('Failed to delete DQ Metric.');
          console.error("Error al eliminar la metrica:", error);
        }
      ); 
    }
  }

  //  EDICION METRICA 

  //Habilitar edicion DQ Metric (ctx components)
  enableDQMetricEdition(metric: any): void {
    console.log("enableDQMetricEdition", metric)
    metric.isEditing = !metric.isEditing;
  
    // Inicializar tempContextComponents si no está definido
    if (!metric.tempContextComponents) {
      metric.tempContextComponents = JSON.parse(JSON.stringify(metric.context_components || {}));
    }
  }

  hasSelectedComponents(category: string): boolean {
    return this.selectionCheckboxCtxComponents.some(
      (component) => component.category === category
    );
  }

  // Seleccion de Componentes de CONTEXTO
  isCtxSelectionAccordionVisible = false;
  isEditingCtxComponents: boolean = false;

  toggleCtxSelectionAccordionVisibility(): void {
    this.isEditingCtxComponents = !this.isEditingCtxComponents;
  }

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

  // Actualizar asociacion componentes de contexto
  saveMetricContextComponents(metric: any): void {
    const updatedMetric = {
      context_components: metric.tempContextComponents,
    };

    metric.context_components = JSON.parse(JSON.stringify(metric.tempContextComponents));
        metric.isEditing = false;

    this.modelService.updateDQMetricCtx(metric.id, updatedMetric).subscribe({
      next: () => {
        this.notificationService.showSuccess(`DQ Metric was successfully updated.`);

        //Actualizar componentes en vista
        metric.context_components = JSON.parse(JSON.stringify(metric.tempContextComponents));
        metric.isEditing = false;
      },
      error: (err) => {
        console.error("Failed to update DQ Metric", err);
        this.notificationService.showError(`Failed to update DQ Metric.`);
      },
    });
  }


  // ========== MODAL DE CONFIRMACIÓN ==========

  isConfirmationModalOpen: boolean = false;
  confirmationModalTitle: string = '';
  confirmationModalMessage: string = '';
  confirmedAction: (() => void) | null = null;

  handleConfirm(): void {
    if (this.confirmedAction) {
      this.confirmedAction(); // Ejecutar la acción confirmada
    }
    this.isConfirmationModalOpen = false;
  }

  handleCancel(): void {
    this.isConfirmationModalOpen = false;
    this.confirmedAction = null;
  }

  openConfirmationModal(
    title: string,
    message: string,
    actionType: 'addMetricToDQModel' | 'deleteDQMetricBase' | 'removeDQMetric', 
    ...params: any[]
  ): void {
    this.confirmationModalTitle = title;
    this.confirmationModalMessage = message;

    // Guardar la acción confirmada según el tipo de acción
    if (actionType === 'addMetricToDQModel') {
      const [selectedFactor, selectedBaseMetric] = params;
      this.confirmedAction = () => {
        this.addMetricToModel(selectedFactor, selectedBaseMetric);
      };
    } else if (actionType === 'removeDQMetric') {
      const [factor, metric] = params;
      this.confirmedAction = () => {
        this.removeMetricFromDQModel(factor, metric);
      };
    } else if (actionType === 'deleteDQMetricBase') {
      const [metricBaseId] = params;
      this.confirmedAction = () => {
        this.deleteMetricBase(metricBaseId);
      };
    }
    this.isConfirmationModalOpen = true;
  }

  openModal(factor:any) {
    this.metricFactor = factor;
    this.isModalOpen = true;
  }

  openCreateMetricModal(factor:any) {
    this.metricFactor = factor;
    this.isModalBaseOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  closeModalBase() {
    this.isModalBaseOpen = false;
  }


  // ========== VISTA COMPONENTES DE CONTEXTO ASOCIADOS ==========

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


  // ========== NAVEGACIÓN ==========
  onStepChange(step: number) {
    this.currentStep = step;
    this.navigateToStep(step);
  }
  
  navigateToStep(stepIndex: number) {
    const route = this.steps[stepIndex].route;
    this.router.navigate([route]);
  }

}
