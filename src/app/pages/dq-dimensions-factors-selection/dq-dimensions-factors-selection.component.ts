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

  selectedDimensionId: number | null = null;
  //contextComponents: any[] = []; 
  contextComponents: ContextComponent[] = [];
  selectedComponents: ContextComponent[] = [];
  selectedComponent: ContextComponent | undefined;  // Cambiado a undefined
 

  private contextModel: any; // Para almacenar el modelo de contexto completo

  dqDimensionsBase: any[] = [];
  dqFactorsBase: any[] = [];
  dqModels: any[] = [];
  filteredFactors: any[] = [];

  selectedDimension: number | null = null;
  selectedFactor: number | null = null;

  selectedPairs2: { dimension: string; factor: string }[] = [];
  selectedPairs: { dimensionId: number; factorId: number }[] = [];

  selectedDimensions: any[] = [];
  selectedFactors: any[] = [];

  availableFactors: any[] = []; 



  dimensionName: string = '';
  dimensionSemantic: string = '';

  factorName: string = '';    
  factorSemantic: string = ''; 

  errorMessage: string | null = null;

  duplicateFactor: boolean = false;

  contextComponentsGrouped: { type: string; ids: number[] }[] = [];

  isModalOpen: boolean = false;
  
  constructor(
    private router: Router,
    private problemsService: DqProblemsService,
    public modelService: DqModelService
  ) { }


  context: any; // Variable para almacenar el contexto obtenido
  id_context: number = 1; // Inicializa con el ID que deseas probar.

  

  dqModel: any; // Variable para almacenar el DQ Model obtenido
  dqModelId: number = 1; // Inicializa con el ID del DQ Model que deseas probar
  noModelMessage: string = ""; // Mensaje para mostrar si no hay modelo

  dqmodel_dimensions: any[] = [];
  noDimensionsMessage: string = "";

  ngOnInit() {
    this.getDQModels();
    this.getUsers();
    this.getDQDimensions();
    this.getDQFactors();
    this.getContext();

    this.getDQModelById(this.dqModelId);
    this.getDQModelDimensionsById(this.dqModelId);

    this.loadContextById(this.id_context);

    // Ejemplo de uso de getComponentByTypeAndId
    setTimeout(() => {
      /*const businessRule = this.getComponentByTypeAndId('business_rules', 2);
      console.log('Business Rule found:', businessRule);
      
      const applicationDomain = this.getComponentByTypeAndId('application_domains', 1);
      console.log('Application Domain found:', applicationDomain);*/
      this.loadContextOptions()
    }, 1000);
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

  getUsers() {
    this.modelService.getUsers().subscribe({
      next: (data) => {
        this.modelService.users = data;
        console.log('Datos obtenidos del servicio:', data); 
      },
      error: (err) => {
        console.log(err);
      },  
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

  getDQDimensions() {
    this.modelService.getDQDimensions().subscribe({
      next: (data) => {
        this.dqDimensionsBase = data;
        console.log('DIMENSIONS BASE obtenidos del servicio:', data); 
      },
      error: (err) => console.error("Error loading dimensions:", err)
    });
  }

  getDQFactors() {
    this.modelService.getDQFactors().subscribe({
      next: (data) => {
        this.dqFactorsBase = data;
        console.log('FACTORS BASE obtenidos del servicio:', data); 
      },
      error: (err) => console.error("Error loading factors:", err)
    });
  }

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
        this.dqModel = data; // Almacena el DQ Model obtenido
        this.noModelMessage = ""; // Resetea el mensaje si se obtiene el modelo
        console.log("DQ Model obtenido:", data); // Imprime el DQ Model en la consola
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

  getDQModelDimensionsById(dqmodelId: number): void {
    console.log("Llamando a getDQModelDimensions con ID:", dqmodelId);
    this.modelService.getDQModelDimensions(dqmodelId).subscribe({
      next: (data) => {
        this.dqmodel_dimensions = data; // Asigna las dimensiones obtenidas
        this.noDimensionsMessage = ""; // Resetea el mensaje si se obtienen dimensiones
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
  }
  
  addDimensionToDQModel(newDimension: any): void {
    this.dqmodel_dimensions.push(newDimension); // Agrega la nueva dimensión al arreglo
    console.log("Nueva dimensión agregada:", newDimension);
  }
  

  /*getFactorsByDimension(dimensionId: number): any[] {
    const filteredFactors = this.qualityFactors.filter(
      factor => factor.dimension_id === Number(dimensionId)
    );
    return filteredFactors;
  }*/
  // Nuevo método getFactorsByDimension que llama al servicio
  /*getFactorsByDimension(dimensionId: number): void {
    this.modelService.getFactorsByDimensionId(dimensionId).subscribe({
      next: (data) => {
        this.availableFactors = data;
        console.log(`Factores obtenidos para la dimensión ${dimensionId}:`, data);
      },
      error: (err) => {
        console.error("Error loading factors by dimension:", err);
        this.availableFactors = []; // Reiniciar en caso de error
      }
    });
  }*/
  /*---------
  getFactorsByDimension(dimensionId: number): void {
    this.modelService.getFactorsByDimensionId(dimensionId).subscribe({
      next: (data) => {
        this.availableFactors = data; // Asigna factores recibidos de la API
        console.log(`Factores obtenidos para la dimensión ${dimensionId}:`, data);
      },
      error: (err) => {
        console.error("Error loading factors by dimension:", err);
        this.availableFactors = []; // Reinicia en caso de error
      }
    });
  }*/
  noFactorsMessage: string = "";

  getFactorsByDimension(dimensionId: number): void {
    this.modelService.getFactorsByDimensionId(dimensionId).subscribe({
      next: (data) => {
        this.availableFactors = data; // Asigna factores recibidos de la API
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

  // Método onDimensionChange actualizado para llamar a getFactorsByDimension
  /*onDimensionChange(): void {
    console.log(`Dimensión seleccionada: ${this.selectedDimension}`);
    if (this.selectedDimension) {
      this.getFactorsByDimension(this.selectedDimension);
      this.selectedFactors = [];
    }
    
    this.selectedFactor = null;
  }*/
  
  onDimensionChange(): void {
    console.log(`Dimensión seleccionada: ${this.selectedDimension}`);
    if (this.selectedDimension) {
      this.getFactorsByDimension(this.selectedDimension); // Llama a `getFactorsByDimension`
      this.selectedFactors = [];
      this.errorMessage = ''; 
    }
    
    this.selectedFactor = null;
  }

  onFactorChange() {
    console.log('Factor seleccionado:', this.selectedFactor);
  }
  

  addDimensionFactorPair() {
    this.duplicateFactor = false;

    if (this.selectedDimension !== null && this.selectedFactor !== null) {
      const factorExists = this.selectedPairs.some(pair => pair.factorId === this.selectedFactor);

      if (factorExists) {
        console.log('Este factor ya ha sido agregado.');
        this.duplicateFactor = true;
        return;
      }

      this.selectedPairs.push({ 
        dimensionId: this.selectedDimension, 
        factorId: this.selectedFactor 
      });

      console.log('Par agregado:', { 
        dimensionId: this.selectedDimension, 
        factorId: this.selectedFactor 
      });

      const dimensionFactorObjects = this.getDimensionFactorPairs();
      console.log('Pares completos después de agregar uno nuevo:', dimensionFactorObjects);

      const dimensionObject = this.dqDimensionsBase.find(dimension => dimension.id === this.selectedDimension);
      if (dimensionObject && !this.selectedDimensions.includes(dimensionObject)) {
        this.selectedDimensions.push(dimensionObject);
      }

      const factorObject = this.dqFactorsBase.find(factor => factor.id === this.selectedFactor);
      if (factorObject && !this.selectedFactors.includes(factorObject)) {
        this.selectedFactors.push(factorObject);
      }

      console.log("Selected DIMENSIONS: ", this.selectedDimensions);
      console.log("Selected FACTORS: ", this.selectedFactors);
      
      this.selectedDimension = null;
      this.selectedFactor = null;
    }
  }

  getDimensionFactorPairs() {
    return this.selectedPairs.map(pair => {
      const dimension = this.dqDimensionsBase.find(dim => dim.id === pair.dimensionId);
      const factor = this.dqFactorsBase.find(fac => fac.id === pair.factorId);
      return { dimension, factor };
    });
  }

  getSelectedFactorsByDimension(dimensionId: number): any[] {
    return this.selectedFactors.filter(factor => factor.dimension_id === dimensionId);
  }

  getSelectedDimension(): any {
    return this.dqDimensionsBase.find(dim => dim.id === this.selectedDimension);
  }

  /*getSelectedDimension(): any | null {
    return this.selectedDimension;
  }*/

  getSelectedFactor() {
    return this.dqFactorsBase.find(factor => factor.id === this.selectedFactor);
  }


  confirmAllFactors() {
    this.router.navigate(['/step4']);
  }

 

  openModal() {
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.resetForm(); // Limpiar el formulario al cerrar
  }

  // Método para crear una nueva DQDimensionBase
  createDimension() {
    const newDimension = {
      name: this.dimensionName,
      semantic: this.dimensionSemantic
    };

    this.modelService.createDQDimension(newDimension).subscribe({
      next: (response) => {
        console.log('Dimensión creada con éxito:', response);
        // Aquí puedes manejar la respuesta, como limpiar el formulario o mostrar un mensaje de éxito
        this.resetForm();
        this.closeModal(); // Cerrar el modal después de crear la dimensión
        this.getDQDimensions();

        this.selectedDimension = response;
      },
      error: (err) => {
        console.error('Error al crear la dimensión:', err);
        this.errorMessage = 'Hubo un error al crear la dimensión.';
      }
    });
  }

  // Método para limpiar el formulario
  resetForm() {
    this.dimensionName = '';
    this.dimensionSemantic = '';
    this.errorMessage = null;
  }

  createFactor() {
    if (this.selectedDimension !== null) {
      const newFactor = {
        name: this.factorName,
        semantic: this.factorSemantic,
        facetOf: this.selectedDimension // Asignar el ID de la dimensión seleccionada
      };

      this.modelService.createDQFactor(newFactor).subscribe({
        next: (response) => {
          console.log('Factor creado con éxito:', response);
          this.resetFactorForm(); // Limpiar el formulario de factor

          this.getDQFactors();
          this.getFactorsByDimension(this.selectedDimension!); // Recargar los factores de la dimensión seleccionada

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


  resetFactorForm() {
    this.factorName = '';
    this.factorSemantic = '';
    this.errorMessage = ''; // Limpiar mensajes de error
  }

  isFactorModalOpen = false; 
  selectedDimensionName: string = ''; 

  /*openFactorModal() {
    this.isFactorModalOpen = true;
  }*/
  // Método para abrir el modal de factores
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
    this.errorMessage = ''; // Limpia el mensaje de error al cerrar el modal
    this.resetFactorForm();
  }

  submitNewDimension(): void {
    if (this.selectedDimension === null) {
      console.error("No se ha seleccionado ninguna dimensión base.");
      return; // Salir si no hay una dimensión seleccionada
    }
  
    const dimensionToAdd = {
      dq_model: this.dqModelId, // Asegúrate de tener el ID del DQ Model
      dimension_base: this.selectedDimension, // Asegúrate de que sea un número
      context_components: [] // Array vacío inicialmente
    };
  
    console.log("ID DQ Model intentando agregar... ", dimensionToAdd.dq_model);

    /*this.modelService.addDimension(dimensionToAdd).subscribe({
      next: (data) => {
        console.log("Dimensión añadida:", data);
      },
      error: (err) => {
        console.error("Error al añadir la dimensión:", err);
      }
    });*/
    this.modelService.addDimension(dimensionToAdd).subscribe({
        next: (data) => {
            console.log("Dimensión añadida:", data);
            // Aquí podrías actualizar tu arreglo de dimensiones si es necesario
            this.errorMessage = ""; // Resetea el mensaje de error
            window.alert("Dimensión añadida correctamente al DQ Model");
        },
        error: (err) => {
          console.error("Error al añadir la dimensión:", err);
          if (err.error && err.error.non_field_errors) {
              window.alert(err.error.non_field_errors[0]); // Muestra el mensaje de error en un alert
          } else {
              window.alert("Ocurrió un error al intentar añadir la dimensión."); // Mensaje genérico
          }
        }
        /*error: (err) => {
            console.error("Error al añadir la dimensión:", err);
            if (err.error && err.error.non_field_errors) {
                this.errorMessage = err.error.non_field_errors[0];
            } else {
                this.errorMessage = "Ocurrió un error al intentar añadir la dimensión."; 
            }
        }*/
    });
  }

  addToDQModel(): void {
    // Llama a la función para agregar la dimensión
    this.submitNewDimension();
  
    // Aquí puedes agregar lógica para el factor más tarde
    // Por ahora, puedes simplemente comentar o dejarlo para el futuro
    // this.submitNewFactor(); // Descomentar cuando esté listo para implementar
  }


}