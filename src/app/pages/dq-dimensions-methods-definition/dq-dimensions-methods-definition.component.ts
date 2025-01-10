import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { DqProblemsService } from '../../shared/dq-problems.service';
import contextComponentsJson from '../../../assets/context-components.json';
import { Router } from '@angular/router';
import { DqModelService } from '../../services/dq-model.service';
import { ProjectService } from '../../services/project.service';

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
  encapsulation: ViewEncapsulation.None
})
export class DqDimensionsMethodsDefinitionComponent implements OnInit {

  currentStep: number = 4; // Step 3
  pageStepTitle: string = 'Selection of DQ Methods';
  phaseTitle: string = 'Phase 2: DQ Assessment';
  stageTitle: string = 'Stage 4: DQ Model Definition';
  project: any;
  dqModelId: number = -1;
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


  constructor(private router: Router, private problemsService: DqProblemsService, private modelService: DqModelService,
    private projectService: ProjectService) { }

  ngOnInit() {
    this.getDQFactorsBase();

    this.loadCurrentProject();
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
        this.allMetrics = [];
  
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
      const baseMetricForFact = await this.modelService.getMetricsBaseByDimensionAndFactorId(item.dimension, item.id).toPromise();
      item.baseMetrics = baseMetricForFact;
      const dqMetricForFact = await this.modelService.getMetricsByDQModelDimensionAndFactor(item.dq_model, item.dimension, item.id).toPromise();
      item.definedMetrics = dqMetricForFact;
      item.definedMetrics.forEach(async (metric:any) => {
        let baseAttrMetric = item.baseMetrics.find((elem:any) => elem.id == metric.metric_base);
        metric.baseAttr = baseAttrMetric;
        const dqBaseMethods = await this.modelService.getMethodsBaseByDimensionFactorAndMetricId(item.dimension, item.id, metric.metric_base).toPromise();
        metric.baseMethods = dqBaseMethods;
        const dqMethods = await this.modelService.getMethodsByDQModelDimensionFactorAndMetric(item.dq_model,item.dimension, item.id, metric.id).toPromise();
        if (dqMethods) {
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

  confirmFactorsSelection(problem: DataQualityProblem) {
    this.problemsService.confirmFactorsSelection(problem.id, problem.selectedFactors || []);
    this.showDimensionsFactorsTitle = true;
    this.showDimensionsFactorsTable = true;
  }

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


  addBaseMethod(factor: any): void {
    if (this.newMethod.name && this.newMethod.output &&this.newMethod.input && this.newMethod.algorithm){
      var newMetric = this.currentMetric!;
      let dqMetric = this.allMetrics.find(item => item.id == newMetric.id)
      //newFactor.definedMetrics.push({ ...this.newMetric });
      const methodBaseToAdd = {
        implements: parseInt(dqMetric.baseAttr.id),
        name: this.newMethod.name,
        inputDataType: this.newMethod.input,
        outputDataType: this.newMethod.output,
        algorithm: this.newMethod.algorithm
      };
      this.newMethod = {
        name: '', input: '', output: '', algorithm: '', expanded: false,  metric: undefined}
      this.modelService.createDQMethod(methodBaseToAdd).subscribe({
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

  closeModalBase() {
    this.isModalBaseOpen = false;
  }
  
  saveMetrics(){
    this.router.navigate(['/step7']);
  }

}
