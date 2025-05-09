import { ChangeDetectorRef, Component, OnInit, ViewEncapsulation  } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { DqModelService } from '../../services/dq-model.service';
import { ProjectDataService } from '../../services/project-data.service';
import { Router } from '@angular/router';



declare var bootstrap: any; 

@Component({
  selector: 'app-dq-measurement-execution',
  templateUrl: './dq-measurement-execution.component.html',
  styleUrl: './dq-measurement-execution.component.css'
})
export class DqMeasurementExecutionComponent  implements OnInit {

  currentStep: number = 0; 
  pageStepTitle: string = 'Execution of the DQ measurement';
  phaseTitle: string = 'Phase 2: DQ Assessment';
  stageTitle: string = 'Stage 5: DQ Measurement';

  steps: { displayName: string, route: string, description: string }[] = [
    { displayName: 'A14', route: 'st5/execution', description: 'Prioritization of DQ Problems' }
  ];


  isNextStepEnabled: boolean = true;

  constructor(
    private router: Router, 
    private cdr: ChangeDetectorRef, 
    private modelService: DqModelService,
    private projectService: ProjectService,
    private projectDataService: ProjectDataService, 
  ) {}

  //Main variables
  project: any = null;
  projectId: number | null = null;
  contextComponents: any = null;
  dqProblems: any[] = [];
  dqModelVersionId: number | null = null;
  dqModel: any = null;

  isLoading: boolean = false; 
  errorMessage: string | null = null; 

  //DQ Methods
  dqMethods: any[] = [];  
  

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
        this.fetchDQMethods(this.dqModelVersionId)
      }
      

    });
  
  }


  // Get DQ Methods in DQ Model
  fetchDQMethods(dqmodelId: number): void {
    this.isLoading = true; // Activa el spinner de carga
    this.errorMessage = null; // Limpia cualquier mensaje de error previo

    this.modelService.getMethodsByDQModel(dqmodelId).subscribe(
      (methods: any[]) => {
        this.dqMethods = methods;  
        this.isLoading = false;  
        console.log(this.dqMethods);
      },
      (error) => {
        this.errorMessage = 'Error al cargar los métodos. Inténtalo de nuevo.'; // Muestra un mensaje de error
        this.isLoading = false; // Desactiva el spinner de carga
        console.error('Error fetching DQ Methods:', error);
      }
    );
  }


  dqData = [
    {
      selected: false,
      appliedDQMethod: 'Method A',
      dqMethod: 'Validation',
      table: 'Customers',
      granularity: 'Row-level',
      dqMetric: 'Completeness',
      dqFactor: 'Accuracy',
      dqDimension: 'Consistency'
    },
    {
      selected: false,
      appliedDQMethod: 'Method B',
      dqMethod: 'Cleaning',
      table: 'Orders',
      granularity: 'Column-level',
      dqMetric: 'Uniqueness',
      dqFactor: 'Precision',
      dqDimension: 'Timeliness'
    },
    // Más datos...
  ];


  // Método para verificar si todos los items están seleccionados
  isAllSelected(): boolean {
    return this.dqData.every(item => item.selected);
  }

  // Método para seleccionar/deseleccionar todos los items
  toggleSelectAll(event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.dqData.forEach(item => (item.selected = isChecked));
  }

  // Método para seleccionar/deseleccionar un item individual
  toggleSelectItem(item: any): void {
    item.selected = !item.selected;
  }



}
