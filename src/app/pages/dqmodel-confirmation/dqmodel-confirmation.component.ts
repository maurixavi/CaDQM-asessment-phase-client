import { ChangeDetectorRef, Component, OnInit  } from '@angular/core';
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
  // COMPONENT PROPERTIES
  // =============================================

  // Navigation and UI properties
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

  // Utils
  public formatCtxCompCategoryName = formatCtxCompCategoryName;
  public getFirstNonIdAttribute = getFirstNonIdAttribute
  public formatAppliedTo = formatAppliedTo;
  public getAppliedToDisplay = getAppliedToDisplay;
  public formatCategoryName = formatCategoryName;

  isNextStepEnabled: boolean = false;
  isLoading: boolean = true; 
  hasProjectLoaded: boolean = false;  
  
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
  // CICLO DE VIDA DEL COMPONENTE
  // =============================================
  ngOnInit(): void {
    // Obtener el Project ID actual
    this.projectId = this.projectDataService.getProjectId();
    this.subscribeToData();

    //this.subscribeToDQModelStatus();

    // Sincronizar el paso actual con la ruta
    this.syncCurrentStepWithRoute();
  }

  // =============================================
  // MANEJO DE DATOS Y SUSCRIPCIONES
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
      this.hasProjectLoaded = true;  
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

  /* subscribeToDQModelStatus(): void {
    this.modelService.dqModelStatus$.subscribe(updatedModel => {
      if (updatedModel && this.currentDQModel && updatedModel.id === this.currentDQModel.id) {
        console.log('DQModel actualizado:', updatedModel);
        this.currentDQModel = { ...this.currentDQModel, ...updatedModel };
        this.cdr.detectChanges();
      }
    });
  } */

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

  // Verificar que no haya ningun concepto de CD vacío en la jerarquia del modelo
  canFinalizeDQModel(): boolean {
    if (!this.completeDQModel?.dimensions || this.completeDQModel.dimensions.length === 0) {
      return false;
    }
  
    for (const dimension of this.completeDQModel.dimensions) {
      if (!dimension.factors || dimension.factors.length === 0) {
        return false;
      }
  
      for (const factor of dimension.factors) {
        if (!factor.metrics || factor.metrics.length === 0) {
          return false;
        }
  
        for (const metric of factor.metrics) {
          if (!metric.methods || metric.methods.length === 0) {
            return false;
          }
  
          for (const method of metric.methods) {
            const applied = method.applied_methods;
            const hasMeasurements = applied?.measurements?.length > 0;
            const hasAggregations = applied?.aggregations?.length > 0;
  
            if (!hasMeasurements && !hasAggregations) {
              return false;
            }
          }
        }
      }
    }
  
    return true;
  }

  //devuelve la primera razón que encuentra por la cual el DQ Model no puede finalizarse
  getDQModelValidationStatus(): { canFinalize: boolean, reason?: string } {
    for (const dimension of this.completeDQModel.dimensions) {
      if (!dimension.factors || dimension.factors.length === 0) {
        return { canFinalize: false, reason: `Dimension "${dimension.dimension_name}" has no factors.` };
      }
  
      for (const factor of dimension.factors) {
        if (!factor.metrics || factor.metrics.length === 0) {
          return { canFinalize: false, reason: `Factor "${factor.factor_name}" has no metrics.` };
        }
  
        for (const metric of factor.metrics) {
          if (!metric.methods || metric.methods.length === 0) {
            return { canFinalize: false, reason: `Metric "${metric.metric_name}" has no methods.` };
          }
  
          for (const method of metric.methods) {
            const applied = method.applied_methods;
            const hasMeasurements = applied?.measurements?.length > 0;
            const hasAggregations = applied?.aggregations?.length > 0;
  
            if (!hasMeasurements && !hasAggregations) {
              return { canFinalize: false, reason: `Method "${method.method_name}" has no applied measurements or aggregations.` };
            }
          }
        }
      }
    }
  
    return { canFinalize: true };
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
  // MANEJO DE MODALES Y CONFIRMACIONES
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

    const validation = this.getDQModelValidationStatus(); 

    if (!validation.canFinalize) {
      //this.notificationService.showError(validation.reason || 'The DQ Model cannot be finalized due to missing information.');
      this.notificationService.showError('The DQ Model cannot be finalized due to missing DQ concepts.');
      this.onConfirmDQModelModalClose(); 
      return; 
    }

    this.finishCurrentDQModel(); // Llamar solamente si no hay conceptos de CD pendientes
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

  
  // =============================================
  // GENERACIÓN PDF
  // =============================================
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

  formatProjectDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }
  
  formatModelDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  generateDQModelPDF(): void {
    if (!this.completeDQModel) {
      return;
    }
  
    this.isLoading = true;
    const doc = new jsPDF();
    const margin = 10;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxLine = pageWidth - 2 * margin;
    let y = 20;
  
    // Colores y tamaños
    const labelColor = [120, 120, 120];
    const valueColor = [60, 60, 60];
    const normalFontSize = 10;
    const sectionFontSize = 12;
    const codeFontSize = 9;
    const lineHeight = 6;
  
    // Estilos
    const setLabelStyle = () => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(normalFontSize);
      doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    };
  
    const setValueStyle = () => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(normalFontSize);
      doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    };
  
    const setSectionStyle = () => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(sectionFontSize);
      doc.setTextColor(0, 0, 0);
    };
  
    const setCodeStyle = () => {
      doc.setFont('courier', 'normal');
      doc.setFontSize(codeFontSize);
      doc.setTextColor(20, 20, 20);
    };
  
    const checkPageBreak = (extraLines = 1) => {
      if (y + extraLines * lineHeight > pageHeight - 10) {
        doc.addPage();
        y = 20;
      }
    };
  
    const writeWrapped = (text: string, indent = 0) => {
      const lines = doc.splitTextToSize(text, maxLine - indent);
      lines.forEach((line: string | string[]) => {
        checkPageBreak();
        doc.text(line, margin + indent, y);
        y += lineHeight;
      });
    };
  
    const writeLabelValue = (label: string, value: string, indent = 0) => {
      checkPageBreak();
      setLabelStyle();
      doc.text(`${label}`, margin + indent, y);
      const labelWidth = doc.getTextWidth(label + ' ');
      setValueStyle();
      const valueLines = doc.splitTextToSize(value, maxLine - indent - labelWidth);
      doc.text(valueLines, margin + indent + labelWidth + 1, y);
      y += valueLines.length * lineHeight;
    };
  
    const writeSectionTitle = (prefix: string, title: string, indent = 0) => {
      checkPageBreak();
      setSectionStyle();
      doc.text(`${prefix} ${title}`, margin + indent, y);
      y += lineHeight;
    };
  
    const writeCodeBlock = (code: string, indent = 10) => {
      setCodeStyle();
      const lines = doc.splitTextToSize(code, maxLine - indent);
      lines.forEach((line: string | string[]) => {
        checkPageBreak();
        doc.text(line, margin + indent, y);
        y += lineHeight;
      });
    };
  
    const formatContextLine = (contextObj: any): string[] => {
      const lines: string[] = [];
      for (const cat in contextObj) {
        if (contextObj[cat]?.length) {
          const values = contextObj[cat]
            .map((id: number) => this.getFirstAttribute(cat, id))
            .join(' • ');
          lines.push(`${this.formatCategoryName(cat)}: ${values}`);
        }
      }
      return lines;
    };
  
    const formatAppliedTo = (appliedTo: any[]): string => {
      if (!appliedTo || appliedTo.length === 0) return 'N/A';
      
      return appliedTo.map(item => {
        if (item.column_name && item.table_name) {
          return `${item.table_name}.${item.column_name}`;
        } else if (item.table_name) {
          return item.table_name;
        }
        return 'Unknown';
      }).join(', ');
    };
  
    // === ENCABEZADO MEJORADO ===
    setSectionStyle();
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
  
    // Nombre del proyecto
    doc.text(`Project: ${this.project?.name || 'Unknown Project'}`, margin, y);
    y += 8;
  
    // Descripción del proyecto (si existe)
    if (this.project?.description) {
      doc.setFontSize(normalFontSize);
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(this.project.description, maxLine);
      descLines.forEach((line: string) => {
        doc.text(line, margin, y);
        y += lineHeight;
      });
      y += 4;
    }
  
    // Fecha del proyecto (si existe)
    if (this.project?.created_at) {
      doc.setFontSize(normalFontSize);
      doc.setFont('helvetica', 'italic');
      doc.text(`Project Date: ${this.formatProjectDate(this.project.created_at)}`, margin, y);
      y += 6;
    }
  
    // Contexto y versión
    doc.setFont('helvetica', 'normal');
    doc.text(`Context Version: ${this.project?.context_obj?.name || ''} (v${this.project?.context_obj?.version || ''})`, margin, y);
    
    y += 10;
  
    // Separador
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 12;
  
    // Título DQ Model
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`DQ Model: ${this.completeDQModel.model.name}`, margin, y);
    y += 6;
  
    // Información del DQ Model
    //doc.setFont('helvetica', 'bold');
    //doc.setFont('helvetica', 'normal');
    //writeLabelValue('Version', this.completeDQModel.model.version);
    // Información del DQ Model (mismo formato para Version, Status y Date Range)
    doc.setFontSize(normalFontSize);
    doc.setFont('helvetica', 'normal');

    // Versión en el mismo formato de una línea
    doc.setFont('helvetica', 'bold');
    doc.text('Version:', margin, y);
    const versionWidth = doc.getTextWidth('Version: ');
    doc.setFont('helvetica', 'normal');
    doc.text(this.completeDQModel.model.version, margin + versionWidth + 1, y);
    y += lineHeight;
    y += 2;

    // Estado y fechas
    //const statusText = `${this.completeDQModel.model.status}`;
    const statusText = `${this.completeDQModel.model.status}`.charAt(0).toUpperCase() + 
                   `${this.completeDQModel.model.status}`.slice(1);
    //const dateRange = `${this.formatModelDate(this.completeDQModel.model.created_at)} - ${this.completeDQModel.model.finished_at ? this.formatModelDate(this.completeDQModel.model.finished_at) : 'In Progress'}`;
    // Date Range con manejo de estados
    const startDate = this.formatModelDate(this.completeDQModel.model.created_at);
    let endDate;

    if (this.completeDQModel.model.status === 'finished') {
      endDate = this.formatModelDate(this.completeDQModel.model.finished_at);
    } else {
      endDate = 'In Progress'; // draft
    }

    const dateRange = `${startDate} - ${endDate}`;
  
    doc.setFont('helvetica', 'bold');
    doc.text('Status:', margin, y);
    const statusWidth = doc.getTextWidth('Status: ');
    doc.setFont('helvetica', 'normal');
    doc.text(statusText, margin + statusWidth + 1, y);
  
    y += lineHeight;
  
    doc.setFont('helvetica', 'bold');
    doc.text('Date Range:', margin, y);
    const dateWidth = doc.getTextWidth('Date Range: ');
    doc.setFont('helvetica', 'normal');
    doc.text(dateRange, margin + dateWidth + 1, y);
  
    y += 10;
  
    // Separador antes de las dimensiones
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 12;
  
    // === Dimensiones ===
    this.completeDQModel.dimensions.forEach((dim: any) => {
      writeSectionTitle('DQ Dimension:', dim.dimension_name);

      writeLabelValue('Semantic', dim.attributesBase?.semantic || 'N/A', 4);
      y += 2;

      const ctx = formatContextLine(dim.context_components).join(' — ');
      writeLabelValue('Suggested by (Ctx. Components)', '', 4);
      writeLabelValue('', ctx, 4);
 
      const problems = dim.dq_problems_details.map((p: any) => p.description).join(' — ');
      writeLabelValue('Uses (DQ Problems)', '', 4);
      if (problems) {
        writeLabelValue('', problems, 4);
      } else {
        writeLabelValue('', 'N/A', 4);
      }

      y += 5;

      // === Factores ===
      dim.factors?.forEach((fac: any) => {
        writeSectionTitle('DQ Factor:', fac.factor_name, 5);

        writeLabelValue('Facet of', dim.dimension_name || 'N/A', 5);
        y += 2;

        writeLabelValue('Semantic', fac.attributesBase?.semantic || 'N/A', 9);
        
        y += 2;
        const ctxF = formatContextLine(fac.context_components).join(' — ');
        writeLabelValue('Arises from (Ctx. Components)', '', 9);
        writeLabelValue('', ctxF, 9);
  
        const probsF = fac.dq_problems_details.map((p: any) => p.description).join(' — ');
        writeLabelValue('Uses (DQ Problems)', '', 9);
        if (probsF) {
          writeLabelValue('', probsF, 9);
        } else {
          writeLabelValue('', 'N/A', 9);
        }

        y += 5;

        // === Metricas ===
        fac.metrics?.forEach((met: any) => {
          writeSectionTitle('DQ Metric:', met.metric_name, 10);

          writeLabelValue('Measures', fac.factor_name || 'N/A', 10);
          y += 2;

          writeLabelValue('Purpose', met.attributesBase?.purpose || 'N/A', 14);
          writeLabelValue('Granularity', met.attributesBase?.granularity || 'N/A', 14);
          writeLabelValue('Result domain', met.attributesBase?.resultDomain || 'N/A', 14);
  
          y += 2;
          const ctxM = formatContextLine(met.context_components).join(' — ');
          writeLabelValue('Influenced by (Ctx. Components):', '', 14);
          writeLabelValue('', ctxM, 14);
  
          y += 5;

          // === Metodos ===
          met.methods?.forEach((meth: any) => {
            writeSectionTitle('DQ Method:', meth.method_name, 15);

            writeLabelValue('Implements', met.metric_name || 'N/A', 15);
            y += 2;

            writeLabelValue('Input data type', meth.attributesBase?.inputDataType || 'N/A', 19);
            writeLabelValue('Output data type', meth.attributesBase?.outputDataType || 'N/A', 19);
            writeLabelValue('Algorithm', '', 19);
            writeCodeBlock(meth.attributesBase?.algorithm || 'N/A', 20);
  
            y += 4;
            const ctxMeth = formatContextLine(meth.context_components).join(' — ');
            writeLabelValue('Uses (Ctx. Components):', '', 19);
            writeLabelValue('', ctxMeth, 19);

            y += 5;
            
            // === MÉTODOS APLICADOS ===
            if (meth.applied_methods && Array.isArray(meth.applied_methods)) {
              // Iterar sobre cada elemento del array applied_methods
              meth.applied_methods.forEach((appliedMethodGroup: any, groupIndex: number) => {
                writeSectionTitle(`Applied Methods:`, '', 20);
                y += 1;
                
                // Measurement Methods
                if (appliedMethodGroup.measurements && appliedMethodGroup.measurements.length > 0) {
                  //writeSectionTitle('>>>>> DQ Measurements:', '', 25);
                  
                  appliedMethodGroup.measurements.forEach((measurement: any) => {
                    writeSectionTitle('', measurement.name, 20);
                    writeLabelValue('Type', 'Measurement', 24);
                    writeLabelValue('Applied to', formatAppliedTo(measurement.appliedTo) || 'N/A', 24);
                    
                    if (measurement.algorithm) {
                      writeLabelValue('Algorithm', '', 24);
                      writeCodeBlock(measurement.algorithm || 'N/A', 25);
                    }
                    y += 3; // Espacio extra entre measurements
                  });
                }
                
                // Aggregations
                if (appliedMethodGroup.aggregations && appliedMethodGroup.aggregations.length > 0) {
                  writeSectionTitle('>>>>> Aggregations:', '', 25);
                  
                  appliedMethodGroup.aggregations.forEach((aggregation: any) => {
                    writeSectionTitle('>>>>>> Aggregation:', aggregation.name || 'Unnamed Aggregation', 30);
                    writeLabelValue('Applied to', formatAppliedTo(aggregation.appliedTo) || 'N/A', 35);
                    
                    if (aggregation.algorithm) {
                      writeLabelValue('Algorithm', '', 35);
                      writeCodeBlock(aggregation.algorithm || 'N/A', 40);
                    }
                    y += 2; // Espacio extra entre aggregations
                  });
                }
                
                y += 4; // Espacio extra entre grupos de métodos aplicados
              });
            }
          });
        });
      });
  
      y += 4;
    });
  
    // Guardar
    //const dqModelName = this.completeDQModel.model.name.replace(/\s+/g, '_').toLowerCase();
    //const projectName = this.project.name.replace(/\s+/g, '_').toLowerCase();
    //const version = this.completeDQModel.model.version.replace(/\s+/g, '_');
    //doc.save(`dqmodel_${name}_v${version}.pdf`);
    //doc.save(`CaDQM_Phase2_DQModelReport_${dqModelName}_v${version}_Project_${projectName}.pdf`);
    // Guardar
    const cleanFileName = (text: string): string => {
      if (!text) return '';
      // Remover caracteres especiales y espacios, mantener solo letras, números y espacios
      let cleaned = text.replace(/[^a-zA-Z0-9\s]/g, '');
      // Reemplazar múltiples espacios por uno solo
      cleaned = cleaned.replace(/\s+/g, ' ');
      // Eliminar espacios al inicio y final
      cleaned = cleaned.trim();
      // Reemplazar espacios con nada (unir palabras)
      cleaned = cleaned.replace(/\s+/g, '');
      return cleaned;
    };

    const dqModelName = cleanFileName(this.completeDQModel.model.name);
    const projectName = cleanFileName(this.project.name);
    const version = cleanFileName(this.completeDQModel.model.version);

    // Obtener fecha actual en formato YYYYMMDD
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const currentDate = `${year}${month}${day}`;

    // Generar nombre del archivo
    const fileName = `CaDQM_Phase2_DQModelReport_${dqModelName}_v${version}_Project_${projectName}_${currentDate}.pdf`;

    doc.save(fileName);
    this.isLoading = false;
  }

  
  // =============================================
  // NAVEGACIÓN
  // =============================================
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


  // =============================================
  // ESTADOS INTERFAZ
  // =============================================
  
  // VISTA: Componentes de Contexto Asociados
  // Guarda el estado expandido por categoría de componente de contexto para cada elemento del modelo
  ctxCategoryStates: { [elementId: string]: { [category: string]: boolean } } = {};

  toggleCategory(elementId: string, category: string): void {
    // Inicializar estructura si no existe
    if (!this.ctxCategoryStates[elementId]) {
      this.ctxCategoryStates[elementId] = {};
    }
    
    // Si el estado es undefined (primera vez), establecerlo como false (cerrado)
    if (this.ctxCategoryStates[elementId][category] === undefined) {
      this.ctxCategoryStates[elementId][category] = false;
    } else {
      // Si ya tiene un estado, invertirlo
      this.ctxCategoryStates[elementId][category] = !this.ctxCategoryStates[elementId][category];
    }
  }
  
  isCategoryExpanded(elementId: string, category: string): boolean {
    // Si el estado es undefined (primera vez), devolver true (abierto por defecto)
    // Si ya tiene estado, devolver ese valor
    return this.ctxCategoryStates[elementId]?.[category] ?? true;
  }


}