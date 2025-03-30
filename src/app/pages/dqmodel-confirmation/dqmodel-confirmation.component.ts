import { ChangeDetectorRef, Component, OnInit, ViewEncapsulation  } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { DqModelService } from '../../services/dq-model.service';
import { ProjectDataService } from '../../services/project-data.service';
import { Router } from '@angular/router';


import { buildContextComponents, formatCtxCompCategoryName, getFirstNonIdAttribute, formatAppliedTo, getAppliedToDisplay } from '../../shared/utils/utils';



import { jsPDF } from 'jspdf';

declare var bootstrap: any; 

@Component({
  selector: 'app-dqmodel-confirmation',
  templateUrl: './dqmodel-confirmation.component.html',
  //styleUrl: './dqmodel-confirmation.component.css',
  styleUrls: ['./dqmodel-confirmation.component.css'],    
  //encapsulation: ViewEncapsulation.None
})


export class DQModelConfirmationComponent implements OnInit {

  // Utils
  //public formatCtxCompCategoryName = formatCtxCompCategoryName;
  //public getFirstNonIdAttribute = getFirstNonIdAttribute;
  public formatAppliedTo = formatAppliedTo;
  public getAppliedToDisplay = getAppliedToDisplay;

  currentStep: number = 5; // Confirmación es el paso 6
  pageStepTitle: string = 'DQ Model confirmation';
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


  isNextStepEnabled: boolean = true;

  project: any; 
  projectId: number | null = null;

  dqModelId: number = -1; 

  completeDQModel: any; 

  contextVersionId: number = -1; 
  
  isLoading: boolean = true; // Activar el estado de carga
  
  dqModelVersionId: number | null = null;

  dataSchema: any = null;
  dataAtHandDetails: any = null;

  constructor(
    private router: Router, 
    private cdr: ChangeDetectorRef, // Inyectar ChangeDetectorRef
    private modelService: DqModelService,
    private projectService: ProjectService,
    private projectDataService: ProjectDataService, 
  ) {}

  ngOnInit(): void {

    // Obtener el Project ID actual
    this.projectId = this.projectDataService.getProjectId();
    console.log("projectIdGet: ", this.projectId);

    // Suscribirse a los observables del servicio
    this.subscribeToData();

    // Sincronizar el paso actual con la ruta
    this.syncCurrentStepWithRoute();

  }

