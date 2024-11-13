import { Component, OnInit, ViewEncapsulation, HostListener } from '@angular/core';
import { DqProblemsService } from '../../shared/dq-problems.service';
import { DqModelService } from '../../services/dq-model.service';
import { Router } from '@angular/router';

import { ProjectService } from '../../services/project.service';

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
  contextComponents: ContextComponent[] = [];
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

  currentDQModel: any; // Variable para almacenar el DQ Model obtenido

  //dqModelId: number | null = null;

  dqModelId: number = -1; // Inicializar con un valor que indique que aún no ha sido asignado

  noModelMessage: string = "";  

  //currentDQModel: any = null; 

  ngOnInit() {
    //Cargar opciones select Dimensiones y Factores base
    this.getDQDimensionsBase();
    this.getDQFactorsBase();

    //Cargar Proyecto actual y DQ Model asociado
    this.loadCurrentProject();
    //this.loadCompleteCurrentDQModel();


    //this.loadContextData();

    //others - context
    this.getContext();
    this.loadContextById(this.id_context);

    //Pruebas metodos, endpoints, etc
    //this.getDQModels();
    
  }


  
  // PROJECT
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



  contextData: any[] = []; // Variable para almacenar los datos


  loadContextData(): void {
    this.modelService.getContext().subscribe({
      next: (data) => {
        this.contextData = data;
        console.log("Datos de contexto recibidos:", this.contextData);
      },
      error: (err) => {
        console.error("Error al obtener datos de contexto:", err);
      }
    });
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
  


  loadContextById(id: number) {
    this.modelService.getContextById(id).subscribe({
      next: (data) => {
        this.context = data; // Almacena el contexto obtenido
        if (this.context) {
          console.log('Contexto obtenido:', this.context);
        } else {
          console.error('Contexto no encontrado.');
        }
      },
      error: (err) => {
        console.error('Error al obtener contexto:', err);
      }
    });
  }


  // Nueva versión de getContext
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

  loadContextOptions() {
    //console.log('Loading context options...');
    this.contextComponents = [];
    
    if (!this.contextModel) {
      console.error('Context model is null or undefined');
      return;
    }
  
    try {
      for (const type in this.contextModel) {
        if (this.contextModel.hasOwnProperty(type)) {
          const items = this.contextModel[type];
          
          if (Array.isArray(items)) {
            items.forEach((item: any) => {
              const component: ContextComponent = {
                type: type,
                id: item.id,
                // Asigna el nombre en lugar del id en displayText
                displayText: `${this.formatTypeLabel(type)}: ${item.name || item.statement || item.path || ""}` 
              };
              this.contextComponents.push(component);
            });
          } else {
            //console.warn(`Items for type ${type} is not an array:`, items);
          }
        }
      }
      
    } catch (error) {
      console.error('Error in loadContextOptions:', error);
    }
  }

  private formatTypeLabel(type: string): string {
    try {
      return type
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    } catch (error) {
      console.error('Error formatting type label:', error);
      return type;
    }
  }

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

  /*removeContextComponent(component: ContextComponent) {
    const index = this.selectedComponents.findIndex(
      c => c.id === component.id && c.type === component.type
    );
    if (index > -1) {
      this.selectedComponents.splice(index, 1);
      console.log('Updated selected components after removal:', this.selectedComponents);
    }
  }*/

  // Método auxiliar para debug
  logContextData() {
    console.log('Current state:');
    console.log('contextComponents:', this.contextComponents);
    console.log('selectedComponent:', this.selectedComponent);
    console.log('selectedComponents:', this.selectedComponents);
    console.log('contextModel:', this.contextModel);
  }

  // Versión anterior de getContext 
  /*
  getContext() {
    this.modelService.getCtxComponents().subscribe({
      next: (data) => {
        console.log("Context components loaded:", data);
        const contextModel = data.context_model;
        this.contextComponents = [];
  
        if (contextModel) {
          this.groupContextComponents(contextModel);
        }
      },
      error: (err) => console.error("Error loading context components:", err)
    });
  }
  */

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

  // Nueva versión de getComponentByTypeAndId
  getComponentByTypeAndId(type: string, id: number): any {
    if (!this.contextModel) {
      console.error('Context model not loaded');
      return null;
    }

    if (!this.contextModel[type]) {
      console.error(`Type "${type}" not found in context model`);
      return null;
    }

    const component = this.contextModel[type].find((item: any) => item.id === id);
    
    if (!component) {
      console.error(`Component with id ${id} not found in type "${type}"`);
      return null;
    }

    return component;
  }

  onComponentSelect() {
    // Verificar si hay un componente seleccionado y que no esté ya en la lista
    if (this.selectedComponent && !this.selectedComponents.includes(this.selectedComponent)) {
      this.selectedComponents.push(this.selectedComponent);
      this.selectedComponent = undefined;  // Reinicia la selección después de agregar
    }
  }

  removeContextComponent(component: ContextComponent) {
    const index = this.selectedComponents.indexOf(component);
    if (index > -1) {
      this.selectedComponents.splice(index, 1);
    }
  }
  // Versión anterior de getComponentByTypeAndId (comentada)
  /*
  getComponentByTypeAndId(type: string, id: number): any {
    const group = this.contextComponentsGrouped.find(g => g.type === type);
    
    if (group) {
      const componentArray = this.contextComponents;
      const component = componentArray.find(item => item.id === id);
      return component || null;
    }
  
    return null;
  }
  */


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
      },
      error: (err) => console.error("Error loading Dimensions Base:", err)
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

  // ADD DIMENSIONS-FACTORS to DQ MODEL
  addToDQModel(): void {
    this.submitNewDimension();
  }

  submitNewDimension(): void {
    if (this.selectedDimension === null) {
      console.error("No se ha seleccionado ninguna dimensión base.");
      return; // salir si no hay una dimensión seleccionada
    }
  
    // Primero verifica si la dimension ya existe
    this.modelService.getDimensionsByDQModel(this.dqModelId).subscribe((existingDimensions) => {
      const existingDimension = existingDimensions.find(dim => dim.dimension_base === this.selectedDimension);
  
      if (existingDimension) {
        // Si la dimensión ya existe, solo agrega el factor asociado a la Dimension
        this.addedDimensionId = existingDimension.id; // Usar el ID existente para Factor
        console.log("Dimensión ya existente, ID:", this.addedDimensionId);
        this.submitNewFactor(); 
      } else {
        // Si no existe, agregar una nueva dimensión
        const dimensionToAdd = {
          dq_model: this.dqModelId,
          dimension_base: this.selectedDimension!,
          context_components: []
        };
  
        this.modelService.addDimensionToDQModel(dimensionToAdd).subscribe({
          next: (data) => {
            console.log("Dimension añadida:", data);
            this.addedDimensionId = data.id; // obtiene el ID de la dimension agregada
            
            // Carga las dimensiones y factores después de añadir la nueva dimensión
            this.loadDQModelDimensionsAndFactors(); 

            window.alert("Dimension successfully added to DQ Model.");

            this.submitNewFactor(); 
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

  submitNewFactor(): void { 
    if (this.selectedFactor === null) {
      console.error("No factor selected.");
      alert("Please select a factor to add.");
      return; // Salir si no se ha seleccionado un factor
    }
  
    // Verificar si el factor ya existe en la dimension seleccionada
    this.modelService.getFactorsByDQModelAndDimension(this.dqModelId!, this.addedDimensionId!).subscribe((existingFactors) => {
      const duplicateFactor = existingFactors.find(factor => factor.factor_base === this.selectedFactor);
  
      if (duplicateFactor) {
        console.warn("Factor already exists in the dimension.");
        alert("This factor already exists in the selected dimension.");
      } else {
        // Si no existe, añadir el nuevo factor
        const factorToAdd = {
          factor_base: this.selectedFactor!,
          dimension: this.addedDimensionId!,
          dq_model: this.dqModelId,
        };
  
        this.modelService.addFactorToDQModel(factorToAdd).subscribe({
          next: (data) => {
            console.log("Factor added:", data);
            this.loadDQModelDimensionsAndFactors(); 
            alert("Factor successfully added to DQ Model.");
          },
          error: (err) => {
            console.error("Error adding the factor:", err);
            alert("An error occurred while trying to add the factor.");
          }
        });
      }
    });
  }

  // DQ MODEL: SHOW DIMENSIONS and FACTORS added  
  /*loadDQModelDimensionsAndFactors(): void {
    this.modelService.getDimensionsByDQModel(this.dqModelId).subscribe(
      (dimensions) => {
        this.dqmodel_dimensions = dimensions;
        
        this.dimensionsWithFactorsInDQModel = [];
        dimensions.forEach(dimension => {
          this.modelService.getFactorsByDQModelAndDimension(this.dqModelId, dimension.id).subscribe(
            (factors) => {
              // Obtener detalles de la dimension base
              this.modelService.getDQDimensionBaseById(dimension.dimension_base).subscribe(
                (baseAttributes) => {
                  // Para cada factor, obtener los detalles del factor base
                  const factorsWithBaseAttributes = factors.map(factor => {
                    return this.modelService.getFactorBaseById(factor.factor_base).toPromise()
                      .then(factorBaseAttributes => ({ ...factor, baseAttributes: factorBaseAttributes }));
                  });
  
                  Promise.all(factorsWithBaseAttributes).then(fullFactors => {
                    this.dimensionsWithFactorsInDQModel.push({
                      dimension,
                      baseAttributes,
                      factors: fullFactors
                    } as any);
                  });
                },
                (error) => {
                  this.errorMessage = `Failed to load attributes for the base dimension ${dimension.dimension_name}.`;
                }
              );
            },
            (error) => {
              this.errorMessage = `Failed to load factors for the dimension ${dimension.dimension_name}.`;
            }
          );
        });
      },
      (error) => {
        this.noDimensionsMessage = 'Failed to load the dimensions of the DQ Model.';
      }
    );
  }*/
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
  
  /* error al agregar la primera dimension
  loadDQModelDimensionsAndFactors(): void {
    this.modelService.getDimensionsByDQModel(this.dqModelId).subscribe(
      (dimensions) => {
        // Verificar si no hay dimensiones y manejar el caso adecuadamente
        if (dimensions.length === 0) {
          this.noDimensionsMessage = 'No dimensions found for this DQ Model.';
          this.dqmodel_dimensions = [];
          this.dimensionsWithFactorsInDQModel = [];
          return;
        }
        
        // Si hay dimensiones, proceder a procesarlas
        this.dqmodel_dimensions = dimensions;
        this.dimensionsWithFactorsInDQModel = [];
  
        dimensions.forEach(dimension => {
          this.modelService.getFactorsByDQModelAndDimension(this.dqModelId, dimension.id).subscribe(
            (factors) => {
              // Obtener detalles de la dimension base
              this.modelService.getDQDimensionBaseById(dimension.dimension_base).subscribe(
                (baseAttributes) => {
                  // Para cada factor, obtener los detalles del factor base
                  const factorsWithBaseAttributes = factors.map(factor => {
                    return this.modelService.getFactorBaseById(factor.factor_base).toPromise()
                      .then(factorBaseAttributes => ({ ...factor, baseAttributes: factorBaseAttributes }));
                  });
  
                  Promise.all(factorsWithBaseAttributes).then(fullFactors => {
                    this.dimensionsWithFactorsInDQModel.push({
                      dimension,
                      baseAttributes,
                      factors: fullFactors
                    } as any);
                  });
                },
                (error) => {
                  this.errorMessage = `Failed to load attributes for the base dimension ${dimension.dimension_name}.`;
                }
              );
            },
            (error) => {
              this.errorMessage = `Failed to load factors for the dimension ${dimension.dimension_name}.`;
            }
          );
        });
      },
      (error) => {
        if (error.status === 404) {
          this.noDimensionsMessage = 'No dimensions found for this DQ Model.';
        } else {
          this.noDimensionsMessage = 'Failed to load the dimensions of the DQ Model.';
        }
      }
    );
  }*/
  

  
  //REMOVE DIMENSIONS or FACTORS from DQ MODEL
  deleteDimension(dimensionId: number): void {
    const userConfirmed = confirm(
      "¿Está seguro que desea eliminar esta dimensión del DQ Model? Esto también eliminará los factores asociados."
    );
  
    if (userConfirmed) {
      console.log(`Eliminando la dimensión con ID: ${dimensionId}`);
      this.modelService.deleteDimensionFromDQModel(dimensionId).subscribe(
        response => {
          alert(response?.message || "Dimensión y factores asociados eliminados exitosamente.");
          // Filtrar la dimensión eliminada sin recargar toda la lista
          this.dimensionsWithFactorsInDQModel = this.dimensionsWithFactorsInDQModel.filter(
            item => item.dimension.id !== dimensionId
          );
          //this.loadDQModelDimensionsAndFactors();
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
    const userConfirmed = confirm(
      "Are you sure you want to remove this factor from the DQ Model?"
    );
  
    if (userConfirmed) {
      console.log(`Eliminando el factor con ID: ${factorId}`);
    
      this.modelService.deleteFactorFromDQModel(factorId).subscribe(
        response => {
          alert("Factor successfully removed.");

          // Elimina el factor de la lista sin recargar la página
          this.dimensionsWithFactorsInDQModel = this.dimensionsWithFactorsInDQModel.map(dimension => ({
            ...dimension,
            factors: dimension.factors.filter((factor: { id: number }) => factor.id !== factorId)
          }));
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
  
  confirmAllFactors() {
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
}