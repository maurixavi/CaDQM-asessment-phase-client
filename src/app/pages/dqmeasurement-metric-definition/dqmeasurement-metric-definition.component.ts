import { Component, OnInit } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import dataQualityProblemsJson from '../../../assets/data-quality-problems.json';
import contextComponentsJson from '../../../assets/context-components.json';

import { DqModelService } from '../../services/dq-model.service';
import { ProjectService } from '../../services/project.service';
import { DqProblemsService } from '../../shared/dq-problems.service';
import { Router } from '@angular/router';

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
  problems: DataQualityProblem[] = [];
  contextComponents: ContextComponent[] = [];
  selectedProblem: DataQualityProblem | null = null;
  detailsVisible: boolean = false;
  isOrderConfirmed: boolean = false;
  
  private contextModel: any; // Para almacenar el modelo de contexto completo
  
  contextComponentsGrouped: { type: string; ids: number[] }[] = [];
  isModalBaseOpen: boolean = false;
  currentStep: number = 3;
  pageStepTitle: string = 'Selection of DQ Metrics';
  phaseTitle: string = 'Phase 2: DQ Assessment';
  stageTitle: string = 'Stage 4: DQ Model Definition';


  constructor(private router: Router, private dqProblemsService: DqProblemsService,
    private modelService: DqModelService,
    private projectService: ProjectService) { }

  /*constructor(private router: Router) { }
  constructor(private dqProblemsService: DqProblemsService) { }*/

  qualityDimensions: QualityDimension[] = [
    { id: 1, name: 'Exactitud (accuracy)' },
    { id: 2, name: 'Completitud (completeness)' },
    { id: 3, name: 'Frescura (freshness)' },
    { id: 4, name: 'Consistencia (consistency)' },
    { id: 5, name: 'Unicidad (uniqueness)' }
  ];
  project: any;
  dqModelId: number = 1;
  currentDQModel:any;
  noModelMessage: string = "";  
  noDimensionsMessage: string = "";
  dqmodel_dimensions: any[] = [];
  dimensionsWithFactorsInDQModel: any[] = [];
  errorMessage: string | null = null;
  factorsByDim: any[] = [];
  
  dqFactorsBase: any[] = [];


  selectedFactors = this.dqProblemsService.getSelectedFactors();

  metricFactor:QualityFactor | undefined = undefined ;

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

  ngOnInit() {
    //this.problems = dataQualityProblemsJson as DataQualityProblem[];
    this.getDQFactorsBase();

    this.loadCurrentProject();

    //this.getBaseMetricsByFactor();
    

    this.contextComponents = contextComponentsJson as ContextComponent[];
  }

  loadCurrentProject(): void {
    this.projectService.loadCurrentProject().subscribe({
      next: (project) => {
        this.project = project;
        console.log('Proyecto cargado en el componente:', this.project);

        //Load complete DQ Model (with Dimensions,Factors...) of current project
        this.loadCompleteCurrentDQModel();
      },
      error: (err) => {
        console.error('Error al cargar el proyecto en el componente:', err);
      }
    });
  }

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
    this.getContext();
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

  /*saveOrder() {
    this.isOrderConfirmed = true;
    this.dqProblemsService.updateProblems(this.problems);
    console.log(this.problems); 
  }*/
  saveOrder() {
    // Lógica para guardar el orden
    this.isOrderConfirmed = true;
    this.dqProblemsService.updateProblems(this.problems); // Suponiendo que `this.problems` contiene los problemas a actualizar
    console.log(this.problems);

    // Redirigir solo si la orden se confirma
    if (this.isOrderConfirmed) {
      this.router.navigate(['/step2']);
    }
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
          alert("Base Metric successfully created.");
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

  getContextDescription(contextId: string): string {
    const context = this.contextComponents.find(c => c.id === contextId);
    return context && context.description ? context.description : 'No description';
  }
  

  addContextComponent(problem: DataQualityProblem, event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const contextId = selectElement.value;
    if (contextId) { // Verifica que contextId no sea nulo ni una cadena vacía
      if (!problem.contextcomp_related_to.includes(contextId)) {
        problem.contextcomp_related_to.push(contextId);
      }
    }
  }

  removeContextComponent(problem: DataQualityProblem, contextId: string) {
    const index = problem.contextcomp_related_to.indexOf(contextId);
    if (index !== -1) {
      problem.contextcomp_related_to.splice(index, 1);
    }
  }

  saveMetrics(){
    var result: QualityMetric[] = [];
    // this.qualityFactors.forEach(elem => {
    //   result = result.concat(elem.definedMetrics);
    // });
    this.router.navigate(['/step5']);
    
  }
  

  isModalOpen = false;

  openModal(factor:any) {
    this.metricFactor = factor;
    this.isModalOpen = true;
  }

  openModalBase(factor:any) {
    this.metricFactor = factor;
    this.isModalBaseOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  closeModalBase() {
    this.isModalBaseOpen = false;
  }
}
