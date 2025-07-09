import { ChangeDetectorRef, Component, OnInit, ViewEncapsulation  } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DqModelService } from '../../services/dq-model.service';
import { NotificationService } from '../../services/notification.service';
import { ProjectDataService } from '../../services/project-data.service';
import { Router } from '@angular/router';
import { combineLatest } from 'rxjs';
import { filter } from 'rxjs/operators';
import { buildContextComponents, formatCtxCompCategoryName, getFirstNonIdAttribute, formatAppliedTo, getAppliedToDisplay, formatCategoryName } from '../../shared/utils/utils';
import { jsPDF } from 'jspdf';

declare var bootstrap: any; 

@Component({
  selector: 'app-dqmodel-confirmation',
  templateUrl: './dqmodel-confirmation.component.html',
  styleUrls: ['./dqmodel-confirmation.component.css'],    

})
export class DQModelConfirmationComponent implements OnInit {

  // =============================================
  // 1. CONSTANTES Y CONFIGURACIÓN
  // =============================================
  //public formatCtxCompCategoryName = formatCtxCompCategoryName;
  //public getFirstNonIdAttribute = getFirstNonIdAttribute;
  public formatAppliedTo = formatAppliedTo;
  public getAppliedToDisplay = getAppliedToDisplay;
  public formatCategoryName = formatCategoryName;

  // =============================================
  // 2. VARIABLES DE ESTADO Y DATOS
  // =============================================
  currentStep: number = 5;
  pageStepTitle: string = 'DQ Model confirmation';
  phaseTitle: string = 'Phase 2: DQ Assessment';
  stageTitle: string = 'Stage 4: DQ Model Definition';

  steps: { displayName: string, route: string, description: string }[] = [
    { displayName: 'A09.1', route: 'phase2/st4/dq-problems-priorization', description: 'Prioritization of DQ Problems' },
    { displayName: 'A09.2', route: 'phase2/st4/dq-problems-selection', description: 'Selection of DQ Problems' },
    { displayName: 'A10', route: 'phase2/st4/dq-dimensions-factors', description: 'Selection of DQ Dimensions and Factors' },
    { displayName: 'A11', route: 'phase2/st4/dq-metrics', description: 'Definition of DQ Metrics' },
    { displayName: 'A12', route: 'phase2/st4/dq-methods', description: 'Implementation of DQ Methods' },
    { displayName: 'DQ Model Confirmation', route: 'phase2/st4/dq-model', description: 'DQ Model Confirmation' }
  ];


  isNextStepEnabled: boolean = false;
  isLoading: boolean = true; 
  
  // Datos del proyecto
  project: any; 
  projectId: number | null = null;
  dataSchema: any = null;
  dataAtHandDetails: any = null;
  contextVersion: any = null;
  contextVersionId: number = -1;

  // Modelo DQ
  dqModelId: number = -1; 
  completeDQModel: any;
  currentDQModel: any | null = null;
  dqModelVersionId: number | null = null;

  // Context Components
  ctxComponents: any = {};
  ctxComponentDetails: any;
  selectedComponentKeys: string[] = [];
  selectedComponentDetails: any = {};

  // DQ Problems
  originalDQProblems: any[] = [];

  // Propiedades para el modal de confirmación
  isConfirmDQModelModalOpen: boolean = false;
  confirmDQModelMessage: string = `
    Are you sure you want to finalize the definition of the DQ Model?
    By confirming, the model will no longer be editable, and its status will be updated from "Draft" to "Finished".
    This action cannot be undone.
  `;

  constructor(
    private router: Router, 
    private cdr: ChangeDetectorRef,
    private modelService: DqModelService,
    private projectDataService: ProjectDataService, 
    private notificationService: NotificationService,
  ) {}

  // =============================================
  // 3. CICLO DE VIDA DEL COMPONENTE
  // =============================================
  ngOnInit(): void {
    // Obtener el Project ID actual
    this.projectId = this.projectDataService.getProjectId();
    this.subscribeToData();

    // Sincronizar el paso actual con la ruta
    this.syncCurrentStepWithRoute();
  }

  // =============================================
  // 4. MANEJO DE DATOS Y SUSCRIPCIONES
  // =============================================
  syncCurrentStepWithRoute() {
    const currentRoute = this.router.url; // Obtiene la ruta actual (por ejemplo, '/st4/confirmation-stage-4')
    const stepIndex = this.steps.findIndex(step => step.route === currentRoute);
    if (stepIndex !== -1) {
      this.currentStep = stepIndex;
    }
  }

