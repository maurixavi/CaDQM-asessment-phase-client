import { Component, OnInit, ViewEncapsulation  } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { DqModelService } from '../../services/dq-model.service';

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

        this.dqModelId = project.dqmodel_version


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

                console.log("Método:", method.method_name);
  console.log("Applied Methods:", method.applied_methods);
  
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


  // Función para obtener detalles de una dimensión base
  getDimensionBaseDetails(dimension: any): void {
    this.modelService.getDimensionBaseDetails(dimension.dimension_base).subscribe({
      next: (data) => {
        dimension.attributesBase = data; // Agregar detalles al objeto de dimensión
      },
      error: (err) => {
        console.error('Error al obtener detalles de la dimensión base:', err);
      }
    });
  }

  // Función para obtener detalles de un factor base
  getFactorBaseDetails(factor: any): void {
    this.modelService.getFactorBaseDetails(factor.factor_base).subscribe({
      next: (data) => {
        factor.attributesBase = data; // Agregar detalles al objeto de factor
      },
      error: (err) => {
        console.error('Error al obtener detalles del factor base:', err);
      }
    });
  }

  // Función para obtener detalles de una métrica base
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

  // Función para obtener detalles de un método base
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


}