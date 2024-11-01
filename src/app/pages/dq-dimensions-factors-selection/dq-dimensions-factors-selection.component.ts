import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { DqProblemsService } from '../../shared/dq-problems.service';
import { DqModelService } from '../../services/dq-model.service';
import { Router } from '@angular/router';

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

  
  constructor(
    private router: Router,
    private problemsService: DqProblemsService,
    public modelService: DqModelService
  ) { }

  
  //inicializacion, pruebas
  context: any; // Variable para almacenar el contexto obtenido
  id_context: number = 1; // Inicializa con el ID que deseas probar.

  dqModel: any; // Variable para almacenar el DQ Model obtenido
  dqModelId: number = 1; // Inicializa con el ID del DQ Model que deseas probar
  noModelMessage: string = "";  

  ngOnInit() {
    this.getDQModels();
    this.getProjects();
    this.getDQDimensionsBase();
    this.getDQFactorsBase();
    this.getContext();

    this.getDQModelById(this.dqModelId);
    //this.getDQModelDimensionsById(this.dqModelId);

    this.loadContextById(this.id_context);

    this.loadDQModelDimensionsAndFactors();

    // Ejemplo de uso de getComponentByTypeAndId
    setTimeout(() => {
      /*const businessRule = this.getComponentByTypeAndId('business_rules', 2);
      console.log('Business Rule found:', businessRule);
      
      const applicationDomain = this.getComponentByTypeAndId('application_domains', 1);
      console.log('Application Domain found:', applicationDomain);*/
      this.loadContextOptions()
    }, 1000);
  }


  // PROJECTS
  getProjects() {
    this.modelService.getProjects().subscribe({
      next: (data) => {
        this.modelService.projects = data;
        console.log('Projects obtenidos del servicio:', data); 
      },
      error: (err) => {
        console.log(err);
      },  
    });
  }


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
    this.modelService.getDQModels().subscribe({
      next: (data) => {
        console.log("All DQ Models loaded:", data);
        this.dqModels = data;
      },
      error: (err) => console.error("Error loading DQ Models:", err)
    });
  }

  getDQModelById(dqmodelId: number): void {
    this.modelService.getDQModel(dqmodelId).subscribe({
      next: (data) => {
        this.dqModel = data; // almacena el DQ Model obtenido
        this.noModelMessage = ""; // resetea el mensaje si se obtiene el modelo
        console.log("DQ Model obtenido:", data); 
      },
      error: (err) => {
        if (err.status === 404) {
          this.dqModel = null; // Reinicia el modelo
          this.noModelMessage = "No DQ Model found with this ID. Please check and try again.";  
        } else {
          console.error("Error loading DQ Model:", err);
          this.dqModel = null; // Reinicia en caso de error
          this.noModelMessage = "An error occurred while loading the DQ Model. Please try again later.";  
        }
      }
    });
  }


  //DIMENSIONS BASE
  getDQDimensionsBase() {
    this.modelService.getDQDimensionsBase().subscribe({
      next: (data) => {
        this.dqDimensionsBase = data;
        console.log('DIMENSIONS BASE obtenidos del servicio:', data); 
      },
      error: (err) => console.error("Error loading dimensions:", err)
    });
  }

  //FACTORS BASE
  getDQFactorsBase() {
    this.modelService.getDQFactorsBase().subscribe({
      next: (data) => {
        this.dqFactorsBase = data;
        console.log('FACTORS BASE obtenidos del servicio:', data); 
      },
      error: (err) => console.error("Error loading factors:", err)
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

  onFactorChange() {
    console.log('Factor seleccionado:', this.selectedFactor);
  }  

  //SHOW SELECTIONS
  getSelectedDimension(): any {
    return this.dqDimensionsBase.find(dim => dim.id === this.selectedDimension);
  }

  getSelectedFactor() {
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

          this.getDQFactorsBase();
          this.getFactorsBaseByDimension(this.selectedDimension!); // Recargar los factores de la dimension seleccionada

          this.closeFactorModal(); 

          this.selectedFactor = response;
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
  
  /*submitNewFactor(): void {
    const factorToAdd = {
      factor_base: this.selectedFactor!, 
      dimension: this.addedDimensionId!,  
      dq_model: this.dqModelId, 
    };

    this.modelService.addFactorToDQModel(factorToAdd).subscribe({
      next: (data) => {
        console.log("Factor añadido:", data);

        this.loadDQModelDimensionsAndFactors(); 
        
        alert("Factor successfully added to DQ Model.");
      },
      error: (err) => {
        console.error("Error al añadir el factor:", err);
        alert("An error occurred while trying to add the factor.");
      }
    });
  }*/

  // DQ MODEL: SHOW DIMENSIONS and FACTORS added  
  loadDQModelDimensionsAndFactors(): void {
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
                  this.errorMessage = `Error al cargar los atributos de la dimensión base ${dimension.dimension_name}.`;
                }
              );
            },
            (error) => {
              this.errorMessage = `Error al cargar los factores para la dimensión ${dimension.dimension_name}.`;
            }
          );
        });
      },
      (error) => {
        this.noDimensionsMessage = 'No se pudieron cargar las dimensiones del DQ Model.';
      }
    );
  }

  /*getDQModelDimensionsById(dqmodelId: number): void {
    console.log("Llamando a getDimensionsByDQModel con ID:", dqmodelId);
    this.modelService.getDimensionsByDQModel(dqmodelId).subscribe({
      next: (data) => {
        this.dqmodel_dimensions = data; 
        this.noDimensionsMessage = "";
        console.log("DIMENSIONES obtenidas del DQ Model:", data);
      },
      error: (err) => {
        console.error("Error en la llamada a la API:", err);
        if (err.status === 404) {
          this.dqmodel_dimensions = [];
          this.noDimensionsMessage = "No dimensions found for this DQ Model. Please check and try again.";
        } else {
          console.error("Error loading dimensions for DQ Model:", err);
          this.dqmodel_dimensions = [];
          this.noDimensionsMessage = "An error occurred while loading the dimensions. Please try again later.";
        }
      }
    });
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

}