import { Component, OnInit, ViewEncapsulation, HostListener, AfterViewInit } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { DqModelService } from '../../services/dq-model.service';
import { Router } from '@angular/router';

import { ProjectService } from '../../services/project.service';
import { ProjectDataService } from '../../services/project-data.service';

import { buildContextComponents, formatCtxCompCategoryName, getFirstNonIdAttribute } from '../../shared/utils/utils';
import { tap } from 'rxjs/operators';

declare var bootstrap: any; 

// Definición de interfaces
interface ContextComponent {
  type: string;
  id: number;
  displayText: string;
}

interface Factor {
  id: number;
  name: string;
  semantic: string;
  ctx_components?: ContextComponent[];
  dimension_id: number;
  dq_model_version_id: number;
}

interface Dimension {
  id: number;
  name: string;
  semantic: string;  
  ctx_components?: ContextComponent[];  
  dq_model_version_id: number;  
}

type DimensionsMap = {
    [key: string]: {
      semantic: string;
      factors: { [key: string]: string };
    };
  };

@Component({
  selector: 'app-dq-dimensions-factors-selection',
  templateUrl: './dq-dimensions-factors-selection.component.html',
  styleUrls: ['./dq-dimensions-factors-selection.component.css'],
  //encapsulation: ViewEncapsulation.None
})
export class DqDimensionsFactorsSelectionComponent implements OnInit {

  isNextStepEnabled: boolean = true;
  
  currentStep: number = 2; //Step 3
  pageStepTitle: string = 'Selection of DQ dimensions and DQ factors';
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


  /* CONTEXT variables */
  //contextComponents: any[] = []; 

  selectedComponents: ContextComponent[] = [];
  selectedComponent: ContextComponent | undefined;  // Cambiado a undefined



  /* DIMENSIONS, FACTORS BASE variables */
  //load dimensions and factor base
  dqDimensionsBase: any[] = [];
  dqFactorsBase: any[] = [];

  //selection dimension and factor base
  selectedDimension: number | null = null;
  selectedFactor: number | null = null;
  selectedFactors: any[] = [];
  availableFactors: any[] = []; //base factors given dimension selected

  //create dimension base
  dimensionName: string = '';
  dimensionSemantic: string = '';

  //create factor base
  factorName: string = '';    
  factorSemantic: string = ''; 


  /* DQ MODELS, DQ DIMENSIONS, DQ FACTORS variables */
  dqModels: any[] = [];

  // load dimensions and factors
  dqmodel_dimensions: any[] = [];
  dimensionsWithFactorsInDQModel: any[] = [];

  // add factor to DQ Model
  addedDimensionId: number | null = null;
  duplicateFactor: boolean = false; 
  
  noDimensionsMessage: string = "";


  /* Other variables */
  errorMessage: string | null = null;
  isLoading: boolean = false;

 



  // Variables de datos
  project: any;
  projectId: number | null = null;
  noProjectMessage: string = "";
  dqModelId: number = -1;
  dqModelVersionId: number | null = null;
  dqModel: any = null;

  // Componentes del contexto
  contextComponents: any = null;

  dataSchema: any = null;


  //Utils.py
  public formatCtxCompCategoryName = formatCtxCompCategoryName;
  public getFirstNonIdAttribute = getFirstNonIdAttribute


  //Datos para Generate AI Dimension-Factor suggestion
  dimensionsAndFactors: DimensionsMap = {
    "Accuracy": {
        "semantic": "Indicates that the data is correct and precise.",
        "factors": {
            "Semantic Accuracy": "The data correctly represents entities or states of the real world.",
            "Syntactic Accuracy": "The data is free from syntactic errors.",
            "Precision": "The data has an adequate level of detail."
        }
    },
    "Completeness": {
        "semantic": "Refers to the availability of all necessary data, ensuring that no important data is missing for analysis or decision-making.",
        "factors": {
            "Density": "The proportion of actual data entries compared to the total possible entries.",
            "Coverage": "The extent to which the data covers the required scope or domain."
        }
    },
    "Freshness": {
        "semantic": "Refers to the recency and update status of the data, indicating whether the data is current and up-to-date.",
        "factors": {
            "Currency": "Indicates how up-to-date the data is.",
            "Timeliness": "The data is available when needed.",
            "Volatility": "The rate at which the data changes over time."
        }
    },
    "Consistency": {
        "semantic": "Ensures that the data is coherent across different sources and over time, maintaining integrity and reliability.",
        "factors": {
            "Domain Integrity": "Data values conform to defined domain rules.",
            "Intra-relationship Integrity": "Ensures that data within a single dataset is consistent.",
            "Inter-relationship Integrity": "Ensures that data across multiple datasets is consistent."
        }
    },
    "Uniqueness": {
        "semantic": "Indicates that each data entry must be unique, with no duplicates present in the dataset.",
        "factors": {
            "No-duplication": "Ensures that there are no duplicate entries in the dataset.",
            "No-contradiction": "Ensures that there are no conflicting entries within the dataset."
        }
    }
  }



  constructor(
    private router: Router,
    private modelService: DqModelService,
    private projectService: ProjectService,
    private projectDataService: ProjectDataService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    //Cargar opciones select Dimensiones y Factores base
    this.getDQDimensionsBase();
    this.getDQFactorsBase();

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
      this.dqProblems_ = data;
      console.log('DQ Problems:', data);

      // Una vez que los problemas están cargados, cargar los problemas priorizados
      if (this.projectId !== null) {
        this.loadSelectedPrioritizedDQProblems(this.projectId);
        //this.getCurrentDQModel(this.projectId);
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
        this.loadDQModelDimensionsForSelection();
      }
    });

    // Suscribirse al esquema de datos
    this.projectDataService.dataSchema$.subscribe((data) => {
      this.dataSchema = data;
      console.log('Data Schema:', data); // Ver el esquema de datos en la consola
    });

  }

  loadCompleteCurrentDQModel(): void {
    // Asigna el dqModelId desde el proyecto, o -1 si no existe DQ Model asociado a Project
    this.dqModelId = this.project?.dqmodel_version ?? -1; 
    console.log("CurrentProject dqModelId:", this.dqModelId);

    if (this.dqModelId > 0) {
      this.getCurrentDQModel(this.dqModelId);
    } else {
      console.warn("No se encontró un dqModelId válido en el proyecto actual.");
    }

    // Cargar Dimensiones y Factores del DQ Model
    this.loadDQModelDimensionsAndFactors();
  }
 
  

  //inicializacion, pruebas
  context: any; // Variable para almacenar el contexto obtenido
  id_context: number = 1; // Inicializa con el ID que deseas probar.
  contextVersionId: number = -1; // Inicializa con el ID que deseas probar.

  currentDQModel: any; // Variable para almacenar el DQ Model obtenido

  //dqModelId: number | null = null;

  //dqModelId: number = -1; // Inicializar con un valor que indique que aún no ha sido asignado

  noModelMessage: string = "";  

  //currentDQModel: any = null; 

  dimensionsWithFactors: { dimension: any, factors: any[] }[] = [];


  


  // Dimensiones seleccionadas en "From DQ Problems"
  selectedDimensionsFromDQProblems: Set<number> = new Set<number>();

  // Factores seleccionados en "From DQ Problems"
  selectedFactorsFromDQProblems: Set<number> = new Set<number>();

  

  // Método para manejar la selección de un factor en "From DQ Problems"
  onFactorChangeFromDQProblems(factorId: number, dimensionId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const isChecked = input.checked;

    // Actualizar la selección del factor
    if (isChecked) {
      this.selectedFactorsFromDQProblems.add(factorId);
    } else {
      this.selectedFactorsFromDQProblems.delete(factorId);
    }

    // Verificar si al menos un factor de la dimensión está seleccionado
    const dimension = this.dimensionsWithFactors.find(d => d.dimension.id === dimensionId);
    if (dimension) {
      const atLeastOneFactorSelected = dimension.factors.some(factor => this.selectedFactorsFromDQProblems.has(factor.id));

      // Actualizar la selección de la dimensión
      if (atLeastOneFactorSelected) {
        this.selectedDimensionsFromDQProblems.add(dimensionId);
      } else {
        this.selectedDimensionsFromDQProblems.delete(dimensionId);
      }
    }


    /*console.log('Factores seleccionados:', this.selectedFactorsFromDQProblems);
    console.log('Dimensiones seleccionadas:', this.selectedDimensionsFromDQProblems);*/
  }

  // Método para verificar si un factor está seleccionado
  isFactorSelectedFromDQProblems(factorId: number): boolean {
    return this.selectedFactorsFromDQProblems.has(factorId);
  }

  // Método para verificar si una dimensión está seleccionada
  isDimensionSelectedFromDQProblems(dimensionId: number): boolean {
    return this.selectedFactorsFromDQProblems.has(dimensionId);
  }




  applicationDomain: any[] = [];
  businessRule: any[] = [];
  dataFiltering: any[] = [];
  dqMetadata: any[] = [];
  dqRequirement: any[] = [];
  otherData: any[] = [];
  otherMetadata: any[] = [];
  systemRequirement: any[] = [];
  taskAtHand: any[] = [];
  userType: any[] = [];

  allContextComponents: any; // Variable para almacenar el contexto obtenido

  //: any = {};
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

  //getContextComponentsByType
  getContextComponents(contextVersionId: number): void {
    this.projectService.getContextComponents(contextVersionId).subscribe({
      next: (data) => {
        this.allContextComponents = data;
        //console.log('Get Context Components:', data);
        
        // Asignar los datos a las variables correspondientes
        this.applicationDomain = data.applicationDomain || [];
        this.businessRule = data.businessRule || [];
        this.dataFiltering = data.dataFiltering || [];
        this.dqMetadata = data.dqMetadata || [];
        this.dqRequirement = data.dqRequirement || [];
        this.otherData = data.otherData || [];
        this.otherMetadata = data.otherMetadata || [];
        this.systemRequirement = data.systemRequirement || [];
        this.taskAtHand = data.taskAtHand || [];
        this.userType = data.userType || [];
        //console.log("this.applicationDomain", this.applicationDomain)
      },
      error: (err) => console.error('Error fetching context components:', err),
    });
  }


  
  //seleccion de componentes de contexto
  // selected_Components: { id: number; category: string; value: string }[] = [];
  ctxComponentsChecked_fromScratch: { id: number; category: string; value: string }[] = [];

  onCtxComponentsCheckboxChange_fromScratch(id: number, category: string, value: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const isChecked = input?.checked || false;
  
    if (isChecked) {
      // Agregar el componente seleccionado
      this.ctxComponentsChecked_fromScratch.push({ id, category, value });
    } else {
      // Eliminar el componente desmarcado
      this.ctxComponentsChecked_fromScratch = this.ctxComponentsChecked_fromScratch.filter(
        (component) => !(component.category === category && component.value === value)
      );
    }
    
    console.log("this.ctxComponentsChecked_fromScratch", this.ctxComponentsChecked_fromScratch);
  }

 
  onCtxComponentsCheckboxChange_suggestion(id: number, category: string, value: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const isChecked = input?.checked || false;
  
    if (isChecked) {
      // Agregar el componente seleccionado
      this.ctxComponentsChecked_suggestion.push({ id, category, value });
    } else {
      // Eliminar el componente desmarcado
      this.ctxComponentsChecked_suggestion = this.ctxComponentsChecked_suggestion.filter(
        (component) => !(component.category === category && component.value === value)
      );
    }

    console.log("this.ctxComponentsChecked_suggestion", this.ctxComponentsChecked_suggestion);
    
  }

  // Validar si un componente está seleccionado
  isComponentSelected(category: string, value: string): boolean {
    return this.ctxComponentsChecked_fromScratch.some(
      (component) => component.category === category && component.value === value
    );
  }

  removeSelectedComponent(componentToRemove: any): void {
    // Filtra la lista para excluir el componente a eliminar
    this.ctxComponentsChecked_fromScratch = this.ctxComponentsChecked_fromScratch.filter(
      (component) => component !== componentToRemove
    );
  }


  isComponentSelectedInSuggestions(category: string, value: string): boolean {
    return this.ctxComponentsChecked_suggestion.some(
      (component) => component.category === category && component.value === value
    );
  }

  removeSelectedComponentInSuggestions(componentToRemove: any): void {
    // Filtra la lista para excluir el componente a eliminar
    this.ctxComponentsChecked_suggestion = this.ctxComponentsChecked_suggestion.filter(
      (component) => component !== componentToRemove
    );
  }





  

  
  getSelectedProblemDetails(): any {
    if (this.selectedProblem && this.selectedPrioritizedProblems.length > 0) {
      return this.selectedPrioritizedProblems.find(problem => problem.id === this.selectedProblem);
    }
    return null;
  }

