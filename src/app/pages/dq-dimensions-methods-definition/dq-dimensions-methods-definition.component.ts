import { Component, OnInit, ViewEncapsulation, HostListener, ChangeDetectorRef } from '@angular/core';
import contextComponentsJson from '../../../assets/context-components.json';
import { Router } from '@angular/router';
import { DqModelService } from '../../services/dq-model.service';
import { ProjectService } from '../../services/project.service';
import { FormBuilder, FormGroup, Validators  } from '@angular/forms';

import { ProjectDataService } from '../../services/project-data.service';

import { buildContextComponents, formatCtxCompCategoryName, getFirstNonIdAttribute } from '../../shared/utils/utils';

declare var bootstrap: any; 

interface ColumnOption {
  table_id: any;
  table_name: any;
  column_id: any;
  column_name: any;
  data_type: any;
}

interface DataColumnOption {
  value: ColumnOption;
  label: string;
}


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
  //encapsulation: ViewEncapsulation.None
})
export class DqDimensionsMethodsDefinitionComponent implements OnInit {

  isNextStepEnabled: boolean = true;

  currentStep: number = 4; // Step 3
  pageStepTitle: string = 'Implementation of DQ Methods';
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

  isLoading: boolean = false;

  dataSchema: any = null;
  dataAtHandDetails: any = null;
  
  dqMethodForm: FormGroup;
  appliedMethodForm: FormGroup;
  
  project: any;
  dqModelId: number = 1;
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
  suggestion: any = null;
  error: string = '';
  isCreateAppliedMethodModalOpen = false;
  selectedMethod: any;
  allMethods: any[] = [];
  selectedMethodObject: any;
  
  
  contextComponentsGrouped: { type: string; ids: number[] }[] = [];
  
  dqFactorsBase: any[] = [];

  isModalBaseOpen = false;

  contextComponents: ContextComponent[] = [];
  selectedComponents: ContextComponent[] = []; // Para almacenar componentes seleccionados
  dropdownOpen: boolean = false; // Para manejar la apertura/cierre del dropdown

  confirmedSelectedProblems: DataQualityProblem[] = [];
  confirmedFactors: { [key: number]: number[] } = {};


  possibleOutputs: string[] = ['Entero', 'Real', 'Booleano'];
  domains: string[] = ['Entero', 'Real', 'Booleano'];
  newMethod: any = {
    name: '', input: '', output: '', algorithm: '', expanded: false,  metric: undefined};

  definedMetrics: QualityMethod[] = [];

  dqFactor_measures: string = '';

  selectedMetric: any = null; 
  onMetricSelected_(): void {
    console.log("Selected Metric:", this.selectedMetric);
  }

  // Método para cargar los detalles de la dimensión
  fetchDQFactorDetails(factorId: number): void {
    if (this.dqModelId && factorId) {
      this.modelService.getDQDimensionDetails(this.dqModelId, factorId).subscribe({
        next: (data) => {
          this.dqFactor_measures = data.factor_name; 
        },
        error: (err) => {
          console.error('Error al cargar los detalles del factor:', err);
        },
      });
    }
  }

