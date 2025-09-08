import { Component, OnInit, ViewEncapsulation, HostListener, AfterViewInit } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { DqModelService } from '../../../services/dq-model.service';
import { Router } from '@angular/router';
import { ProjectService } from '../../../services/project.service';
import { ProjectDataService } from '../../../services/project-data.service';
import { buildContextComponents, formatCtxCompCategoryName, getFirstNonIdAttribute, contextComponentCategories } from '../../../shared/utils/utils';
import { tap } from 'rxjs/operators';
import { NotificationService } from '../../../services/notification.service';
import { combineLatest } from 'rxjs';
import { filter } from 'rxjs/operators';
import { 
  removeExistingFactorsFromSuggestions, 
  convertProblemsToMap,
  abbreviateContextComponents,
  renameContextComponentCategories,
  getCheckedCtxComponentsFromSuggestion,
  getCheckedDQProblemsFromSuggestion
} from './utils/suggestion.utils';

declare var bootstrap: any; 

// =============================================
// INTERFACES AND TYPES
// =============================================
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

type DimensionsMap = {
    [key: string]: {
      semantic: string;
      factors: { [key: string]: string };
    };
  };

@Component({
  selector: 'app-dq-dimensions-factors-selection',
  templateUrl: './dq-dimensions-factors-selection.component.html',
  styleUrls: ['./dq-dimensions-factors-selection.component.css'],
  //encapsulation: ViewEncapsulation.None
})
export class DqDimensionsFactorsSelectionComponent implements OnInit {

  // =============================================
  // COMPONENT PROPERTIES
  // =============================================

  // Navigation and UI properties
  isNextStepEnabled: boolean = true;
  currentStep: number = 2; //Step 3
  pageStepTitle: string = 'Selection of DQ dimensions and DQ factors';
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

  // Project properties
  project: any;
  projectId: number | null = null;
  noProjectMessage: string = "";
  dqModelId: number = -1;
  dqModelVersionId: number | null = null;
  dqModel: any = null;
  dataSchema: any = null;
  dataAtHandDetails: any = null;

  // DQ Model properties
  dqModels: any[] = [];
  dqmodel_dimensions: any[] = [];
  dimensionsWithFactorsInDQModel: any[] = [];
  addedDimensionId: number | null = null;
  duplicateFactor: boolean = false; 
  noDimensionsMessage: string = "";
  currentDQModel: any;
  //noModelMessage: string = "";  
  dimensionsWithFactors: { dimension: any, factors: any[] }[] = [];

  // Base dimensions and factors properties
  dqDimensionsBase: any[] = [];
  dqFactorsBase: any[] = [];
  selectedDimension: number | null = null;
  selectedFactor: number | null = null;
  selectedFactors: any[] = [];
  availableFactors: any[] = []; // base factors given dimension selected
  dimensionName: string = '';
  dimensionSemantic: string = '';
  factorName: string = '';    
  factorSemantic: string = ''; 

  // Context related properties
  contextVersion: any = null;
  selectedComponents: ContextComponent[] = [];
  selectedComponent: ContextComponent | undefined;
  contextComponents: any = null;
  allContextComponents: any;
  categories = contextComponentCategories;

  contextVersionId: number = -1;

  // DQ Model dimensions selection
  availableDQModelDimensions: any[] = []; // Dimensiones en DQ Model
  selectedDQModelDimension: number | null = null;

  // DQ Problems properties
  selectedPrioritizedProblems: any[] = [];
  allProjectDQProblems: any[] = [];
  dqProblemDetails: any = null; 
  selectedProblem: number | null = null;
  selectedProblemsFromScratch: any[] = [];
  selectedProblemsSuggestions: any[] = [];

  // Selection properties
  selectedDimensionsFromDQProblems: Set<number> = new Set<number>();
  selectedFactorsFromDQProblems: Set<number> = new Set<number>();
  ctxComponentsChecked_fromScratch: { id: number; category: string; value: string }[] = [];
  ctxComponentsChecked_suggestion: { id: number; category: string; value: string }[] = [];
  
  // UI state properties
  isFromScratchSectionVisible: boolean = false;  
  isFromScratchSectionVisible_addDimensions: boolean = false; 
  isFromScratchSectionVisible_addFactors: boolean = false;
  isFromProblemsSectionVisible: boolean = false;  
  isSuggestionsSectionVisible: boolean = false;  
  isCtxSelectionAccordionVisible = false;
  isEditSuggestedContextVisible: boolean = false;
  isEditSuggestedDQProblemsVisible: boolean = false;
  isEditingCtxComponents: boolean = false;
  isCtxSuggestionVisible: boolean = true; 
  isDimensionModalOpen: boolean = false;
  isFactorModalOpen = false; 
  selectedDimensionName: string = '';

  isConfirmationModalOpen: boolean = false;
  confirmationModalTitle: string = '';
  confirmationModalMessage: string = '';
  confirmedAction: (() => void) | null = null;
  isSuggestionConfigModalOpen: boolean = false;

  // Error and loading properties
  errorMessage: string | null = null;
  isLoading: boolean = false;
  noFactorsMessage: string = "";

  // AI Suggestion (input parameters)
  dimensionsAndFactors: DimensionsMap = {
    "Accuracy": {
      "semantic": "Indicates the degree to which data is accurate. Refers to how well data correctly represents real-world objects or events.",
      "factors": {
        "Semantic Accuracy": "Indicates the degree to which data correctly represents real-world entities or states.",
        "Syntactic Accuracy": "Indicates the degree to which data conforms to expected structural formats, patterns, or data types.",
        "Precision": "Refers to the level of detail in which data is captured or expressed."
      }
    },
    "Completeness": {
      "semantic": "Refers to the availability of all necessary data, ensuring that no important data is missing for analysis or decision-making.",
      "factors": {
        "Density": "Describes the proportion of actual data entries compared to the total number of expected entries.",
        "Coverage": "Indicates the extent to which the data covers the required scope, domain, or entities."
      }
    },
    "Consistency": {
      "semantic": "Indicates the satisfaction of semantic rules defined on the data.",
      "factors": {
        "Domain Integrity": "Indicates whether individual attribute values comply with defined constraints, rules, or value domains.",
        "Intra-relationship Integrity": "Indicates whether values across multiple attributes within the same record or table satisfy logical rules or dependencies.",
        "Inter-relationship Integrity": "Indicates whether data relationships across different tables or entities satisfy expected referential and semantic rules."
      }
    },
    "Uniqueness": {
      "semantic": "Indicates the degree to which a real-world entity is represented only once in the information system, without duplication or contradiction.",
      "factors": {
        "No-duplication": "Indicates the absence of duplicate records within the dataset.",
        "No-contradiction": "Ensures that logically related records do not contain conflicting or contradictory information."
      }
    },
    "Freshness": {
      "semantic": "Refers to the temporal validity of the data, indicating how current, timely, or stable the data is with respect to its use and the real world.",
      "factors": {
        "Currency": "Indicates how up-to-date the data is with respect to the real-world entities or source systems it represents.",
        "Timeliness": "Indicates whether data is available in time to support its intended use.",
        "Volatility": "Describes the frequency or rate at which the data changes over time."
      }
    }
  };
  

  suggestedDQDimensionBase: any;
  suggestedDQFactorBase: any;
  dimAndFactorSuggested: any;
  generatedSuggestion: any;
  suggestionConfig = {
    useContextComponents: true,
    useDQProblems: true,
    useExistingModel: false,
    excludeAccuracy: false,
    excludeCompleteness: false,
    excludeConsistency: false,
    excludeUniqueness: false,
    excludeFreshness: false,
  };
  

  // Utils
  public formatCtxCompCategoryName = formatCtxCompCategoryName;
  public getFirstNonIdAttribute = getFirstNonIdAttribute

  // =============================================
  // CONSTRUCTOR AND LIFECYCLE HOOKS
  // =============================================
  constructor(
    private router: Router,
    private modelService: DqModelService,
    private projectService: ProjectService,
    private projectDataService: ProjectDataService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) { }

  // ========== COMPONENT LIFECYCLE METHODS ==========
  ngOnInit() {
    this.projectId = this.projectDataService.getProjectId();
    this.subscribeToData();
    this.syncCurrentStepWithRoute();

    this.loadDQDimensionsBase();
    this.loadDQFactorsBase();
  }

  syncCurrentStepWithRoute() {
    const currentRoute = this.router.url; // Obtiene la ruta actual (por ejemplo, '/st4/a09-1')
    const stepIndex = this.steps.findIndex(step => step.route === currentRoute);
    if (stepIndex !== -1) {
      this.currentStep = stepIndex;
    }
  }