// Propiedad para almacenar el problema seleccionado
  selectedProblem: number | null = null;

  // Método para manejar el cambio de selección
  onProblemChange(): void {
    if (this.selectedProblem) {
      console.log('Id Problema seleccionado:', this.selectedProblem);
      // Aquí puedes agregar lógica adicional, como cargar detalles del problema seleccionado
    } else {
      console.log('Ningún problema seleccionado.');
    }
  }

  // SELECTED DQ PROBLEMS FETCHED
  selectedPrioritizedProblems: any[] = [];

  // Método para cargar los problemas priorizados
  loadSelectedPrioritizedDQProblems(projectId: number): void {
    this.projectService.getSelectedPrioritizedDQProblemsByProjectId(projectId).subscribe({
      next: (data) => {
        this.selectedPrioritizedProblems = data;

        // Obtener los detalles adicionales (description y date) para cada problema
        //this.selectedPrioritizedProblems.forEach((problem) => this.getDQProblemDetails(problem.dq_problem_id, problem));

        console.log(data);

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

  // Obtener todos los problemas de calidad del proyecto
  dqProblems_: any[] = [];
  dqProblemDetails: any = null; 

  loadDQProblems(projectId: number): void {
    this.projectService.getDQProblemsByProjectId(projectId).subscribe({
      next: (data) => {
        this.dqProblems_ = data;
        //console.log('Problemas de calidad:', data);

        this.loadSelectedPrioritizedDQProblems(projectId);
      },
      error: (err) => {
        console.error('Error al obtener los problemas de calidad:', err);
      },
    });
  }

  getDQProblemDetails(dqProblemId: number, problem: any): void {
    const dqProblem = this.dqProblems_.find((p) => p.id === dqProblemId);
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

  /*getSelectedPrioritizedDqProblems(projectId: number): void {
    this.projectService.getSelectedPrioritizedDQProblemsByProjectId(projectId).subscribe({
      next: (selectedProblems) => {
        if (selectedProblems && selectedProblems.length > 0) {
          this.selectedPrioritizedProblems = selectedProblems;
          console.log('*SELECTED Prioritized problems:', this.selectedPrioritizedProblems);

        } else {
          console.log('*** No selected problems found.');
        }
      },
      error: (err) => {
        console.error('*Error al verificar los problemas seleccionados:', err);
      }
    });
  }*/

  getSelectedPrioritizedDqProblems(dqModelId: number): void {
    this.modelService.getSelectedPrioritizedDqProblems(dqModelId).subscribe({
      next: (selectedProblems) => {
        if (selectedProblems && selectedProblems.length > 0) {
          this.selectedPrioritizedProblems = selectedProblems;
          console.log('*SELECTED Prioritized problems:', this.selectedPrioritizedProblems);

        } else {
          console.log('*** No selected problems found.');
        }
      },
      error: (err) => {
        console.error('*Error al verificar los problemas seleccionados:', err);
        // Aquí puedes manejar el error si ocurre
      }
    });
  }

  selectedProblemsFromScratch: any[] = []; // Array para almacenar los problemas seleccionados
  //isEditSuggestedDQProblemsVisible = true; // Mostrar/ocultar checkboxes
  selectedProblemsSuggestions: any[] = []; // Array para almacenar los problemas seleccionados

  // Maneja los cambios en los checkboxes
  onCheckboxProblemsChange(problem: any, event: Event) {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.selectedProblemsFromScratch.push(problem);
    } else {
      this.selectedProblemsFromScratch = this.selectedProblemsFromScratch.filter(p => p.id !== problem.id);
    }
    console.log("DQ PROBLEM CHEQUEADO: ", this.selectedProblemsFromScratch)
  }


  onCheckboxSuggestionsProblemsChange(problem: any, event: Event) {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.selectedProblemsSuggestions.push(problem);
    } else {
      this.selectedProblemsSuggestions = this.selectedProblemsSuggestions.filter(p => p.id !== problem.id);
    }
    console.log("CHECQUEADO: ", this.selectedProblemsSuggestions)
  }

  isProblemSelectedInSuggestions(dqProblemId: number): boolean {
    return this.selectedProblemsSuggestions.some(p => p.dq_problem_id === dqProblemId);
  }


  //GET CURRENT DQ MODEL IN PROJECT
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









  //DIMENSIONS BASE
  // Suscripcion al observable del servicio
  getDQDimensionsBase() {
    this.modelService.getAllDQDimensionsBase().subscribe({
      next: (data) => {
        this.dqDimensionsBase = data;
        console.log('*All DIMENSIONS BASE loaded:', data);
        this.loadFactorsForAllDimensions(data); // Cargar factores para todas las dimension
      },
      error: (err) => console.error("Error loading Dimensions Base:", err)
    });
  }

  loadFactorsForAllDimensions_(dimensions: any[]) {
    dimensions.forEach((dimension) => {
      this.modelService.getFactorsBaseByDimensionId(dimension.id).subscribe({
        next: (factors) => {
          this.dimensionsWithFactors.push({ dimension, factors });
          //console.log("this.dimensionsWithFactors: ", this.dimensionsWithFactors)
        },
        error: (err) => console.error(`Error loading factors for dimension ${dimension.id}:`, err),
      });
    });
  }

  loadFactorsForAllDimensions(dimensions: any[]) {
    dimensions.forEach((dimension) => {
      this.modelService.getFactorsBaseByDimensionId(dimension.id).subscribe({
        next: (factors) => {
          if (factors.length > 0) {
            this.dimensionsWithFactors.push({ dimension, factors });
          } else {
            console.warn(`No se encontraron factores para la dimensión ${dimension.id}.`);
          }
        },
        error: (err) => {
          console.warn(`Advertencia: No se pudieron cargar los factores para la dimensión ${dimension.id}.`);
        },
      });
    });
  }

  //FACTORS BASE
  getDQFactorsBase() {
    this.modelService.getAllDQFactorsBase().subscribe({
      next: (data) => {
        this.dqFactorsBase = data;
        //console.log('*All FACTORS BASE loaded:', data);
      },
      error: (err) => console.error("Error loading Factors Base:", err)
    });
  }

  //SELECT DIMENSIONS and FACTORS BASE 
  noFactorsMessage: string = "";

  getFactorsBaseByDimension(dimensionId: number): void {
    this.modelService.getFactorsBaseByDimensionId(dimensionId).subscribe({
      next: (data) => {
        this.availableFactors = data; // Factores disponibles asociados a Dimension para select
        this.noFactorsMessage = ""; // Resetea el mensaje si hay factores
      },
      error: (err) => {
        // no hay factores
        if (err.status === 404) { // Suponiendo que la API devuelve un 404 cuando no hay factores
          this.availableFactors = []; // Reinicia factores
          this.noFactorsMessage = "No factors are associated with this dimension. Please create and add a new DQ Factor.";  
        } else {
          console.error("Error loading factors by dimension:", err);
          this.availableFactors = []; // Reinicia en caso de error
          this.noFactorsMessage = "An error occurred while loading factors. Please try again later.";  
        }
      }
    });
  }

  onDimensionChange(): void {
    this.clearSelectedComponents();  // Limpiar la selección de componentes
    this.clearDQProblemsSelection();
    console.log(`Dimensión seleccionada: ${this.selectedDimension}`);
    if (this.selectedDimension) {
      this.getFactorsBaseByDimension(this.selectedDimension); 
      this.selectedFactors = [];
      this.errorMessage = ''; 
    }
    this.selectedFactor = null;
  }

  selectedFactorDetails: any | null = null;
  onFactorChange0() {
    console.log('Factor seleccionado:', this.selectedFactor);
    this.selectedFactorDetails = this.availableFactors.find(factor => factor.id === this.selectedFactor);
    console.log("this.selectedFactorDetails", this.selectedFactorDetails);
    /*this.getSelectedFactor();
    console.log("this.getSelectedFactor", this.getSelectedFactor());*/
  }  

  onFactorChange(): void {
    if (this.selectedFactor) {
      console.log('Selected factor:', this.selectedFactor);
      this.selectedFactorDetails = this.availableFactors.find(f => f.id === this.selectedFactor);
      console.log('Selected factor details:', this.selectedFactorDetails);
    } else {
      this.selectedFactorDetails = null;
    }
  }

  //SHOW SELECTIONS
  getSelectedDimension(): any {
    return this.dqDimensionsBase.find(dim => dim.id === this.selectedDimension);
  }

  getSelectedFactor() {
    //console.log(this.availableFactors);
    return this.dqFactorsBase.find(factor => factor.id === this.selectedFactor);
  }

  /*getSelectedFactorsByDimension(dimensionId: number): any[] {
    return this.selectedFactors.filter(factor => factor.dimension_id === dimensionId);
  }*/


  //ADD SELECTION (DIMENSION,BASE) to DQ MODEL
  addDimensionToDQModel(newDimension: any): void {
    this.dqmodel_dimensions.push(newDimension); // Agrega la nueva dimensión al arreglo
    console.log("Nueva dimensión agregada:", newDimension);
  }
  

  //FORMS
  //CREATE and ADD DIMENSION BASE
  createDimension() {
    const newDimension = {
      name: this.dimensionName,
      semantic: this.dimensionSemantic
    };

    this.modelService.createDQDimension(newDimension).subscribe({
      next: (response) => {
        console.log('Dimensión creada con éxito:', response);
        alert('The DQ Dimension was successfully created. You can now select it to add it to the DQ Model.');
        this.resetDimensionForm();
        this.closeDimensionModal(); 
        this.getDQDimensionsBase();

        this.selectedDimension = response;
      },
      error: (err) => {
        console.error('Error al crear la dimensión:', err);
        this.errorMessage = 'Hubo un error al crear la dimensión.';
      }
    });
  }

  isDimensionModalOpen: boolean = false;

  openDimensionModal() {
    this.isDimensionModalOpen = true;
  }

  closeDimensionModal() {
    this.isDimensionModalOpen = false;
    this.resetDimensionForm(); 
  }

  resetDimensionForm() {
    this.dimensionName = '';
    this.dimensionSemantic = '';
    this.errorMessage = null;
  }

  //CREATE and ADD FACTOR BASE
  createFactor() {
    if (this.selectedDimension !== null) {
      const newFactor = {
        name: this.factorName,
        semantic: this.factorSemantic,
        facetOf: this.selectedDimension // asignar el ID de la dimensión seleccionada
      };
      console.log("newFactor", newFactor);

      this.modelService.createDQFactor(newFactor).subscribe({
        next: (response) => {
          console.log('Factor Base creado con éxito:', response);
          alert('The DQ Factor was successfully created. You can now select it to add it to the DQ Model.');
          this.resetFactorForm(); // Limpiar el formulario de factor

          //this.getDQFactorsBase();
          this.getFactorsBaseByDimension(this.selectedDimension!); // Recargar los factores de la dimension seleccionada

          this.closeFactorModal(); 

          this.selectedFactor = response;
          console.log("FACTOR CREADO RESPONSE: ", response);

          //this.selectedFactorDetails = response;
          //console.log("FACTOR CREADO RESPONSE this.selectedFactorDetail: ", this.selectedFactorDetails);
        },
        error: (err) => {
          console.error('Error al crear el factor:', err);
          this.errorMessage = 'Hubo un error al crear el factor.';
        }
      });
    } else {
      this.errorMessage = 'Por favor, seleccione una dimensión antes de crear un factor.';
    }
  }

  createFactorBaseSinSeleccionar() {
    // 1. Verifica si hay una dimensión del DQ Model seleccionada
    if (this.selectedDQModelDimension) {
      // 2. Encuentra la dimensión del DQ Model seleccionada
      const selectedDQModelDim = this.availableDQModelDimensions.find(
        dim => dim.id === this.selectedDQModelDimension
      );
  
      if (selectedDQModelDim) {
        // 3. Crea el factor base asociado a la dimensión base (no a la del DQ Model)
        const newFactor = {
          name: this.factorName,
          semantic: this.factorSemantic,
          facetOf: selectedDQModelDim.dimension_base  // ¡Usa dimension_base, no selectedDimension!
        };
  
        // 4. Envía la petición para crear el factor base
        this.modelService.createDQFactor(newFactor).subscribe({
          next: (response) => {
            console.log('Factor base creado:', response);
            alert('DQ Factor created successfully. You can now add it to the DQ Model.');
            
            // 5. Recarga los factores de la dimensión base asociada
            this.getFactorsBaseByDimension(selectedDQModelDim.dimension_base);
            
            this.resetFactorForm();
            this.closeFactorModal();
          },
          error: (err) => {
            console.error('Error:', err);
            this.errorMessage = 'Error creating factor. Check the console for details.';
          }
        });
      } else {
        this.errorMessage = 'Selected dimension not found.';
      }
    } else {
      this.errorMessage = 'Please select a dimension from the DQ Model first.';
    }
  }


  createFactorBase() {
    // 1. Verificar si hay una dimensión del DQ Model seleccionada
    if (!this.selectedDQModelDimension) {
      this.errorMessage = 'Please select a dimension from the DQ Model first.';
      return;
    }

    // 2. Encontrar la dimensión seleccionada
    const selectedDQModelDim = this.availableDQModelDimensions.find(
      dim => dim.id === this.selectedDQModelDimension
    );

    if (!selectedDQModelDim) {
      this.errorMessage = 'Selected dimension not found.';
      return;
    }

    // 3. Crear el nuevo factor base
    const newFactor = {
      name: this.factorName,
      semantic: this.factorSemantic,
      facetOf: selectedDQModelDim.dimension_base
    };

    // 4. Enviar la petición con manejo de la respuesta
    this.modelService.createDQFactor(newFactor).pipe(
      tap((response) => {
        // Acción secundaria: preparar la selección del nuevo factor
        this.selectedFactor = response.id;
      })
    ).subscribe({
      next: (response) => {
        console.log('Factor creado:', response);
        
        // 5. Recargar los factores disponibles
        this.getFactorsBaseByDimension(selectedDQModelDim.dimension_base);
        
        // 6. Seleccionar automáticamente el nuevo factor
        setTimeout(() => {
          this.selectedFactorDetails = this.availableFactors.find(f => f.id === response.id);
          this.cdr.detectChanges(); // Forzar actualización de vista si es necesario
        }, 100); // Pequeño delay para asegurar la carga
        
        alert('DQ Factor created and selected!');
        this.resetFactorForm();
        this.closeFactorModal();
      },
      error: (err) => {
        console.error('Error:', err);
        this.errorMessage = err.error?.message || 'Error creating factor';
      }
    });
  }

 
  isFactorModalOpen = false; 
  selectedDimensionName: string = ''; 

  openFactorModal(): void {
    if (this.selectedDQModelDimension) {
      // Busca la dimensión del DQ Model seleccionada
      const selectedDQModelDim = this.availableDQModelDimensions.find(
        dim => dim.id === this.selectedDQModelDimension
      );
      
      if (selectedDQModelDim) {
        this.isFactorModalOpen = true;
        // Obtiene el nombre de la dimensión base asociada
        const dimensionBase = this.dqDimensionsBase.find(
          dim => dim.id === selectedDQModelDim.dimension_base
        );
        this.selectedDimensionName = dimensionBase?.name || '';
      } else {
        this.errorMessage = 'Selected dimension not found.';
      }
    } else {
      this.errorMessage = 'Please select a dimension from the DQ Model before adding a factor.';
    }
  }

  openFactorModal0(): void {
    if (this.selectedDimension) {
      this.isFactorModalOpen = true;
      this.selectedDimensionName = this.dqDimensionsBase.find(dim => dim.id === this.selectedDimension)?.name || '';
    } else {
      this.errorMessage = 'Please select a dimension before adding a factor.';
    }
  }

  closeFactorModal(): void {
    this.isFactorModalOpen = false;
    this.errorMessage = ''; 
    this.resetFactorForm();
  }

  resetFactorForm() {
    this.factorName = '';
    this.factorSemantic = '';
    this.errorMessage = ''; 
  }


 


  // ADD DIMENSIONS-FACTORS to DQ MODEL
  mergeContextComponents(existing: any, newComponents: any) {
    // Crear una copia profunda del objeto existente
    const merged = JSON.parse(JSON.stringify(existing));
  
    // Iterar sobre cada categoría en los nuevos componentes
    Object.keys(newComponents).forEach((category) => {
      if (!Array.isArray(merged[category])) {
        merged[category] = [];
      }
  
      // Filtrar y agregar solo los elementos nuevos que no existan
      const uniqueNewComponents = newComponents[category].filter(
        (id: number) => !merged[category].includes(id)
      );
  
      // Agregar los nuevos componentes únicos al array existente
      merged[category] = [...merged[category], ...uniqueNewComponents];
    });
  
    return merged;
  }

 
  //Agregar solo DIMENSION al DQ Model
  addDimToDQModel(selectedDimension: any, selectedComponents: { id: number; category: string; value: string }[], selectedDQProblems: number[]) {

    if (!selectedDimension) {
      console.log('Por favor, selecciona una dimensión.');
      return;
    }
    // Manejar la lógica aquí con los parámetros recibidos
    console.log('Dimensión seleccionada:', selectedDimension);
    console.log("--selected_Components in addToDQModel--", selectedComponents);

    //const selectedProblemIds = this.selectedProblemsFromScratch.map(problem => problem.id); Agrega id priorizado
    const selectedProblemIds = this.selectedProblemsFromScratch.map(problem => problem.dq_problem_id); //agrega id problema original
    console.log("--selected_Problem IDs in addToDQModel--", selectedProblemIds);

    this.submitDimensionToDQModel(selectedDimension, selectedComponents, selectedProblemIds);
    //this.loadDQModelDimensionsAndFactors();
  }
  

  //Agregar par DIMENSION-FACTOR al DQ Model
  addToDQModel(selectedDimension: any, selectedFactor: any, selectedComponents: { id: number; category: string; value: string }[], selectedDQProblems: number[]) {

    if (!selectedDimension || !selectedFactor) {
      console.log('Por favor, selecciona una dimensión y un factor.');
      return;
    }
    // Manejar la lógica aquí con los parámetros recibidos
    console.log('Dimensión seleccionada:', selectedDimension);
    console.log('Factor seleccionado:', selectedFactor);
    console.log("--selected_Components in addToDQModel--", selectedComponents);

    //const selectedProblemIds = this.selectedProblemsFromScratch.map(problem => problem.id); Agrega id priorizado
    const selectedProblemIds = this.selectedProblemsFromScratch.map(problem => problem.dq_problem_id); //agrega id problema original
    console.log("--selected_Problem IDs in addToDQModel--", selectedProblemIds);

    this.submitNewDimension(selectedDimension, selectedFactor, selectedComponents, selectedProblemIds);
    this.loadDQModelDimensionsAndFactors();
  }
  

  submitDimensionToDQModel(selectedDimension: any, 
    selectedComponents: { id: number; category: string; value: string }[],
    selectedProblemIds: number[]): void {

    if (!selectedDimension) {
      console.error("No se ha seleccionado ninguna dimensión base.");
      return; 
    }

    // Buscar los objetos correspondientes en los arrays dqDimensionsBase y dqFactorsBase
    const dimensionObj = this.dqDimensionsBase.find(dim => dim.id === selectedDimension);

    const dimensionName = dimensionObj ? dimensionObj.name : 'Dimension';

    // Mensaje de confirmación
    /*const confirmMessage = `Are you sure you want to add the DQ Dimension "${dimensionName}" and the DQ Factor "${factorName}" to the DQ Model?`;*/

   
  
      // verificar si la dimension ya existe
      this.modelService.getDimensionsByDQModel(this.dqModelId).subscribe((existingDimensions) => {
        const existingDimension = existingDimensions.find(dim => dim.dimension_base === selectedDimension);
    
        if (existingDimension) {
          // Si la dimensión ya existe, solo agrega el factor asociado a la Dimension
          this.addedDimensionId = existingDimension.id;
          console.log("Dimensión ya existente, ID:", this.addedDimensionId);
          console.log("Dimensión ya existente, Ctx Components:", existingDimension.context_components);
      
          const existingComponents = existingDimension.context_components;
          const newComponents = buildContextComponents(selectedComponents);
          
          // Combinar los componentes existentes con los nuevos, evitando duplicados
          const mergedComponents = JSON.parse(JSON.stringify(existingComponents));

          Object.keys(newComponents).forEach((category) => {
              if (!Array.isArray(mergedComponents[category])) {
                  mergedComponents[category] = [];
              }
              
              // Agregar solo los componentes que no existen
              newComponents[category].forEach((id: number) => {
                  if (!mergedComponents[category].includes(id)) {
                      mergedComponents[category].push(id);
                  }
              });
          });

          // DQ PROBLEMS:
          // Combinar problemas de calidad sin duplicados
          const existingProblems = existingDimension.dq_problems || [];
          const mergedProblems = [...new Set([...existingProblems, ...selectedProblemIds])];

          // Verificar si hay cambios en los componentes o problemas
          const hasChanges =
            JSON.stringify(mergedComponents) !== JSON.stringify(existingComponents) ||
            JSON.stringify(mergedProblems) !== JSON.stringify(existingProblems);
      
          if (hasChanges) {
              const updatedDimension = {
                  context_components: mergedComponents,
                  dq_problems: mergedProblems
              };
      
              this.modelService.updateDQDimensionContextComponents(existingDimension.id, updatedDimension).subscribe({
                  next: () => {
                      console.log("Componentes actualizados exitosamente en la dimensión.");
                      //this.submitNewFactor(selectedFactor, selectedComponents, selectedProblemIds);
                  },
                  error: (err) => {
                      console.error("Error al actualizar la dimensión:", err);
                      alert("Error updating dimension context components.");
                  }
              });
          } else {
              console.log("No hay cambios en los componentes.");
              //this.submitNewFactor(selectedFactor, selectedComponents, selectedProblemIds);
          }
      

        } else {
          // Construir los context_components
          const contextComponents = buildContextComponents(selectedComponents);
          console.log("***DIM: buildContextComponents()", buildContextComponents(selectedComponents))

          console.log("AGREGANDO DIMENSION.... ", selectedProblemIds);

          // Crear una nueva dimensión con los context_components
          const dimensionToAdd = {
            dq_model: this.dqModelId,
            dimension_base: selectedDimension!,
            context_components: contextComponents,
            dq_problems: selectedProblemIds 
          };
          
          /* Si no existe, agregar una nueva dimensión
          const dimensionToAdd = {
            dq_model: this.dqModelId,
            dimension_base: this.selectedDimension!,
            context_components: []
          };*/
    
          this.modelService.addDimensionToDQModel(dimensionToAdd).subscribe({
            next: (data) => {
              console.log("Dimension añadida:", data);
              this.addedDimensionId = data.id; // obtiene el ID de la dimension agregada
              
              // Carga las dimensiones y factores después de añadir la nueva dimensión
              this.loadDQModelDimensionsAndFactors(); 

              const successMessage = `DQ Dimension "${data.dimension_name}" was successfully added to the DQ Model.`;

              alert(successMessage);

              //window.alert("Dimension successfully added to DQ Model.");

              //this.submitNewFactor(selectedFactor, selectedComponents, selectedProblemIds);
            },
            error: (err) => {
              console.error("Error al añadir la dimension:", err);
              if (err.error && err.error.non_field_errors) {
                  window.alert(err.error.non_field_errors[0]);  
              } else {
                  window.alert("An error occurred while trying to add the dimension."); 
              }
            }
          });
        }
      });
      
    
  }



  submitNewDimension(selectedDimension: any, selectedFactor: any, 
    selectedComponents: { id: number; category: string; value: string }[],
    selectedProblemIds: number[]): void {

    if (!selectedDimension) {
      console.error("No se ha seleccionado ninguna dimensión base.");
      return; 
    }

    // Buscar los objetos correspondientes en los arrays dqDimensionsBase y dqFactorsBase
    const dimensionObj = this.dqDimensionsBase.find(dim => dim.id === selectedDimension);
    const factorObj = this.dqFactorsBase.find(factor => factor.id === selectedFactor);

    const dimensionName = dimensionObj ? dimensionObj.name : 'Dimension';
    const factorName = factorObj ? factorObj.name : 'Factor';

    // Mensaje de confirmación
    /*const confirmMessage = `Are you sure you want to add the DQ Dimension "${dimensionName}" and the DQ Factor "${factorName}" to the DQ Model?`;*/

   
  
      // verificar si la dimension ya existe
      this.modelService.getDimensionsByDQModel(this.dqModelId).subscribe((existingDimensions) => {
        const existingDimension = existingDimensions.find(dim => dim.dimension_base === selectedDimension);
    
        if (existingDimension) {
          // Si la dimensión ya existe, solo agrega el factor asociado a la Dimension
          this.addedDimensionId = existingDimension.id;
          console.log("Dimensión ya existente, ID:", this.addedDimensionId);
          console.log("Dimensión ya existente, Ctx Components:", existingDimension.context_components);
      
          const existingComponents = existingDimension.context_components;
          const newComponents = buildContextComponents(selectedComponents);
          
          // Combinar los componentes existentes con los nuevos, evitando duplicados
          const mergedComponents = JSON.parse(JSON.stringify(existingComponents));

          Object.keys(newComponents).forEach((category) => {
              if (!Array.isArray(mergedComponents[category])) {
                  mergedComponents[category] = [];
              }
              
              // Agregar solo los componentes que no existen
              newComponents[category].forEach((id: number) => {
                  if (!mergedComponents[category].includes(id)) {
                      mergedComponents[category].push(id);
                  }
              });
          });

          // DQ PROBLEMS:
          // Combinar problemas de calidad sin duplicados
          const existingProblems = existingDimension.dq_problems || [];
          const mergedProblems = [...new Set([...existingProblems, ...selectedProblemIds])];

          // Verificar si hay cambios en los componentes o problemas
          const hasChanges =
            JSON.stringify(mergedComponents) !== JSON.stringify(existingComponents) ||
            JSON.stringify(mergedProblems) !== JSON.stringify(existingProblems);
      
          if (hasChanges) {
              const updatedDimension = {
                  context_components: mergedComponents,
                  dq_problems: mergedProblems
              };
      
              this.modelService.updateDQDimensionContextComponents(existingDimension.id, updatedDimension).subscribe({
                  next: () => {
                      console.log("Componentes actualizados exitosamente en la dimensión.");
                      this.submitNewFactor(selectedFactor, selectedComponents, selectedProblemIds);
                  },
                  error: (err) => {
                      console.error("Error al actualizar la dimensión:", err);
                      alert("Error updating dimension context components.");
                  }
              });
          } else {
              console.log("No hay cambios en los componentes.");
              this.submitNewFactor(selectedFactor, selectedComponents, selectedProblemIds);
          }
      

        } else {
          // Construir los context_components
          const contextComponents = buildContextComponents(selectedComponents);
          console.log("***DIM: buildContextComponents()", buildContextComponents(selectedComponents))

          // Crear una nueva dimensión con los context_components
          const dimensionToAdd = {
            dq_model: this.dqModelId,
            dimension_base: selectedDimension!,
            context_components: contextComponents,
            dq_problems: selectedProblemIds 
          };
          
          /* Si no existe, agregar una nueva dimensión
          const dimensionToAdd = {
            dq_model: this.dqModelId,
            dimension_base: this.selectedDimension!,
            context_components: []
          };*/
    
          this.modelService.addDimensionToDQModel(dimensionToAdd).subscribe({
            next: (data) => {
              console.log("Dimension añadida:", data);
              this.addedDimensionId = data.id; // obtiene el ID de la dimension agregada
              
              // Carga las dimensiones y factores después de añadir la nueva dimensión
              this.loadDQModelDimensionsAndFactors(); 

              const successMessage = `DQ Dimension "${data.dimension_name}" was successfully added to the DQ Model.`;

              alert(successMessage);

              //window.alert("Dimension successfully added to DQ Model.");

              this.submitNewFactor(selectedFactor, selectedComponents, selectedProblemIds);
            },
            error: (err) => {
              console.error("Error al añadir la dimension:", err);
              if (err.error && err.error.non_field_errors) {
                  window.alert(err.error.non_field_errors[0]);  
              } else {
                  window.alert("An error occurred while trying to add the dimension."); 
              }
            }
          });
        }
      });
      
    
  }



  submitNewFactor(selectedFactor: any, 
    selectedComponents: { id: number; category: string; value: string }[],
    selectedProblemIds: number[]): void { 
    /*if (this.selectedFactor === null) {
      console.error("No factor selected.");
      alert("Please select a factor to add.");
      return; // Salir si no se ha seleccionado un factor
    }*/
    if (!selectedFactor) {
      console.error("No factor selected.");
      alert("Please select a factor to add.");
      return; 
    }
  
    // Verificar si el factor ya existe en la dimension seleccionada en el DQ Model
    this.modelService.getFactorsByDQModelAndDimension(this.dqModelId!, this.addedDimensionId!).subscribe((existingFactors) => {
      const duplicateFactor = existingFactors.find(factor => factor.factor_base === selectedFactor);
  
      console.log("duplicateFactor", duplicateFactor)

      if (duplicateFactor) {
        console.warn("Factor already exists in the dimension.");

        const warningMessage = `The DQ Factor "${duplicateFactor.factor_name}" already exists in the DQ Model.`;

        alert(warningMessage);
        //alert("This factor already exists in the selected dimension.");
      } 
      else {
        // Si no existe, añadir el nuevo factor
        const contextComponents = buildContextComponents(selectedComponents);
        console.log("***FACT: buildContextComponents()", buildContextComponents(selectedComponents))

        const factorToAdd = {
          factor_base: selectedFactor!,
          dimension: this.addedDimensionId!,
          dq_model: this.dqModelId,
          context_components: contextComponents,
          dq_problems: selectedProblemIds 
        };
  
        this.modelService.addFactorToDQModel(factorToAdd).subscribe({
          next: (data) => {
            console.log("DQ Factor added to DQ Model:", data);

            this.loadDQModelDimensionsAndFactors(); //update DQ Model
 
            const successMessage = `DQ Factor "${data.factor_name}" was successfully added to the DQ Model.`;

            alert(successMessage);

            this.noDimensionsMessage = '';

            //alert("Factor data successfully added to DQ Model.");
            this.clearSelectedComponents();  // Limpiar la selección de componentes
            this.clearDQProblemsSelection();
            this.clearDimensionSelection();
          },
          error: (err) => {
            console.error("Error adding the factor:", err);
            alert("An error occurred while trying to add the factor.");
          }
        });
      }
    });
  }

  clearSelectedComponents(): void {
    this.ctxComponentsChecked_fromScratch = [];  // Limpiar la lista de componentes seleccionados
  }

  clearDQProblemsSelection(): void {
    this.selectedProblemsFromScratch = []; 
    this.cdr.detectChanges();  
  }

  clearDimensionSelection(): void {
    this.selectedDimension = null; // Limpiar la selección de la dimensión
    this.availableFactors = []; // Limpiar la lista de factores disponibles
    this.selectedFactor = null; // Limpiar la selección del factor (opcional, por si acaso)
    this.isCtxSelectionAccordionVisible = false;
    this.isEditSuggestedDQProblemsVisible = false;
    this.cdr.detectChanges(); // Forzar la detección de cambios
  }

 // Método para limpiar la selección de factores y dimensiones
  clearSelectionFromDQProblems(): void {
    // Vaciar las colecciones de factores y dimensiones seleccionados
    this.selectedFactorsFromDQProblems.clear();
    this.selectedDimensionsFromDQProblems.clear();

    // Actualizar el estado de los checkboxes (esto puede depender de cómo manejas los checkboxes en tu HTML)
    // Suponiendo que estás usando una estructura similar a la de onFactorChangeFromDQProblems para manejar la selección
    this.dimensionsWithFactors.forEach(dimension => {
      dimension.factors.forEach(factor => {
        // Desmarcar los checkboxes de los factores
        const factorCheckbox = document.getElementById(`factor-checkbox-${factor.id}`) as HTMLInputElement;
        if (factorCheckbox) {
          factorCheckbox.checked = false;
        }
      });

      // Desmarcar los checkboxes de las dimensiones
      const dimensionCheckbox = document.getElementById(`dimension-checkbox-${dimension.dimension.id}`) as HTMLInputElement;
      if (dimensionCheckbox) {
        dimensionCheckbox.checked = false;
      }
    });

    console.log('Selección de factores y dimensiones limpiada');


    //this.selectedProblem = null;
  }

  

  addDimensionsAndFactorsFromDQProblems(): void {
    console.log('DQ Problem seleccionado desde DQ Problems:', this.selectedProblem)
    console.log('Factores seleccionados desde DQ Problems:', this.selectedFactorsFromDQProblems);
    console.log('Dimensiones seleccionadas desde DQ Problems:', this.selectedDimensionsFromDQProblems);
    
  
    const selectedFactorsArray = Array.from(this.selectedFactorsFromDQProblems);
    console.log('Array de factores seleccionados desde DQ Problems:', selectedFactorsArray);

    selectedFactorsArray.forEach(factorBaseId => {

      // Obtener los atributos del factor
      const factorBaseAttr = this.dqFactorsBase.find(factor => factor.id === factorBaseId);
      console.log(`Detalles del factor ${factorBaseId}:`, factorBaseAttr);

      const dimensionBaseId = factorBaseAttr.facetOf;

      this.addToDQModel(dimensionBaseId, factorBaseId, [], []);

    });

    this.clearSelectionFromDQProblems()
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
  
        this.dqmodel_dimensions = dimensions.map(dimension => ({
          ...dimension,
          isEditing: false,
          tempContextComponents: JSON.parse(JSON.stringify(dimension.context_components)),
        }));
  
        this.dqmodel_dimensions = dimensions;
        this.dimensionsWithFactorsInDQModel = [];
  
        // Obtener la lista de todos los problemas del proyecto
        const allProblems = this.dqProblems_;
  
        const dimensionsData = await Promise.all(dimensions.map(async (dimension) => {
          try {
            // Obtener factores de la dimensión
            const factors = await this.modelService.getFactorsByDQModelAndDimension(this.dqModelId, dimension.id).toPromise();
  
            if (!factors) {
              throw new Error(`Factors not found for dimension ${dimension.dimension_name}`);
            }
  
            // Obtener detalles de la dimensión base
            const baseAttributes = await this.modelService.getDQDimensionBaseById(dimension.dimension_base).toPromise();
  
            // Obtener componentes de contexto de la dimensión
            const dimensionContextComponents = dimension.context_components || [];
  
            // Obtener detalles de los problemas de calidad asociados a la dimensión
            const dimensionDqProblemsDetails = dimension.dq_problems
              .map((problemId: any) => {
                // Buscar el problema en la lista de todos los problemas
                const problemDetails = allProblems.find(problem => problem.id === problemId);
                if (!problemDetails) {
                  console.warn(`Problem with ID ${problemId} not found in allProblems.`);
                }
                return problemDetails || null;
              })
              .filter((detail: null) => detail !== null); // Filtrar problemas no encontrados
  
            // Obtener los detalles del factor base para cada factor
            const factorsWithBaseAttributes = await Promise.all(factors.map(async (factor) => {
              const factorBaseAttributes = await this.modelService.getFactorBaseById(factor.factor_base).toPromise();
  
              // Obtener componentes de contexto del factor
              const factorContextComponents = factor.context_components || [];
  
              // Obtener detalles de los problemas de calidad asociados al factor
              const dqProblemsDetails = factor.dq_problems
                .map((problemId: any) => {
                  // Buscar el problema en la lista de todos los problemas
                  const problemDetails = allProblems.find(problem => problem.id === problemId);
                  if (!problemDetails) {
                    console.warn(`Problem with ID ${problemId} not found in allProblems.`);
                  }
                  return problemDetails || null;
                })
                .filter((detail: null) => detail !== null); // Filtrar problemas no encontrados
  
              return {
                ...factor,
                baseAttributes: factorBaseAttributes,
                context_components: factorContextComponents,
                dq_problems_details: dqProblemsDetails,
              };
            }));
  
            return {
              dimension: {
                ...dimension,
                dq_problems_details: dimensionDqProblemsDetails,
              },
              baseAttributes,
              factors: factorsWithBaseAttributes,
              context_components: dimensionContextComponents,
            };
          } catch (error) {
            console.error(`Error loading data for dimension ${dimension.dimension_name}:`, error);
            this.errorMessage = `Failed to load data for dimension ${dimension.dimension_name}.`;
            return null;
          }
        }));
  
        // Filtrar cualquier entrada nula debido a errores y luego asignar los datos completos
        this.dimensionsWithFactorsInDQModel = dimensionsData.filter((dim) => dim !== null);
        console.log("DQ MODEL: Dimensions with Factors and Problem Details:", this.dimensionsWithFactorsInDQModel);
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

  // DQ MODEL: SHOW DIMENSIONS and FACTORS added 


  toggleEditDQFactorVisibility(factor: any): void {
    factor.isEditing = !factor.isEditing;
  
    // Inicializar tempContextComponents si no está definido
    if (!factor.tempContextComponents) {
      factor.tempContextComponents = JSON.parse(JSON.stringify(factor.context_components || {}));
    }
  }


  loadDQModelDimensionsAndFactors_RESPALDO_PROBLEMASPRIORIZADOS(): void {
    this.modelService.getDimensionsByDQModel(this.dqModelId).subscribe(
      async (dimensions) => {
        if (dimensions.length === 0) {
          this.noDimensionsMessage = 'No dimensions found for this DQ Model.';
          this.dqmodel_dimensions = [];
          this.dimensionsWithFactorsInDQModel = [];
          return;
        }

        this.dqmodel_dimensions = dimensions.map(dimension => ({
          ...dimension,
          isEditing: false,
          tempContextComponents: JSON.parse(JSON.stringify(dimension.context_components)),
        }));

        
  
        this.dqmodel_dimensions = dimensions;
        this.dimensionsWithFactorsInDQModel = [];
  
        // Obtener la lista de problemas priorizados para el proyecto
        const prioritizedProblems = this.selectedPrioritizedProblems;
  
        // Crear un mapa de id de problemas priorizados a dq_problem_id
        const prioritizedProblemsMap = new Map<number, number>();
        prioritizedProblems.forEach(problem => {
          prioritizedProblemsMap.set(problem.id, problem.dq_problem_id);
        });
  
        const dimensionsData = await Promise.all(dimensions.map(async (dimension) => {
          try {
            // Obtener factores de la dimensión
            const factors = await this.modelService.getFactorsByDQModelAndDimension(this.dqModelId, dimension.id).toPromise();
  
            if (!factors) {
              throw new Error(`Factors not found for dimension ${dimension.dimension_name}`);
            }
  
            // Obtener detalles de la dimensión base
            const baseAttributes = await this.modelService.getDQDimensionBaseById(dimension.dimension_base).toPromise();
  
            // Obtener componentes de contexto de la dimensión
            const dimensionContextComponents = dimension.context_components || [];
  
            // Obtener detalles de los problemas de calidad asociados a la dimensión
            const dimensionDqProblemsDetails = await Promise.all(dimension.dq_problems.map(async (problemId: number) => {
              if (this.projectId) {
                // Obtener el dq_problem_id correspondiente al problemId
                const dqProblemId = prioritizedProblemsMap.get(problemId);
                if (dqProblemId) {
                  const problemDetails = await this.projectService.getDQProblemById(this.projectId, dqProblemId).toPromise();
                  return problemDetails;
                }
              }
              return null; // Si no hay projectId o no se encuentra el dq_problem_id, devolver null
            }));
  
            // Obtener los detalles del factor base para cada factor
            const factorsWithBaseAttributes = await Promise.all(factors.map(async (factor) => {
              const factorBaseAttributes = await this.modelService.getFactorBaseById(factor.factor_base).toPromise();
  
              // Obtener componentes de contexto del factor
              const factorContextComponents = factor.context_components || [];
  
              // Obtener detalles de los problemas de calidad asociados al factor
              const dqProblemsDetails = await Promise.all(factor.dq_problems.map(async (problemId: number) => {
                if (this.projectId) {
                  // Obtener el dq_problem_id correspondiente al problemId
                  const dqProblemId = prioritizedProblemsMap.get(problemId);
                  if (dqProblemId) {
                    const problemDetails = await this.projectService.getDQProblemById(this.projectId, dqProblemId).toPromise();
                    return problemDetails;
                  }
                }
                return null; // Si no hay projectId o no se encuentra el dq_problem_id, devolver null
              }));
  
              return {
                ...factor,
                baseAttributes: factorBaseAttributes,
                context_components: factorContextComponents,
                dq_problems_details: dqProblemsDetails.filter(detail => detail !== null), // Filtrar detalles nulos
              };
            }));
  
            return {
              dimension: {
                ...dimension,
                dq_problems_details: dimensionDqProblemsDetails.filter(detail => detail !== null), // Filtrar detalles nulos
              },
              baseAttributes,
              factors: factorsWithBaseAttributes,
              context_components: dimensionContextComponents,
            };
          } catch (error) {
            console.error(`Error loading data for dimension ${dimension.dimension_name}:`, error);
            this.errorMessage = `Failed to load data for dimension ${dimension.dimension_name}.`;
            return null;
          }
        }));
  
        // Filtrar cualquier entrada nula debido a errores y luego asignar los datos completos
        this.dimensionsWithFactorsInDQModel = dimensionsData.filter((dim) => dim !== null);
        console.log("DQ MODEL: Dimensions with Factors:", this.dimensionsWithFactorsInDQModel);
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

  //REMOVE DIMENSIONS or FACTORS from DQ MODEL
  deleteDimension(dimensionId: number): void {

    const confirmationMessage = `Are you sure you want to remove this DQ Dimension from the DQ Model? This will also delete the associated factors.`;

    const userConfirmed = confirm(confirmationMessage);
  
    if (userConfirmed) {
      console.log(`Eliminando la dimensión con ID: ${dimensionId}`);
      this.modelService.deleteDimensionFromDQModel(dimensionId).subscribe(
        response => {
          alert(response?.message || "Dimensión y factores asociados eliminados exitosamente.");
          // Filtrar la dimensión eliminada sin recargar toda la lista
          this.dimensionsWithFactorsInDQModel = this.dimensionsWithFactorsInDQModel.filter(
            item => item.dimension.id !== dimensionId
          );
          this.loadDQModelDimensionsAndFactors();
        },
        error => {
          alert("Error al eliminar la dimensión.");
          console.error("Error al eliminar la dimensión:", error);
        }
      );
    } else {
      console.log("Eliminación de la dimensión cancelada por el usuario.");
    }
  }
  
  deleteFactor(factorId: number): void {


  
      console.log(`Eliminando el factor con ID: ${factorId}`);
    
      this.modelService.deleteFactorFromDQModel(factorId).subscribe(
        response => {
          alert("The DQ Factor was successfully removed.");

          // Elimina el factor de la lista sin recargar la página
          this.dimensionsWithFactorsInDQModel = this.dimensionsWithFactorsInDQModel.map(dimension => ({
            ...dimension,
            factors: dimension.factors.filter((factor: { id: number }) => factor.id !== factorId)
          }));
          this.loadDQModelDimensionsAndFactors();
        },
        error => {
          alert("Error while removing the factor.");
          console.error("Error al eliminar el factor:", error);
        }
      );
    
  }

  //OTHER METHODS
  scrollToDiv(divId: string): void {
    const element = document.getElementById(divId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
  
  goToNextStep() {
    this.router.navigate(['/st4/a11']);
  }



  //FLOATING CARD - DQ PROBLEMS
  isMinimized: boolean = true;
  isDragging: boolean = false;
  offsetX: number = 0;
  offsetY: number = 0;

  // Toggle para minimizar/maximizar la tarjeta
  toggleMinimize(): void {
    this.isMinimized = !this.isMinimized;
  }

  onMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    const dqCard = document.getElementById('dqCard')!;
    
    // Calcula el desplazamiento del mouse en relación con la posición de la tarjeta
    const rect = dqCard.getBoundingClientRect();
    this.offsetX = event.clientX - rect.left;
    this.offsetY = event.clientY - rect.top;
  }

  // Evento para mover la tarjeta mientras se arrastra
  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      const dqCard = document.getElementById('dqCard')!;
      dqCard.style.position = 'fixed';
      dqCard.style.left = `${event.clientX - this.offsetX}px`;
      dqCard.style.top = `${event.clientY - this.offsetY}px`;
    }
  }

  // Evento para detener el movimiento cuando se suelta el mouse
  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.isDragging = false;
  }


  // Seleccion de Componentes de CONTEXTO
  isCtxSelectionAccordionVisible = false;

  // Alterna la visibilidad del div y cambia el texto e ícono del botón
  toggleCtxSelectionAccordionVisibility(): void {
    this.isCtxSelectionAccordionVisible = !this.isCtxSelectionAccordionVisible;
  }



  // HABILITAR EDITAR DIMENSIONES y FACTORES SUGERIDOS
  isEditSuggestedContextVisible: boolean = false;
  isEditSuggestedDQProblemsVisible: boolean = false;

  toggleSuggestedItemsVisibility(type: string): void {
    if (type === 'context') {
      this.isEditSuggestedContextVisible = !this.isEditSuggestedContextVisible;
    } else if (type === 'dqproblems') {
      this.isEditSuggestedDQProblemsVisible = !this.isEditSuggestedDQProblemsVisible;
    }
  }


  // SECTIONS VISIBILITY
  /*isFromScratchSectionVisible: boolean = false;  
  toggleFromScratchSectionVisibility() {
    this.isFromScratchSectionVisible = !this.isFromScratchSectionVisible;  
  }

  isFromScratchSectionVisible_addDimensions: boolean = false;  
  toggleFromScratchSectionVisibility_addDimensions() {
    this.isFromScratchSectionVisible_addDimensions = !this.isFromScratchSectionVisible_addDimensions;  
  }

  isFromScratchSectionVisible_addFactors: boolean = false;  
  toggleFromScratchSectionVisibility_addFactors() {
    this.isFromScratchSectionVisible_addFactors = !this.isFromScratchSectionVisible_addFactors;  
  }*/

  isFromScratchSectionVisible: boolean = false;  
  isFromScratchSectionVisible_addDimensions: boolean = false; 
  isFromScratchSectionVisible_addFactors: boolean = false;  

  // Controlador principal para mostrar/ocultar toda la sección
toggleFromScratchSectionVisibility(): void {
  this.isFromScratchSectionVisible = !this.isFromScratchSectionVisible;
  
  // Al abrir la sección, mostrar Dimensions por defecto
  if (this.isFromScratchSectionVisible) {
    this.showDimensionsSection();
  } else {
    // Al cerrar la sección, ocultar todo
    this.hideAllSections();
  }
}

// Mostrar solo la sección de Dimensions
showDimensionsSection(): void {
  this.isFromScratchSectionVisible_addDimensions = true;
  this.isFromScratchSectionVisible_addFactors = false;
}

// Mostrar solo la sección de Factors
showFactorsSection(): void {
  this.isFromScratchSectionVisible_addDimensions = false;
  this.isFromScratchSectionVisible_addFactors = true;
}

// Ocultar todas las subsecciones
hideAllSections(): void {
  this.isFromScratchSectionVisible_addDimensions = false;
  this.isFromScratchSectionVisible_addFactors = false;
}

// Toggle para Dimensions
toggleFromScratchSectionVisibility_addDimensions(): void {
  if (this.isFromScratchSectionVisible_addDimensions) {
    // Si ya está abierto, lo cerramos
    this.isFromScratchSectionVisible_addDimensions = false;
  } else {
    // Si está cerrado, lo abrimos y cerramos Factors
    this.showDimensionsSection();
  }
}

// Toggle para Factors
toggleFromScratchSectionVisibility_addFactors(): void {
  if (this.isFromScratchSectionVisible_addFactors) {
    // Si ya está abierto, lo cerramos
    this.isFromScratchSectionVisible_addFactors = false;
  } else {
    // Si está cerrado, lo abrimos y cerramos Dimensions
    this.showFactorsSection();
  }
}

  isFromProblemsSectionVisible: boolean = false;  
  toggleFromProblemsSectionVisibility() {
    this.isFromProblemsSectionVisible = !this.isFromProblemsSectionVisible;  
  }

  isSuggestionsSectionVisible: boolean = false;  
  toggleSuggestionsSectionVisibility() {
    this.isSuggestionsSectionVisible = !this.isSuggestionsSectionVisible;  
  }


  // Método para verificar si una categoría tiene componentes seleccionados
  hasSelectedComponents(category: string): boolean {
    return this.ctxComponentsChecked_suggestion.some(component => component.category === category);
  }

  suggestedDQDimensionBase: any;
  suggestedDQFactorBase: any;

  ctxComponentsChecked_suggestion: { id: number; category: string; value: string }[] = [];


  selectRandomComponents() {
    // Reinicia la selección
    this.ctxComponentsChecked_suggestion = [];

    // Aplanar todos los componentes en un solo array
    const allComponents: { id: number; category: string; value: string }[] = [];

    const allContextComponents = this.allContextComponents

    // Itera sobre cada categoría de componentes
    Object.keys(allContextComponents).forEach(category => {
      allContextComponents[category].forEach((component: { id: any; name: any; statement: any; filter: any; metadata: any; requirement: any; data: any; task: any; type: any; }) => {
        allComponents.push({
          id: component.id,
          category: category,
          value: component.name || component.statement || component.filter || component.metadata || component.requirement || component.data || component.task || component.type
        });
      });
    });

    // Seleccionar una cantidad aleatoria de componentes (entre 1 y el total de componentes)
    const totalComponents = allComponents.length;
    const numberOfComponentsToSelect = Math.floor(Math.random() * totalComponents) + 1; // Entre 1 y el total

    // Seleccionar componentes aleatorios sin repetir
    const suggestionCtxComponents = [];
    for (let i = 0; i < numberOfComponentsToSelect; i++) {
      const randomIndex = Math.floor(Math.random() * allComponents.length);
      suggestionCtxComponents.push(allComponents[randomIndex]);
      allComponents.splice(randomIndex, 1); // Eliminar el componente seleccionado para evitar duplicados
    }

    return suggestionCtxComponents;

  }

 

  // Método para generar un DQ Factor y su DQ Dimension
  generateSuggestion() {

    const randomIndex = Math.floor(Math.random() * this.dqFactorsBase.length);
    console.log("randomIndex", randomIndex)

    const generatedDQFactorBase = this.dqFactorsBase[randomIndex];
    
    this.suggestedDQFactorBase = generatedDQFactorBase

    const suggestedDimensionId = generatedDQFactorBase.facetOf

    const suggestedDimensionObj = this.dqDimensionsBase.find(dim => dim.id === suggestedDimensionId);

    this.suggestedDQDimensionBase = suggestedDimensionObj

    console.log("Factor sugerido:", this.suggestedDQFactorBase)
    console.log("Dimension sugerida:", this.suggestedDQDimensionBase)
  
    // Seleccionar componentes de contexto aleatorios
    this.ctxComponentsChecked_suggestion = this.selectRandomComponents();
    console.log("Componentes de contexto sugeridos:", this.ctxComponentsChecked_suggestion);

  }

  getSuggestedDimension(): any {
    return this.suggestedDQDimensionBase;
  }

  getSuggestedFactor(): any {
    return this.suggestedDQFactorBase;
  }


  isCtxSuggestionVisible: boolean = true; 

  toggleCtxSuggestionVisibility(): void {
    this.isCtxSuggestionVisible = !this.isCtxSuggestionVisible;
  }


  // Método para obtener las categorías de los componentes de contexto
  getContextComponentCategories(contextComponents: any): string[] {
    return Object.keys(contextComponents).filter(category => contextComponents[category].length > 0);
  }

  // Método para obtener los detalles de un componente de contexto
  getContextComponentDetails(category: string, componentId: number): string {
    const component = this.allContextComponents[category].find((comp: any) => comp.id === componentId);
    if (component) {
      // Retorna el primer atributo no 'id' que encuentre
      const keys = Object.keys(component).filter(key => key !== 'id');
      if (keys.length > 0) {
        return `${keys[0]}: ${component[keys[0]]}`;
      }
    }
    return 'No details available';
  }

  // Método para obtener todos los detalles de un componente de contexto
  getContextComponentCompleteDetails(category: string, componentId: number): string {
    const component = this.allContextComponents[category].find((comp: any) => comp.id === componentId);
    if (component) {
      // Crear una lista de todos los atributos (excepto 'id')
      const details = Object.keys(component)
        .filter(key => key !== 'id') // Excluir el campo 'id'
        .map(key => `${key}: ${component[key]}`) // Formatear como "clave: valor"
        .join(', '); // Unir todos los pares clave-valor en una cadena
      return details;
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

  // Navegación
  nextStep(): void {
    this.router.navigate(['/st4/a11']);
  }

  onStepChange(step: number) {
    this.currentStep = step;
    this.navigateToStep(step);
  }
  
  navigateToStep(stepIndex: number) {
    const route = this.steps[stepIndex].route;
    this.router.navigate([route]);
  }


  isEditingCtxComponents: boolean = false;

  /*toggleEditDQDimensionVisibility(): void {
    this.isEditingCtxComponents = !this.isEditingCtxComponents;
  }*/

  toggleEditDQDimensionVisibility(dimension: any): void {
    dimension.isEditing = !dimension.isEditing;
  
    // Inicializar tempContextComponents si no está definido
    if (!dimension.tempContextComponents) {
      dimension.tempContextComponents = JSON.parse(JSON.stringify(dimension.context_components || {}));
    }
    // Inicializar dq_problems si no está definido
    if (!dimension.dq_problems) {
      dimension.dq_problems = JSON.parse(JSON.stringify(dimension.dq_problems || []));
    }
  }

  isComponentSelected_editing(category: string, componentId: number, tempContextComponents: any): boolean {
    return tempContextComponents[category] && tempContextComponents[category].includes(componentId);
  }

  onCtxComponentsCheckboxChange(componentId: number, category: string, dimension: any): void {
    if (!dimension.tempContextComponents[category]) {
      dimension.tempContextComponents[category] = [];
    }
  
    const index = dimension.tempContextComponents[category].indexOf(componentId);
    if (index === -1) {
      // Agregar el componente si no está seleccionado
      dimension.tempContextComponents[category].push(componentId);
    } else {
      // Eliminar el componente si ya está seleccionado
      dimension.tempContextComponents[category].splice(index, 1);
    }
  }


  saveFactorContextComponents(factor: any, dimensionId: number): void {
    const updatedFactor = {
      context_components: factor.tempContextComponents,
      dq_problems: factor.dq_problems, // Incluir los problemas seleccionados
    };
  
    this.modelService.updateDQFactor(this.dqModelId, dimensionId, factor.id, updatedFactor).subscribe({
      next: () => {
        console.log("Componentes y problemas actualizados exitosamente en el factor.");
        factor.context_components = JSON.parse(JSON.stringify(factor.tempContextComponents));
        factor.isEditing = false; // Deshabilitar la edición
      },
      error: (err) => {
        console.error("Error al actualizar el factor:", err);
        alert("Error updating factor context components and problems.");
      },
    });
  }


  saveContextComponents(dimension: any): void {
    const updatedDimension = {
      context_components: dimension.tempContextComponents,
      dq_problems: dimension.dq_problems, // Incluir los problemas seleccionados
    };
  
    this.modelService.updateDQDimensionContextComponents(dimension.id, updatedDimension).subscribe({
      next: () => {
        console.log("Componentes y problemas actualizados exitosamente.");
        dimension.context_components = JSON.parse(JSON.stringify(dimension.tempContextComponents));
        dimension.isEditing = false; // Deshabilitar la edición
      },
      error: (err) => {
        console.error("Error al actualizar la dimensión:", err);
        alert("Error updating dimension context components and problems.");
      },
    });
  }
  
  saveContextComponents_(dimension: any): void {
    const updatedDimension = {
      context_components: dimension.tempContextComponents,
    };
  
    this.modelService.updateDQDimensionContextComponents(dimension.id, updatedDimension).subscribe({
      next: () => {
        console.log("Componentes de contexto actualizados exitosamente.");
        dimension.context_components = JSON.parse(JSON.stringify(dimension.tempContextComponents));
        dimension.isEditing = false; // Deshabilitar la edición
      },
      error: (err) => {
        console.error("Error al actualizar los componentes de contexto:", err);
        alert("Error updating context components.");
      },
    });
  }

  isComponentSelected_editing2(category: string, componentId: number, contextComponents: any): boolean {
    return contextComponents[category] && contextComponents[category].includes(componentId);
  }


  hasComponents(category: string, tempContextComponents: any): boolean {
    return tempContextComponents[category] && tempContextComponents[category].length > 0;
  }

  isProblemSelected(problemId: number, dqProblems: number[]): boolean {
    return dqProblems.includes(problemId);
  }

  onProblemCheckboxChange(problemId: number, dimension: any): void {
    const index = dimension.dq_problems.indexOf(problemId);

    if (index === -1) {
      // Agregar el problema si no está seleccionado
      dimension.dq_problems.push(problemId);
    } else {
      // Eliminar el problema si ya está seleccionado
      dimension.dq_problems.splice(index, 1);
    }
  }



  // Propiedades para el modal de confirmación
  // Propiedades para el modal de confirmación
  isConfirmationModalOpen: boolean = false;
  confirmationModalTitle: string = '';
  confirmationModalMessage: string = '';
  confirmedAction: (() => void) | null = null;

  

  openConfirmationModal(
    title: string,
    message: string,
    actionType: 'addToDQModel' | 'deleteDimension' | 'deleteFactor' | 'addDimensionToDQModel' | 'addFactorDQModel' | 'addDimAndFactorRecommendedToDQModel',  // Identificador de acción
    ...params: any[] // Parámetros para la acción
  ): void {
    this.confirmationModalTitle = title;
    this.confirmationModalMessage = message;

    // Guardar la acción confirmada según el tipo de acción
    if (actionType === 'addToDQModel') {
      const [selectedDimension, selectedFactor, ctxComponents, selectedProblems] = params;
      this.confirmedAction = () => {
        this.addToDQModel(selectedDimension, selectedFactor, ctxComponents, selectedProblems);
      };
    } else if (actionType === 'deleteDimension') {
      const [dimensionId] = params;
      this.confirmedAction = () => {
        this.deleteDimension(dimensionId);
      };
    } else if (actionType === 'deleteFactor') {
      const [factorId] = params;
      this.confirmedAction = () => {
        this.deleteFactor(factorId);
      };
    } else if (actionType === 'addDimensionToDQModel') {
      const [selectedDimension, ctxComponents, selectedProblems] = params;
      this.confirmedAction = () => {
        this.addDimToDQModel(selectedDimension, ctxComponents, selectedProblems);
      };
    } else if (actionType === 'addFactorDQModel') {
      const [selectedDQModelDimension, selectedFactor, ctxComponentsChecked_fromScratch, selectedProblemsFromScratch] = params;
      this.confirmedAction = () => {
        this.addDQFactorToDQModel(
          selectedDQModelDimension,
          selectedFactor,
          ctxComponentsChecked_fromScratch,
          selectedProblemsFromScratch
        );
      };
    } else if (actionType === 'addDimAndFactorRecommendedToDQModel') {
      const [ctxComponentsChecked_suggestion, selectedProblemsSuggestions] = params;
      this.confirmedAction = () => {
        this.addDQDimAndFactorToDQModel(
          ctxComponentsChecked_suggestion,
          selectedProblemsSuggestions
        );
      };
    }

    // Abrir el modal
    this.isConfirmationModalOpen = true;
  }


  addDQDimAndFactorToDQModel(selectedComponents: { id: number; category: string; value: string }[], selectedDQProblems: number[]) {

    // Manejar la lógica aquí con los parámetros recibidos
    console.log("--selected_Components in addDimAndFactorRecommendedToDQModel--", selectedComponents);
    console.log("--DQ PROBLEMS in addDimAndFactorRecommendedToDQModel--", selectedDQProblems);

    const selectedProblemIds = this.selectedProblemsSuggestions.map(problem => problem.dq_problem_id); //agrega id problema original
    console.log("--selected_Problem IDs in addDimAndFactorRecommendedToDQModel--", selectedProblemIds);


    const suggestedDimensionBaseId = this.suggestedDQDimensionBase.id;
    const suggestedFactorBaseId = this.suggestedDQFactorBase.id;

    console.log("Dimension ID sugerida:", this.suggestedDQDimensionBase.id);
    console.log("Factor ID sugerido:", this.suggestedDQFactorBase.id);

    this.submitNewDimension(suggestedDimensionBaseId, suggestedFactorBaseId, selectedComponents, selectedProblemIds);
    this.loadDQModelDimensionsAndFactors();
    
    /*
    this.addToDQModel(suggestedDimensionBaseId,
      suggestedFactorBaseId,
      selectedComponents, 
      selectedDQProblems);
      */
    /*this.addDimToDQModel(suggestedDimensionBaseId, selectedComponents, selectedDQProblems);
    this.addDQFactorToDQModel(
      suggestedDimensionBaseId,
      suggestedFactorBaseId,
      selectedComponents, 
      selectedDQProblems
    );*/


  }
  


  addDQFactorToDQModel(
    selectedDQModelDimensionId: number,
    selectedFactorBaseId: number,
    ctxComponents: { id: number; category: string; value: string }[],
    selectedProblems: any[]
  ): void {
    // 1. Convertir problemas a IDs si es necesario
    const problemIds = selectedProblems.map(p => p.dq_problem_id || p.id);
  
    // 2. Construir el payload del factor
    const factorToAdd = {
      factor_base: selectedFactorBaseId,
      dimension: selectedDQModelDimensionId, // ID de la dimensión EN EL DQ MODEL (no dimension_base)
      dq_model: this.dqModelId,
      context_components: buildContextComponents(ctxComponents),
      dq_problems: problemIds
    };
  
    // 3. Verificar si el factor ya existe en la dimensión
    this.modelService.getFactorsByDQModelAndDimension(
      this.dqModelId,
      selectedDQModelDimensionId
    ).subscribe({
      next: (existingFactors) => {
        const isDuplicate = existingFactors.some(f => f.factor_base === selectedFactorBaseId);
        
        if (isDuplicate) {
          alert('This factor already exists in the selected dimension.');
          return;
        }
  
        // 4. Crear el factor en el DQ Model
        this.modelService.addFactorToDQModel(factorToAdd).subscribe({
          next: (newFactor) => {
            console.log('Factor added to DQ Model:', newFactor);
            this.loadDQModelDimensionsAndFactors(); // Actualizar vista
            alert(`Factor "${newFactor.factor_name}" added successfully!`);
            //this.clearSelections();
            this.selectedDQModelDimension = null;
            this.selectedFactor = null;
            this.ctxComponentsChecked_fromScratch = [];
            this.selectedProblemsFromScratch = [];
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Error adding factor:', err);
            alert('Error: ' + (err.error?.message || 'Failed to add factor'));
          }
        });
      },
      error: (err) => {
        console.error('Error checking existing factors:', err);
      }
    });
  }

  clearSelections(): void {
    this.selectedDQModelDimension = null;
    this.selectedFactor = null;
    this.ctxComponentsChecked_fromScratch = [];
    this.selectedProblemsFromScratch = [];
    this.cdr.detectChanges();
  }

  // Método para manejar la confirmación
  handleConfirm(): void {
    if (this.confirmedAction) {
      this.confirmedAction(); // Ejecutar la acción confirmada
    }
    this.isConfirmationModalOpen = false;
  }

  // Método para manejar la cancelación
  handleCancel(): void {
    this.isConfirmationModalOpen = false;
    this.confirmedAction = null;
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



  // Método cuando se selecciona una dimensión del DQ Model
  onDQModelDimensionChange0(): void {
    this.clearSelectedComponents();
    this.clearDQProblemsSelection();
    
    if (this.selectedDQModelDimension) {
      // Encontrar la dimensión base asociada a la dimensión del DQ Model seleccionada
      const selectedDimension = this.availableDQModelDimensions.find(
        dim => dim.id === this.selectedDQModelDimension
      );
      
      if (selectedDimension) {
        // Cargar los factores base para esta dimensión base
        this.getFactorsBaseByDimension(selectedDimension.dimension_base);
      }
    }
    
    this.selectedFactor = null;
  }

  onDQModelDimensionChange(): void {
    this.clearSelectedComponents();
    this.clearDQProblemsSelection();
    
    if (this.selectedDQModelDimension) {
      this.loadFactorsForSelectedDimension(this.selectedDQModelDimension);
    }
    
    this.selectedFactor = null;
  }

  // Modificar el método para agregar factores
  addFactorToDQModel(): void {
    if (!this.selectedDQModelDimension || !this.selectedFactor) {
      console.log('Por favor, selecciona una dimensión del DQ Model y un factor.');
      return;
    }

    const selectedFactorObj = this.dqFactorsBase.find(factor => factor.id === this.selectedFactor);
    const selectedDimensionObj = this.availableDQModelDimensions.find(
      dim => dim.id === this.selectedDQModelDimension
    );

    const confirmMessage = `¿Estás seguro de que deseas agregar el DQ Factor "${selectedFactorObj.name}" a la DQ Dimension "${selectedDimensionObj.dimension_name}" en el DQ Model?`;

    if (confirm(confirmMessage)) {
      const factorToAdd = {
        factor_base: this.selectedFactor,
        dimension: this.selectedDQModelDimension, // ID de la dimensión en el DQ Model
        dq_model: this.dqModelId,
        context_components: buildContextComponents(this.ctxComponentsChecked_fromScratch),
        dq_problems: this.selectedProblemsFromScratch.map(problem => problem.dq_problem_id)
      };

      this.modelService.addFactorToDQModel(factorToAdd).subscribe({
        next: (data) => {
          console.log("DQ Factor added to DQ Model:", data);
          this.loadDQModelDimensionsAndFactors(); // Actualizar la vista
          alert(`DQ Factor "${data.factor_name}" agregado exitosamente.`);
          //this.clearSelections();
        },
        error: (err) => {
          console.error("Error adding the factor:", err);
          alert("Error al agregar el factor.");
        }
      });
    }
  }

  /**
   * Carga los factores base para una dimensión específica del DQ Model seleccionada
   * @param selectedDQModelDimensionId ID de la dimensión del DQ Model seleccionada
   */
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

    console.log(`Cargando factores base para dimensión base ID: ${selectedDimension.dimension_base}`);

    this.modelService.getFactorsBaseByDimensionId(selectedDimension.dimension_base).subscribe({
      next: (factors) => {
        this.availableFactors = factors;
        console.log(`Factores base cargados para dimensión ${selectedDimension.dimension_name}:`, factors);
      },
      error: (err) => {
        console.error(`Error cargando factores para dimensión base ${selectedDimension.dimension_base}:`, err);
        this.availableFactors = [];
      }
    });
  }


  //AI SUGGESTIONS -----------------
  
  
  removeFactorByName(factorName: string): void {
    for (const dimension in this.dimensionsAndFactors) {
      const factors = this.dimensionsAndFactors[dimension].factors;
      if (factors && factorName in factors) {
        delete factors[factorName];
        console.log(`Factor '${factorName}' eliminado de la dimensión '${dimension}'.`);
        break;
      }
    }
  }

  // PAYLOAD
  convertContextComponents(contextComponents: any): any {
    const abbreviated: any = {};

    if (contextComponents.applicationDomain) {
      abbreviated.appDomain = contextComponents.applicationDomain.map((item: any) => ({
        n: item.name,
        id: item.id
      }));
    }

    if (contextComponents.businessRule) {
      abbreviated.bizRule = contextComponents.businessRule.map((item: any) => ({
        s: item.statement,
        id: item.id,
        sem: item.semantic
      }));
    }

    if (contextComponents.dataFiltering) {
      abbreviated.dataFilter = contextComponents.dataFiltering.map((item: any) => ({
        s: item.statement,
        id: item.id,
        desc: item.description,
        task: item.taskAtHandId
      }));
    }

    if (contextComponents.dqMetadata) {
      abbreviated.dqMeta = contextComponents.dqMetadata.map((item: any) => ({
        p: item.path,
        id: item.id,
        desc: item.description,
        meas: item.measuredMetrics
      }));
    }

    if (contextComponents.dqRequirement) {
      abbreviated.dqReq = contextComponents.dqRequirement.map((item: any) => ({
        s: item.statement,
        id: item.id,
        desc: item.description,
        dataFilterIds: item.dataFilterIds,
        userTypeId: item.userTypeId
      }));
    }

    if (contextComponents.otherData) {
      abbreviated.otherData = contextComponents.otherData.map((item: any) => ({
        p: item.path,
        id: item.id,
        desc: item.description,
        own: item.owner
      }));
    }

    if (contextComponents.otherMetadata) {
      abbreviated.otherMeta = contextComponents.otherMetadata.map((item: any) => ({
        p: item.path,
        id: item.id,
        desc: item.description,
        auth: item.author,
        lastUpd: item.lastUpdated
      }));
    }

    if (contextComponents.systemRequirement) {
      abbreviated.sysReq = contextComponents.systemRequirement.map((item: any) => ({
        s: item.statement,
        id: item.id,
        desc: item.description
      }));
    }

    if (contextComponents.taskAtHand) {
      abbreviated.task = contextComponents.taskAtHand.map((item: any) => ({
        n: item.name,
        id: item.id,
        purp: item.purpose
      }));
    }

    if (contextComponents.userType) {
      abbreviated.userType = contextComponents.userType.map((item: any) => ({
        n: item.name,
        id: item.id,
        char: item.characteristics
      }));
    }

    return abbreviated;
  }

  convertProblemsToMap(problemsArray: any[]): { [key: number]: string } {
    const problemMap: { [key: number]: string } = {};
    for (const problem of problemsArray) {
      problemMap[problem.dq_problem_id] = problem.description;
    }
    return problemMap;
  }

  // RESPONSE
  expandAbbreviatedContext(context: any): any {
    const expanded: any = {};
  
    if (context.appDomain) {
      expanded.applicationDomain = context.appDomain.map((item: any) => ({
        id: item.id,
        name: item.n
      }));
    }
  
    if (context.bizRule) {
      expanded.businessRule = context.bizRule.map((item: any) => ({
        id: item.id,
        statement: item.s,
        semantic: item.sem
      }));
    }
  
    if (context.dataFilter) {
      expanded.dataFiltering = context.dataFilter.map((item: any) => ({
        id: item.id,
        statement: item.s,
        description: item.desc,
        taskAtHandId: item.task
      }));
    }
  
    if (context.dqMeta) {
      expanded.dqMetadata = context.dqMeta.map((item: any) => ({
        id: item.id,
        path: item.p,
        description: item.desc,
        measuredMetrics: item.meas
      }));
    }
  
    if (context.dqReq) {
      expanded.dqRequirement = context.dqReq.map((item: any) => ({
        id: item.id,
        statement: item.s,
        description: item.desc,
        dataFilterIds: item.dataFilterIds,
        userTypeId: item.userTypeId
      }));
    }
  
    if (context.otherData) {
      expanded.otherData = context.otherData.map((item: any) => ({
        id: item.id,
        path: item.p,
        description: item.desc,
        owner: item.own
      }));
    }
  
    if (context.otherMeta) {
      expanded.otherMetadata = context.otherMeta.map((item: any) => ({
        id: item.id,
        path: item.p,
        description: item.desc,
        author: item.auth,
        lastUpdated: item.lastUpd
      }));
    }
  
    if (context.sysReq) {
      expanded.systemRequirement = context.sysReq.map((item: any) => ({
        id: item.id,
        statement: item.s,
        description: item.desc
      }));
    }
  
    if (context.task) {
      expanded.taskAtHand = context.task.map((item: any) => ({
        id: item.id,
        name: item.n,
        purpose: item.purp
      }));
    }
  
    if (context.userType) {
      expanded.userType = context.userType.map((item: any) => ({
        id: item.id,
        name: item.n,
        characteristics: item.char
      }));
    }
  
    return expanded;
  }

  renameContextKeys(supportedByContext: any): any {
    const keyMap: { [key: string]: string } = {
      appDomain: 'applicationDomain',
      bizRule: 'businessRule',
      dataFilter: 'dataFiltering',
      dqMeta: 'dqMetadata',
      dqReq: 'dqRequirement',
      otherData: 'otherData',
      otherMeta: 'otherMetadata',
      sysReq: 'systemRequirement',
      task: 'taskAtHand',
      userType: 'userType'
    };
  
    const renamed: any = {};
  
    for (const shortKey in supportedByContext) {
      const fullKey = keyMap[shortKey] || shortKey;
      renamed[fullKey] = supportedByContext[shortKey];
    }
  
    return renamed;
  }
  

  markCtxComponentsFromSuggestion(supportedByContext: any): void {
    this.ctxComponentsChecked_suggestion = [];
  
    for (const category in supportedByContext) {
      const ids: number[] = supportedByContext[category];
  
      if (!this.allContextComponents[category]) continue;
  
      ids.forEach(id => {
        const component = this.allContextComponents[category].find((item: any) => item.id === id);
        if (component) {
          this.ctxComponentsChecked_suggestion.push({
            id: component.id,
            category,
            value: this.getFirstNonIdAttribute(component)
          });
        }
      });
    }
  }
  
  markDQProblemsFromSuggestion(supportedByProblems: number[]): void {
    this.selectedProblemsSuggestions = [];

    supportedByProblems.forEach(problemId => {
      const matched = this.selectedPrioritizedProblems.find(p => p.dq_problem_id === problemId);
      if (matched) {
        this.selectedProblemsSuggestions.push(matched);
      }
    });
  }


  dimAndFactorSuggested: any;
  generatedSuggestion: any;

  generateDimensionFactorSuggestion(): void {
    this.isLoading = true;

    const payload = {
      dimensions_and_factors: this.dimensionsAndFactors,
      dq_problems: this.convertProblemsToMap(this.selectedPrioritizedProblems),
      context_components: this.convertContextComponents(this.allContextComponents)
    };

    console.log("payload: ", payload)
  
    this.modelService.generateDQDimensionFactorSuggestion(payload).subscribe({
      next: (response) => {
        console.log('✅ Sugerencia recibida:', response);

        if (response.supported_by_context) {

          //response.supported_by_context = this.renameContextKeys(response.supported_by_context);
          

          const supported_by_ctxComponents_abbr = response.supported_by_context
          //response.supported_by_context = this.expandAbbreviatedContext(response.supported_by_context);
          const supported_by_ctxComponents = this.renameContextKeys(supported_by_ctxComponents_abbr);

          console.log("supported_by_ctxComponents", supported_by_ctxComponents)

          //SETEAR CTX COMPONENTS en el SELECT CHECkbox
          //this.ctxComponentsChecked_suggestion = this.selectRandomComponents();
          console.log("Componentes de contexto sugerencia:", this.ctxComponentsChecked_suggestion);

          // 👇 Marcar los checkboxes correspondientes
          this.markCtxComponentsFromSuggestion(supported_by_ctxComponents);
          this.markDQProblemsFromSuggestion(response.supported_by_problems);


          //this.ctxComponentsChecked_suggestion = response.supported_by_context;
          //console.log("this.ctxComponentsChecked_suggestion", this.ctxComponentsChecked_suggestion);
        }

        this.dimAndFactorSuggested = response;

        const suggestedDQDimensionName = response.recommended_dimension;
        const suggestedDQFactorName = response.recommended_factor;

        const suggestedDimensionObj = this.dqDimensionsBase.find(dim => dim.name === suggestedDQDimensionName);
        const suggestedFactorObj = this.dqFactorsBase.find(factor => factor.name === suggestedDQFactorName);

        //response.recommended_dimension = suggestedDimensionObj
        //response.recommended_factor = suggestedFactorObj

        this.suggestedDQDimensionBase = suggestedDimensionObj;
        this.suggestedDQFactorBase = suggestedFactorObj;

        console.log("Dimension sugerida:", this.suggestedDQDimensionBase);
        console.log("Factor sugerido:", this.suggestedDQFactorBase);

        this.generatedSuggestion = response;
        console.log("this.generatedSuggestion:", this.generatedSuggestion);

        this.isLoading = false;

      },
      error: (err) => {
        console.error('❌ Error al generar sugerencia:', err);
        this.isLoading = false;
      }
    });
  }
  
  



}