  onMetricSelected(): void {
    if (this.selectedMetric) {
      console.log("Selected Factor:", this.selectedMetric);
      // Limpiar la selección actual
      this.selectionCheckboxCtxComponents = [];

      //Obtener Dimension del factor
      this.fetchDQFactorDetails(this.selectedMetric.factor);
  
      // Cargar los componentes de contexto asociados al factor seleccionado
      const contextComponents = this.selectedMetric.context_components;
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

  selectedBaseDQMethod: any = null; 
  onMethodSelected(): void {
    console.log("Selected Method:", this.selectedBaseDQMethod);
  }

  selectedMethodDQModel: any = null; 
  onMethodDQModelSelected(): void {
    // Convierte el valor seleccionado a número
    const selectedId = Number(this.selectedMethodDQModel);
  
    console.log("Selected DQ Method DQ Model id for Applied Method(converted to number):", selectedId);
  
    // Llama a la función para obtener los detalles del método
    this.getDQMethodDetails(selectedId);
  }

  selectedMethodDetails: any;

  // En tu componente
  selectedDQMethodDetails: any = null; // Almacena los detalles del método base

  
  // Función para obtener los detalles del método base
  /*getDQMethodsBaseDetails(methodBaseId: number): void {
    this.modelService.getDQMetricBaseById(methodBaseId).subscribe(
      (methodBase) => {
        console.log("Detalles del método base:", methodBase);
        this.selectedMethodDetails = methodBase; // Almacena los detalles del método base
      },
      (error) => {
        console.error("Error al obtener los detalles del método base:", error);
      }
    );
  }*/

  project_: any;
  allDQProblems: any[] = [];
  allContextComponents_: any;


  // Variables de datos

  projectId: number | null = null;
  noProjectMessage: string = "";

  dqModelVersionId: number | null = null;
  dqModel: any = null;

  contextVersionId: number | null = null;

  allContextComponents: any; // Variable para almacenar el contexto obtenido

  constructor(
    private router: Router, 
    private modelService: DqModelService,
    private projectService: ProjectService,  
    private projectDataService: ProjectDataService, 
    private fb:FormBuilder,
    private cdr: ChangeDetectorRef
  ) { 
    // Inicialización del formulario en el constructor
    this.dqMethodForm = this.fb.group({
      name: [''],
      inputDataType: [''],
      outputDataType: [''],
      algorithm: ['']
    });
    this.appliedMethodForm = this.fb.group({
      name: ['', Validators.required],
      appliedTo: ['', Validators.required],
      algorithm: ['', Validators.required],
      type: ['Aggregated', Validators.required]
    });
  }

  ngOnInit() {
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

      if (this.project.data_at_hand) {
        this.loadDataAtHandDetails(this.project.data_at_hand);
      }

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
      /*if (this.projectId !== null) {
        this.loadSelectedPrioritizedDQProblems(this.projectId);
        this.getCurrentDQModel(this.projectId);
      }*/
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

    // Suscribirse al esquema de datos
    this.projectDataService.dataSchema$.subscribe((data) => {
      this.dataSchema = data;
      console.log('Data Schema:', data); // Ver el esquema de datos en la consola

      this.generateAppliedToDataSchemaOptions();

    });

  }

  dataColumnOptions: { value: any, label: string }[] = []; // Lista de opciones para el select
  // Función para generar las opciones del select de atributo appliedTo para Applied Methods
  /*generateAppliedToDataSchemaOptions() {
    this.dataColumnOptions = [];
    this.dataSchema.forEach((table: { columns: { column_id: any; column_name: any; }[]; table_name: any; }) => {
      table.columns.forEach((column: { column_id: any; column_name: any; }) => {
        this.dataColumnOptions.push({
          value: column.column_id,  // Valor que se asignará al campo appliedTo
          label: `${column.column_name} (${table.table_name})`  // Texto que se mostrará en el select
        });
      });
    });
    console.log("dataColumnOptions", this.dataColumnOptions)
  }*/
  generateAppliedToDataSchemaOptions_() {
    this.dataColumnOptions = [];
    this.dataSchema.forEach((table: { columns: { column_id: any; column_name: any; }[]; table_name: any; }) => {
      table.columns.forEach((column: { column_id: any; column_name: any; }) => {
        this.dataColumnOptions.push({
          value: column.column_id,
          label: `${column.column_name} (${table.table_name})`
        });
      });
    });
    console.log('dataColumnOptions', this.dataColumnOptions);
  }

  onTypeChange_() {
    const type = this.appliedMethodForm.get('type')?.value;
    
    // Restablecer el campo appliedTo cuando cambia el tipo
    this.appliedMethodForm.get('appliedTo')?.setValue('');

    // No necesitas una función especial para actualizar el estado de "multiple"
    // El binding se maneja automáticamente en la plantilla
  }

  onAppliedToChange_(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const selectedOptions = Array.from(selectElement.selectedOptions).map(option => option.value);

    // Si el tipo es "Aggregated", concatenar los valores seleccionados
    if (this.appliedMethodForm.get('type')?.value === 'Aggregated') {
      const concatenatedValue = selectedOptions.join(';');
      this.appliedMethodForm.get('appliedTo')?.setValue(concatenatedValue);
    } else {
      // Si el tipo es "Measurement", usar solo el primer valor seleccionado
      this.appliedMethodForm.get('appliedTo')?.setValue(selectedOptions[0] || '');
    }
  }

  generateAppliedToDataSchemaOptions_backup() {
    this.dataColumnOptions = [];
    this.dataSchema.forEach((table: { columns: { column_id: any; column_name: any; }[]; table_name: any; }) => {
      table.columns.forEach((column: { column_id: any; column_name: any; }) => {
        this.dataColumnOptions.push({
          value: column.column_id,
          label: `${column.column_name} (${table.table_name})`
        });
      });
    });
  }

  generateAppliedToDataSchemaOptions() {
    this.dataColumnOptions = [];
    this.dataSchema.forEach((table: any) => {
      table.columns.forEach((column: any) => {
        this.dataColumnOptions.push({
          value: {
            table_id: table.table_id,
            table_name: table.table_name,
            column_id: column.column_id,
            column_name: column.column_name,
            data_type: column.data_type
          },
          label: `${column.column_name} (${table.table_name})`
        });
      });
    });
  }

  generateAppliedToDataSchemaOptions1() {
    this.dataColumnOptions = [];
    this.dataSchema.forEach((table: { columns: { column_id: any; column_name: any; }[]; table_name: any; }) => {
      table.columns.forEach((column: { column_id: any; column_name: any; }) => {
        this.dataColumnOptions.push({
          value: column.column_id,
          label: `${column.column_name} (${table.table_name})`
        });
      });
    });
  }


  dataAppliedToOptions: DataColumnOption[] = [];
  /*generateAppliedToDataSchemaOptions() {
    this.dataAppliedToOptions = [];
    this.dataSchema.forEach((table: { table_id: any; table_name: any; columns: any[] }) => {
      table.columns.forEach((column: { column_id: any; column_name: any; data_type: any }) => {
        const columnOption: ColumnOption = {
          table_id: table.table_id,
          table_name: table.table_name,
          column_id: column.column_id,
          column_name: column.column_name,
          data_type: column.data_type
        };
        this.dataAppliedToOptions.push({
          value: columnOption,
          label: `${column.column_name} (${table.table_name})`
        } as DataColumnOption);
      });
    });
  }*/

  generateAppliedToDataSchemaOptions0() {
    this.dataAppliedToOptions = [];
    this.dataSchema.forEach((table: { table_id: any; table_name: any; columns: any[] }) => {
      table.columns.forEach((column: { column_id: any; column_name: any; data_type: any }) => {
        this.dataAppliedToOptions.push({
          value: {
            table_id: table.table_id,
            table_name: table.table_name,
            column_id: column.column_id,
            column_name: column.column_name,
            data_type: column.data_type
          },
          label: `${column.column_name} (${table.table_name})`
        });
      });
    });
  }
  

  onTypeChange() {
    const type = this.appliedMethodForm.get('type')?.value;
    
    if (type === 'Aggregated') {
      // Si el tipo es 'Aggregated', inicializamos el campo appliedTo como un array vacío para soportar múltiples selecciones
      this.appliedMethodForm.get('appliedTo')?.setValue([]);
    } else {
      // Si el tipo es 'Measurement', lo inicializamos como un string vacío
      this.appliedMethodForm.get('appliedTo')?.setValue('');
    }

    // Forzar el cambio de detección para asegurarse de que el atributo 'multiple' se actualice en la vista
    this.cdr.detectChanges();
  }

  
  onAppliedToChange_backup(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const selectedOptions = Array.from(selectElement.selectedOptions).map(option => option.value);
    
    const type = this.appliedMethodForm.get('type')?.value;
  
    if (type === 'Aggregated') {
      // Si el tipo es 'Aggregated', concatenamos los valores seleccionados y los guardamos como un string
      this.appliedMethodForm.get('appliedTo')?.setValue(selectedOptions.join(';'));
    } else {
      // Si el tipo es 'Measurement', tomamos el primer valor seleccionado como un string
      this.appliedMethodForm.get('appliedTo')?.setValue(selectedOptions[0] || '');
    }
  }

  onAppliedToChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const selectedOptions = Array.from(selectElement.selectedOptions).map(option => JSON.parse(option.value));
  
    // Agrupar las columnas por tabla
    const groupedByTable = selectedOptions.reduce((acc, option) => {
      const tableKey = `${option.table_id}-${option.table_name}`;
      if (!acc[tableKey]) {
        acc[tableKey] = {
          table_id: option.table_id,
          table_name: option.table_name,
          columns: []
        };
      }
      acc[tableKey].columns.push({
        column_id: option.column_id,
        column_name: option.column_name,
        data_type: option.data_type
      });
      return acc;
    }, {});
  
    // Convertir el objeto agrupado en una lista
    const appliedToData = Object.values(groupedByTable);
  
    // Asignar el valor al formulario
    this.appliedMethodForm?.get('appliedTo')?.setValue(appliedToData);
  }

  onSubmit() {
    const formValue = this.appliedMethodForm.value;
  
    // Asegurarse de que `appliedTo` sea un string
    if (Array.isArray(formValue.appliedTo)) {
      formValue.appliedTo = formValue.appliedTo.join(';');  // Convierte el array en un string, separado por ;
    }
  
    // Aquí puedes hacer la llamada a la API o procesar el formulario
    console.log('Form data to submit:', formValue);
  }
  
  
  /*onTypeChange() {
    const type = this.appliedMethodForm.get('type')?.value;
    
    if (type === 'Aggregated') {
      this.appliedMethodForm.get('appliedTo')?.setValue([]);
    } else {
      this.appliedMethodForm.get('appliedTo')?.setValue('');
    }

    this.cdr.detectChanges();
  }

  onAppliedToChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const selectedOptions = Array.from(selectElement.selectedOptions).map(option => option.value);

    const type = this.appliedMethodForm.get('type')?.value;

    if (type === 'Aggregated') {
      this.appliedMethodForm.get('appliedTo')?.setValue(selectedOptions.join(';'));
    } else {
      this.appliedMethodForm.get('appliedTo')?.setValue(selectedOptions[0] || '');
    }
  }*/


  // Función para cargar los detalles del data_at_hand
  loadDataAtHandDetails(dataAtHandId: number): void {
    this.projectDataService.getDataAtHandById(dataAtHandId).subscribe(
      (data) => {
        this.dataAtHandDetails = data; // Asignar los detalles a la variable del componente
      },
      (error) => {
        console.error('Error loading data at hand details:', error);
      }
    );
  }


  



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
  // En el componente TypeScript
  getSelectedCategories(): string[] {
    return Object.keys(this.selectedMetric.context_components).filter(
      category => this.selectedMetric.context_components[category].length > 0
    );
  }

  getComponentById(category: string, id: number): any {
    const components = this.allContextComponents[category];
    if (!components || components.length === 0) {
      return null; // Si la categoría no tiene componentes, retorna null
    }
    return components.find((c: { id: number; }) => c.id === id);
  }

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









  /* ---------- */

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
    // this.getContext();
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
        this.allMethods = [];
  
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
    let that = this;
    this.factorsByDim.forEach(async item => {
      const baseMetricForFact = await this.modelService.getMetricsBaseByDimensionAndFactorId(item.baseAttributes.facetOf, item.factor_base).toPromise();
      item.baseMetrics = baseMetricForFact;
      const dqMetricForFact = await this.modelService.getMetricsByDQModelDimensionAndFactor(item.dq_model, item.dimension, item.id).toPromise();
      item.definedMetrics = dqMetricForFact;
      item.definedMetrics.forEach(async (metric:any) => {
        let baseAttrMetric = item.baseMetrics.find((elem:any) => elem.id == metric.metric_base);
        metric.baseAttr = baseAttrMetric;
        const dqBaseMethods = await this.modelService.getMethodsBaseByDimensionFactorAndMetricId(item.dimension, item.factor_base, metric.metric_base).toPromise();
        metric.baseMethods = dqBaseMethods;
        const dqMethods = await this.modelService.getMethodsByDQModelDimensionFactorAndMetric(item.dq_model,item.dimension, item.id, metric.id).toPromise();
        if (dqMethods) {
          that.allMethods = that.allMethods.concat(dqMethods);
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

  onMethodChange(event:any){
    this.selectedMethodObject = this.allMethods.find(elem=> elem.id == event?.target.value);
  }

  openCreateAppliedMethodModal(method: any) {
    this.selectedMethodObject = this.allMethods.find(elem => elem.id == method);
    console.log("SELECT METHOD for APPLIED METHODS", this.selectedMethodObject);
  
    // Obtener los detalles del método base y la métrica base
    this.getDQMethodDetails(this.selectedMethodObject.id);
  
    const implementationName = `${this.selectedMethodObject.method_name}_implementation_x`;

    const appliedAlgorithm = this.selectedMethodObject.baseAttr.algorithm;
  
    // Asigna valores predeterminados al formulario
    this.appliedMethodForm.patchValue({
      name: implementationName,
      appliedTo: '',
      algorithm: appliedAlgorithm,
      type: 'Aggregated'
    });
    
    this.isCreateAppliedMethodModalOpen = true;
  }
  
  openCreateAppliedMethodModal00(method: any){
    this.selectedMethodObject = this.allMethods.find(elem=> elem.id == method);
    console.log("SELECT METHOD fro APPLIED METHODS", this.selectedMethodObject);

    const implementationName = `${this.selectedMethodObject.method_name}_implementation_x`;

    const appliedAlgorithm = this.selectedMethodObject.algorithm;
    console.log("appliedAlgorithm", appliedAlgorithm)

    // Asigna valores predeterminados al formulario
    this.appliedMethodForm.patchValue({
      name: implementationName,  // Nombre del método aplicado
      appliedTo: '',  // Valor predeterminado para "appliedTo"
      algorithm: this.selectedMethodObject.algorithm || 'Default algorithm',
      type: 'Aggregated'  // Valor predeterminado para "type"
    });
    
    // Presetea los valores del formulario con los datos del método seleccionado
    /*this.appliedMethodForm.patchValue({
      name: this.selectedMethodObject.method_name,  // Asigna el nombre del método seleccionado
      appliedTo: '',   
      type: 'Aggregated'   
    });*/

    console.log("name:", this.appliedMethodForm.get('name')?.value);
    console.log("appliedTo:", this.appliedMethodForm.get('appliedTo')?.value);
    console.log("algorithm:", this.appliedMethodForm.get('algorithm')?.value);
    console.log("type:", this.appliedMethodForm.get('type')?.value);

    this.isCreateAppliedMethodModalOpen = true;
  }

  closeCreateAppliedMethodModal(){
    this.isCreateAppliedMethodModalOpen = false;
    this.appliedMethodForm.reset({ type: 'Aggregated' });
  }

  deleteAppliedMethod(appMethod: any){
    if (appMethod) {
      const userConfirmed = confirm(
        "¿Está seguro que desea eliminar esta metodo aplicado del DQ Model?"
      );
    
      if (userConfirmed) {
        console.log(`Eliminando la metodo aplicado con ID: ${appMethod.id}`);
        let dqMethod = this.allMethods.find(elem => elem.id == appMethod.associatedTo);
        let isAggr = dqMethod.applied_methods.aggregations.find((item: any) => item === appMethod);
        if (isAggr){
          this.modelService.deleteAggregatedMethod(appMethod.id).subscribe(
            response => {
              alert(response?.message || "Metodo Aplicado eliminado correctamente");
              // Filtrar la dimensión eliminada sin recargar toda la lista
                dqMethod.definedMethods = dqMethod.applied_methods.aggregations.filter(
                  (item:any) => item.id !== appMethod.id
                );
              //this.loadDQModelDimensionsAndFactors();
            },
            error => {
              alert("Error al eliminar el metodo aplicado.");
              console.error("Error al eliminar el metodo aplicado:", error);
            }
          );
        } else {
          this.modelService.deleteMeasurementdMethod(appMethod.id).subscribe(
            response => {
              alert(response?.message || "Metodo Aplicado eliminado correctamente");
              // Filtrar la dimensión eliminada sin recargar toda la lista
              dqMethod.definedMethods = dqMethod.applied_methods.measurements.filter(
                (item:any) => item.id !== appMethod.id
              );
              //this.loadDQModelDimensionsAndFactors();
            },
            error => {
              alert("Error al eliminar el metodo aplicado.");
              console.error("Error al eliminar el metodo aplicado:", error);
            }
          );
        }
        
        
      } else {
        console.log("Eliminación de la dimensión cancelada por el usuario.");
      }
      
    }
  }

  createAppliedMethod___() {
    if (this.appliedMethodForm.valid) {
      const appliedMethod = this.appliedMethodForm.value;
      console.log('Applied Method Created:', appliedMethod);
  
      // Obtener el valor de appliedTo y asegurarse de que sea un string
      let appliedToValue = this.appliedMethodForm.get("appliedTo")?.value;
  
      // Verificar si appliedTo es un array y convertirlo en un string si es necesario
      if (Array.isArray(appliedToValue)) {
        appliedToValue = appliedToValue.join(';');  // Convertir array a string
      }
  
      const newAppMeth = {
        name: this.appliedMethodForm.get("name")?.value,
        appliedTo: appliedToValue,  // Asegurarse de que sea un string
        associatedTo: this.selectedMethodObject.id
      };
  
      if (this.appliedMethodForm.get("type")?.value === "Aggregated") {
        this.modelService.createAggregatedMethod(newAppMeth).subscribe({
          next: (data) => {
            console.log("Applied Method created:", data);
            this.loadDQModelDimensionsAndFactors(); 
            alert("Applied Method successfully created");
          },
          error: (err) => {
            console.error("Error creating the Applied Method:", err);
            alert("Error creating the Applied Method.");
          }
        });
      } else {
        this.modelService.createMeasurementMethod(newAppMeth).subscribe({
          next: (data) => {
            console.log("Applied Method created:", data);
            this.loadDQModelDimensionsAndFactors(); 
            alert("Applied Method successfully created");
          },
          error: (err) => {
            console.error("Error creating the Applied Method:", err);
            alert("Error creating the Applied Method.");
          }
        });
      }
  
      this.closeCreateAppliedMethodModal();
    }
  }

  public JSON = JSON;
  
  createAppliedMethod() {
    if (this.appliedMethodForm.valid) {
      const appliedMethod = this.appliedMethodForm.value;
  
      // Parsear appliedTo si es una cadena JSON
      let appliedToValue = appliedMethod.appliedTo;
      if (typeof appliedToValue === 'string') {
        try {
          appliedToValue = JSON.parse(appliedToValue);
        } catch (error) {
          console.error("Error parsing appliedTo:", error);
          alert("Invalid data in 'Applied To' field.");
          return;
        }
      }
  
      console.log('Applied Method Created:', appliedMethod);
  
      const newAppMeth = {
        name: appliedMethod.name,
        appliedTo: appliedToValue, // Usar el valor parseado
        algorithm: appliedMethod.algorithm, // Agregar el campo algorithm
        associatedTo: this.selectedMethodObject.id
      };
  
      if (appliedMethod.type === "Aggregated") {
        this.modelService.createAggregatedMethod(newAppMeth).subscribe({
          next: (data) => {
            console.log("Applied Method created:", data);
            this.loadDQModelDimensionsAndFactors();
            alert("Applied Method successfully created");
          },
          error: (err) => {
            console.error("Error creating the Applied Method:", err);
            alert("Error creating the Applied Method.");
          }
        });
      } else {
        this.modelService.createMeasurementMethod(newAppMeth).subscribe({
          next: (data) => {
            console.log("Applied Method created:", data);
            this.loadDQModelDimensionsAndFactors();
            alert("Applied Method successfully created");
          },
          error: (err) => {
            console.error("Error creating the Applied Method:", err);
            alert("Error creating the Applied Method.");
          }
        });
      }
  
      this.closeCreateAppliedMethodModal();
    } else {
      console.log("Formulario inválido. No se puede crear el método.");
    }
  }
  
  createAppliedMethod_BACKUP(){
    if (this.appliedMethodForm.valid) {
      const appliedMethod = this.appliedMethodForm.value;
      console.log('Applied Method Created:', appliedMethod);
      const newAppMeth = {
        name: this.appliedMethodForm.get("name")?.value,
        appliedTo: this.appliedMethodForm.get("appliedTo")?.value,
        associatedTo: this.selectedMethodObject.id
      }
      if( this.appliedMethodForm.get("type")?.value === "Aggregated"){
        this.modelService.createAggregatedMethod(newAppMeth).subscribe({
          next: (data) => {
            console.log("Applied Method created:", data);
            this.loadDQModelDimensionsAndFactors(); 
            alert("Applied Method successfully created");
          },
          error: (err) => {
            console.error("Error creating the Applied Method:", err);
            alert("Error creating the Applied Method.");
          }
        });
      } else {
        this.modelService.createMeasurementMethod(newAppMeth).subscribe({
          next: (data) => {
            console.log("Applied Method created:", data);
            this.loadDQModelDimensionsAndFactors(); 
            alert("Applied Method successfully created");
          },
          error: (err) => {
            console.error("Error creating the Applied Method:", err);
            alert("Error creating the Applied Method.");
          }
        });
      }
      
      this.closeCreateAppliedMethodModal();
    }

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

  // Función para agregar el método al DQ Model
  addMethodToDQModel(metric: any, method: any) {
    if (!metric || !method) {
      alert("Please select a metric and a method.");
      return;
    }

    const context_components = buildContextComponents(this.selectionCheckboxCtxComponents);
    console.log(context_components)
  
    // Preparar los datos para el servicio
    const methodData = {
      dq_model: metric.dq_model,
      method_base: method.id, // ID del método base
      dimension: metric.dimensionId, // ID de la dimensión (ajusta según tu estructura)
      factorId: metric.factorId, // ID del factor (ajusta según tu estructura)
      metric: metric.id, // ID de la métrica
      context_components: context_components,
    };
  
    // Llamada al servicio para agregar el método al DQ Model
    this.modelService.addMethodsToDQModel(methodData).subscribe({
      next: (response) => {
        console.log("Method added to DQ Model:", response);
        alert("Method successfully added to DQ Model.");
        this.loadDQModelDimensionsAndFactors(); 
      },
      error: (err) => {
        console.error("Error adding method to DQ Model:", err);
        alert("An error occurred while adding the method to DQ Model.");
      }
    });
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



  addBaseMethod(factor: any) : void {
    if (this.dqMethodForm.valid) {
      var methodData = this.dqMethodForm.value;
      methodData.implements = this.currentMetric.metric_base;
      
      this.modelService.createDQMethodBase(methodData).subscribe({
        next: (data) => {
          console.log('Nuevo DQ Method Base creado:', data);
          
          this.loadDQModelDimensionsAndFactors(); 
          alert('The DQ Method was successfully created. You can now select it to add it to the DQ Model.');
          this.dqMethodForm.reset();
          this.closeModalBase();
        },
        error: (error) => {
          console.error('Error al crear el DQ Method Base:', error);
          alert('Error al crear el DQ Method Base. Intenta nuevamente.');
        }
      });
    } else {
      alert('Por favor, completa todos los campos requeridos.');
    }
  }

  generateNewSuggestion() {

    // Activar el spinner
    this.isLoading = true;  
    this.generateSuggestion();

  }
  // DQ METHOD SUGGESTION METHODS
  generateSuggestion() {
    console.log('Generando sugerencia...');
    let metric = {
      id: this.currentMetric.metric_base,
      name: this.currentMetric.metric_name,
      purpose: this.currentMetric.baseAttr.purpose,
      granularity: this.currentMetric.baseAttr.granularity,
      resultDomain: this.currentMetric.baseAttr.resultDomain
    }
    this.modelService.generateDQMethodSuggestion(metric).subscribe({
      next: (response) => {
        console.log('Sugerencia recibida:', response);
        this.suggestion = response;
        this.error = '';

        // Asegurarse de que el formulario esté inicializado
        if (this.dqMethodForm) {
          // Actualizar el formulario con los valores de la sugerencia
          this.dqMethodForm.patchValue({
            name: response.name || '',
            inputDataType: response.inputDataType || '',
            outputDataType: response.outputDataType || '',
            algorithm: response.algorithm || ''
          });

          console.log('Formulario actualizado:', this.dqMethodForm.value);
        } else {
          console.error('El formulario no está inicializado');
        }

        // Desactivar el spinner cuando la solicitud finalice (éxito o error)
        this.isLoading = false;
        // Mostrar los valores en un confirm para verificar
        const confirmMessage = `
          Sugerencia generada:
          Nombre: ${response.name}
          Tipo de entrada: ${response.inputDataType}
          Tipo de salida: ${response.outputDataType}
          Algoritmo: ${response.algorithm}
          Implementación: ${response.implements}
        `;
        console.log(confirmMessage);
      },
      error: (err) => {
        // Desactivar el spinner cuando la solicitud finalice (éxito o error)
        this.isLoading = false;
        console.error('Error al generar la sugerencia:', err);
        this.error = 'Error al generar la sugerencia. Por favor intente nuevamente.';
        this.suggestion = null;
        
      }
    });
  }

  closeModalBase() {
    this.isModalBaseOpen = false;
  }
  
  saveMetrics(){
    this.router.navigate(['/st4/confirmation-stage-4']);
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


  selectedMetricBaseDetails: any; // Detalles de la métrica base
  // Función para obtener los detalles del método seleccionado y su método base
  getDQMethodDetails(methodId: number): void {
    const selectedMethod = this.allMethods.find((method) => method.id === methodId);
  
    if (selectedMethod) {
      const methodBaseId = selectedMethod.method_base;
  
      if (methodBaseId) {
        this.modelService.getDQMethodBaseById(methodBaseId).subscribe(
          (methodBase) => {
            this.selectedMethodDetails = methodBase;
            
            // Ahora obtenemos los detalles de la métrica base
            if (methodBase.implements) {
              this.modelService.getMetricBaseDetails(methodBase.implements).subscribe(
                (metricBase) => {
                  this.selectedMetricBaseDetails = metricBase;

                  // Reset appliedTo cuando cambia la granularidad
                  this.appliedMethodForm.get('appliedTo')?.setValue(
                    metricBase.granularity?.toLowerCase() === 'Column' ? '' : []
                );
                },
                (error) => {
                  console.error("Error al obtener los detalles de la métrica base:", error);
                }
              );
            }
          },
          (error) => {
            console.error("Error al obtener los detalles del método base:", error);
          }
        );
      }
    }
  }

  getDQMethodDetails00(methodId: number): void {
    // Busca el método seleccionado en allMethods
    const selectedMethod = this.allMethods.find((method) => method.id === methodId);

    if (selectedMethod) {
      console.log("Método seleccionado encontrado:", selectedMethod);

      // Obtiene el method_base del método seleccionado
      const methodBaseId = selectedMethod.method_base;

      if (methodBaseId) {
        console.log("ID del método base:", methodBaseId);

        // Llama al servicio para obtener los detalles del método base
        this.getDQMethodsBaseDetails(methodBaseId);
      } else {
        console.warn("El método seleccionado no tiene un method_base definido.");
      }
    } else {
      console.warn("No se encontró el método seleccionado en allMethods.");
    }
  }

  // Función para obtener los detalles del método base
  getDQMethodsBaseDetails(methodBaseId: number): void {
    this.modelService.getDQMethodBaseById(methodBaseId).subscribe(
      (methodBase) => {
        console.log("Detalles del método base:", methodBase);
        this.selectedMethodDetails = methodBase; // Almacena los detalles del método base
      },
      (error) => {
        console.error("Error al obtener los detalles del método base:", error);
      }
    );
  }



}
