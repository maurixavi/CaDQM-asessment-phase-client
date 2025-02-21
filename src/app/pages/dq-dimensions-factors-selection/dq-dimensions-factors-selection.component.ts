import { Component, OnInit, ViewEncapsulation, HostListener, AfterViewInit } from '@angular/core';
import { DqProblemsService } from '../../shared/dq-problems.service';
import { DqModelService } from '../../services/dq-model.service';
import { Router } from '@angular/router';

import { ProjectService } from '../../services/project.service';

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

@Component({
  selector: 'app-dq-dimensions-factors-selection',
  templateUrl: './dq-dimensions-factors-selection.component.html',
  styleUrls: ['./dq-dimensions-factors-selection.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class DqDimensionsFactorsSelectionComponent implements OnInit {
  currentStep: number = 2;
  pageStepTitle: string = 'Selection of DQ dimensions and DQ factors';
  phaseTitle: string = 'Phase 2: DQ Assessment';
  stageTitle: string = 'Stage 4: DQ Model Definition';


  /* CONTEXT variables */
  //contextComponents: any[] = []; 

  selectedComponents: ContextComponent[] = [];
  selectedComponent: ContextComponent | undefined;  // Cambiado a undefined
  private contextModel: any; // Para almacenar el modelo de contexto completo
  contextComponentsGrouped: { type: string; ids: number[] }[] = [];


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

  //PROJECT
  project: any; 


  constructor(
    private router: Router,
    private problemsService: DqProblemsService,
    private modelService: DqModelService,
    private projectService: ProjectService
  ) { }

  


  //inicializacion, pruebas
  context: any; // Variable para almacenar el contexto obtenido
  id_context: number = 1; // Inicializa con el ID que deseas probar.
  contextVersionId: number = -1; // Inicializa con el ID que deseas probar.

  currentDQModel: any; // Variable para almacenar el DQ Model obtenido

  //dqModelId: number | null = null;

  dqModelId: number = -1; // Inicializar con un valor que indique que aún no ha sido asignado

  noModelMessage: string = "";  

  //currentDQModel: any = null; 

  dimensionsWithFactors: { dimension: any, factors: any[] }[] = [];


  ngOnInit() {
    //Cargar opciones select Dimensiones y Factores base
    this.getDQDimensionsBase();
    this.getDQFactorsBase();

    //Cargar Proyecto actual y DQ Model asociado
    this.loadCurrentProject();
    //this.loadCompleteCurrentDQModel();


  

    //Pruebas metodos, endpoints, etc
    //this.getDQModels();
    
  }


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




/*  ngAfterViewInit() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }*/

  

  
  // PROJECT
  loadCurrentProject(): void {
    this.projectService.loadCurrentProject().subscribe({
      next: (project) => {
        this.project = project;
        console.log('Proyecto cargado en el componente:', this.project);
        this.contextVersionId = project.context_version;
        console.log("this.contextVersionId ", this.contextVersionId );

        if (this.contextVersionId !== -1){
          this.getContextComponents(this.contextVersionId);
          this.getSelectedPrioritizedDqProblems(this.project.dqmodel_version);
        }
        

        //Load complete DQ Model (with Dimensions,Factors...) of current project
        this.loadCompleteCurrentDQModel();
      },
      error: (err) => {
        console.error('Error al cargar el proyecto en el componente:', err);
      }
    });
  }

  getAllContextComponents(contextVersionId: number): void {
    this.projectService.getContextComponents(contextVersionId).subscribe({
      next: (data) => {
        console.log('---Context Components context_version:---', data);
        this.context_Components = data;
      },
      error: (err) => console.error('Error fetching context components:', err)
    });
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

  context_Components: any; // Variable para almacenar el contexto obtenido

  //context_Components: any = {};
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
        this.context_Components = data;
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
  //para mostrar componentes de contexto por categoria
  formatCategoryName(category: string): string {
    return category.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
  }

  getFirstNonIdAttribute(item: any): string {
    const keys = Object.keys(item);
    const firstNonIdKey = keys.find((key) => key !== 'id');
    return firstNonIdKey ? item[firstNonIdKey] : '';
  }
  
  //seleccion de componentes de contexto
  selected_Components: { id: number; category: string; value: string }[] = [];


  onCheckboxChange(id: number, category: string, value: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const isChecked = input?.checked || false;
  
    if (isChecked) {
      // Agregar el componente seleccionado
      this.selected_Components.push({ id, category, value });
    } else {
      // Eliminar el componente desmarcado
      this.selected_Components = this.selected_Components.filter(
        (component) => !(component.category === category && component.value === value)
      );
    }
  }

 
  onCheckboxChangeCtxSuggestions(id: number, category: string, value: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const isChecked = input?.checked || false;
  
    if (isChecked) {
      // Agregar el componente seleccionado
      this.suggestionCtxComponents.push({ id, category, value });
    } else {
      // Eliminar el componente desmarcado
      this.suggestionCtxComponents = this.suggestionCtxComponents.filter(
        (component) => !(component.category === category && component.value === value)
      );
    }
  }

  // Validar si un componente está seleccionado
  isComponentSelected(category: string, value: string): boolean {
    return this.selected_Components.some(
      (component) => component.category === category && component.value === value
    );
  }

  removeSelectedComponent(componentToRemove: any): void {
    // Filtra la lista para excluir el componente a eliminar
    this.selected_Components = this.selected_Components.filter(
      (component) => component !== componentToRemove
    );
  }


  isComponentSelectedInSuggestions(category: string, value: string): boolean {
    return this.suggestionCtxComponents.some(
      (component) => component.category === category && component.value === value
    );
  }

  removeSelectedComponentInSuggestions(componentToRemove: any): void {
    // Filtra la lista para excluir el componente a eliminar
    this.suggestionCtxComponents = this.suggestionCtxComponents.filter(
      (component) => component !== componentToRemove
    );
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

  // PROBLEMAS PRIORIZADOS SELECCIONADOS
  selectedPrioritizedProblems: any[] = [];

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

  selectedProblems: any[] = []; // Array para almacenar los problemas seleccionados
  //isEditSuggestedDQProblemsVisible = true; // Mostrar/ocultar checkboxes

  // Maneja los cambios en los checkboxes
  onCheckboxProblemsChange(problem: any, event: Event) {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.selectedProblems.push(problem);
    } else {
      this.selectedProblems = this.selectedProblems.filter(p => p.id !== problem.id);
    }
    console.log("CHECQUEADO: ", this.selectedProblems)
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



  // PROJECTS
  


 


  addContextComponent() {
    if (this.selectedComponent && 
        !this.selectedComponents.some(c => 
          c.id === this.selectedComponent?.id && 
          c.type === this.selectedComponent?.type
        )) {
      this.selectedComponents.push(this.selectedComponent);
      this.selectedComponent = undefined;
    }
  }

 





  //DQ MODELS
  getDQModels() {
    this.modelService.getAllDQModels().subscribe({
      next: (data) => {
        console.log("*All DQ Models loaded:", data);
        this.dqModels = data;
      },
      error: (err) => console.error("Error loading DQ Models:", err)
    });
  }

  getDQModelById(dqmodelId: number): void {
    this.modelService.getDQModelById(dqmodelId).subscribe({
      next: (data) => {
        this.currentDQModel = data; // almacena el DQ Model obtenido
        this.noModelMessage = ""; // resetea el mensaje si se obtiene el modelo
        console.log("DQ Model obtenido:", data); 
      },
      error: (err) => {
        if (err.status === 404) {
          this.currentDQModel = null; // Reinicia el modelo
          this.noModelMessage = "No DQ Model found with this ID. Please check and try again.";  
        } else {
          console.error("Error loading DQ Model:", err);
          this.currentDQModel = null; // Reinicia en caso de error
          this.noModelMessage = "An error occurred while loading the DQ Model. Please try again later.";  
        }
      }
    });
  }


  //DIMENSIONS BASE
  // Suscripcion al observable del servicio
  getDQDimensionsBase() {
    this.modelService.getAllDQDimensionsBase().subscribe({
      next: (data) => {
        this.dqDimensionsBase = data;
        //console.log('*All DIMENSIONS BASE loaded:', data);
        this.loadFactorsForAllDimensions(data); // Cargar factores para todas las dimension
      },
      error: (err) => console.error("Error loading Dimensions Base:", err)
    });
  }

  loadFactorsForAllDimensions(dimensions: any[]) {
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
    console.log(`Dimensión seleccionada: ${this.selectedDimension}`);
    if (this.selectedDimension) {
      this.getFactorsBaseByDimension(this.selectedDimension); 
      this.selectedFactors = [];
      this.errorMessage = ''; 
    }
    this.selectedFactor = null;
  }

  selectedFactorDetails: any | null = null;
  onFactorChange() {
    console.log('Factor seleccionado:', this.selectedFactor);
    this.selectedFactorDetails = this.availableFactors.find(factor => factor.id === this.selectedFactor);
    console.log("this.selectedFactorDetails", this.selectedFactorDetails);
    /*this.getSelectedFactor();
    console.log("this.getSelectedFactor", this.getSelectedFactor());*/
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

      this.modelService.createDQFactor(newFactor).subscribe({
        next: (response) => {
          console.log('Factor creado con éxito:', response);
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

  isFactorModalOpen = false; 
  selectedDimensionName: string = ''; 

  openFactorModal(): void {
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


  /*------- DQ MODEL: DIMENSIONS AND FACTORS -------*/
  // Agregar COMPONENTES DE CONTEXTO ENDPOINT
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

 

  addToDQModel(selectedDimension2: any, selectedFactor2: any, selectedComponents: { id: number; category: string; value: string }[]) {

    if (!selectedDimension2 || !selectedFactor2) {
      console.log('Por favor, selecciona una dimensión y un factor.');
      return;
    }
    // Manejar la lógica aquí con los parámetros recibidos
    console.log('Dimensión seleccionada:', selectedDimension2);
    console.log('Factor seleccionado:', selectedFactor2);
    console.log("--selected_Components in addToDQModel--", selectedComponents);

    this.submitNewDimension(selectedDimension2, selectedFactor2, selectedComponents);
    this.loadDQModelDimensionsAndFactors();
  }

  
  
  submitNewDimension(selectedDimension: any, selectedFactor: any, selectedComponents: { id: number; category: string; value: string }[]): void {

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
    const confirmMessage = `Are you sure you want to add the DQ Dimension "${dimensionName}" and the DQ Factor "${factorName}" to the DQ Model?`;

    if (window.confirm(confirmMessage)) {
  
      // verificar si la dimension ya existe
      this.modelService.getDimensionsByDQModel(this.dqModelId).subscribe((existingDimensions) => {
        const existingDimension = existingDimensions.find(dim => dim.dimension_base === selectedDimension);
    
        if (existingDimension) {
          // Si la dimensión ya existe, solo agrega el factor asociado a la Dimension
          this.addedDimensionId = existingDimension.id;
          console.log("Dimensión ya existente, ID:", this.addedDimensionId);
          console.log("Dimensión ya existente, Ctx Components:", existingDimension.context_components);
      
          const existingComponents = existingDimension.context_components;
          const newComponents = this.buildContextComponents(selectedComponents);
          
          // Crear una copia del objeto existente para combinar los componentes
          const mergedComponents = JSON.parse(JSON.stringify(existingComponents));
      
          // Combinar los componentes existentes con los nuevos, evitando duplicados
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
      
          // Verificar si hay cambios en alguna categoría
          const hasChanges = Object.keys(mergedComponents).some(category => 
              JSON.stringify(mergedComponents[category]) !== JSON.stringify(existingComponents[category])
          );
      
          if (hasChanges) {
              const updatedDimension = {
                  context_components: mergedComponents
              };
      
              this.modelService.updateDQDimensionContextComponents(existingDimension.id, updatedDimension).subscribe({
                  next: () => {
                      console.log("Componentes actualizados exitosamente en la dimensión.");
                      this.submitNewFactor(selectedFactor, selectedComponents);
                  },
                  error: (err) => {
                      console.error("Error al actualizar la dimensión:", err);
                      alert("Error updating dimension context components.");
                  }
              });
          } else {
              console.log("No hay cambios en los componentes.");
              this.submitNewFactor(selectedFactor, selectedComponents);
          }
      

        } else {
          // Construir los context_components
          const contextComponents = this.buildContextComponents(selectedComponents);
          console.log("***DIM: this.buildContextComponents()", this.buildContextComponents(selectedComponents))

          // Crear una nueva dimensión con los context_components
          const dimensionToAdd = {
            dq_model: this.dqModelId,
            dimension_base: selectedDimension!,
            context_components: contextComponents,
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

              this.submitNewFactor(selectedFactor, selectedComponents);
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
  }

  submitNewFactor(selectedFactor: any, selectedComponents: { id: number; category: string; value: string }[]): void { 
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
        const contextComponents = this.buildContextComponents(selectedComponents);
        console.log("***FACT: this.buildContextComponents()", this.buildContextComponents(selectedComponents))

        const factorToAdd = {
          factor_base: selectedFactor!,
          dimension: this.addedDimensionId!,
          dq_model: this.dqModelId,
          context_components: contextComponents,
        };
  
        this.modelService.addFactorToDQModel(factorToAdd).subscribe({
          next: (data) => {
            console.log("DQ Factor added to DQ Model:", data);

            this.loadDQModelDimensionsAndFactors(); //update DQ Model
 
            const successMessage = `DQ Factor "${data.factor_name}" was successfully added to the DQ Model.`;

            alert(successMessage);

            //alert("Factor data successfully added to DQ Model.");
            this.clearSelectedComponents();  // Limpiar la selección de componentes
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
    this.selected_Components = [];  // Limpiar la lista de componentes seleccionados
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

      this.addToDQModel(dimensionBaseId, factorBaseId, []);

    });

    this.clearSelectionFromDQProblems()
  }
  


  // DQ MODEL: SHOW DIMENSIONS and FACTORS added  
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
        //console.log("+++ this.dqmodel_dimensions: ", this.dqmodel_dimensions);
        this.dimensionsWithFactorsInDQModel = [];
        
  
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
  
            // Obtener componentes de contexto de la dimensión
            const dimensionContextComponents = dimension.context_components || [];
            //console.log(`Context components for dimension ${dimension.dimension_name}:`, dimensionContextComponents);


            // Obtener los detalles del factor base para cada factor
            const factorsWithBaseAttributes  = await Promise.all(factors.map(async (factor) => {
              const factorBaseAttributes = await this.modelService.getFactorBaseById(factor.factor_base).toPromise();
              
              // Obtener componentes de contexto del factor
              const factorContextComponents = factor.context_components || [];
              /* console.log(`Context components for factor ${factor.factor_name}:`, factorContextComponents); */
              
              return {
                ...factor,
                baseAttributes: factorBaseAttributes,
                context_components: factorContextComponents,
              };

            }));
  
            return {
              dimension,
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
        console.log("DQ MODEL: Dimensions with Factors:", this.dimensionsWithFactorsInDQModel)
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

  /*getKeys(obj: any): string[] {
    return Object.keys(obj);
  }*/

  //used in html
  formatContextComponents(contextComponents: any): string {
    const formattedComponents: string[] = [];
  
    // Iterar sobre las claves del objeto
    for (const key of Object.keys(contextComponents)) {
      const values = contextComponents[key];
      if (values.length > 0) {
        // Formatear cada clave y sus valores con HTML
        const formattedValues = values.map((v: any) => `${key}${v}`).join(', ');
        formattedComponents.push(`<strong>${key}:</strong> ${formattedValues}`);
      }
    }
  
    // Combinar los resultados con punto y coma
    return formattedComponents.join('; ');
  }
  
  formatContextComponents0(contextComponents: any): string {
    const formattedComponents: string[] = [];
  
    // Iterar sobre las claves del objeto
    for (const key of Object.keys(contextComponents)) {
      const values = contextComponents[key];
      if (values.length > 0) {
        // Formatear cada clave y sus valores
        const formattedValues = values.map((v: any) => `${key}${v}`).join(', ');
        formattedComponents.push(`${key}: ${formattedValues}`);
      }
    }
  
    // Combinar los resultados con punto y coma
    return formattedComponents.join('; ');
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

    const confirmationMessage = `Are you sure you want to remove this DQ Factor from the DQ Model?`;

    const userConfirmed = confirm(confirmationMessage);
  
    if (userConfirmed) {
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
    } else {
      console.log("Eliminación del factor cancelada por el usuario.");
    }
  }

  //OTHER METHODS
  scrollToDiv(divId: string): void {
    const element = document.getElementById(divId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
  
  goToNextStep() {
    this.router.navigate(['/step4']);
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


  isFromScratchSectionVisible: boolean = false;  

  toggleFromScratchSectionVisibility() {
    this.isFromScratchSectionVisible = !this.isFromScratchSectionVisible;  
  }

  isFromProblemsSectionVisible: boolean = false;  

  toggleFromProblemsSectionVisibility() {
    this.isFromProblemsSectionVisible = !this.isFromProblemsSectionVisible;  
  }

  isSuggestionsSectionVisible: boolean = true;  

  toggleSuggestionsSectionVisibility() {
    this.isSuggestionsSectionVisible = !this.isSuggestionsSectionVisible;  
  }


  // Método para verificar si una categoría tiene componentes seleccionados
  hasSelectedComponents(category: string): boolean {
    return this.suggestionCtxComponents.some(component => component.category === category);
  }

  suggestedDQDimensionBase: any;
  suggestedDQFactorBase: any;

  suggestionCtxComponents: { id: number; category: string; value: string }[] = [];


  selectRandomComponents() {
    // Reinicia la selección
    this.suggestionCtxComponents = [];

    // Aplanar todos los componentes en un solo array
    const allComponents: { id: number; category: string; value: string }[] = [];

    const context_Components = this.context_Components

    // Itera sobre cada categoría de componentes
    Object.keys(context_Components).forEach(category => {
      context_Components[category].forEach((component: { id: any; name: any; statement: any; filter: any; metadata: any; requirement: any; data: any; task: any; type: any; }) => {
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

  // Función para seleccionar componentes aleatorios
  selectRandomComponents_() {
    // Reinicia la selección
    this.suggestionCtxComponents = [];

    const allCtxComponents = this.context_Components

    // Itera sobre cada categoría de componentes
    Object.keys(allCtxComponents).forEach(category => {
      const components = allCtxComponents[category];

      // Selecciona un componente aleatorio de la categoría actual
      if (components.length > 0) {
        const randomIndex = Math.floor(Math.random() * components.length);
        const selectedComponent = components[randomIndex];

        // Agrega el componente seleccionado a la lista
        this.suggestionCtxComponents.push({
          id: selectedComponent.id,
          category: category,
          value: selectedComponent.name || selectedComponent.statement || selectedComponent.filter || selectedComponent.metadata || selectedComponent.requirement || selectedComponent.data || selectedComponent.task || selectedComponent.type
        });
      }
    });

    console.log("suggestionCtxComponents", this.suggestionCtxComponents)

  }

  // Método para generar un DQ Factor y su DQ Dimension
  generateSuggestion() {
    /*
    console.log("dqDimensionsBase", this.dqDimensionsBase);
    console.log("dqFactorsBase", this.dqFactorsBase);*/

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
    this.suggestionCtxComponents = this.selectRandomComponents();
    console.log("Componentes de contexto sugeridos:", this.suggestionCtxComponents);

  }

  getSuggestedDimension(): any {
    return this.suggestedDQDimensionBase;
  }

  getSuggestedFactor(): any {
    return this.suggestedDQFactorBase;
  }

}