  // =============================================
  // DATA SUBSCRIPTION METHODS
  // =============================================
  subscribeToData(): void {
    this.projectDataService.project$.subscribe((data) => {
      this.project = data;
    });

    this.projectDataService.contextVersion$.subscribe(contextVersion => {
      this.contextVersion = contextVersion;
    });

    this.projectDataService.contextComponents$.subscribe((data) => {
      this.allContextComponents = data;
      console.log('Context Components:', data);
    });

    this.projectDataService.dataAtHand$.subscribe((data) => {
      this.dataAtHandDetails = data;
    });

    this.projectDataService.dataSchema$.subscribe((data) => {
      this.dataSchema = data;
    });

    combineLatest([
      this.projectDataService.dqProblems$,
      this.projectDataService.dqModelVersion$
    ])
    .pipe(
      filter(([problems, dqModelVersionId]) => problems.length > 0 && dqModelVersionId !== null)
    )
    .subscribe(([problems, dqModelVersionId]) => {
      this.allProjectDQProblems = problems;
      this.dqModelVersionId = dqModelVersionId;
      if (dqModelVersionId){
        this.dqModelId = dqModelVersionId;
      }     
      /*console.log('Problemas y versión del modelo listos');
      console.log('Problems:', problems);
      console.log('DQ Model ID:', this.dqModelId);*/
    
      if (this.projectId) {
        this.fetchSelectedPrioritizedDQProblems(this.projectId).then(() => {
          if (dqModelVersionId){
            //this.loadCompleteCurrentDQModel();
            this.fetchDQModelDetails(dqModelVersionId);
            this.loadDQModelDimensionsAndFactors(); //Fetch Dimensions and Factor added to DQ Model
            this.loadDQModelDimensionsForSelection(); 
          }
        });
      }
    });
  }


  // ========== DATA FETCHING METHODS ==========
  fetchDQModelDetails(dqmodelId: number): void {
    this.modelService.getCurrentDQModel(dqmodelId).subscribe(
      (data) => {
        this.currentDQModel = data;
        console.log("DQ Model", this.currentDQModel);        
      },
      (error) => {
        console.error('Error al obtener DQ Model:', error);
      }
    );
  }

