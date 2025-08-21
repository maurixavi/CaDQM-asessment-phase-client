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

  // Utils
  public formatCtxCompCategoryName = formatCtxCompCategoryName;
  public getFirstNonIdAttribute = getFirstNonIdAttribute

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
      //doc.setTextColor(...labelColor);
      doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    };
  
    const setValueStyle = () => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(normalFontSize);
      //doc.setTextColor(...valueColor);
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
            .join(' · ');
          lines.push(`${this.formatCategoryName(cat)}: ${values}`);
        }
      }
      return lines;
    };
  
    // === Encabezado ===
    setSectionStyle();
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`DQ Model ${this.completeDQModel.model.name}`, margin, y);
    y += 10;
  
    writeLabelValue('Version', this.completeDQModel.model.version);
    writeLabelValue('DONE', `${this.formatDate(this.completeDQModel.model.created_at)} - [fecha final estimada]`);
    writeLabelValue('', `(Contexto de ${this.project?.name || 'Sin nombre'} v${this.project?.context_version})`);
    y += 4;
  
    // === Dimensiones ===
    this.completeDQModel.dimensions.forEach((dim: any) => {
      writeSectionTitle('DQ Dimension:', dim.dimension_name);
      writeLabelValue('Semantic', dim.attributesBase?.semantic || 'N/A', 5);
  
      const ctx = formatContextLine(dim.context_components).join(' · ');
      writeLabelValue('Suggested by (Context Components):', ctx, 5);
  
      const problems = dim.dq_problems_details.map((p: any) => p.description).join(' · ');
      if (problems) {
        writeLabelValue('DQ Problems used:', problems, 5);
      }
  
      dim.factors?.forEach((fac: any) => {
        writeSectionTitle('> DQ Factor:', fac.factor_name, 5);
        writeLabelValue('Semantic', fac.attributesBase?.semantic || 'N/A', 10);
  
        const ctxF = formatContextLine(fac.context_components).join(' · ');
        writeLabelValue('Arises from (Context Components)', ctxF, 10);
  
        const probsF = fac.dq_problems_details.map((p: any) => p.description).join(' · ');
        if (probsF) {
          writeLabelValue('DQ Problems used', probsF, 10);
        }
  
        fac.metrics?.forEach((met: any) => {
          writeSectionTitle('>> DQ Metric:', met.metric_name, 10);
          writeLabelValue('Purpose', met.attributesBase?.purpose || 'N/A', 15);
          writeLabelValue('Granularity', met.attributesBase?.granularity || 'N/A', 15);
          writeLabelValue('Result domain', met.attributesBase?.resultDomain || 'N/A', 15);
  
          const ctxM = formatContextLine(met.context_components).join(' · ');
          writeLabelValue('Influenced by (Context Components):', ctxM, 15);
  
          met.methods?.forEach((meth: any) => {
            writeSectionTitle('>>> DQ Method:', meth.method_name, 15);
            writeLabelValue('Input data type', meth.attributesBase?.inputDataType || 'N/A', 20);
            writeLabelValue('Output data type', meth.attributesBase?.outputDataType || 'N/A', 20);
            writeLabelValue('Algorithm', '', 20);
            writeCodeBlock(meth.attributesBase?.algorithm || 'N/A', 25);
  
            const ctxMeth = formatContextLine(meth.context_components).join(' · ');
            writeLabelValue('Uses (Context Components):', ctxMeth, 20);
          });
        });
      });
  
      y += 4;
    });
  
    // Guardar
    const name = this.completeDQModel.model.name.replace(/\s+/g, '_').toLowerCase();
    const version = this.completeDQModel.model.version.replace(/\s+/g, '_');
    doc.save(`dqmodel_${name}_v${version}.pdf`);
    this.isLoading = false;
  }
  

  generateDQModelPDF307_02(): void {
    if (!this.completeDQModel) {
      alert('Los datos del DQ Model no están cargados.');
      return;
    }
  
    this.isLoading = true;
    const doc = new jsPDF();
    const margin = 10;
    const lineHeight = 7;
    const maxLineWidth = doc.internal.pageSize.getWidth() - margin * 2;
    const pageHeight = doc.internal.pageSize.getHeight();
    let yOffset = 20;
  
    const valueColor = [80, 80, 80]; // Gris oscuro
    const titleFontSize = 12;
    const textFontSize = 10;
    const contextFontSize = 9;
  
    const checkPageBreak = (lines = 1) => {
      if (yOffset + lines * lineHeight > pageHeight - 10) {
        doc.addPage();
        yOffset = 20;
      }
    };
  
    const addSectionTitle = (title: string) => {
      checkPageBreak();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(titleFontSize);
      doc.setTextColor(0, 0, 0);
      doc.text(title, margin, yOffset);
      yOffset += lineHeight;
      doc.setFontSize(textFontSize);
    };
  
    const addLabelValue = (label: string, value: string, indent = 0, size = textFontSize) => {
      checkPageBreak();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(size);
      doc.setTextColor(0, 0, 0);
      const labelWidth = doc.getTextWidth(`${label}: `);
      doc.text(`${label}:`, margin + indent, yOffset);
  
      const wrapped = doc.splitTextToSize(value, maxLineWidth - indent - labelWidth);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
      wrapped.forEach((line: string | string[], i: number) => {
        const lineYOffset = yOffset + i * lineHeight;
        doc.text(line, margin + indent + labelWidth, lineYOffset);
      });
      yOffset += wrapped.length * lineHeight;
      doc.setFontSize(textFontSize);
      doc.setTextColor(0, 0, 0);
    };
  
    const formatContextComponents = (contextComponents: any): string[] => {
      const formatted: string[] = [];
      for (const category in contextComponents) {
        const items = contextComponents[category]
          .map((id: number) => this.getFirstAttribute(category, id))
          .join(' · ');
        if (items) {
          formatted.push(`${this.formatCategoryName(category)}: ${items}`);
        }
      }
      return formatted;
    };
  
    // Título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text("DQ Model Report", margin, yOffset);
    yOffset += 10;
  
    doc.setFontSize(textFontSize);
  
    // Datos generales
    addLabelValue('Model ID', this.completeDQModel.model.id.toString());
    addLabelValue('Version', this.completeDQModel.model.version);
    addLabelValue('Created At', this.formatDate(this.completeDQModel.model.created_at));
    addLabelValue('Status', this.completeDQModel.model.status);
    addLabelValue('Context version', `CtxA v1.0 (id: ${this.project.context_version})`);
    addLabelValue('Data at hand', 'Dataset A');
  
    // Dimensiones
    this.completeDQModel.dimensions.forEach((dimension: any, index: number) => {
      addSectionTitle(`DQ Dimension: ${dimension.dimension_name}`);
      addLabelValue('Semantic', dimension.attributesBase?.semantic || 'N/A', 5);
  
      // Componentes de contexto
      const formattedCtx = formatContextComponents(dimension.context_components);
      if (formattedCtx.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(contextFontSize);
        doc.setTextColor(0, 0, 0);
        doc.text('Suggested by (Ctx. Components):', margin + 5, yOffset);
        yOffset += lineHeight;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
        formattedCtx.forEach(line => {
          const wrapped = doc.splitTextToSize(line, maxLineWidth - 10);
          wrapped.forEach((w: string | string[]) => {
            checkPageBreak();
            doc.text(w, margin + 10, yOffset);
            yOffset += lineHeight;
          });
        });
        doc.setFontSize(textFontSize);
      }
  
      // Problemas asociados
      if (dimension.dq_problems_details?.length) {
        addLabelValue('DQ Problems (Used)', dimension.dq_problems_details.map((p: any) => `- ${p.description}`).join(' · '), 5);
      }
  
      // Factores
      if (dimension.factors?.length) {
        dimension.factors.forEach((factor: any) => {
          addSectionTitle(`DQ Factor: ${factor.factor_name}`);
          addLabelValue('Semantic', factor.attributesBase?.semantic || 'N/A', 5);
  
          const factorCtx = formatContextComponents(factor.context_components);
          if (factorCtx.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(contextFontSize);
            doc.setTextColor(0, 0, 0);
            doc.text('Arises from (Ctx. Components):', margin + 5, yOffset);
            yOffset += lineHeight;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
            factorCtx.forEach(line => {
              const wrapped = doc.splitTextToSize(line, maxLineWidth - 10);
              wrapped.forEach((w: string | string[]) => {
                checkPageBreak();
                doc.text(w, margin + 10, yOffset);
                yOffset += lineHeight;
              });
            });
            doc.setFontSize(textFontSize);
          }
  
          if (factor.dq_problems_details?.length) {
            addLabelValue('DQ Problems (Used)', factor.dq_problems_details.map((p: any) => `- ${p.description}`).join(' · '), 5);
          }
  
          // Métricas
          if (factor.metrics?.length) {
            factor.metrics.forEach((metric: any) => {
              addSectionTitle(`DQ Metric: ${metric.metric_name}`);
              addLabelValue('Purpose', metric.attributesBase?.purpose || 'N/A', 5);
              addLabelValue('Granularity', metric.attributesBase?.granularity || 'N/A', 5);
              addLabelValue('Result domain', metric.attributesBase?.resultDomain || 'N/A', 5);
  
              // Métodos
              if (metric.methods?.length) {
                metric.methods.forEach((method: any) => {
                  addSectionTitle(`DQ Method: ${method.method_name}`);
                  addLabelValue('Input data type', method.attributesBase?.inputDataType || 'N/A', 5);
                  addLabelValue('Output data type', method.attributesBase?.outputDataType || 'N/A', 5);
                  addLabelValue('Algorithm', method.attributesBase?.algorithm || 'N/A', 5);
  
                  if (method.applied_methods?.measurements?.length) {
                    method.applied_methods.measurements.forEach((m: any) => {
                      addSectionTitle(`Applied Measurement: ${m.name}`);
                      addLabelValue('Applied to', m.appliedTo, 5);
                    });
                  }
  
                  if (method.applied_methods?.aggregations?.length) {
                    method.applied_methods.aggregations.forEach((a: any) => {
                      addSectionTitle(`Applied Aggregation: ${a.name}`);
                      addLabelValue('Applied to', a.appliedTo, 5);
                    });
                  }
                });
              }
            });
          }
        });
      }
  
      // Línea divisoria
      if (index < this.completeDQModel.dimensions.length - 1) {
        checkPageBreak();
        doc.setDrawColor(0);
        doc.line(margin, yOffset, doc.internal.pageSize.getWidth() - margin, yOffset);
        yOffset += 5;
      }
    });
  
    doc.save(`dqmodel_${this.completeDQModel.model.name}_v${this.completeDQModel.model.version}.pdf`);
    this.isLoading = false;
  }
  

  generateDQModelPDF307_01(): void {
    if (!this.completeDQModel) {
      alert('Los datos del DQ Model no están cargados.');
      return;
    }
  
    this.isLoading = true;
    const doc = new jsPDF();
    const margin = 10;
    const lineHeight = 7;
    const maxLineWidth = doc.internal.pageSize.getWidth() - margin * 2;
    const pageHeight = doc.internal.pageSize.getHeight();
    let yOffset = 20;
  
    const checkPageBreak = (lines = 1) => {
      if (yOffset + lines * lineHeight > pageHeight - 10) {
        doc.addPage();
        yOffset = 20;
      }
    };
  
    const addWrappedText = (text: string, indent = 0, fontStyle: 'normal' | 'bold' = 'normal') => {
      const wrapped = doc.splitTextToSize(text, maxLineWidth - indent);
      doc.setFont('helvetica', fontStyle);
      wrapped.forEach((line: string) => {
        checkPageBreak();
        doc.text(line, margin + indent, yOffset);
        yOffset += lineHeight;
      });
    };
  
    const addLabelValue = (label: string, value: string, indent = 0) => {
      doc.setFont('helvetica', 'bold');
      const labelWidth = doc.getTextWidth(`${label}: `);
      const valueWrapped = doc.splitTextToSize(value, maxLineWidth - indent - labelWidth);
      doc.text(`${label}:`, margin + indent, yOffset);
      doc.setFont('helvetica', 'normal');
      doc.text(valueWrapped, margin + indent + labelWidth, yOffset);
      yOffset += valueWrapped.length * lineHeight;
      checkPageBreak();
    };
  
    const formatContextComponents = (contextComponents: any): string[] => {
      const formatted: string[] = [];
      for (const category in contextComponents) {
        const items = contextComponents[category]
          .map((id: number) => this.getFirstAttribute(category, id))
          .join(' | ');
        if (items) {
          formatted.push(`${this.formatCategoryName(category)}: ${items}`);
        }
      }
      return formatted;
    };
  
    // Título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text("DQ Model Report", margin, yOffset);
    yOffset += 10;
  
    doc.setFontSize(10);
  
    // Datos generales
    addLabelValue('Model ID', this.completeDQModel.model.id.toString());
    addLabelValue('Version', this.completeDQModel.model.version);
    addLabelValue('Created At', this.formatDate(this.completeDQModel.model.created_at));
    addLabelValue('Status', this.completeDQModel.model.status);
    addLabelValue('Context version', `CtxA v1.0 (id: ${this.project.context_version})`);
    addLabelValue('Data at hand', 'Dataset A');
  
    // Dimensiones
    this.completeDQModel.dimensions.forEach((dimension: any, index: number) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`DQ Dimension: ${dimension.dimension_name}`, margin, yOffset);
      yOffset += lineHeight;
      doc.setFontSize(10);
  
      addLabelValue('Semantic', dimension.attributesBase?.semantic || 'N/A', 5);
  
      // Componentes de contexto
      const formattedCtx = formatContextComponents(dimension.context_components);
      if (formattedCtx.length > 0) {
        addWrappedText('Suggested by (Ctx. Components):', 5, 'bold');
        formattedCtx.forEach(line => addWrappedText(line, 10));
      }
  
      // Problemas asociados
      if (dimension.dq_problems_details?.length) {
        addWrappedText('DQ Problems (Used):', 5, 'bold');
        dimension.dq_problems_details.forEach((p: any) => addWrappedText(`- ${p.description}`, 10));
      }
  
      // Factores
      if (dimension.factors?.length) {
        addWrappedText('DQ Factors:', 5, 'bold');
        dimension.factors.forEach((factor: any) => {
          addLabelValue('DQ Factor', factor.factor_name, 10);
          addLabelValue('Semantic', factor.attributesBase?.semantic || 'N/A', 15);
  
          // Componentes de contexto del factor
          const factorCtx = formatContextComponents(factor.context_components);
          if (factorCtx.length > 0) {
            addWrappedText('Arises from (Ctx. Components):', 15, 'bold');
            factorCtx.forEach(line => addWrappedText(line, 20));
          }
  
          // Problemas asociados
          if (factor.dq_problems_details?.length) {
            addWrappedText('DQ Problems (Used):', 15, 'bold');
            factor.dq_problems_details.forEach((p: any) => addWrappedText(`- ${p.description}`, 20));
          }
  
          // Métricas
          if (factor.metrics?.length) {
            addWrappedText('DQ Metrics:', 15, 'bold');
            factor.metrics.forEach((metric: any) => {
              addLabelValue('DQ Metric', metric.metric_name, 20);
              addLabelValue('Purpose', metric.attributesBase?.purpose || 'N/A', 25);
              addLabelValue('Granularity', metric.attributesBase?.granularity || 'N/A', 25);
              addLabelValue('Result domain', metric.attributesBase?.resultDomain || 'N/A', 25);
  
              // Métodos
              if (metric.methods?.length) {
                addWrappedText('DQ Methods:', 25, 'bold');
                metric.methods.forEach((method: any) => {
                  addLabelValue('DQ Method', method.method_name, 30);
                  addLabelValue('Input data type', method.attributesBase?.inputDataType || 'N/A', 35);
                  addLabelValue('Output data type', method.attributesBase?.outputDataType || 'N/A', 35);
                  addLabelValue('Algorithm', method.attributesBase?.algorithm || 'N/A', 35);
  
                  if (method.applied_methods?.measurements?.length) {
                    addWrappedText('Applied Measurements:', 35, 'bold');
                    method.applied_methods.measurements.forEach((m: any) => {
                      addLabelValue('Measurement', m.name, 40);
                      addLabelValue('Applied to', m.appliedTo, 45);
                    });
                  }
  
                  if (method.applied_methods?.aggregations?.length) {
                    addWrappedText('Applied Aggregations:', 35, 'bold');
                    method.applied_methods.aggregations.forEach((a: any) => {
                      addLabelValue('Aggregation', a.name, 40);
                      addLabelValue('Applied to', a.appliedTo, 45);
                    });
                  }
                });
              }
            });
          }
        });
      }
  
      // Línea divisoria entre dimensiones
      if (index < this.completeDQModel.dimensions.length - 1) {
        checkPageBreak();
        doc.setDrawColor(0);
        doc.line(margin, yOffset, doc.internal.pageSize.getWidth() - margin, yOffset);
        yOffset += 5;
      }
    });
  
    // Guardar PDF
    doc.save(`dqmodel_${this.completeDQModel.model.name}_v${this.completeDQModel.model.version}.pdf`);
    this.isLoading = false;
  }
  


  generateDQModelPDF_(): void {
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