  // Métodos de suscripción a datos
  subscribeToData(): void {
    this.projectDataService.project$.subscribe((data) => {
      this.project = data;
      if (this.project) {
        this.fetchDataAtHandDetails(this.project.data_at_hand);
      }
    });

    this.projectDataService.dataSchema$.subscribe((data) => {
      this.dataSchema = data;
    });

    this.projectDataService.contextVersion$.subscribe(contextVersion => {
      this.contextVersion = contextVersion;
    });
  
    // Combinar las suscripciones críticas
    combineLatest([
      this.projectDataService.contextComponents$,
      this.projectDataService.dqProblems$,
      this.projectDataService.dqModelVersion$.pipe(filter(Boolean)) // Filtra valores null
    ]).pipe(
      filter(([ctxComponents, dqProblems, dqModelVersionId]) => 
        ctxComponents && dqProblems.length > 0)
    ).subscribe(([ctxComponents, dqProblems, dqModelVersionId]) => {
      this.ctxComponents = ctxComponents;
      this.originalDQProblems = dqProblems;
      this.dqModelVersionId = dqModelVersionId;
      
      /* loadFullDQModel() se ejecuta solo cuando:
      ContextComponents y DQ Problems estan disponibles
      dqModelVersionId no es null */
      this.loadFullDQModel(dqModelVersionId);
      this.fetchDQModelDetails(dqModelVersionId);
    });
  
  }


  // =============================================
  // MÉTODOS DE CARGA DE DATOS
  // =============================================
  fetchDQModelDetails(dqmodelId: number): void {
    this.modelService.getCurrentDQModel(dqmodelId).subscribe({
      next: (dqModel) => {
        this.currentDQModel = dqModel;
        console.log('DQ Model cargado:', this.currentDQModel);
        if (this.currentDQModel.status === "finished") {
          this.isNextStepEnabled = true;
        }
        this.cdr.detectChanges(); 
      },
      error: (err) => {
        console.error('Error al cargar el DQ Model:', err);
      },
    });
  }

  fetchDataAtHandDetails(dataAtHandId: number): void {
    this.projectDataService.getDataAtHandById(dataAtHandId).subscribe(
      (data) => {
        this.dataAtHandDetails = data; 
      },
      (error) => {
        console.error('Error loading data at hand details:', error);
      }
    );
  }


  getDQProblemsDetails(dqProblemIds: number[]): any[] {
    return this.originalDQProblems.filter(problem => dqProblemIds.includes(problem.id));
  }



