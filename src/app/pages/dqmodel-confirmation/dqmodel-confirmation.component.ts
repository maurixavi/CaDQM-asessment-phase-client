import { Component, OnInit, ViewEncapsulation  } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { DqModelService } from '../../services/dq-model.service';

declare var bootstrap: any; 

@Component({
  selector: 'app-dqmodel-confirmation',
  templateUrl: './dqmodel-confirmation.component.html',
  //styleUrl: './dqmodel-confirmation.component.css',
  styleUrls: ['./dqmodel-confirmation.component.css'],    
  encapsulation: ViewEncapsulation.None
})


export class DQModelConfirmationComponent implements OnInit {
  /*steps: string[] = [
    'Step 1',
    'Step 2',
    'Step 3',
    'Step 4',
    'Step 5',
    'Step 6',
    'Confirmation'
  ];*/
  
  currentStep: number = 5; // Confirmación es el paso 6
  pageStepTitle: string = 'DQ Model confirmation';
  phaseTitle: string = 'Phase 2: DQ Assessment';
  stageTitle: string = 'Stage 4: DQ Model Definition';

  project: any; 
  projectId: number | null = null;

  dqModelId: number = -1; 

  completeDQModel: any; 

  contextVersionId: number = -1; 
  
  isLoading: boolean = true; // Activar el estado de carga
  

  constructor(
    private modelService: DqModelService,
    private projectService: ProjectService
  ) {}

  ngOnInit(): void {

    this.loadCurrentProject();
    
  }



  loadCurrentProject(): void {
    this.projectService.loadCurrentProject().subscribe({
      next: (project) => {
        this.project = project; //Set current Project

        console.log('Proyecto cargado en el componente:', this.project);

        this.projectId = project.id;

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

  getAllContextComponents(contextVersionId: number): void {
    this.projectService.getContextComponents(contextVersionId).subscribe({
      next: (data) => {
        console.log('---Context Components context_version:---', data);
        this.ctxComponents = data;
      },
      error: (err) => console.error('Error fetching context components:', err)
    });
  }


  loadFullDQModel(dqModelId: number): void {
    this.modelService.getFullDQModel(dqModelId).subscribe({
      next: (data) => {
        this.completeDQModel = this.transformDQModelToIterable(data);
        this.isLoading = false;
  
        // Obtener detalles de las dimensiones base
        this.completeDQModel.dimensions.forEach((dimension: any) => {
          this.getDimensionBaseDetails(dimension);
  
          // Obtener detalles de los factores base
          dimension.factors.forEach((factor: any) => {
            this.getFactorBaseDetails(factor);
  
            // Obtener detalles de las métricas base
            factor.metrics.forEach((metric: any) => {
              this.getMetricBaseDetails(metric);
  
              // Obtener detalles de los métodos base
              metric.methods.forEach((method: any) => {
                this.getMethodBaseDetails(method);

                //console.log("Método:", method.method_name);
                //console.log("Applied Methods:", method.applied_methods);
  
                // Obtener detalles de los métodos aplicados (measurements y aggregations)
                if (method.applied_methods) {
                  // Obtener measurements
                  if (method.applied_methods.measurements && method.applied_methods.measurements.length > 0) {
                    method.applied_methods.measurements.forEach((measurement: any) => {
                      this.getMeasurementDetails(measurement);
                    });
                  }
  
                  // Obtener aggregations
                  if (method.applied_methods.aggregations && method.applied_methods.aggregations.length > 0) {
                    method.applied_methods.aggregations.forEach((aggregation: any) => {
                      this.getAggregationDetails(aggregation);
                    });
                  }
                }
              });
            });
          });
        });
  
        console.log("COMPLETE DQModel con detalles base:", this.completeDQModel);
      },
      error: (err) => {
        console.error('Error al cargar el DQModel.', err);
        this.isLoading = false;
      }
    });
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


  loadFullDQModel_backup83(dqModelId: number): void {
    this.modelService.getFullDQModel(dqModelId).subscribe({
      next: (data) => {
        this.completeDQModel = this.transformDQModelToIterable(data);
        this.isLoading = false;
  
        // Obtener detalles de las dimensiones base
        this.completeDQModel.dimensions.forEach((dimension: any) => {
          //console.log("dimension.dimension_base", dimension.dimension_base)
          this.getDimensionBaseDetails(dimension);
  
          // Obtener detalles de los factores base
          dimension.factors.forEach((factor: any) => {
            //console.log("factor.factor_base", factor.factor_base)
            this.getFactorBaseDetails(factor);
  
            // Obtener detalles de las métricas base
            factor.metrics.forEach((metric: any) => {
              this.getMetricBaseDetails(metric);
  
              // Obtener detalles de los métodos base
              metric.methods.forEach((method: any) => {
                this.getMethodBaseDetails(method);
                
              });
            });
          });
        });
  
        console.log("COMPLETE DQModel con detalles base:", this.completeDQModel);
      },
      error: (err) => {
        console.error('Error al cargar el DQModel.', err);
        this.isLoading = false;
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



  getDimensionBaseDetails(dimension: any): void {
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

  getDimensionBaseDetails0(dimension: any): void {
    this.modelService.getDimensionBaseDetails(dimension.dimension_base).subscribe({
      next: (data) => {
        dimension.attributesBase = data; // Agregar detalles al objeto de dimensión
      },
      error: (err) => {
        console.error('Error al obtener detalles de la dimensión base:', err);
      }
    });
  }


  getFactorBaseDetails(factor: any): void {

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

  getFactorBaseDetails0(factor: any): void {
    this.modelService.getFactorBaseDetails(factor.factor_base).subscribe({
      next: (data) => {
        factor.attributesBase = data; 
      },
      error: (err) => {
        console.error('Error al obtener detalles del factor base:', err);
      }
    });
  }


  getMetricBaseDetails(metric: any): void {
    this.modelService.getMetricBaseDetails(metric.metric_base).subscribe({
      next: (data) => {
        metric.attributesBase = data; // Agregar detalles al objeto de métrica
      },
      error: (err) => {
        console.error('Error al obtener detalles de la métrica base:', err);
      }
    });
  }


  getMethodBaseDetails(method: any): void {
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



  // Confirmar el DQ Model
  confirmDQModel(): void {
    const confirmationMessage = `
      Are you sure you want to finalize the definition of the DQ Model?
      By confirming, the model will no longer be editable, and its status will be updated from "Draft" to "Finished".
      This action cannot be undone.
    `;

    const userConfirmed = confirm(confirmationMessage);

    if (userConfirmed) {
      // agregar lgica para actualizar el estado del DQ Model a "Finished"

    } else {
      console.log("DQ Model confirmation canceled by the user.");
    }
  }

    // Método para abrir el modal de confirmación
  openConfirmDQModelModal(): void {
    const modalElement = document.getElementById('confirmDQModelModal');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  // Método para finalizar el DQ Model
  finalizeDQModel(): void {
    // Cerrar el modal
    const modalElement = document.getElementById('confirmDQModelModal');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal.hide();
    }

    // Lógica para actualizar el estado del DQ Model a "Finished"
    //this.updateDQModelStatus();
  }


}