  syncCurrentStepWithRoute() {
    const currentRoute = this.router.url; // Obtiene la ruta actual (por ejemplo, '/st4/confirmation-stage-4')
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
      this.ctxComponents = data;
      console.log('Context Components:', data);
    });

    // Suscribirse a los problemas de calidad de datos (DQ Problems)
    this.projectDataService.dqProblems$.subscribe((data) => {
      this.originalProblems = data;
      console.log('DQ Problems:', data);

    });

    // Suscribirse a la versión del modelo de calidad de datos (DQ Model Version)
    this.projectDataService.dqModelVersion$.subscribe((dqModelVersionId) => {
      this.dqModelVersionId = dqModelVersionId;
      console.log('DQ Model Version ID:', this.dqModelVersionId);

      if (this.dqModelVersionId !== null) {
        //Load complete DQ Model (with Dimensions,Factors...) of current project
        this.loadCurrentDQModel(this.dqModelVersionId);
        this.loadFullDQModel(this.dqModelVersionId);
  
      }
    });

    this.projectDataService.dataSchema$.subscribe((data) => {
      this.dataSchema = data;
      console.log('Data Schema:', data); 
    });
  }

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

  // Función para abrir el modal del esquema de datos
  openDataSchemaModal(): void {
    const modalElement = document.getElementById('dataSchemaModal');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement); // Usar Bootstrap vanilla
      modal.show();
    }
  }


  currentDQModel: any | null = null;


  loadCurrentProject(): void {
    this.projectService.loadCurrentProject().subscribe({
      next: (project) => {
        this.project = project; //Set current Project

        console.log('Proyecto cargado en el componente:', this.project);

        this.projectId = project.id;

        /*if (this.projectId) {
          this.getPrioritizedProblemsMap()
        }*/
        if (this.project && this.project.dqmodel_version) {
          this.loadCurrentDQModel(this.project.dqmodel_version);
        }

        this.contextVersionId = project.context_version;
        console.log("this.contextVersionId ", this.contextVersionId );

        if (this.contextVersionId !== -1){
          this.getAllContextComponents(this.contextVersionId);
          //this.getSelectedPrioritizedDqProblems(this.project.dqmodel_version);
        }


        this.dqModelId = project.dqmodel_version

        if(this.projectId){
          this.loadAllDQProblems(this.projectId);
        }
        


        if (this.dqModelId !== null){
          console.log("DQ Model ID:", this.dqModelId);
          console.log("IF")
          this.loadFullDQModel(this.dqModelId);
        } else (
          console.log("ELSE")
        )
        

      },
      error: (err) => {
        console.error('Error al cargar el proyecto en el componente:', err);
      }
    });
  }

  // Cargar el DQ Model actual
  loadCurrentDQModel(dqmodelId: number): void {
    this.modelService.getCurrentDQModel(dqmodelId).subscribe({
      next: (dqModel) => {
        this.currentDQModel = dqModel;
        console.log('DQ Model cargado:', this.currentDQModel);
        if (this.currentDQModel.status === "finished") {
          this.isNextStepEnabled = true;
          console.log(this.isNextStepEnabled);
        }
        this.cdr.detectChanges(); // Forzar la detección de cambios
      },
      error: (err) => {
        console.error('Error al cargar el DQ Model:', err);
      },
    });
  }


  getDQProblemsDetails(dqProblemIds: number[]): any[] {
    return this.originalProblems.filter(problem => dqProblemIds.includes(problem.id));
  }


  getAllContextComponents(contextVersionId: number): void {
    this.projectService.getContextComponents(contextVersionId).subscribe({
      next: (data) => {
        console.log('---Context Components context_version:---', data);
        this.ctxComponents = data;
      },
      error: (err) => console.error('Error fetching context components:', err)
    });
  }


  async loadFullDQModel(dqModelId: number): Promise<void> {
    try {
      const data = await this.modelService.getFullDQModel(dqModelId).toPromise();
      this.completeDQModel = this.transformDQModelToIterable(data);
      this.isLoading = false;
  
      // Obtener detalles de las dimensiones base
      for (const dimension of this.completeDQModel.dimensions) {
        await this.geDQDimensionDetails(dimension);
  
        // Obtener detalles de los factores base
        for (const factor of dimension.factors) {
          await this.getDQFactorDetails(factor);
  
          // Obtener detalles de las métricas base
          for (const metric of factor.metrics) {
            this.getDQMetricDetails(metric);
  
            // Obtener detalles de los métodos base
            for (const method of metric.methods) {
              this.getDQMethodDetails(method);
  
              // Obtener detalles de los métodos aplicados (measurements y aggregations)
              if (method.applied_methods) {
                // Obtener measurements
                if (method.applied_methods.measurements && method.applied_methods.measurements.length > 0) {
                  for (const measurement of method.applied_methods.measurements) {
                    this.getMeasurementDetails(measurement);
                  }
                }
  
                // Obtener aggregations
                if (method.applied_methods.aggregations && method.applied_methods.aggregations.length > 0) {
                  for (const aggregation of method.applied_methods.aggregations) {
                    this.getAggregationDetails(aggregation);
                  }
                }
              }
            }
          }
        }
      }
  
      console.log("COMPLETE DQModel con detalles base:", this.completeDQModel);
    } catch (err) {
      console.error('Error al cargar el DQModel.', err);
      this.isLoading = false;
    }
  }





  mapDQProblemDetails(problemIds: number[], prioritizedProblemsMap: Map<number, number>): any[] {
    if (!this.originalProblems || !problemIds) {
      return []; // Retornar un array vacío si no hay problemas originales o IDs
    }
  
    return problemIds.map((problemId) => {
      // Obtener el dq_problem_id correspondiente al problemId
      const dqProblemId = prioritizedProblemsMap.get(problemId);
      if (dqProblemId) {
        return this.originalProblems.find((problem) => problem.id === dqProblemId);
      }
      return null; // Si no se encuentra el dq_problem_id, devolver null
    }).filter((problem) => problem !== null); // Filtrar problemas no encontrados
  }


    // Función para obtener detalles de un measurement
  getMeasurementDetails(measurement: any): void {
    this.modelService.getMeasurementDetails(measurement.id).subscribe({
      next: (data) => {
        measurement.details = data; // Agregar detalles al objeto measurement
      },
      error: (err) => {
        console.error('Error al obtener detalles del measurement:', err);
      }
    });
  }

  // Función para obtener detalles de una aggregation
  getAggregationDetails(aggregation: any): void {
    this.modelService.getAggregationDetails(aggregation.id).subscribe({
      next: (data) => {
        aggregation.details = data; // Agregar detalles al objeto aggregation
      },
      error: (err) => {
        console.error('Error al obtener detalles de la aggregation:', err);
      }
    });
  }


  

  // transformar el DQModel en una estructura iterable
  transformDQModelToIterable(dqModel: any): any {
    if (!dqModel) return dqModel;

    // Asegurarse de que 'dimensions' sea un array
    if (dqModel.dimensions && !Array.isArray(dqModel.dimensions)) {
      dqModel.dimensions = [dqModel.dimensions];
    }

    // Recorrer las dimensiones y asegurarse de que 'factors' sea un array
    if (dqModel.dimensions) {
      dqModel.dimensions.forEach((dimension: any) => {
        if (dimension.factors && !Array.isArray(dimension.factors)) {
          dimension.factors = [dimension.factors];
        }

        // Recorrer los factores y asegurarse de que 'metrics' sea un array
        if (dimension.factors) {
          dimension.factors.forEach((factor: any) => {
            if (factor.metrics && !Array.isArray(factor.metrics)) {
              factor.metrics = [factor.metrics];
            }

            // Recorrer las métricas y asegurarse de que 'methods' sea un array
            if (factor.metrics) {
              factor.metrics.forEach((metric: any) => {
                if (metric.methods && !Array.isArray(metric.methods)) {
                  metric.methods = [metric.methods];
                }

                // Recorrer los métodos y asegurarse de que 'applied_methods' sea un array
                if (metric.methods) {
                  metric.methods.forEach((method: any) => {
                    if (method.applied_methods && !Array.isArray(method.applied_methods)) {
                      method.applied_methods = [method.applied_methods];
                    }
                  });
                }
              });
            }
          });
        }
      });
    }

    return dqModel;
  }


  geDQDimensionDetails(dimension: any): void {
    this.modelService.getDimensionBaseDetails(dimension.dimension_base).subscribe({
      next: (data) => {
        dimension.attributesBase = data; // Agregar detalles base al objeto de dimensión
  
        // Mapear los detalles de los problemas asociados a la dimensión
        dimension.dq_problems_details = this.mapProblemDetails(dimension.dq_problems);
  
        console.log("Detalles de la dimensión cargados:", dimension);
        console.log("Problemas de la dimensión:", dimension.dq_problems_details); // Depuración
      },
      error: (err) => {
        console.error('Error al obtener detalles de la dimensión base:', err);
      },
    });
  }



  getDQFactorDetails(factor: any): void {

    this.modelService.getFactorBaseDetails(factor.factor_base).subscribe({
      next: (data) => {
        factor.attributesBase = data;

        factor.dq_problems_details = this.mapProblemDetails(factor.dq_problems);

        console.log("Detalles del factor cargados:", factor);
      },
      error: (err) => {
        console.error('Error al obtener detalles del factor base:', err);
      },
    });
  }


  getDQMetricDetails(metric: any): void {
    this.modelService.getMetricBaseDetails(metric.metric_base).subscribe({
      next: (data) => {
        metric.attributesBase = data; // Agregar detalles al objeto de métrica
      },
      error: (err) => {
        console.error('Error al obtener detalles de la métrica base:', err);
      }
    });
  }


  getDQMethodDetails(method: any): void {
    this.modelService.getMethodBaseDetails(method.method_base).subscribe({
      next: (data) => {
        method.attributesBase = data; // Agregar detalles al objeto de método
      },
      error: (err) => {
        console.error('Error al obtener detalles del método base:', err);
      }
    });
  }


  // Context Components -----------------------

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

 
  formatContextComponents2(contextComponents: any): string {


    const formattedComponents: string[] = [];

  
    // Iterar sobre las claves del objeto
    for (const key of Object.keys(contextComponents)) {
      const values = contextComponents[key];
      if (values && values.length > 0) {
        // Formatear cada clave y sus valores con HTML
        const formattedValues = values.map((v: number) => {
          return `${v}`;
        }).join(', ');

        formattedComponents.push(`<strong>${key}:</strong> ${formattedValues}`);
      }
    }

    //this.getContextComponentsDetails(this.contextVersionId, contextComponents);
  
    // Combinar los resultados con punto y coma
    return formattedComponents.join('; ');
  }
  
  // Función para obtener los detalles de todos los componentes
  getContextComponentsDetails(contextVersionId: number, contextComponents: { [key: string]: number[] }): void {
    // Iterar sobre cada tipo de componente
    for (const componentType of Object.keys(contextComponents)) {
        const componentIds = contextComponents[componentType];

        // Filtrar arrays vacíos (si es necesario)
        if (componentIds && componentIds.length > 0) {
            // Iterar sobre cada ID del tipo de componente
            for (const componentId of componentIds) {
                // Llamar a la función que obtiene los detalles del componente
                this.getContextComponentDetailsById(contextVersionId, componentType, componentId);
            }
        }
    }
  }

  // Función para obtener los detalles de un componente de contexto
  getContextComponentDetailsById(contextVersionId: number, componentType: string, componentId: number): void {
    this.projectService.getContextComponentById(contextVersionId, componentType, componentId).subscribe({
        next: (data) => {
            console.log(`Detalles del componente ${componentType} con ID ${componentId}:`, data);
            // Aquí puedes hacer algo con los detalles del componente, como almacenarlos en una variable
            this.ctxComponentDetails = data; // Asumiendo que tienes una variable en el componente para almacenar los detalles
        },
        error: (err) => {
            console.error(`Error al obtener detalles del componente ${componentType} con ID ${componentId}:`, err);
        }
    });
  }

 

  //used in html
  formatContextComponentsBackup(contextComponents: any): string {
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


  ctxComponentDetails: any;

  // Función para obtener los detalles de los componentes de contexto
  // Función para obtener los detalles de un componente de contexto
  getContextComponentDetails_(contextVersionId: number, componentType: string, componentId: number): void {
    this.projectService.getContextComponentById(contextVersionId, componentType, componentId).subscribe({
      next: (data) => {
        console.log(`Detalles del componente ${componentType} con ID ${componentId}:`, data);
        // Aquí puedes hacer algo con los detalles del componente, como almacenarlos en una variable
        this.ctxComponentDetails = data;
      },
      error: (err) => {
        console.error(`Error al obtener detalles del componente ${componentType} con ID ${componentId}:`, err);
      }
    });
  }

  // Obtener las claves de un componente
  getComponentKeys(component: any): string[] {
    return Object.keys(component).filter((key) => key !== 'id' && key !== 'type');
  }

   // Variables para el modal
   selectedComponentKeys: string[] = []; // Claves del componente seleccionado
   selectedComponentDetails: any = {}; // Detalles del componente seleccionado

   ctxComponents: any = {}; // Inicializa como un objeto vacío

  // Obtener las categorías de los componentes de contexto
  getContextComponentCategories(contextComponents: any): string[] {
    return Object.keys(contextComponents).filter(category => contextComponents[category].length > 0);
  }

  // Formatear el nombre de la categoría
  formatCategoryName(category: string): string {
    return category.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
  }

  // Abrir el modal con los detalles del componente de contexto
  openContextComponentModal(category: string, componentId: number): void {
    const component = this.ctxComponents[category].find((comp: any) => comp.id === componentId);
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

  // Obtener el primer atributo no 'id' de un componente
  getFirstAttribute(category: string, componentId: number): string {
    const component = this.ctxComponents[category].find((comp: any) => comp.id === componentId);
    if (component) {
      const keys = Object.keys(component).filter(key => key !== 'id'); // Excluir 'id'
      if (keys.length > 0) {
        return `${component[keys[0]]}`; // Devolver solo el valor del primer atributo
      }
    }
    return 'No details available';
  }


  originalProblems: any[] = []; // Lista de problemas originales con detalles
  dimensionsWithProblemsDetails: any[] = []; // Array para almacenar dimensiones con detalles de problemas

  // Método para cargar problemas originales
  loadAllDQProblems(projectId: number): void {
    this.projectService.getDQProblemsByProjectId(projectId).subscribe({
      next: (data) => {
        this.originalProblems = data; // Almacenar los problemas originales
        console.log('Problemas originales cargados:', this.originalProblems);
      },
      error: (err) => {
        console.error('Error al cargar problemas originales:', err);
      },
    });
  }

  // Método para cargar dimensiones con detalles de problemas
  loadDimensionsWithProblemsDetails(): void {
    this.modelService.getDimensionsByDQModel(this.dqModelId).subscribe({
      next: (dimensions) => {
        // Mapear los IDs de problemas con los detalles
        this.dimensionsWithProblemsDetails = dimensions.map((dimension) => {
          return {
            ...dimension,
            dq_problems_details: this.mapProblemDetails(dimension.dq_problems),
          };
        });
      },
      error: (err) => {
        console.error('Error al cargar dimensiones:', err);
      },
    });
  }

  // Método para mapear IDs de problemas con detalles
  mapProblemDetails(problemIds: number[]): any[] {
    if (!this.originalProblems || !problemIds) {
      return []; // Retornar un array vacío si no hay problemas originales o IDs
    }

    return problemIds.map((problemId) => {
      return this.originalProblems.find((problem) => problem.id === problemId);
    }).filter((problem) => problem !== undefined); // Filtrar problemas no encontrados
  }



  //DQ MODEL CONFIRMATION
  // Método para abrir el modal de confirmación
  openConfirmDQModelModal_backup(): void {
    const modalElement = document.getElementById('confirmDQModelModal');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  openConfirmDQModelModal(): void {
    this.isConfirmDQModelModalOpen = true;
  }

  onConfirmDQModelModalClose(): void {
    this.isConfirmDQModelModalOpen = false;
  }

  
  // Método para confirmar la finalización del DQ Model
  confirmationFinishedDQModel(): void {
    this.finishCurrentDQModel(); // Llamar al método que hace la operación en el backend
    this.closeConfirmDQModelModal(); // Cerrar el modal después de confirmar
    //this.router.navigate(['/']); // Redirigir a la raíz del proyecto
  }

  // Método para cancelar y cerrar el modal
  cancelConfirmDQModelModal(): void {
    this.closeConfirmDQModelModal(); // Cerrar el modal sin hacer nada
  }

  // Método para cerrar el modal
  closeConfirmDQModelModal(): void {
    const modalElement = document.getElementById('confirmDQModelModal');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal.hide();
    }
  }

  // Método para finalizar el DQ Model (llamado desde confirmationFinishedDQModel)
  finishCurrentDQModel(): void {
    if (this.currentDQModel && this.currentDQModel.id) {
      this.modelService.finishDQModel(this.currentDQModel.id).subscribe({
        next: (response) => {
          console.log('DQ Model finalizado:', response);
          alert('El DQ Model ha sido finalizado con éxito.'); // Mensaje de éxito
          this.isNextStepEnabled = true;
          this.loadCurrentDQModel(this.currentDQModel.id); // Recargar el DQ Model actualizado
        },
        error: (err) => {
          console.error('Error al finalizar el DQ Model:', err);
          alert('Ocurrió un error al finalizar el DQ Model.'); // Mensaje de error
        },
      });
    } else {
      console.error('No se ha cargado un DQ Model válido.');
    }
  }


  formatDate(dateString: string): string {
    const date = new Date(dateString);
  
    // Obtener los componentes de la fecha
    const month = date.toLocaleString('default', { month: 'short' }); // MMM (ej. "Mar")
    const day = date.getDate(); // dd
    const hours = date.getHours(); // HH
    const minutes = date.getMinutes(); // mm
    const year = date.getFullYear(); // yyyy
  
    // Formatear la fecha como "MMM dd HH:mm yyyy"
    return `${month} ${day.toString().padStart(2, '0')} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${year}`;
  }

  generatePdf(): void {
    if (!this.completeDQModel) {
      alert('Los datos del DQ Model no están cargados.');
      return;
    }
  
    const doc = new jsPDF();
    const margin = 10; // Margen izquierdo
    let yOffset = 20;  // Posición vertical inicial
    const pageHeight = doc.internal.pageSize.getHeight(); // Altura de la página
  
    // Función para agregar texto con etiqueta en negrita y valor normal
    const addLabelValue = (label: string, value: string, indent: number = 0) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, margin + indent, yOffset);
      const labelWidth = doc.getTextWidth(`${label}:`);
      doc.setFont('helvetica', 'normal');
      doc.text(value, margin + indent + labelWidth + 2, yOffset);
      yOffset += 7; // Espaciado entre líneas
  
      // Verificar si se necesita una nueva página
      if (yOffset > pageHeight - 20) {
        doc.addPage();
        yOffset = 20; // Reiniciar la posición Y en la nueva página
      }
    };
  
    // Título del PDF (en negrita y tamaño 18)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text("DQ Model Report", margin, yOffset);
    yOffset += 10;
  
    // Información del modelo (tamaño 10)
    doc.setFontSize(10);
  
    // Información del modelo
    addLabelValue('Model ID', this.completeDQModel.model.id.toString());
    addLabelValue('Version', this.completeDQModel.model.version);
    addLabelValue('Created At', this.formatDate(this.completeDQModel.model.created_at));
    addLabelValue('Status', this.completeDQModel.model.status);
  
    // Context version (asumiendo que está en this.project)
    addLabelValue('Context version', `CtxA v1.0 (id: ${this.project.context_version})`);
  
    // Data at hand (asumiendo que está en this.project)
    addLabelValue('Data at hand', 'Dataset A');
  
    // DQ Dimensions
    doc.setFont('helvetica', 'bold');
    doc.text('DQ Dimensions:', margin, yOffset);
    yOffset += 10;
  
    // Iterar sobre todas las dimensiones
    this.completeDQModel.dimensions.forEach((dimension: any, index: number) => {
      // Nombre de la dimensión en negrita
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`DQ Dimension: ${dimension.dimension_name}`, margin, yOffset);
      yOffset += 7;
      doc.setFontSize(10);
  
      // Atributos de la dimensión
      addLabelValue('  Semantic', dimension.attributesBase?.semantic || 'N/A');
  
      // Context components (Ctx)
      doc.setFont('helvetica', 'bold');
      doc.text('  Suggested by (Ctx. Components):', margin, yOffset);
      yOffset += 7;
  
      Object.keys(dimension.context_components).forEach((category) => {
        const components = dimension.context_components[category];
        if (components.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.text(`    ${this.formatCategoryName(category)}:`, margin, yOffset);
          yOffset += 7;
  
          components.forEach((componentId: number) => {
            const componentDetails = this.getFirstAttribute(category, componentId);
            doc.setFont('helvetica', 'normal');
            doc.text(`      - ${componentDetails}`, margin + 5, yOffset);
            yOffset += 7;
  
            // Verificar si se necesita una nueva página
            if (yOffset > pageHeight - 20) {
              doc.addPage();
              yOffset = 20; // Reiniciar la posición Y en la nueva página
            }
          });
        }
      });
  
      // DQ Problems (Used)
      doc.setFont('helvetica', 'bold');
      doc.text('  DQ Problems (Used):', margin, yOffset);
      yOffset += 7;
  
      dimension.dq_problems_details.forEach((problem: any) => {
        doc.setFont('helvetica', 'normal');
        doc.text(`    - ${problem.description}`, margin + 5, yOffset);
        yOffset += 7;
  
        // Verificar si se necesita una nueva página
        if (yOffset > pageHeight - 20) {
          doc.addPage();
          yOffset = 20; // Reiniciar la posición Y en la nueva página
        }
      });
  
      // DQ Factors
      doc.setFont('helvetica', 'bold');
      doc.text('  DQ Factors:', margin, yOffset);
      yOffset += 7;
  
      // Iterar sobre todos los factores
      dimension.factors.forEach((factor: any) => {
        addLabelValue('    DQ Factor', factor.factor_name);
  
        // Atributos del factor
        addLabelValue('      Semantic', factor.attributesBase?.semantic || 'N/A');
  
        // Context components (Ctx)
        doc.setFont('helvetica', 'bold');
        doc.text('      Arises from (Ctx. Components):', margin, yOffset);
        yOffset += 7;
  
        Object.keys(factor.context_components).forEach((category) => {
          const components = factor.context_components[category];
          if (components.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.text(`        ${this.formatCategoryName(category)}:`, margin, yOffset);
            yOffset += 7;
  
            components.forEach((componentId: number) => {
              const componentDetails = this.getFirstAttribute(category, componentId);
              doc.setFont('helvetica', 'normal');
              doc.text(`          - ${componentDetails}`, margin + 5, yOffset);
              yOffset += 7;
  
              // Verificar si se necesita una nueva página
              if (yOffset > pageHeight - 20) {
                doc.addPage();
                yOffset = 20; // Reiniciar la posición Y en la nueva página
              }
            });
          }
        });
  
        // DQ Problems (Used)
        doc.setFont('helvetica', 'bold');
        doc.text('      DQ Problems (Used):', margin, yOffset);
        yOffset += 7;
  
        factor.dq_problems_details.forEach((problem: any) => {
          doc.setFont('helvetica', 'normal');
          doc.text(`        - ${problem.description}`, margin + 5, yOffset);
          yOffset += 7;
  
          // Verificar si se necesita una nueva página
          if (yOffset > pageHeight - 20) {
            doc.addPage();
            yOffset = 20; // Reiniciar la posición Y en la nueva página
          }
        });
  
        // DQ Metrics
        doc.setFont('helvetica', 'bold');
        doc.text('      DQ Metrics:', margin, yOffset);
        yOffset += 7;
  
        // Iterar sobre todas las métricas
        factor.metrics.forEach((metric: any) => {
          addLabelValue('        DQ Metric', metric.metric_name);
  
          // Atributos de la métrica
          addLabelValue('          Purpose', metric.attributesBase?.purpose || 'N/A');
          addLabelValue('          Granularity', metric.attributesBase?.granularity || 'N/A');
          addLabelValue('          Result domain', metric.attributesBase?.resultDomain || 'N/A');
  
          // DQ Methods
          doc.setFont('helvetica', 'bold');
          doc.text('          DQ Methods:', margin, yOffset);
          yOffset += 7;
  
          // Iterar sobre todos los métodos
          metric.methods.forEach((method: any) => {
            addLabelValue('            DQ Method', method.method_name);
  
            // Atributos del método
            addLabelValue('              Input data type', method.attributesBase?.inputDataType || 'N/A');
            addLabelValue('              Output data type', method.attributesBase?.outputDataType || 'N/A');
            addLabelValue('              Algorithm', method.attributesBase?.algorithm || 'N/A');
  
            // Applied Methods: Measurements
            if (method.applied_methods?.measurements?.length > 0) {
              doc.setFont('helvetica', 'bold');
              doc.text('              Applied Measurements:', margin, yOffset);
              yOffset += 7;
  
              method.applied_methods.measurements.forEach((measurement: any) => {
                addLabelValue('                Measurement', measurement.name);
                addLabelValue('                  Applied to', measurement.appliedTo);
              });
            }
  
            // Applied Methods: Aggregations
            if (method.applied_methods?.aggregations?.length > 0) {
              doc.setFont('helvetica', 'bold');
              doc.text('              Applied Aggregations:', margin, yOffset);
              yOffset += 7;
  
              method.applied_methods.aggregations.forEach((aggregation: any) => {
                addLabelValue('                Aggregation', aggregation.name);
                addLabelValue('                  Applied to', aggregation.appliedTo);
              });
            }
          });
        });
      });
  
      // Agregar una línea horizontal al final de cada dimensión (excepto la primera)
      if (index < this.completeDQModel.dimensions.length - 1) {
        doc.setDrawColor(0); // Color de la línea (negro)
        doc.line(margin, yOffset, doc.internal.pageSize.getWidth() - margin, yOffset); // Dibujar línea
        yOffset += 10; // Espaciado después de la línea
  
        // Verificar si se necesita una nueva página
        if (yOffset > pageHeight - 20) {
          doc.addPage();
          yOffset = 20; // Reiniciar la posición Y en la nueva página
        }
      }
    });
  
    // Guardar el PDF
    doc.save(`dqmodel_${this.completeDQModel.model.id}.pdf`);
  }


  generatePdf_backup(): void {
    if (!this.completeDQModel) {
      alert('Los datos del DQ Model no están cargados.');
      return;
    }
  
    const doc = new jsPDF();
    const margin = 10; // Margen izquierdo
    let yOffset = 20;  // Posición vertical inicial
    const pageHeight = doc.internal.pageSize.getHeight(); // Altura de la página
  
    // Función para agregar texto con etiqueta en negrita y valor normal
    const addLabelValue = (label: string, value: string, indent: number = 0) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, margin + indent, yOffset);
      const labelWidth = doc.getTextWidth(`${label}:`);
      doc.setFont('helvetica', 'normal');
      doc.text(value, margin + indent + labelWidth + 2, yOffset);
      yOffset += 7; // Espaciado entre líneas
  
      // Verificar si se necesita una nueva página
      if (yOffset > pageHeight - 20) {
        doc.addPage();
        yOffset = 20; // Reiniciar la posición Y en la nueva página
      }
    };
  
    // Título del PDF (en negrita y tamaño 18)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text("DQ Model Report", margin, yOffset);
    yOffset += 10;
  
    // Información del modelo (tamaño 10)
    doc.setFontSize(10);
  
    // Información del modelo
    addLabelValue('Model ID', this.completeDQModel.model.id.toString());
    addLabelValue('Version', this.completeDQModel.model.version);
    addLabelValue('Created At', this.formatDate(this.completeDQModel.model.created_at));
    addLabelValue('Status', this.completeDQModel.model.status);
  
    // Context version (asumiendo que está en this.project)
    addLabelValue('Context version', `CtxA v1.0 (id: ${this.project.context_version})`);
  
    // Data at hand (asumiendo que está en this.project)
    addLabelValue('Data at hand', 'Dataset A');
  
    // DQ Dimensions
    doc.setFont('helvetica', 'bold');
    doc.text('DQ Dimensions:', margin, yOffset);
    yOffset += 10;
  
    // Iterar sobre todas las dimensiones
    this.completeDQModel.dimensions.forEach((dimension: any, index: number) => {
      // Nombre de la dimensión en negrita
      doc.setFont('helvetica', 'bold');
      doc.text(`DQ Dimension: ${dimension.dimension_name}`, margin, yOffset);
      yOffset += 7;
  
      // Atributos de la dimensión
      addLabelValue('  Semantic', dimension.attributesBase?.semantic || 'N/A');
  
      // Context components (Ctx)
      doc.setFont('helvetica', 'bold');
      doc.text('  Ctx (Suggested by):', margin, yOffset);
      yOffset += 7;
  
      Object.keys(dimension.context_components).forEach((category) => {
        const components = dimension.context_components[category];
        if (components.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.text(`    ${this.formatCategoryName(category)}:`, margin, yOffset);
          yOffset += 7;
  
          components.forEach((componentId: number) => {
            const componentDetails = this.getFirstAttribute(category, componentId);
            doc.setFont('helvetica', 'normal');
            doc.text(`      - ${componentDetails}`, margin + 5, yOffset);
            yOffset += 7;
  
            // Verificar si se necesita una nueva página
            if (yOffset > pageHeight - 20) {
              doc.addPage();
              yOffset = 20; // Reiniciar la posición Y en la nueva página
            }
          });
        }
      });
  
      // DQ Problems (Used)
      doc.setFont('helvetica', 'bold');
      doc.text('  DQ Problems (Used):', margin, yOffset);
      yOffset += 7;
  
      dimension.dq_problems_details.forEach((problem: any) => {
        doc.setFont('helvetica', 'normal');
        doc.text(`    - ${problem.description}`, margin + 5, yOffset);
        yOffset += 7;
  
        // Verificar si se necesita una nueva página
        if (yOffset > pageHeight - 20) {
          doc.addPage();
          yOffset = 20; // Reiniciar la posición Y en la nueva página
        }
      });
  
      // DQ Factors
      doc.setFont('helvetica', 'bold');
      doc.text('  DQ Factors:', margin, yOffset);
      yOffset += 7;
  
      // Iterar sobre todos los factores
      dimension.factors.forEach((factor: any) => {
        addLabelValue('    DQ Factor', factor.factor_name);
  
        // Atributos del factor
        addLabelValue('      Semantic', factor.attributesBase?.semantic || 'N/A');
  
        // Context components (Ctx)
        doc.setFont('helvetica', 'bold');
        doc.text('      Ctx (Arises from):', margin, yOffset);
        yOffset += 7;
  
        Object.keys(factor.context_components).forEach((category) => {
          const components = factor.context_components[category];
          if (components.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.text(`        ${this.formatCategoryName(category)}:`, margin, yOffset);
            yOffset += 7;
  
            components.forEach((componentId: number) => {
              const componentDetails = this.getFirstAttribute(category, componentId);
              doc.setFont('helvetica', 'normal');
              doc.text(`          - ${componentDetails}`, margin + 5, yOffset);
              yOffset += 7;
  
              // Verificar si se necesita una nueva página
              if (yOffset > pageHeight - 20) {
                doc.addPage();
                yOffset = 20; // Reiniciar la posición Y en la nueva página
              }
            });
          }
        });
  
        // DQ Problems (Used)
        doc.setFont('helvetica', 'bold');
        doc.text('      DQ Problems (Used):', margin, yOffset);
        yOffset += 7;
  
        factor.dq_problems_details.forEach((problem: any) => {
          doc.setFont('helvetica', 'normal');
          doc.text(`        - ${problem.description}`, margin + 5, yOffset);
          yOffset += 7;
  
          // Verificar si se necesita una nueva página
          if (yOffset > pageHeight - 20) {
            doc.addPage();
            yOffset = 20; // Reiniciar la posición Y en la nueva página
          }
        });
  
        // DQ Metrics
        doc.setFont('helvetica', 'bold');
        doc.text('      DQ Metrics:', margin, yOffset);
        yOffset += 7;
  
        // Iterar sobre todas las métricas
        factor.metrics.forEach((metric: any) => {
          addLabelValue('        DQ Metric', metric.metric_name);
  
          // Atributos de la métrica
          addLabelValue('          Purpose', metric.attributesBase?.purpose || 'N/A');
          addLabelValue('          Granularity', metric.attributesBase?.granularity || 'N/A');
          addLabelValue('          Result domain', metric.attributesBase?.resultDomain || 'N/A');
  
          // DQ Methods
          doc.setFont('helvetica', 'bold');
          doc.text('          DQ Methods:', margin, yOffset);
          yOffset += 7;
  
          // Iterar sobre todos los métodos
          metric.methods.forEach((method: any) => {
            addLabelValue('            DQ Method', method.method_name);
  
            // Atributos del método
            addLabelValue('              Input data type', method.attributesBase?.inputDataType || 'N/A');
            addLabelValue('              Output data type', method.attributesBase?.outputDataType || 'N/A');
            addLabelValue('              Algorithm', method.attributesBase?.algorithm || 'N/A');
  
            // Applied Methods: Measurements
            if (method.applied_methods?.measurements?.length > 0) {
              doc.setFont('helvetica', 'bold');
              doc.text('              Applied Measurements:', margin, yOffset);
              yOffset += 7;
  
              method.applied_methods.measurements.forEach((measurement: any) => {
                addLabelValue('                Measurement', measurement.name);
                addLabelValue('                  Applied to', measurement.appliedTo);
              });
            }
  
            // Applied Methods: Aggregations
            if (method.applied_methods?.aggregations?.length > 0) {
              doc.setFont('helvetica', 'bold');
              doc.text('              Applied Aggregations:', margin, yOffset);
              yOffset += 7;
  
              method.applied_methods.aggregations.forEach((aggregation: any) => {
                addLabelValue('                Aggregation', aggregation.name);
                addLabelValue('                  Applied to', aggregation.appliedTo);
              });
            }
          });
        });
      });
  
      // Agregar una línea horizontal al final de cada dimensión (excepto la primera)
      if (index < this.completeDQModel.dimensions.length - 1) {
        doc.setDrawColor(0); // Color de la línea (negro)
        doc.line(margin, yOffset, doc.internal.pageSize.getWidth() - margin, yOffset); // Dibujar línea
        yOffset += 10; // Espaciado después de la línea
  
        // Verificar si se necesita una nueva página
        if (yOffset > pageHeight - 20) {
          doc.addPage();
          yOffset = 20; // Reiniciar la posición Y en la nueva página
        }
      }
    });
  
    // Guardar el PDF
    doc.save(`dqmodel_${this.completeDQModel.model.id}.pdf`);
  }


  // Método para generar el PDF
  generatePdfSimple(): void {
    const doc = new jsPDF();

    // Título del PDF
    doc.setFontSize(18);
    doc.text("DQ Model Report", 10, 10);

    // Información del modelo
    doc.setFontSize(12);
    doc.text(`Model ID: ${this.completeDQModel.model.id}`, 10, 20);
    doc.text(`Version: ${this.completeDQModel.model.version}`, 10, 30);
    const formattedDate = this.formatDate(this.completeDQModel.model.created_at);
    doc.text(`Created At: ${formattedDate}`, 10, 40);
    doc.text(`Status: ${this.completeDQModel.model.status}`, 10, 50);

    // Dimensiones y factores
    let yOffset = 60; // Posición vertical inicial
    this.completeDQModel.dimensions.forEach((dimension: any) => {
      doc.setFontSize(14);
      doc.text(`DQ Dimension: ${dimension.dimension_name}`, 10, yOffset);
      yOffset += 10;

      dimension.factors.forEach((factor: any) => {
        doc.setFontSize(14);
        doc.text(`- DQ Factor: ${factor.factor_name}`, 15, yOffset);
        yOffset += 10;

        factor.metrics.forEach((metric: any) => {
          doc.setFontSize(12);
          doc.text(`  - DQ Metric: ${metric.metric_name}`, 20, yOffset);
          yOffset += 10;

          // Métodos asociados a la métrica
          metric.methods.forEach((method: any) => {
            doc.text(`    - DQ Method: ${method.method_name}`, 25, yOffset);
            yOffset += 10;

            // Métodos aplicados (measurements y aggregations)
            if (method.applied_methods) {
              if (method.applied_methods.measurements && method.applied_methods.measurements.length > 0) {
                method.applied_methods.measurements.forEach((measurement: any) => {
                  doc.text(`      - Measurement Applied DQ Method: ${measurement.name}`, 30, yOffset);
                  yOffset += 10;
                });
              }

              if (method.applied_methods.aggregations && method.applied_methods.aggregations.length > 0) {
                method.applied_methods.aggregations.forEach((aggregation: any) => {
                  doc.text(`      - Aggregation Applied DQ Method:: ${aggregation.name}`, 30, yOffset);
                  yOffset += 10;
                });
              }
            }
          });
        });
      });
    });

    // Guardar el PDF
    doc.save(`dqmodel_${this.completeDQModel.model.id}.pdf`);
  }



  // Navegación
  onStepChange(step: number) {
    this.currentStep = step;
    this.navigateToStep(step);
  }
  /*onStepChange(step: number): void {
    if (this.isNextStepEnabled) {
      this.currentStep = step;
    } else {
      console.warn('No se puede avanzar. El estado del modelo no es "finished".');
    }
  }*/
  
  navigateToStep(stepIndex: number) {
    const route = this.steps[stepIndex].route;
    this.router.navigate([route]);
  }


  // Propiedades para el modal de confirmación
  isConfirmDQModelModalOpen: boolean = false;
  confirmDQModelMessage: string = `
  Are you sure you want to finalize the definition of the DQ Model?
  By confirming, the model will no longer be editable, and its status will be updated from "Draft" to "Finished".
  This action cannot be undone.
`;


  // Método para manejar la finalización del stage
  onCompleteStage(): void {
    // Navegar al siguiente stage (por ejemplo, Stage 5)
    this.router.navigate(['/st5/execution']); // Cambia '/stage5' por la ruta correcta

    // Reiniciar el contador de pasos (si es necesario)
    this.currentStep = 0;
  }

}