  async loadFullDQModel(dqModelId: number): Promise<void> {
    try {
      const data = await this.modelService.getFullDQModel(dqModelId).toPromise();
      this.completeDQModel = this.transformDQModelToIterable(data);
      this.isLoading = false;
  
      // Obtener detalles de las dimensiones base
      for (const dimension of this.completeDQModel.dimensions) {
        await this.fetchDQDimensionDetails(dimension);
  
        // Obtener detalles de los factores base
        for (const factor of dimension.factors) {
          await this.fetchDQFactorDetails(factor);
  
          // Obtener detalles de las métricas base
          for (const metric of factor.metrics) {
            this.fetchDQMetricDetails(metric);
  
            // Obtener detalles de los métodos base
            for (const method of metric.methods) {
              this.fetchDQMethodDetails(method);
  
              // Obtener detalles de los métodos aplicados (measurements y aggregations)
              if (method.applied_methods) {
                // Obtener measurements
                if (method.applied_methods.measurements && method.applied_methods.measurements.length > 0) {
                  for (const measurement of method.applied_methods.measurements) {
                    this.fetchMeasurementAppliedMethodDetails(measurement);
                  }
                }
  
                // Obtener aggregations
                if (method.applied_methods.aggregations && method.applied_methods.aggregations.length > 0) {
                  for (const aggregation of method.applied_methods.aggregations) {
                    this.fetchAggregationAppliedMethodDetails(aggregation);
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
    if (!this.originalDQProblems || !problemIds) {
      return []; // Retornar un array vacío si no hay problemas originales o IDs
    }
  
    return problemIds.map((problemId) => {
      // Obtener el dq_problem_id correspondiente al problemId
      const dqProblemId = prioritizedProblemsMap.get(problemId);
      if (dqProblemId) {
        return this.originalDQProblems.find((problem) => problem.id === dqProblemId);
      }
      return null; // Si no se encuentra el dq_problem_id, devolver null
    }).filter((problem) => problem !== null); // Filtrar problemas no encontrados
  }


    // Función para obtener detalles de un measurement
  fetchMeasurementAppliedMethodDetails(measurementAppliedMethod: any): void {
    this.modelService.getMeasurementAppliedMethodDetails(measurementAppliedMethod.id).subscribe({
      next: (data) => {
        measurementAppliedMethod.details = data; 
      },
      error: (err) => {
        console.error('Error al obtener detalles del measurementAppliedMethod:', err);
      }
    });
  }

  // Función para obtener detalles de una aggregation
  fetchAggregationAppliedMethodDetails(aggregationAppliedMethod: any): void {
    this.modelService.getAggregationAppliedMethodDetails(aggregationAppliedMethod.id).subscribe({
      next: (data) => {
        aggregationAppliedMethod.details = data; 
      },
      error: (err) => {
        console.error('Error al obtener detalles del aggregationAppliedMethod:', err);
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


  fetchDQDimensionDetails(dimension: any): void {
    this.modelService.getDimensionBaseDetails(dimension.dimension_base).subscribe({
      next: (data) => {
        dimension.attributesBase = data; // Agregar detalles base al objeto de dimensión
  
        // Mapear los detalles de los problemas asociados a la dimensión
        dimension.dq_problems_details = this.mapProblemDetails(dimension.dq_problems);
  
        /*console.log("Detalles de la dimensión cargados:", dimension);
        console.log("Problemas de la dimensión:", dimension.dq_problems_details);*/
      },
      error: (err) => {
        console.error('Error al obtener detalles de la dimensión base:', err);
      },
    });
  }



  fetchDQFactorDetails(factor: any): void {

    this.modelService.getFactorBaseDetails(factor.factor_base).subscribe({
      next: (data) => {
        factor.attributesBase = data;

        factor.dq_problems_details = this.mapProblemDetails(factor.dq_problems);

      },
      error: (err) => {
        console.error('Error al obtener detalles del factor base:', err);
      },
    });
  }


  fetchDQMetricDetails(metric: any): void {
    this.modelService.getMetricBaseDetails(metric.metric_base).subscribe({
      next: (data) => {
        metric.attributesBase = data; // Agregar detalles al objeto de métrica
      },
      error: (err) => {
        console.error('Error al obtener detalles de la métrica base:', err);
      }
    });
  }


  fetchDQMethodDetails(method: any): void {
    this.modelService.getMethodBaseDetails(method.method_base).subscribe({
      next: (data) => {
        method.attributesBase = data; // Agregar detalles al objeto de método
      },
      error: (err) => {
        console.error('Error al obtener detalles del método base:', err);
      }
    });
  }


  // =============================================
  // MANEJO DE CONTEXT COMPONENTS
  // =============================================

  // Obtener las categorías de los componentes de contexto
  getContextComponentCategories(contextComponents: any): string[] {
    return Object.keys(contextComponents).filter(category => contextComponents[category].length > 0);
  }

  // Ver detalles de un componente de contexto
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


  // =============================================
  // MANEJO DE DQ PROBLEMS
  // =============================================

  // Método para mapear IDs de problemas con detalles
  mapProblemDetails(problemIds: number[]): any[] {
    if (!this.originalDQProblems || !problemIds) {
      return []; // Retornar un array vacío si no hay problemas originales o IDs
    }

    return problemIds.map((problemId) => {
      return this.originalDQProblems.find((problem) => problem.id === problemId);
    }).filter((problem) => problem !== undefined); // Filtrar problemas no encontrados
  }


  // =============================================
  // 8. MANEJO DE MODALES Y CONFIRMACIONES
  // =============================================

  // DQ MODEL CONFIRMATION
  openConfirmDQModelModal(): void {
    this.isConfirmDQModelModalOpen = true;
  }

  onConfirmDQModelModalClose(): void {
    this.isConfirmDQModelModalOpen = false;
  }

  // Método para confirmar la finalización del DQ Model
  confirmationFinishedDQModel(): void {
    this.finishCurrentDQModel();
    this.onConfirmDQModelModalClose(); 
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
          this.notificationService.showSuccess(`DQ Model was successfully confirmed and marked as finished.`);
          this.isNextStepEnabled = true;
          this.fetchDQModelDetails(this.currentDQModel.id); // Recargar el DQ Model actualizado
          this.loadFullDQModel(this.currentDQModel.id);
        },
        error: (err) => {
          console.error('Error al finalizar el DQ Model:', err);
          this.notificationService.showError('Failed to confirm DQ Model.');
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

  generateDQModelPDF(): void {
    if (!this.completeDQModel) {
      alert('Los datos del DQ Model no están cargados.');
      return;
    }

    this.isLoading = true;
  
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
    doc.save(`dqmodel_${this.completeDQModel.model.name}_v${this.completeDQModel.model.version}.pdf`);
    this.isLoading = false;
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

  
  navigateToStep(stepIndex: number) {
    const route = this.steps[stepIndex].route;
    this.router.navigate([route]);
  }


  


  // Método para manejar la finalización del stage
  onCompleteStage(): void {
    this.router.navigate(['/phase2/st5/measurement-execution']); 
    this.currentStep = 0;
  }




}