import { ChangeDetectorRef, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { DqModelService } from '../../services/dq-model.service';
import { ProjectDataService } from '../../services/project-data.service';
import { Router } from '@angular/router';

declare var bootstrap: any;

@Component({
  selector: 'app-dq-measurement-execution',
  templateUrl: './dq-measurement-execution.component.html',
  styleUrl: './dq-measurement-execution.component.css',
})
export class DqMeasurementExecutionComponent implements OnInit {
  currentStep: number = 0;
  pageStepTitle: string = 'Execution of the DQ measurement';
  phaseTitle: string = 'Phase 2: DQ Assessment';
  stageTitle: string = 'Stage 5: DQ Measurement';

  steps: { displayName: string; route: string; description: string }[] = [
    { displayName: 'A14', route: 'st5/execution', description: 'Prioritization of DQ Problems' },
  ];

  isNextStepEnabled: boolean = true;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private modelService: DqModelService,
    private projectService: ProjectService,
    private projectDataService: ProjectDataService
  ) {}

  // Main variables
  project: any = null;
  projectId: number | null = null;
  contextComponents: any = null;
  dqProblems: any[] = [];
  dqModelVersionId: number | null = null;
  dqModel: any = null;

  isLoading: boolean = false;
  errorMessage: string | null = null;

  // DQ Methods
  dqMethods: any[] = [];
  appliedDQMethods: any[] = []; // Lista de applied_methods aplanados

  isModalOpen: boolean = false;
  modalTitle: string = 'DQ Method Details';
  modalMessage: string = '';
  methodDetails: any = null;

  // Variables para el ordenamiento
  sortColumn: string = ''; // Columna actualmente ordenada
  sortDirection: 'asc' | 'desc' = 'asc'; // Dirección del ordenamiento


  ngOnInit(): void {
    // Obtener el Project ID actual
    this.projectId = this.projectDataService.getProjectId();
    console.log('projectIdGet: ', this.projectId);

    // Suscribirse a los observables del servicio
    this.subscribeToData();

    // Sincronizar el paso actual con la ruta
    this.syncCurrentStepWithRoute();
  }

  syncCurrentStepWithRoute() {
    const currentRoute = this.router.url; // Obtiene la ruta actual (por ejemplo, '/st4/confirmation-stage-4')
    const stepIndex = this.steps.findIndex((step) => step.route === currentRoute);
    if (stepIndex !== -1) {
      this.currentStep = stepIndex;
    }
  }

  subscribeToData(): void {
    // Suscribirse al proyecto
    this.projectDataService.project$.subscribe((data) => {
      this.project = data;
      console.log('Project Data:', data);
    });

    // Suscribirse a los componentes del contexto
    this.projectDataService.contextComponents$.subscribe((data) => {
      this.contextComponents = data;
      //console.log('Context Components:', data);
    });

    // Suscribirse a los problemas de calidad de datos (DQ Problems)
    this.projectDataService.dqProblems$.subscribe((data) => {
      this.dqProblems = data;
      //console.log('DQ Problems:', data);
    });

    // Suscribirse a la versión del modelo de calidad de datos (DQ Model Version)
    this.projectDataService.dqModelVersion$.subscribe((dqModelVersionId) => {
      this.dqModelVersionId = dqModelVersionId;
      //console.log('DQ Model Version ID:', this.dqModelVersionId);
      if (this.dqModelVersionId) {
        this.fetchExpandedDQMethodsData(this.dqModelVersionId);
      }
    });
  }

  // Obtener los métodos de un DQModel y aplanar los applied_methods
  fetchExpandedDQMethodsData(dqmodelId: number): void {
    this.isLoading = true; // Activa el spinner de carga
    this.errorMessage = null; // Limpia cualquier mensaje de error previo
  
    this.modelService.getMethodsByDQModel(dqmodelId).subscribe({
      next: (methods: any[]) => {
        // Aplanar la lista de applied_methods
        this.appliedDQMethods = methods.flatMap((method) => {
          const dqMethodName = method.method_name; // Nombre del DQ Method
          const methodBase = method.method_base; // Id del DQ Method Base
          const metricId = method.metric; // ID de la métrica
  
          // Obtener los detalles de la métrica, el factor y la dimensión
          this.modelService.getMetricInDQModel(dqmodelId, metricId).subscribe((metric) => {
            if (metric) {
              const factorId = metric.factor; // ID del factor
              this.modelService.getFactorInDQModel(dqmodelId, factorId).subscribe((factor) => {
                if (factor) {
                  const dimensionId = factor.dimension; // ID de la dimensión
                  this.modelService.getDimensionInDQModel(dqmodelId, dimensionId).subscribe((dimension) => {
                    if (dimension) {
                      // Mapear los applied_methods (measurements y aggregations)
                      const appliedMethods = [
                        ...method.applied_methods.measurements.map((measurement: any) => ({
                          ...measurement,
                          dqMethod: dqMethodName,
                          methodBase: methodBase,
                          dqMetric: metric.metric_name, // Nombre de la métrica
                          dqFactor: factor.factor_name, // Nombre del factor
                          dqDimension: dimension.dimension_name, // Nombre de la dimensión
                          selected: false, // Inicializar el checkbox como no seleccionado
                        })),
                        ...method.applied_methods.aggregations.map((aggregation: any) => ({
                          ...aggregation,
                          dqMethod: dqMethodName,
                          dqMetric: metric.metric_name, // Nombre de la métrica
                          dqFactor: factor.factor_name, // Nombre del factor
                          dqDimension: dimension.dimension_name, // Nombre de la dimensión
                          selected: false, // Inicializar el checkbox como no seleccionado
                        })),
                      ];
  
                      // Agregar los appliedMethods a dqData
                      this.appliedDQMethods = [...this.appliedDQMethods, ...appliedMethods];
                    }
                  });
                }
              });
            }
          });
  
          return []; // Retornar un array vacío temporalmente
        });
  
        this.isLoading = false; // Desactiva el spinner de carga
      },
      error: (error: any) => {
        this.errorMessage = 'Error al cargar los métodos. Inténtalo de nuevo.'; // Muestra un mensaje de error
        this.isLoading = false; // Desactiva el spinner de carga
        console.error('Error fetching DQ Methods:', error);
      },
    });
  }
  
  fetchExpandedDQMethodsData2(dqmodelId: number): void {
    this.isLoading = true; // Activa el spinner de carga
    this.errorMessage = null; // Limpia cualquier mensaje de error previo

    this.modelService.getMethodsByDQModel(dqmodelId).subscribe({
      next: (methods: any[]) => {
        // Aplanar la lista de applied_methods
        this.appliedDQMethods = methods.flatMap((method) => {
          const dqMethodName = method.method_name; // Nombre del DQ Method
          const methodBase = method.method_base; // Id del DQ Method Base
          const appliedTo = method.appliedTo;
          const dqMetric = method.metric; // ID de la métrica
          const dqFactor = method.metric; // ID del factor (ajusta según tu estructura)
          const dqDimension = method.metric; // ID de la dimensión (ajusta según tu estructura)

          // Mapear los applied_methods (measurements y aggregations)
          const appliedMethods = [
            ...method.applied_methods.measurements.map((measurement: any) => ({
              ...measurement,
              dqMethod: dqMethodName,
              methodBase: methodBase,
              dqMetric: dqMetric,
              dqFactor: dqFactor,
              dqDimension: dqDimension,
              selected: false, // Inicializar el checkbox como no seleccionado
            })),
            ...method.applied_methods.aggregations.map((aggregation: any) => ({
              ...aggregation,
              dqMethod: dqMethodName,
              methodBase: methodBase,
              dqMetric: dqMetric,
              dqFactor: dqFactor,
              dqDimension: dqDimension,
              selected: false, // Inicializar el checkbox como no seleccionado
            })),
          ];

          return appliedMethods;
        });

        this.isLoading = false; // Desactiva el spinner de carga
      },
      error: (error: any) => {
        this.errorMessage = 'Error al cargar los métodos. Inténtalo de nuevo.'; // Muestra un mensaje de error
        this.isLoading = false; // Desactiva el spinner de carga
        console.error('Error fetching DQ Methods:', error);
      },
    });
  }

  // Método para verificar si todos los items están seleccionados
  isAllSelected(): boolean {
    return this.appliedDQMethods.every((item) => item.selected);
  }

  // Método para seleccionar/deseleccionar todos los items
  toggleSelectAll(event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.appliedDQMethods.forEach((item) => (item.selected = isChecked));
  }

  // Método para seleccionar/deseleccionar un item individual
  toggleSelectItem(item: any): void {
    item.selected = !item.selected;
  }

  //DQ Methods details
  // Método para abrir el modal y cargar los detalles del método
  openMethodDetailsModal(methodBaseId: number): void {
    this.isModalOpen = true;
    this.isLoading = true;
    this.errorMessage = '';

    this.modelService.getMethodBaseDetails(methodBaseId).subscribe(
      (data) => {
        this.methodDetails = data;
        this.isLoading = false;
        console.log("data", data);
      },
      (error) => {
        this.errorMessage = 'Failed to load method details.';
        this.isLoading = false;
      }
    );
  }

  // Método para cerrar el modal
  closeModal(): void {
    this.isModalOpen = false;
    this.methodDetails = null; // Limpiar los detalles al cerrar
  }

  //Sort table
  // Método para ordenar la tabla
  sortTable(column: string): void {
    if (this.sortColumn === column) {
      // Si ya está ordenada por esta columna, cambia la dirección
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Si es una nueva columna, ordena en orden ascendente por defecto
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    // Ordenar la lista
    this.appliedDQMethods.sort((a, b) => {
      const valueA = a[column];
      const valueB = b[column];

      if (valueA < valueB) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  //Navigation
  onStepChange(step: number) {
    this.currentStep = step;
    this.navigateToStep(step);
  }
  
  navigateToStep(stepIndex: number) {
    const route = this.steps[stepIndex].route;
    this.router.navigate([route]);
  }

}