  // DQ MODEL VIEW: Dimensiones y Factores agregados al DQ Model
  loadDQModelDimensionsAndFactors(): void {
    this.modelService.getDimensionsByDQModel(this.dqModelId).subscribe(
      async (dimensions) => {
        if (dimensions.length === 0) {
          this.noDimensionsMessage = 'No dimensions found for this DQ Model.';
          this.dqmodel_dimensions = [];
          this.dimensionsWithFactorsInDQModel = [];
          return;
        }
  
        this.dqmodel_dimensions = dimensions.map(dimension => ({
          ...dimension,
          isEditing: false,
          tempContextComponents: JSON.parse(JSON.stringify(dimension.context_components)),
        }));
  
        this.dqmodel_dimensions = dimensions;
        this.dimensionsWithFactorsInDQModel = [];
  
        // Obtener la lista de todos los problemas del proyecto
        const allProjectDQProblems = this.allProjectDQProblems;
  
        const dimensionsData = await Promise.all(dimensions.map(async (dimension) => {
          try {
            // Obtener factores de la dimensión
            const factors = await this.modelService.getFactorsByDQModelAndDimension(this.dqModelId, dimension.id).toPromise();
  
            if (!factors) {
              throw new Error(`Factors not found for dimension ${dimension.dimension_name}`);
            }
  
            // Obtener detalles de la dimensión base
            const baseAttributes = await this.modelService.getDQDimensionBaseById(dimension.dimension_base).toPromise();
  
            // Obtener componentes de contexto de la dimensión
            const dimensionContextComponents = dimension.context_components || [];
  
            // Obtener detalles de los problemas de calidad asociados a la dimensión
            const dimensionDqProblemsDetails = dimension.dq_problems
              .map((problemId: any) => {
                // Buscar el problema en la lista de todos los problemas
                const problemDetails = allProjectDQProblems.find(problem => problem.id === problemId);
                if (!problemDetails) {
                  console.warn(`Problem with ID ${problemId} not found in allProjectDQProblems.`);
                }
                return problemDetails || null;
              })
              .filter((detail: null) => detail !== null); // Filtrar problemas no encontrados
  
            // Obtener los detalles del factor base para cada factor
            const factorsWithBaseAttributes = await Promise.all(factors.map(async (factor) => {
              const factorBaseAttributes = await this.modelService.getFactorBaseById(factor.factor_base).toPromise();
  
              // Obtener componentes de contexto del factor
              const factorContextComponents = factor.context_components || [];
  
              // Obtener detalles de los problemas de calidad asociados al factor
              const dqProblemsDetails = factor.dq_problems
                .map((problemId: any) => {
                  // Buscar el problema en la lista de todos los problemas
                  const problemDetails = allProjectDQProblems.find(problem => problem.id === problemId);
                  if (!problemDetails) {
                    console.warn(`Problem with ID ${problemId} not found in allProjectDQProblems.`);
                  }
                  return problemDetails || null;
                })
                .filter((detail: null) => detail !== null); // Filtrar problemas no encontrados
  
              return {
                ...factor,
                baseAttributes: factorBaseAttributes,
                context_components: factorContextComponents,
                dq_problems_details: dqProblemsDetails,
              };
            }));
  
            return {
              dimension: {
                ...dimension,
                dq_problems_details: dimensionDqProblemsDetails,
              },
              baseAttributes,
              factors: factorsWithBaseAttributes,
              context_components: dimensionContextComponents,
            };
          } catch (error) {
            console.error(`Error loading data for dimension ${dimension.dimension_name}:`, error);
            this.errorMessage = `Failed to load data for dimension ${dimension.dimension_name}.`;
            return null;
          }
        }));
  
        // Filtrar cualquier entrada nula debido a errores y luego asignar los datos completos
        this.dimensionsWithFactorsInDQModel = dimensionsData.filter((dim) => dim !== null);
        console.log("DQ Model Parcial - Dimensiones con detalles y Factores", this.dimensionsWithFactorsInDQModel);
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

  fetchSelectedPrioritizedDQProblems(projectId: number): Promise<any> {
    return new Promise((resolve) => {
      this.projectService.getSelectedPrioritizedDQProblemsByProjectId(projectId).subscribe({
        next: (problems: any[]) => {
          this.selectedPrioritizedProblems = problems;
          // Obtener los detalles adicionales (description y date) para cada problema
          this.selectedPrioritizedProblems.forEach((problem) => this.getDQProblemDetails(problem.dq_problem_id, problem));
          console.log('DQ Problems Priorizados disponibles', 
            this.selectedPrioritizedProblems,
          );
          resolve(problems);
        },
        error: (err: any) => {
          console.error('Error loading prioritized DQ Problems:', err);
          resolve([]);
        }
      });
    });
  }

  getDQProblemDetails(dqProblemId: number, problem: any): void {
    const dqProblem = this.allProjectDQProblems.find((p) => p.id === dqProblemId);
    if (dqProblem) {
      problem.description = dqProblem.description;
      problem.date = dqProblem.date;
    } else {
      console.error('Problema no encontrado:', dqProblemId);
    }
  }


  // =============================================
  // BASE DIMENSIONS AND FACTORS
  // =============================================

  loadDQDimensionsBase() {
    const nonEditableDimensions = [
      'Accuracy',
      'Completeness',
      'Freshness',
      'Consistency',
      'Uniqueness'
    ];
  
    this.modelService.getAllDQDimensionsBase().subscribe({
      next: (data) => {
        this.dqDimensionsBase = data
          .filter(d => !d.is_disabled)
          .map(dimension => ({
            ...dimension,
            is_editable: !nonEditableDimensions.includes(dimension.name)
          }));
  
        console.log('Dimensions Base', this.dqDimensionsBase);
        //this.loadFactorsForAllDimensions(this.dqDimensionsBase);
      },
      error: (err) => console.error("Error loading Dimensions Base:", err)
    });
  }

  loadDQFactorsBase() {
    const nonEditableFactorNames = [
      'Semantic Accuracy', 'Syntactic Accuracy', 'Precision',
      'Density', 'Coverage',
      'Currency', 'Timeliness', 'Volatility',
      'Domain Integrity', 'Intra-relationship Integrity', 'Inter-relationship Integrity',
      'No-duplication', 'No-contradiction'
    ];
  
    this.modelService.getAllDQFactorsBase().subscribe({
      next: (data) => {
        this.dqFactorsBase = data.map(factor => ({
          ...factor,
          is_editable: !nonEditableFactorNames.includes(factor.name) && !factor.is_disabled
        }));
      
      },
      error: (err) => console.error("Error loading Factors Base:", err)
    });
  }

  // CREATION
  createDimensionBase() {
    const newDimension = {
      name: this.dimensionName,
      semantic: this.dimensionSemantic
    };

    this.modelService.createDQDimension(newDimension).subscribe({
      next: (response) => {
        console.log('Dimensión creada con éxito:', response);
        this.notificationService.showSuccess(`DQ Dimension "${newDimension.name}" was successfully created. You can now select it to add it to the DQ Model.`);
        //alert('The DQ Dimension was successfully created. You can now select it to add it to the DQ Model.');
        this.resetDimensionForm();
        this.closeDimensionModal(); 
        this.loadDQDimensionsBase();

        this.selectedDimension = response;
      },
      error: (err) => {
        console.error('Error al crear la dimensión:', err);
        this.errorMessage = 'Hubo un error al crear la dimensión.';
        this.notificationService.showError('Failed to create DQ Dimension');
      }
    });
  }

  createFactorBase() {
    const selectedDQModelDimensionId = this.selectedDQModelDimension;
    const selectedDQModelDimensionObj = this.availableDQModelDimensions.find(
      dim => dim.id === selectedDQModelDimensionId
    );

    const newFactor = {
      name: this.factorName,
      semantic: this.factorSemantic,
      facetOf: selectedDQModelDimensionObj.dimension_base // ID dimension base
    };

    this.modelService.createDQFactor(newFactor).subscribe({
      next: (response) => {
        console.log('Factor creado:', response);

        // Recargar factores disponibles de la dimensión
        this.getFactorsBaseByDimension(selectedDQModelDimensionObj.dimension_base);
        //this.loadFactorsForSelectedDimension(selectedDQModelDim.dimension_base);
  
        // Delay para asegurar que los factores estén actualizados
        setTimeout(() => {
          this.selectedFactorDetails = this.availableFactors.find(f => f.id === response.id);
          this.cdr.detectChanges(); // Forzar actualización de vista si es necesario
        }, 100);
        
        this.notificationService.showSuccess(`DQ Factor "${newFactor.name}" was successfully created. You can now select it to add to the DQ Model.`);

        this.resetFactorForm();
        this.closeFactorModal();
      },
      error: (err) => {
        console.error('Error:', err);
        this.errorMessage = err.error?.message || 'Error creating factor';
      }
    });
  }

  // EDITION
  get selectedDimensionIsEditable(): boolean {
    const selected = this.dqDimensionsBase.find(d => d.id === this.selectedDimension);
    return !!selected?.is_editable;
  }

  get selectedFactorIsEditable(): boolean {
    const selected = this.dqFactorsBase.find(f => f.id === this.selectedFactor);
    return !!selected?.is_editable;
  }

  
  loadFactorsForAllDimensions(): void {
    // Limpiar antes de volver a cargar
    this.dimensionsWithFactors = [];

    this.cdr.detectChanges();

    const dimensions = this.dqDimensionsBase;
    dimensions.forEach((dimension) => {
      this.modelService.getFactorsBaseByDimensionId(dimension.id).subscribe({
        next: (factors) => {
          if (factors.length > 0) {
            const activeFactors = factors.filter(f => !f.is_disabled); // Solo factores activos
            console.log("activeFactors", activeFactors);

            const alreadyExists = this.dimensionsWithFactors.some(
              entry => entry.dimension.id === dimension.id
            );
  
            if (!alreadyExists && activeFactors.length > 0) {
              this.dimensionsWithFactors.push({ dimension, factors: activeFactors });
            }
          }
        },
        error: (err) => {
          console.error(`Error cargando factores para la dimensión ${dimension.id}:`, err);
        },
      });
    });
  }
  



  //SELECT DIMENSIONS and FACTORS BASE 
  getFactorsBaseByDimension(dimensionId: number): void {
    this.modelService.getFactorsBaseByDimensionId(dimensionId).subscribe({
      next: (data) => {
        // Filtrar factores que no estén deshabilitados
        this.availableFactors = data.filter(factor => !factor.is_disabled);
        console.log("this.availableFactors (active only):", this.availableFactors);
        this.noFactorsMessage = ""; // Resetear mensaje
      },
      error: (err) => {
        console.log("No factors are associated with this dimension");
        this.noFactorsMessage = "No factors are associated with this dimension. Please create and add a new DQ Factor.";  
      }
    });
  }

  // DELETION  
  deleteDimensionBase(dimensionId: number): void {
    //Delete Dimension base (disabled from DQ Dimensions selection)
    if (dimensionId) {
      console.log(`Dimensión seleccionada para eliminar: ${this.selectedDimension}`);
      this.modelService.updateDQDimensionBaseDisabledStatus(dimensionId, true).subscribe({
        next: (response) => {
          this.notificationService.showSuccess('DQ Dimension was successfully deleted.');
          this.loadDQDimensionsBase(); // Recargar lista de dimensiones activas
          this.selectedDimension = null;

        },
        error: (err) => {
          this.notificationService.showError('Failed to delete DQ Dimension.');
        }
      });
    }
  }
  
  deleteFactorBase(factorId: number): void {
    //Delete Dimension base (disabled from DQ Dimensions selection)
    if (factorId) {
      console.log(`Factor seleccionada para eliminar: ${this.selectedFactor}`);
      this.modelService.updateDQFactorBaseDisabledStatus(factorId, true).subscribe({
        next: (response) => {
          this.notificationService.showSuccess('DQ Factor was successfully deleted.');

          this.loadFactorsForAllDimensions();
          this.selectedFactor = null;

          if (this.selectedDQModelDimension)
            this.loadFactorsForSelectedDimension(this.selectedDQModelDimension);

        },
        error: (err) => {
          this.notificationService.showError('Failed to delete DQ Dimension.');
        }
      });
    }
  }
  


  // Método para manejar la selección de un factor en "From DQ Problems"
  onFactorChangeFromDQProblems(factorId: number, dimensionId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const isChecked = input.checked;

    // Actualizar la selección del factor
    if (isChecked) {
      this.selectedFactorsFromDQProblems.add(factorId);
    } else {
      this.selectedFactorsFromDQProblems.delete(factorId);
    }

    // Verificar si al menos un factor de la dimensión está seleccionado
    const dimension = this.dimensionsWithFactors.find(d => d.dimension.id === dimensionId);
    if (dimension) {
      const atLeastOneFactorSelected = dimension.factors.some(factor => this.selectedFactorsFromDQProblems.has(factor.id));

      // Actualizar la selección de la dimensión
      if (atLeastOneFactorSelected) {
        this.selectedDimensionsFromDQProblems.add(dimensionId);
      } else {
        this.selectedDimensionsFromDQProblems.delete(dimensionId);
      }
    }
  }

  // Método para verificar si un factor está seleccionado
  isFactorSelectedFromDQProblems(factorId: number): boolean {
    return this.selectedFactorsFromDQProblems.has(factorId);
  }

  // Método para verificar si una dimensión está seleccionada
  isDimensionSelectedFromDQProblems(dimensionId: number): boolean {
    return this.selectedFactorsFromDQProblems.has(dimensionId);
  }


  applicationDomain: any[] = [];
  businessRule: any[] = [];
  dataFiltering: any[] = [];
  dqMetadata: any[] = [];
  dqRequirement: any[] = [];
  otherData: any[] = [];
  otherMetadata: any[] = [];
  systemRequirement: any[] = [];
  taskAtHand: any[] = [];
  userType: any[] = [];



  getContextComponents(contextVersionId: number): void {
    this.projectService.getContextComponents(contextVersionId).subscribe({
      next: (data) => {
        this.allContextComponents = data;
        //console.log('Get Context Components:', data);
        
        // Asignar los datos a las variables correspondientes
        this.applicationDomain = data.applicationDomain || [];
        this.businessRule = data.businessRule || [];
        this.dataFiltering = data.dataFiltering || [];
        this.dqMetadata = data.dqMetadata || [];
        this.dqRequirement = data.dqRequirement || [];
        this.otherData = data.otherData || [];
        this.otherMetadata = data.otherMetadata || [];
        this.systemRequirement = data.systemRequirement || [];
        this.taskAtHand = data.taskAtHand || [];
        this.userType = data.userType || [];
        //console.log("this.applicationDomain", this.applicationDomain)
      },
      error: (err) => console.error('Error fetching context components:', err),
    });
  }


  onCtxComponentsCheckboxChange_fromScratch(id: number, category: string, value: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const isChecked = input?.checked || false;
  
    if (isChecked) {
      // Agregar el componente seleccionado
      this.ctxComponentsChecked_fromScratch.push({ id, category, value });
    } else {
      // Eliminar el componente desmarcado
      this.ctxComponentsChecked_fromScratch = this.ctxComponentsChecked_fromScratch.filter(
        (component) => !(component.category === category && component.value === value)
      );
    }
    
    console.log("this.ctxComponentsChecked_fromScratch", this.ctxComponentsChecked_fromScratch);
  }

 
  onCtxComponentsCheckboxChange_suggestion(id: number, category: string, value: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const isChecked = input?.checked || false;
  
    if (isChecked) {
      // Agregar el componente seleccionado
      this.ctxComponentsChecked_suggestion.push({ id, category, value });
    } else {
      // Eliminar el componente desmarcado
      this.ctxComponentsChecked_suggestion = this.ctxComponentsChecked_suggestion.filter(
        (component) => !(component.category === category && component.value === value)
      );
    }

    console.log("this.ctxComponentsChecked_suggestion", this.ctxComponentsChecked_suggestion);
    
  }

  // Validar si un componente está seleccionado
  isComponentSelected(category: string, value: string): boolean {
    return this.ctxComponentsChecked_fromScratch.some(
      (component) => component.category === category && component.value === value
    );
  }

  removeSelectedComponent(componentToRemove: any): void {
    // Filtra la lista para excluir el componente a eliminar
    this.ctxComponentsChecked_fromScratch = this.ctxComponentsChecked_fromScratch.filter(
      (component) => component !== componentToRemove
    );
  }


  isComponentSelectedInSuggestions(category: string, value: string): boolean {
    return this.ctxComponentsChecked_suggestion.some(
      (component) => component.category === category && component.value === value
    );
  }

  removeSelectedComponentInSuggestions(componentToRemove: any): void {
    // Filtra la lista para excluir el componente a eliminar
    this.ctxComponentsChecked_suggestion = this.ctxComponentsChecked_suggestion.filter(
      (component) => component !== componentToRemove
    );
  }



  getSelectedProblemDetails(): any {
    if (this.selectedProblem && this.selectedPrioritizedProblems.length > 0) {
      return this.selectedPrioritizedProblems.find(problem => problem.id === this.selectedProblem);
    }
    return null;
  }


  onProblemChange(): void {
    if (this.selectedProblem) {
      console.log('Id Problema seleccionado:', this.selectedProblem);
      // Aquí puedes agregar lógica adicional, como cargar detalles del problema seleccionado
    } else {
      console.log('Ningún problema seleccionado.');
    }
  }


  onCheckboxProblemsChange(problem: any, event: Event) {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.selectedProblemsFromScratch.push(problem);
    } else {
      this.selectedProblemsFromScratch = this.selectedProblemsFromScratch.filter(p => p.id !== problem.id);
    }
    console.log("DQ PROBLEM CHEQUEADO: ", this.selectedProblemsFromScratch)
  }


  onCheckboxSuggestionsProblemsChange(problem: any, event: Event) {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.selectedProblemsSuggestions.push(problem);
    } else {
      this.selectedProblemsSuggestions = this.selectedProblemsSuggestions.filter(p => p.id !== problem.id);
    }
    console.log("CHECQUEADO: ", this.selectedProblemsSuggestions)
  }

  isProblemSelectedInSuggestions(dqProblemId: number): boolean {
    return this.selectedProblemsSuggestions.some(p => p.dq_problem_id === dqProblemId);
  }


 
  // ------------
  // Add Dimensions and Factors from scratch
  // ------------

  // Dimension from scratch
  onDimensionChange(): void {
    this.clearSelectedComponents();  // Limpiar la selección de componentes
    this.clearDQProblemsSelection();
    console.log(`Dimensión Base seleccionada (ID): ${this.selectedDimension}`);
  }

  getSelectedDimension(): any {
    return this.dqDimensionsBase.find(dim => dim.id === this.selectedDimension);
  }

  // Factor from scratch
  onDQModelDimensionChange(): void {
    // Opciones: Dimensiones en DQ Model
    this.loadDQModelDimensionsForSelection(); 
    this.clearSelectedComponents();
    this.clearDQProblemsSelection();
    
    if (this.selectedDQModelDimension) {
      this.loadFactorsForSelectedDimension(this.selectedDQModelDimension);
    }
    
    this.selectedFactor = null;
  }

  selectedFactorDetails: any | null = null;
  onFactorChange(): void {
    if (this.selectedFactor) {
      console.log('Selected factor:', this.selectedFactor);
      this.selectedFactorDetails = this.availableFactors.find(f => f.id === this.selectedFactor);
      console.log('Selected factor details:', this.selectedFactorDetails);
    } else {
      this.selectedFactorDetails = null;
    }
  }

  getSelectedFactor() {
    //console.log(this.availableFactors);
    return this.dqFactorsBase.find(factor => factor.id === this.selectedFactor);
  }


  // =============================================
  // ADD TO DQ MODEL METHODS
  // =============================================

  //ADD SELECTION (DIMENSION,BASE) to DQ MODEL
  addDimensionToDQModel(newDimension: any): void {
    this.dqmodel_dimensions.push(newDimension); // Agrega la nueva dimensión al arreglo
    console.log("Nueva dimensión agregada:", newDimension);
  }
  
  // Agregar solamente Dimension al DQ Model (from scratch)
  addDimToDQModel(selectedDimension: any, selectedComponents: { id: number; category: string; value: string }[], selectedDQProblems: number[]) {

    if (!selectedDimension) {
      console.log('Por favor, selecciona una dimensión.');
      return;
    }
    // Manejar la lógica aquí con los parámetros recibidos
    console.log('Dimensión seleccionada:', selectedDimension);
    console.log("--selected_Components in addToDQModel--", selectedComponents);

    //const selectedProblemIds = this.selectedProblemsFromScratch.map(problem => problem.id); Agrega id priorizado
    const selectedProblemIds = this.selectedProblemsFromScratch.map(problem => problem.dq_problem_id); //agrega id problema original
    console.log("--selected_Problem IDs in addToDQModel--", selectedProblemIds);

    this.submitDimensionToDQModel(selectedDimension, selectedComponents, selectedProblemIds);
    //this.loadDQModelDimensionsAndFactors();
  }

  submitDimensionToDQModel(selectedDimension: any, 
    selectedComponents: { id: number; category: string; value: string }[],
    selectedProblemIds: number[]): void {

    if (!selectedDimension) {
      console.error("No se ha seleccionado ninguna dimensión base.");
      return; 
    }

    // Buscar los objetos correspondientes en los arrays dqDimensionsBase y dqFactorsBase
    const dimensionObj = this.dqDimensionsBase.find(dim => dim.id === selectedDimension);
    const dimensionName = dimensionObj ? dimensionObj.name : 'Dimension';


      // verificar si la dimension ya existe
      this.modelService.getDimensionsByDQModel(this.dqModelId).subscribe((existingDimensions) => {
        const existingDimension = existingDimensions.find(dim => dim.dimension_base === selectedDimension);
    
        if (existingDimension) {
          // Si la dimensión ya existe, solo agrega el factor asociado a la Dimension
          this.addedDimensionId = existingDimension.id;
          console.log("Dimensión ya existente, ID:", this.addedDimensionId);
          console.log("Dimensión ya existente, Ctx Components:", existingDimension.context_components);
      
          this.notificationService.showError('DQ Dimension has already been added to the DQ Model.');

          const existingComponents = existingDimension.context_components;
          const newComponents = buildContextComponents(selectedComponents);
          
          // Combinar los componentes existentes con los nuevos, evitando duplicados
          const mergedComponents = JSON.parse(JSON.stringify(existingComponents));

          Object.keys(newComponents).forEach((category) => {
              if (!Array.isArray(mergedComponents[category])) {
                  mergedComponents[category] = [];
              }
              
              // Agregar solo los componentes que no existen
              newComponents[category].forEach((id: number) => {
                  if (!mergedComponents[category].includes(id)) {
                      mergedComponents[category].push(id);
                  }
              });
          });

          // DQ PROBLEMS:
          

          // Combinar problemas de calidad sin duplicados
          const existingProblems = existingDimension.dq_problems || [];
          const mergedProblems = [...new Set([...existingProblems, ...selectedProblemIds])];

          console.log("existingProblems", existingProblems)
          console.log("mergedProblems", mergedProblems)

          // Verificar si hay cambios en los componentes o problemas
          const hasChanges =
            JSON.stringify(mergedComponents) !== JSON.stringify(existingComponents) ||
            JSON.stringify(mergedProblems) !== JSON.stringify(existingProblems);
      
          if (hasChanges) {
              const updatedDimension = {
                  context_components: mergedComponents,
                  dq_problems: mergedProblems
              };

              console.log("updatedDimension.dq_problems", updatedDimension.dq_problems)
      
              this.modelService.updateDQDimensionCtxAndProblems(existingDimension.id, updatedDimension).subscribe({
                  next: () => {
                      console.log("Ctx componentes Y DQ Problems actualizados exitosamente en la dimensión.");
                  
                      this.loadDQModelDimensionsAndFactors();
                  },
                  error: (err) => {
                      this.notificationService.showError("Failed to update this DQ Dimension.");
                  }
              });
          } 
      

        } else {
          // Construir los context_components
          const contextComponents = buildContextComponents(selectedComponents);
          console.log("***DIM: buildContextComponents()", buildContextComponents(selectedComponents))

          console.log("AGREGANDO DIMENSION.... ", selectedProblemIds);

          // Crear una nueva dimensión con los context_components
          const dimensionToAdd = {
            dq_model: this.dqModelId,
            dimension_base: selectedDimension!,
            context_components: contextComponents,
            dq_problems: selectedProblemIds 
          };
          
          this.modelService.addDimensionToDQModel(dimensionToAdd).subscribe({
            next: (data) => {
              console.log("Dimension añadida:", data);
              this.addedDimensionId = data.id; 
              
              const successMessage = `DQ Dimension "${data.dimension_name}" was successfully added to the DQ Model.`;


              this.notificationService.showSuccess(successMessage);

              // Recargar las dimensiones después de añadir la nueva dimensión
              this.loadDQModelDimensionsAndFactors(); //update DQ Model
              //this.loadDQDimensionsBase();
              this.loadDQModelDimensionsForSelection(); //actualizar select factors

            },
            error: (err) => {
              this.notificationService.showError('Failed to add the DQ Dimension to DQ Model');
            }
          });
        }
      }); 
    
  }



  addFactorToDQModel(): void {
    if (!this.selectedDQModelDimension || !this.selectedFactor) {
      console.log('Por favor, selecciona una dimensión del DQ Model y un factor.');
      return;
    }

    const selectedFactorObj = this.dqFactorsBase.find(factor => factor.id === this.selectedFactor);
    const selectedDimensionObj = this.availableDQModelDimensions.find(
      dim => dim.id === this.selectedDQModelDimension
    );

    const confirmMessage = `¿Estás seguro de que deseas agregar el DQ Factor "${selectedFactorObj.name}" a la DQ Dimension "${selectedDimensionObj.dimension_name}" en el DQ Model?`;

    if (confirm(confirmMessage)) {
      const factorToAdd = {
        factor_base: this.selectedFactor,
        dimension: this.selectedDQModelDimension, // ID de la dimensión en el DQ Model
        dq_model: this.dqModelId,
        context_components: buildContextComponents(this.ctxComponentsChecked_fromScratch),
        dq_problems: this.selectedProblemsFromScratch.map(problem => problem.dq_problem_id)
      };

      this.modelService.addFactorToDQModel(factorToAdd).subscribe({
        next: (data) => {
          console.log("DQ Factor added to DQ Model:", data);
          this.loadDQModelDimensionsAndFactors(); // Actualizar la vista
          alert(`DQ Factor "${data.factor_name}" agregado exitosamente.`);
          //this.clearSelections();
        },
        error: (err) => {
          console.error("Error adding the factor:", err);
          alert("Error al agregar el factor.");
        }
      });
    }
  }

  addDQDimAndFactorToDQModel(selectedComponents: { id: number; category: string; value: string }[], selectedDQProblems: number[]) {

    const selectedProblemIds = this.selectedProblemsSuggestions.map(problem => problem.dq_problem_id);

    const suggestedDimensionBaseId = this.suggestedDQDimensionBase.id;
    const suggestedFactorBaseId = this.suggestedDQFactorBase.id;

    this.submitNewDimension(suggestedDimensionBaseId, suggestedFactorBaseId, selectedComponents, selectedProblemIds);
    this.loadDQModelDimensionsAndFactors();

  }
  
  addDQFactorToDQModel(
    selectedDQModelDimensionId: number,
    selectedFactorBaseId: number,
    ctxComponents: { id: number; category: string; value: string }[],
    selectedProblems: any[]
  ): void {
    // 1. Convertir problemas a IDs si es necesario
    const problemIds = selectedProblems.map(p => p.dq_problem_id || p.id);
  
    // 2. Construir el payload del factor
    const factorToAdd = {
      factor_base: selectedFactorBaseId,
      dimension: selectedDQModelDimensionId, // ID de la dimensión EN EL DQ MODEL (no dimension_base)
      dq_model: this.dqModelId,
      context_components: buildContextComponents(ctxComponents),
      dq_problems: problemIds
    };
  
    // 3. Verificar si el factor ya existe en la dimensión
    this.modelService.getFactorsByDQModelAndDimension(
      this.dqModelId,
      selectedDQModelDimensionId
    ).subscribe({
      next: (existingFactors) => {
        const isDuplicate = existingFactors.some(f => f.factor_base === selectedFactorBaseId);
        
        if (isDuplicate) {
          //alert('This factor already exists in the selected dimension.');
          this.notificationService.showError('DQ Factor has already been added to the DQ Model.');
          return;
        }
  
        // 4. Crear el factor en el DQ Model
        this.modelService.addFactorToDQModel(factorToAdd).subscribe({
          next: (newFactor) => {
            console.log('Factor added to DQ Model:', newFactor);
            this.loadDQModelDimensionsAndFactors(); // Actualizar vista
            //alert(`Factor "${newFactor.factor_name}" added successfully!`);

            const successMessage = `DQ Factor "${newFactor.factor_name}" was successfully added to the DQ Model.`;
            this.notificationService.showSuccess(successMessage);

            //this.clearSelections();
            this.selectedDQModelDimension = null;
            this.selectedFactor = null;
            this.ctxComponentsChecked_fromScratch = [];
            this.selectedProblemsFromScratch = [];
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Error adding factor:', err);
            this.notificationService.showSuccess('Failed to add DQ Factor');
          }
        });
      },
      /*error: (err) => {
        console.error('Error checking existing factors:', err);
      }*/
    });
  }


  //Agregar par Dimension-Factor al DQ Model
  addToDQModel(selectedDimension: any, selectedFactor: any, selectedComponents: { id: number; category: string; value: string }[], selectedDQProblems: number[]) {

    if (!selectedDimension || !selectedFactor) {
      console.log('No se selecciono una dimensión y un factor.');
      return;
    }
    
    // Log de datos recibidos
    console.log('Dimensión seleccionada:', selectedDimension);
    console.log('Factor seleccionado:', selectedFactor);
    // console.log('Componentes seleccionados:', selectedComponents);
    // console.log('Problemas DQ seleccionados:', selectedDQProblems);

    const selectedProblemIds = selectedDQProblems;
    
    // Procesar la nueva dimensión y factor
    this.submitNewDimension(selectedDimension, selectedFactor, selectedComponents, selectedProblemIds);
    this.loadDQModelDimensionsAndFactors();
  }

  submitNewDimension(selectedDimension: any, selectedFactor: any, 
    selectedComponents: { id: number; category: string; value: string }[],
    selectedProblemIds: number[]): void {

    if (!selectedDimension) {
      console.error("No se ha seleccionado ninguna dimensión base.");
      return; 
    }

    // Buscar objetos correspondientes
    const dimensionObj = this.dqDimensionsBase.find(dim => dim.id === selectedDimension);
    const factorObj = this.dqFactorsBase.find(factor => factor.id === selectedFactor);

    const dimensionName = dimensionObj ? dimensionObj.name : 'Dimension';
    const factorName = factorObj ? factorObj.name : 'Factor';

      // Verificar si la dimensión ya existe en el DQ Model
      this.modelService.getDimensionsByDQModel(this.dqModelId).subscribe((existingDimensions) => {
        const existingDimension = existingDimensions.find(dim => dim.dimension_base === selectedDimension);
    
        // Caso 1: Dimension ya existe (solo agregar factor y actualizar componentes de contexto a dimension)
        if (existingDimension) {
          this.addedDimensionId = existingDimension.id;

          // Combinar componentes existentes con los nuevos, evitando duplicados
          const existingComponents = existingDimension.context_components;
          const newComponents = buildContextComponents(selectedComponents);
          const mergedComponents = JSON.parse(JSON.stringify(existingComponents));

          Object.keys(newComponents).forEach((category) => {
              if (!Array.isArray(mergedComponents[category])) {
                  mergedComponents[category] = [];
              }
              
              // Agregar solo los componentes que no existen
              newComponents[category].forEach((id: number) => {
                  if (!mergedComponents[category].includes(id)) {
                      mergedComponents[category].push(id);
                  }
              });
          });

          // Combinar problemas de calidad sin duplicados
          const existingProblems = existingDimension.dq_problems || [];
          const mergedProblems = [...new Set([...existingProblems, ...selectedProblemIds])];

          // Verificar si hay cambios en los componentes o problemas
          const hasChanges =
            JSON.stringify(mergedComponents) !== JSON.stringify(existingComponents) ||
            JSON.stringify(mergedProblems) !== JSON.stringify(existingProblems);
      
          // Si hay cambios, actualizar la dimensión existente
          if (hasChanges) {
              const updatedDimension = {
                  context_components: mergedComponents,
                  dq_problems: mergedProblems
              };
      
              this.modelService.updateDQDimensionCtxAndProblems(existingDimension.id, updatedDimension).subscribe({
                  next: () => {
                      this.submitNewFactor(selectedFactor, selectedComponents, selectedProblemIds);
                  },
                  error: (err) => {
                      console.error("Error al actualizar la dimensión:", err);
                      this.notificationService.showError("Error updating dimension context components.");
                  }
              });
          } else {
              console.log("No hay cambios en los componentes.");
              this.submitNewFactor(selectedFactor, selectedComponents, selectedProblemIds);
          }
      
        // CASO 2: NUEVA DIMENSIÓN (crear desde cero)
        } else {
          // Construir los context_components para la nueva dimensión
          const contextComponents = buildContextComponents(selectedComponents);

          const dimensionToAdd = {
            dq_model: this.dqModelId,
            dimension_base: selectedDimension!,
            context_components: contextComponents,
            dq_problems: selectedProblemIds 
          };
          
          this.modelService.addDimensionToDQModel(dimensionToAdd).subscribe({
            next: (data) => {
              console.log("Dimension añadida:", data);
              this.addedDimensionId = data.id; 
              
              // Recargar dimensiones y factores del modelo
              this.loadDQModelDimensionsAndFactors(); 

              const successMessage = `DQ Dimension "${data.dimension_name}" was successfully added to the DQ Model.`;

              this.notificationService.showSuccess(successMessage);

              // Agregar el factor asociado
              this.submitNewFactor(selectedFactor, selectedComponents, selectedProblemIds);
            },
            error: (err) => {
              console.error("Error al añadir la dimension:", err);
              if (err.error && err.error.non_field_errors) {
                  window.alert(err.error.non_field_errors[0]);  
              } else {
                  window.alert("An error occurred while trying to add the dimension."); 
              }
            }
          });
        }
      });

  }

  submitNewFactor(selectedFactor: any, 
    selectedComponents: { id: number; category: string; value: string }[],
    selectedProblemIds: number[]): void { 

    if (!selectedFactor) {
      console.error("No factor selected.");
      alert("Please select a factor to add.");
      return; 
    }
  
    // Verificar si el factor ya existe en la dimension seleccionada en el DQ Model
    this.modelService.getFactorsByDQModelAndDimension(this.dqModelId!, this.addedDimensionId!).subscribe((existingFactors) => {
      const duplicateFactor = existingFactors.find(factor => factor.factor_base === selectedFactor);

      // Caso 1: Factor existe, mostrar advertencia
      if (duplicateFactor) {
        console.warn("Factor already exists in the dimension.");
        const warningMessage = `DQ Factor "${duplicateFactor.factor_name}" already exists in the DQ Model.`;
        this.notificationService.showError(warningMessage);
      } 
      // Caso 2: Agregar Factor nuevo al DQ Model
      else {
        const contextComponents = buildContextComponents(selectedComponents);

        const factorToAdd = {
          factor_base: selectedFactor!,
          dimension: this.addedDimensionId!,
          dq_model: this.dqModelId,
          context_components: contextComponents,
          dq_problems: selectedProblemIds 
        };
  
        this.modelService.addFactorToDQModel(factorToAdd).subscribe({
          next: (data) => {
            console.log("DQ Factor added to DQ Model:", data);

            this.loadDQModelDimensionsAndFactors();

            const successMessage = `DQ Factor "${data.factor_name}" was successfully added to the DQ Model.`;
            this.notificationService.showSuccess(successMessage);

            this.noDimensionsMessage = '';
            this.clearSelectedComponents(); 
            this.clearDQProblemsSelection();
            this.clearDimensionSelection();
          },
          error: (err) => {
            console.error("Error adding the factor:", err);
            alert("An error occurred while trying to add the factor.");
          }
        });
      }
    });
  }


  // =============================================
  // MODALS
  // =============================================

  openDimensionModal() {
    this.isDimensionModalOpen = true;
  }

  closeDimensionModal() {
    this.isDimensionModalOpen = false;
    this.resetDimensionForm(); 
  }

  resetDimensionForm() {
    this.dimensionName = '';
    this.dimensionSemantic = '';
    this.errorMessage = null;
  }

  openFactorModal(): void {
    if (this.selectedDQModelDimension) {
      // Busca la dimensión del DQ Model seleccionada
      const selectedDQModelDim = this.availableDQModelDimensions.find(
        dim => dim.id === this.selectedDQModelDimension
      );
      
      if (selectedDQModelDim) {
        this.isFactorModalOpen = true;
        // Obtiene el nombre de la dimensión base asociada
        const dimensionBase = this.dqDimensionsBase.find(
          dim => dim.id === selectedDQModelDim.dimension_base
        );
        this.selectedDimensionName = dimensionBase?.name || '';
      } else {
        this.errorMessage = 'Selected dimension not found.';
      }
    } else {
      this.errorMessage = 'Please select a dimension from the DQ Model before adding a factor.';
    }
  }

  closeFactorModal(): void {
    this.isFactorModalOpen = false;
    this.errorMessage = ''; 
    this.resetFactorForm();
  }

  resetFactorForm() {
    this.factorName = '';
    this.factorSemantic = '';
    this.errorMessage = ''; 
  }



  // ADD DIMENSIONS-FACTORS to DQ MODEL
  mergeContextComponents(existing: any, newComponents: any) {
    // Crear una copia completa del objeto existente
    const merged = JSON.parse(JSON.stringify(existing));
  
    // Iterar sobre cada categoría en los nuevos componentes
    Object.keys(newComponents).forEach((category) => {
      if (!Array.isArray(merged[category])) {
        merged[category] = [];
      }
  
      // Filtrar y agregar solo los elementos nuevos que no existan
      const uniqueNewComponents = newComponents[category].filter(
        (id: number) => !merged[category].includes(id)
      );
  
      // Agregar los nuevos componentes únicos al array existente
      merged[category] = [...merged[category], ...uniqueNewComponents];
    });
  
    return merged;
  }


  clearSelectedComponents(): void {
    this.ctxComponentsChecked_fromScratch = [];
  }

  clearDQProblemsSelection(): void {
    this.selectedProblemsFromScratch = []; 
    this.cdr.detectChanges();  
  }

  clearDimensionSelection(): void {
    this.selectedDimension = null; 
    this.availableFactors = []; 
    this.selectedFactor = null; 
    this.isCtxSelectionAccordionVisible = false;
    this.isEditSuggestedDQProblemsVisible = false;
    this.cdr.detectChanges(); 
  }

 // Método para limpiar la selección de factores y dimensiones
  clearSelectionFromDQProblems(): void {
    this.selectedFactorsFromDQProblems.clear();
    this.selectedDimensionsFromDQProblems.clear();

    // Actualizar el estado de los checkboxes
    this.dimensionsWithFactors.forEach(dimension => {
      dimension.factors.forEach(factor => {
        // Desmarcar los checkboxes de los factores
        const factorCheckbox = document.getElementById(`factor-checkbox-${factor.id}`) as HTMLInputElement;
        if (factorCheckbox) {
          factorCheckbox.checked = false;
        }
      });

      // Desmarcar los checkboxes de las dimensiones
      const dimensionCheckbox = document.getElementById(`dimension-checkbox-${dimension.dimension.id}`) as HTMLInputElement;
      if (dimensionCheckbox) {
        dimensionCheckbox.checked = false;
      }
    });
  }


  addDimensionsAndFactorsFromDQProblems(): void {
    //console.log('DQ Problem seleccionado desde DQ Problems:', this.selectedProblem)
    //console.log('Factores seleccionados desde DQ Problems:', this.selectedFactorsFromDQProblems);
    //console.log('Dimensiones seleccionadas desde DQ Problems:', this.selectedDimensionsFromDQProblems);
    const selectedProblemObj = this.selectedPrioritizedProblems.find(p => p.id === this.selectedProblem);
    const dqProblemId = selectedProblemObj.dq_problem_id;

    const selectedFactorsArray = Array.from(this.selectedFactorsFromDQProblems);
    console.log('Factores seleccionados (DQ Problems section)', selectedFactorsArray);

    selectedFactorsArray.forEach(factorBaseId => {

      // Obtener los atributos del factor
      const factorBaseAttr = this.dqFactorsBase.find(factor => factor.id === factorBaseId);
      console.log(`Detalles del factor ${factorBaseId}:`, factorBaseAttr);

      const dimensionBaseId = factorBaseAttr.facetOf;

      this.addToDQModel(dimensionBaseId, factorBaseId, [], [dqProblemId]);

    });

    this.clearSelectionFromDQProblems()
  }
  


  // DQ MODEL: SHOW DIMENSIONS and FACTORS added 

  toggleEditDQFactorVisibility(factor: any): void {
    factor.isEditing = !factor.isEditing;
  
    // Inicializar tempContextComponents si no está definido
    if (!factor.tempContextComponents) {
      factor.tempContextComponents = JSON.parse(JSON.stringify(factor.context_components || {}));
    }
  }


  // Remover Dimension del DQ Model
  deleteDimension(dimensionId: number): void {
    this.modelService.deleteDimensionFromDQModel(dimensionId).subscribe(
      response => {
        this.notificationService.showSuccess('DQ Dimension and its Factors were successfully removed from the DQ Model.');
        // Filtrar la dimensión eliminada sin recargar toda la lista
        this.dimensionsWithFactorsInDQModel = this.dimensionsWithFactorsInDQModel.filter(
          item => item.dimension.id !== dimensionId
        );
        this.loadDQModelDimensionsAndFactors();
        this.loadDQDimensionsBase();
        this.loadDQModelDimensionsForSelection();
      },
      error => {
        alert("Error al eliminar la dimensión.");
        console.error("Error al eliminar la dimensión:", error);
      }
    );
  }
  
  // Remover Factor del DQ Model
  deleteFactor(factorId: number): void {
    this.modelService.deleteFactorFromDQModel(factorId).subscribe(
      response => {
        this.notificationService.showSuccess('DQ Factor was successfully removed from the DQ Model.');

        // Elimina el factor de la lista sin recargar la página
        this.dimensionsWithFactorsInDQModel = this.dimensionsWithFactorsInDQModel.map(dimension => ({
          ...dimension,
          factors: dimension.factors.filter((factor: { id: number }) => factor.id !== factorId)
        }));
        this.loadDQModelDimensionsAndFactors();
      },
      error => {
        this.notificationService.showError('Failed to remove DQ Factor from the DQ Model');
        console.error("Error al eliminar el factor:", error);
      }
    );
  }

  // Utilidades UI
  scrollToDiv(divId: string): void {
    const element = document.getElementById(divId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
  
  // Alterna la visibilidad del div y cambia el texto e ícono del botón
  toggleCtxSelectionAccordionVisibility(): void {
    this.isCtxSelectionAccordionVisible = !this.isCtxSelectionAccordionVisible;
  }

  toggleSuggestedItemsVisibility(type: string): void {
    if (type === 'context') {
      this.isEditSuggestedContextVisible = !this.isEditSuggestedContextVisible;
    } else if (type === 'dqproblems') {
      this.isEditSuggestedDQProblemsVisible = !this.isEditSuggestedDQProblemsVisible;
    }
  }

  // Controlador principal para mostrar/ocultar toda la sección
  toggleFromScratchSectionVisibility(): void {
    this.isFromScratchSectionVisible = !this.isFromScratchSectionVisible;
    
    // Al abrir la sección, mostrar Dimensions por defecto
    if (this.isFromScratchSectionVisible) {
      this.showDimensionsSection();
    } else {
      // Al cerrar la sección, ocultar todo
      this.hideAllSections();
    }
  }

  // Mostrar solo la sección de Dimensions
  showDimensionsSection(): void {
    this.isFromScratchSectionVisible_addDimensions = true;
    this.isFromScratchSectionVisible_addFactors = false;
  }

  // Mostrar solo la sección de Factors
  showFactorsSection(): void {
    this.isFromScratchSectionVisible_addDimensions = false;
    this.isFromScratchSectionVisible_addFactors = true;
  }

  // Ocultar todas las subsecciones
  hideAllSections(): void {
    this.isFromScratchSectionVisible_addDimensions = false;
    this.isFromScratchSectionVisible_addFactors = false;
  }

  // Toggle para Dimensions
  toggleFromScratchSectionVisibility_addDimensions(): void {
    if (this.isFromScratchSectionVisible_addDimensions) {
      // Si ya está abierto, lo cerramos
      this.isFromScratchSectionVisible_addDimensions = false;
    } else {
      // Si está cerrado, lo abrimos y cerramos Factors
      this.showDimensionsSection();
    }
  }

  // Toggle para Factors
  toggleFromScratchSectionVisibility_addFactors(): void {
    if (this.isFromScratchSectionVisible_addFactors) {
      // Si ya está abierto, lo cerramos
      this.isFromScratchSectionVisible_addFactors = false;
    } else {
      // Si está cerrado, lo abrimos y cerramos Dimensions
      this.showFactorsSection();
    }
  }

  toggleFromProblemsSectionVisibility() {
    this.isFromProblemsSectionVisible = !this.isFromProblemsSectionVisible;  

    if (this.isFromProblemsSectionVisible)
      this.loadFactorsForAllDimensions();
  }
 
  toggleSuggestionsSectionVisibility() {
    this.isSuggestionsSectionVisible = !this.isSuggestionsSectionVisible;  
  }

  // Método para verificar si una categoría tiene componentes seleccionados
  hasSelectedComponents(category: string): boolean {
    return this.ctxComponentsChecked_suggestion.some(component => component.category === category);
  }


  getSuggestedDimension(): any {
    return this.suggestedDQDimensionBase;
  }

  getSuggestedFactor(): any {
    return this.suggestedDQFactorBase;
  }


  toggleCtxSuggestionVisibility(): void {
    this.isCtxSuggestionVisible = !this.isCtxSuggestionVisible;
  }

  // Método para obtener las categorías de los componentes de contexto
  getContextComponentCategories(contextComponents: any): string[] {
    return Object.keys(contextComponents).filter(category => contextComponents[category].length > 0);
  }

  // Método para obtener los detalles de un componente de contexto
  getContextComponentDetails(category: string, componentId: number): string {
    const component = this.allContextComponents[category].find((comp: any) => comp.id === componentId);
    if (component) {
      // Retorna el primer atributo no 'id' que encuentre
      const keys = Object.keys(component).filter(key => key !== 'id');
      if (keys.length > 0) {
        return `${keys[0]}: ${component[keys[0]]}`;
      }
    }
    return 'No details available';
  }

  // Método para obtener todos los detalles de un componente de contexto
  getContextComponentCompleteDetails(category: string, componentId: number): string {
    const component = this.allContextComponents[category].find((comp: any) => comp.id === componentId);
    if (component) {
      // Crear una lista de todos los atributos (excepto 'id')
      const details = Object.keys(component)
        .filter(key => key !== 'id') // Excluir el campo 'id'
        .map(key => `${key}: ${component[key]}`) // Formatear como "clave: valor"
        .join(', '); // Unir todos los pares clave-valor en una cadena
      return details;
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

  enableDQDimensionEdition(dimension: any): void {
    console.log("enableDQDimensionEdition", dimension)

    dimension.isEditing = !dimension.isEditing;
  
    // Inicializar tempContextComponents si no está definido
    if (!dimension.tempContextComponents) {
      dimension.tempContextComponents = JSON.parse(JSON.stringify(dimension.context_components || {}));
    }
    // Inicializar dq_problems si no está definido
    if (!dimension.dq_problems) {
      dimension.dq_problems = JSON.parse(JSON.stringify(dimension.dq_problems || []));
    }
  }

  isComponentSelected_editing(category: string, componentId: number, tempContextComponents: any): boolean {
    return tempContextComponents[category] && tempContextComponents[category].includes(componentId);
  }

  onCtxComponentsCheckboxChange_editing(componentId: number, category: string, dimension: any): void {
    if (!dimension.tempContextComponents[category]) {
      dimension.tempContextComponents[category] = [];
    }
    const index = dimension.tempContextComponents[category].indexOf(componentId);
    if (index === -1) {
      // Agregar el componente si no está seleccionado
      dimension.tempContextComponents[category].push(componentId);
    } else {
      // Eliminar el componente si ya está seleccionado
      dimension.tempContextComponents[category].splice(index, 1);
    }
  }

  saveFactorContextComponents(factor: any, dimensionId: number): void {
    const updatedFactor = {
      context_components: factor.tempContextComponents,
      dq_problems: factor.dq_problems, 
    };

    this.modelService.updateDQFactorCtxAndProblems(factor.id, updatedFactor).subscribe({
      next: () => {
        this.notificationService.showSuccess(`DQ Factor was successfully updated.`);
        this.loadDQModelDimensionsAndFactors();

        console.log("Componentes y problemas actualizados exitosamente en el factor.");
        factor.context_components = JSON.parse(JSON.stringify(factor.tempContextComponents));
        factor.isEditing = false;
      },
      error: (err) => {
        console.error("Error al actualizar el factor:", err);
        alert("Error updating factor context components and problems.");
      },
    });

  }

  saveDQDimensionChanges(dimension: any): void {
    const updatedDimension = {
      context_components: dimension.tempContextComponents,
      dq_problems: dimension.dq_problems, // Incluir los problemas seleccionados
    };
  
    this.modelService.updateDQDimensionCtxAndProblems(dimension.id, updatedDimension).subscribe({
      next: () => {
        console.log("Edicion Dim: Componentes y problemas actualizados exitosamente.");
        this.notificationService.showSuccess(`DQ Dimension was successfully updated.`);
        this.loadDQModelDimensionsAndFactors();

        dimension.context_components = JSON.parse(JSON.stringify(dimension.tempContextComponents));
        dimension.isEditing = false; // Deshabilitar la edición
      },
      error: (err) => {
        console.error("Error al actualizar la dimensión:", err);
        alert("Error updating dimension context components and problems.");
      },
    });
  }
  
  hasComponents(category: string, tempContextComponents: any): boolean {
    return tempContextComponents[category] && tempContextComponents[category].length > 0;
  }

  isProblemSelected(problemId: number, dqProblems: number[]): boolean {
    return dqProblems.includes(problemId);
  }

  onProblemCheckboxChange(problemId: number, dimension: any): void {
    const index = dimension.dq_problems.indexOf(problemId);

    if (index === -1) {
      // Agregar el problema si no está seleccionado
      dimension.dq_problems.push(problemId);
    } else {
      // Eliminar el problema si ya está seleccionado
      dimension.dq_problems.splice(index, 1);
    }
  }

  onProblemCheckboxChangeEditFactor(problemId: number, factor: any): void {
    const index = factor.dq_problems.indexOf(problemId);

    if (index === -1) {
      // Agregar el problema si no está seleccionado
      factor.dq_problems.push(problemId);
    } else {
      // Eliminar el problema si ya está seleccionado
      factor.dq_problems.splice(index, 1);
    }
  }

  openConfirmationModal(
    title: string,
    message: string,
    actionType: 'addToDQModel' | 'deleteDimension' | 'deleteFactor' | 'addDimensionToDQModel' | 'addFactorDQModel' | 'addDimAndFactorRecommendedToDQModel' | 'deleteDimensionBase' | 'deleteFactorBase' | 'ignoreSuggestedFactor', 
    ...params: any[]  
  ): void {
    this.confirmationModalTitle = title;
    this.confirmationModalMessage = message;

    if (actionType === 'addToDQModel') {
      const [selectedDimension, selectedFactor, ctxComponents, selectedProblems] = params;
      this.confirmedAction = () => {
        this.addToDQModel(selectedDimension, selectedFactor, ctxComponents, selectedProblems);
      };
    } else if (actionType === 'deleteDimension') {
      const [dimensionId] = params;
      this.confirmedAction = () => {
        this.deleteDimension(dimensionId);
      };
    } else if (actionType === 'deleteFactor') {
      const [factorId] = params;
      this.confirmedAction = () => {
        this.deleteFactor(factorId);
      };
    } else if (actionType === 'addDimensionToDQModel') {
      const [selectedDimension, ctxComponents, selectedProblems] = params;
      this.confirmedAction = () => {
        this.addDimToDQModel(selectedDimension, ctxComponents, selectedProblems);
      };
    } else if (actionType === 'addFactorDQModel') {
      const [selectedDQModelDimension, selectedFactor, ctxComponentsChecked_fromScratch, selectedProblemsFromScratch] = params;
      this.confirmedAction = () => {
        this.addDQFactorToDQModel(
          selectedDQModelDimension,
          selectedFactor,
          ctxComponentsChecked_fromScratch,
          selectedProblemsFromScratch
        );
      };
    } else if (actionType === 'addDimAndFactorRecommendedToDQModel') {
      const [ctxComponentsChecked_suggestion, selectedProblemsSuggestions] = params;
      this.confirmedAction = () => {
        this.addDQDimAndFactorToDQModel(
          ctxComponentsChecked_suggestion,
          selectedProblemsSuggestions
        );
      };
    } else if (actionType === 'deleteDimensionBase') {
      const [selectedDimension] = params;
      this.confirmedAction = () => {
        this.deleteDimensionBase(selectedDimension);
      };
    } else if (actionType === 'deleteFactorBase') {
      const [selectedFactor] = params;
      this.confirmedAction = () => {
        this.deleteFactorBase(selectedFactor);
      };
    } else if (actionType === 'ignoreSuggestedFactor') {
      this.confirmedAction = () => {
        this.ignoreSuggestedFactor();
      };
    }

    this.isConfirmationModalOpen = true;
  }

  clearSelections(): void {
    this.selectedDQModelDimension = null;
    this.selectedFactor = null;
    this.ctxComponentsChecked_fromScratch = [];
    this.selectedProblemsFromScratch = [];
    this.cdr.detectChanges();
  }

  handleConfirm(): void {
    if (this.confirmedAction) {
      this.confirmedAction(); 
    }
    this.isConfirmationModalOpen = false;
  }

  handleCancel(): void {
    this.isConfirmationModalOpen = false;
    this.confirmedAction = null;
  }

  loadDQModelDimensionsForSelection(): void {
    if (this.dqModelId) {
      this.modelService.getDimensionsByDQModel(this.dqModelId).subscribe({
        next: (dimensions) => {
          // Filtrar las dimensiones del DQ Model cuya Dim base no esté deshabilitada
          this.availableDQModelDimensions = dimensions.filter(dqModelDim => {
            const dimBase = this.dqDimensionsBase.find(base => base.id === dqModelDim.dimension_base);
            return dimBase && !dimBase.is_disabled;
          });
          
          this.availableDQModelDimensions = dimensions;
          console.log('Dimensiones en DQ Model', dimensions);
        },
        error: (err) => {
          console.error('Error loading DQ Model dimensions:', err);
          this.availableDQModelDimensions = [];
        }
      });
    } else {
      console.warn('dqModelId no está definido o es inválido');
    }
  }

  // Carga los factores base para una dimensión específica del DQ Model seleccionada
  loadFactorsForSelectedDimension(selectedDQModelDimensionId: number): void {
    this.availableFactors = [];
    this.selectedFactor = null;

    // Encontrar la dimensión seleccionada en las disponibles
    const selectedDimension = this.availableDQModelDimensions.find(
      dim => dim.id === selectedDQModelDimensionId
    );

    if (!selectedDimension) {
      console.warn('No se encontró la dimensión seleccionada');
      return;
    }

    //console.log(`Cargando factores base para dimensión base ID: ${selectedDimension.dimension_base}`);
    this.modelService.getFactorsBaseByDimensionId(selectedDimension.dimension_base).subscribe({
      next: (factors) => {
        // Filtrar removiendo los factores que tienen is_disabled = true
        const activeFactors = factors.filter(factor => !factor.is_disabled);

        // Asignar los factores activos a la variable availableFactors
        this.availableFactors = activeFactors;

        console.log(`Factores base cargados para dimensión ${selectedDimension.dimension_name}:`, factors);
      },
      error: (err) => {
        console.error(`Error cargando factores para dimensión base ${selectedDimension.dimension_base}:`, err);
        this.availableFactors = [];
      }
    });
  }



  // =============================================
  // AI SUGGESTIONS
  // =============================================

  generateDimensionFactorSuggestion(): void {
    this.isLoading = true;

    // Limpiar factores existentes en DQ Model y por configuración del usuario
    this.removeFactorsFromSuggestionsByUserConfig();
    const filteredDimFactorsOptions = removeExistingFactorsFromSuggestions(
      this.dimensionsWithFactorsInDQModel,
      this.dimensionsAndFactors //filtro previo segun preferencias usuario
    );

    const payload = {
      dimensions_and_factors: filteredDimFactorsOptions,
      dq_problems: convertProblemsToMap(this.selectedPrioritizedProblems),
      context_components: abbreviateContextComponents(this.allContextComponents)
    };
    console.log("Payload: ", payload)
  
    // Validar que haya dimensiones/factores disponibles después de filtros
    const hasSuggestionOptions = payload.dimensions_and_factors &&
      Object.keys(payload.dimensions_and_factors).some(
        key => Object.keys(payload.dimensions_and_factors[key].factors || {}).length > 0
      );

    if (!hasSuggestionOptions) {
      this.isLoading = false;
      this.notificationService.showWarning('No available Dimensions/Factors to suggest.');
      return;
    }

    this.modelService.generateDQDimensionFactorSuggestion(payload).subscribe({
      next: (response) => {
        //console.log('Sugerencia recibida:', response);
        // Convertir strings a int en supported_by_problems
        if (response.supported_by_problems && Array.isArray(response.supported_by_problems)) {
          response.supported_by_problems = response.supported_by_problems.map((problem: any) => {
            if (typeof problem === 'string' && !isNaN(Number(problem))) {
              return Number(problem);
            }
            return problem;
          });
        }

        if (response.supported_by_context) {
          const supported_by_ctxComponents_abbr = response.supported_by_context
          const supported_by_ctxComponents = renameContextComponentCategories(supported_by_ctxComponents_abbr);

          // Marcar los checkboxes correspondientes a los componentes y problemas utilizados
          //this.markCtxComponentsFromSuggestion(supported_by_ctxComponents);
          this.ctxComponentsChecked_suggestion = getCheckedCtxComponentsFromSuggestion(
            supported_by_ctxComponents,
            this.allContextComponents
          );

          const supported_by_problems = response.supported_by_problems;
          //this.markDQProblemsFromSuggestion(response.supported_by_problems);
          this.selectedProblemsSuggestions = getCheckedDQProblemsFromSuggestion(
            supported_by_problems,
            this.selectedPrioritizedProblems
          );
          
        }

        this.dimAndFactorSuggested = response;

        const suggestedDQDimensionName = response.recommended_dimension;
        const suggestedDQFactorName = response.recommended_factor;

        const suggestedDimensionObj = this.dqDimensionsBase.find(dim => dim.name === suggestedDQDimensionName);
        const suggestedFactorObj = this.dqFactorsBase.find(factor => factor.name === suggestedDQFactorName);

        this.suggestedDQDimensionBase = suggestedDimensionObj;
        this.suggestedDQFactorBase = suggestedFactorObj;

        this.generatedSuggestion = response;
        console.log("Generated Suggestion", this.generatedSuggestion);

        this.isLoading = false;

      },
      error: (err) => {
        console.error('Error al generar sugerencia:', err);
        this.isLoading = false;
      }
    });
  }
  
  removeFactorsFromSuggestionsByUserConfig(): void {
    const exclusionMap: { [key: string]: boolean } = {
      Accuracy: this.suggestionConfig.excludeAccuracy,
      Completeness: this.suggestionConfig.excludeCompleteness,
      Consistency: this.suggestionConfig.excludeConsistency,
      Uniqueness: this.suggestionConfig.excludeUniqueness,
      Freshness: this.suggestionConfig.excludeFreshness
    };    
  
    for (const dimensionName in exclusionMap) {
      if (exclusionMap[dimensionName] && this.dimensionsAndFactors[dimensionName]) {
        console.log(`Usuario excluyó '${dimensionName}'.`);
        this.dimensionsAndFactors[dimensionName].factors = {};
        delete this.dimensionsAndFactors[dimensionName];
      }
    }
  }

  openSuggestionConfigModal(): void {
    this.isSuggestionConfigModalOpen = true;
  }

  closeSuggestionConfigModal(): void {
    this.isSuggestionConfigModalOpen = false;
  }

  generateSuggestionWithConfig(): void {
    this.closeSuggestionConfigModal();
    console.log('Generating suggestion with config:', this.suggestionConfig);
    this.generateDimensionFactorSuggestion();
  }


  //Remover de futuras sugerencias un Factor sugerido no deseado
  ignoreSuggestedFactor(): void {
    const suggestedFactor = this.getSuggestedFactor();
    const suggestedDimension = this.getSuggestedDimension();
    if (!suggestedDimension || !suggestedFactor) return;

    const suggestedFactorName = suggestedFactor.name;
    const suggestedDimensionName = suggestedDimension.name;

    if (this.dimensionsAndFactors[suggestedDimensionName] && this.dimensionsAndFactors[suggestedDimensionName].factors[suggestedFactorName]) {

      // Eliminar el factor de la dimensión
      delete this.dimensionsAndFactors[suggestedDimensionName].factors[suggestedFactorName];

      // Si la dimensión ya no tiene factores, también se elimina
      const hasRemainingFactors = Object.keys(this.dimensionsAndFactors[suggestedDimensionName].factors).length > 0;
      if (!hasRemainingFactors) {
        delete this.dimensionsAndFactors[suggestedDimensionName];
      }
      
      // Resetear el factor sugerido
      this.suggestedDQFactorBase = null;
    }
  }


  // VISTA: Componentes de Contexto Asociados
  // Guarda el estado expandido por categoría de componente de contexto para cada elemento del modelo
  ctxCategoryStates: { [elementId: string]: { [category: string]: boolean } } = {};

  toggleCategory(elementId: string, category: string): void {
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

  // Navegación
  onStepChange(step: number) {
    this.currentStep = step;
    this.navigateToStep(step);
  }
  
  navigateToStep(stepIndex: number) {
    const route = this.steps[stepIndex].route;
    this.router.navigate([route]);
  }

}