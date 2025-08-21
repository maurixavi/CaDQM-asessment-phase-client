import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError, forkJoin, BehaviorSubject } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

interface DQModel {
  version: string;
  status: string | null;
  model_dimensions: any[];
  model_factors: any[];
  model_metrics: any[];
  model_methods: any[];
  measurement_methods: any[];
  aggregation_methods: any[];
  previous_version: number | null;
}


// Define la interfaz para el contexto
interface Context {
  id: number;
  application_domains: any[];
  business_rules: any[];
  user_types: any[];
  tasks_at_hand: any[];
  dq_requirements: any[];
  data_filtering: any[];
  system_requirements: any[];
  dq_metadata: any[];
  other_metadata: any[];
  other_data: any[];
  version: string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class DqModelService {

  private readonly baseUrl = "http://localhost:8000/api"


  // Método para obtener el DQModel completo con todas sus relaciones
  getFullDQModel(dqModelId: number): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqModelId}/full/`; // URL del endpoint
    return this.http.get<any>(url).pipe(
      catchError(err => {
        console.error(`Error al obtener el DQModel completo ${dqModelId}:`, err);
        throw err;
      })
    );
  }



  getSelectedPrioritizedDqProblems(dqModelId: number): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqModelId}/selected-prioritized-dq-problems/`;
    return this.http.get(url);
  }


  readonly API_URL_PRIORITIZED_DQ_PROBLEMS = `${this.baseUrl}/prioritized-dq-problems/`;

 // Método para crear problemas priorizados
  createPrioritizedProblems(dqProblems: any[], dqModelId: number): Observable<any> {
    const prioritizedProblems = dqProblems.map(problem => ({
      dq_model: dqModelId,
      description: problem.description,
      date: new Date(problem.date * 1000).toISOString() 
    }));

    return this.http.post(this.API_URL_PRIORITIZED_DQ_PROBLEMS, prioritizedProblems);
  }

  // obtener problemas priorizados del DQ Model
  // url: http://localhost:8000/api/dqmodels/${dqModelId}/prioritized-dq-problems/
  getPrioritizedDqProblems(dqModelId: number): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqModelId}/prioritized-dq-problems/`;
    return this.http.get(url);
  }


  updatePrioritizedProblem(dqModelId: number, problemId: number, updatedData: any) {
    const url = `${this.API_URL_DQMODELS}${dqModelId}/prioritized-dq-problems/${problemId}/`;
    return this.http.put(url, updatedData);
  }

  updatePrioritizedProblemAttribute(dqModelId: number, problemId: number, updatedData: any) {
    const url = `${this.API_URL_DQMODELS}${dqModelId}/prioritized-dq-problems/${problemId}/`;
    return this.http.patch(url, updatedData); // Usa PATCH en lugar de PUT
  }


  


  readonly API_URL_METHODS_BASE_GENERATION = `${this.baseUrl}/generate-dqmethod-suggestion/`;
  readonly API_URL_DIM_FACTOR_GENERATION = `${this.baseUrl}/generate-dq-dimension-factor-suggestion/`;

  //API ENDPOINT PROJECTS
  readonly API_URL_PROJECTS = `${this.baseUrl}/projects/`;

  //API ENDPOINTS DIMENSIONS, FACTORS, METRICS, METHODS BASE
  readonly API_URL_DIMENSIONS_BASE = `${this.baseUrl}/dimensions-base/`;
  readonly API_URL_FACTORS_BASE = `${this.baseUrl}/factors-base/`;
  readonly API_URL_METRICS_BASE = `${this.baseUrl}/metrics-base/`;
  readonly API_URL_METHODS_BASE = `${this.baseUrl}/methods-base/`;

  //API ENDPOINTS DQ MODEL
  readonly API_URL_DQMODELS = `${this.baseUrl}/dqmodels/`;  //"http://localhost:8000/api/dqmodels/"
  readonly API_URL_DIMENSIONS_DQMODEL = `${this.baseUrl}/dimensions/`; //"http://localhost:8000/api/dimensions/"
  readonly API_URL_FACTORS_DQMODEL = `${this.baseUrl}/factors/`; //"http://localhost:8000/api/factors/"
  readonly API_URL_METRICS_DQMODEL = `${this.baseUrl}/metrics/`; //"http://localhost:8000/api/metrics/"
  readonly API_URL_METHODS_DQMODEL = `${this.baseUrl}/methods/`; //"http://localhost:8000/api/methods/"
  readonly API_URL_AG_METHODS_DQMODEL = `${this.baseUrl}/aggregation-methods/`; //"http://localhost:8000/api/aggregation-methods/"
  readonly API_URL_ME_METHODS_DQMODEL = `${this.baseUrl}/measurement-methods/`; //"http://localhost:8000/api/measurement-methods/"
  // http://localhost:8000/api/dqmodels/1/dimensions/6/factors/52/metrics/3/methods/


  //CONTEXT
  readonly API_URL_CTX = "http://localhost:8000/api/context-model/"

  //ENDPOINTS JSON ASSETS
  private basePath = "/assets/test"; 
  readonly API_PATH_CONTEXT2 = "/assets/ctx_components.json"
  readonly API_PATH_CONTEXT = "assets/test/ctx_components.json"
  

  //dqmodels: any[];
  dimensions: any[];
  factors: any[];
  metrics: any[];
  methods: any[];
  
  ctx_components: any[];

  constructor(private http: HttpClient) {

    //this.dqmodels = [];
    this.dimensions = [];
    this.factors = [];
    this.metrics = [];
    this.methods = [];
    
    this.ctx_components = [];
  }

  createDQMethodBase(method: { name: string; inputDataType: string; outputDataType: string; algorithm: string; implements: number  }): Observable<any> {
    return this.http.post<any>(this.API_URL_METHODS_BASE, method).pipe(
      catchError(err => {
        console.error('Error al crear el DQ Method:', err);
        throw err; // Re-lanzar el error para que pueda ser manejado en el componente
      })
    );
  }

  // Método para generar la sugerencia de DQMethod
  generateDQMethodSuggestion(dqMetricData: any): Observable<any> {
    return this.http.post<any>(this.API_URL_METHODS_BASE_GENERATION, dqMetricData).pipe(
      catchError(err => {
        console.error('Error al generar la sugerencia de DQMethod:', err);
        return throwError(() => err);
      })
    );
  }

  // Método para generar la sugerencia de dimensión y factor de calidad
  generateDQDimensionFactorSuggestion(data: {
    dimensions_and_factors: any;
    dq_problems: any;
    context_components: any;
  }): Observable<any> {
    const url = `${this.API_URL_DIM_FACTOR_GENERATION}`;

    return this.http.post<any>(url, data).pipe(
      catchError(err => {
        console.error('Error al generar la sugerencia de dimension y factor:', err);
        return throwError(() => err);
      })
    );
  }



  //Manejo de errores
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      return of(result as T);
    };
  }


  //DQ MODELS
  private currentDQModel: any | null = null;

  // Obtiene (desde cache o servidor) el DQ Model actual dado el currentProject
  getCurrentDQModel(dqModelId: number): Observable<any> {
    // Si el modelo está en caché y es el mismo ID, lo devolvemos
    if (this.currentDQModel && this.currentDQModel.id === dqModelId) {
      console.log('Fetched DQ Model (already in cache):', this.currentDQModel);
      return of(this.currentDQModel);
    }

    // Si no está en caché o es un ID diferente, hacemos la petición
    return this.http.get<any>(`${this.API_URL_DQMODELS}${dqModelId}/`).pipe(
      map((data) => {
        this.currentDQModel = data; // Actualizamos el caché
        console.log('Fetched DQ Model (from server):', this.currentDQModel);
        return data;
      }),
      catchError((err) => {
        console.error(`Error al obtener DQ Model ${dqModelId}:`, err);
        throw err;
      })
    );
  }

  getDQModel(dqmodelId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL_DQMODELS}${dqmodelId}/`).pipe( 
      catchError(err => {
        console.error(`Error al obtener DQ Model ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  //Update DQ Model 
  updateDQModel(dqmodelId: number, updatedData: any): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/`;
    return this.http.put<any>(url, updatedData).pipe(
      catchError(err => {
        console.error(`Error al actualizar el DQ Model ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  // BehaviorSubject solo para notificar cambios de estado
  private dqModelStatusSubject = new BehaviorSubject<{id: number, status: string} | null>(null);
  public dqModelStatus$ = this.dqModelStatusSubject.asObservable();

  // Método para finalizar un DQ Model (MODIFICADO)
  finishDQModel(dqmodelId: number): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/`;
    const updatedData = { status: 'finished' }; 

    return this.http.patch<any>(url, updatedData).pipe(
      tap(updatedModel => {
        // Actualizar el caché local
        this.currentDQModel = updatedModel;
        
        // Notificar el cambio de estado a los suscriptores
        this.dqModelStatusSubject.next({
          id: updatedModel.id,
          status: updatedModel.status
        });
      }),
      catchError((err) => {
        console.error(`Error al finalizar el DQ Model ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  // Método para finalizar un DQ Model
  finishDQModel0(dqmodelId: number): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/`;
    const updatedData = { status: 'finished' }; 

    return this.http.patch<any>(url, updatedData).pipe(
      catchError((err) => {
        console.error(`Error al finalizar el DQ Model ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Obtiene la versión siguiente (next version) de un DQModel dado su ID.
   * @param dqModelId ID del DQModel original.
   * @returns Observable con la siguiente versión del modelo (si existe).
   */
  getNextDQModelVersion(dqModelId: number): Observable<any | null> {
    const url = `${this.baseUrl}/dqmodels/${dqModelId}/next-version/`;
    return this.http.get<any>(url).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          return of(null);
        }
        console.error('Error inesperado al obtener la siguiente versión:', error);
        return of(null);
      })
    );
  }
  
  


  getAllDQModels(): Observable<any[]> {
    return this.http.get<any[]>(this.API_URL_DQMODELS).pipe(
      tap(data => console.log('Fetched DQ Models:', data)),
      catchError(this.handleError<any[]>('getAllDQModels', []))
    );
  }


  createDQModel(dqModelData: DQModel): Observable<any> {
    return this.http.post<any>(this.API_URL_DQMODELS, dqModelData).pipe(
      catchError(err => {
        console.error('Error al crear el DQ Model:', err);
        throw err;
      })
    );
  }

  

  //DIMENSIONS DQ MODEL
  getDimensionsByDQModel(dqmodelId: number): Observable<any[]> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/dimensions/`;
    return this.http.get<any[]>(url).pipe(
      catchError(err => {
        if (err.status === 404) {
          // Si el error es 404, devolvemos un array vacío
          console.warn(`No se encontraron dimensiones para el DQ Model ${dqmodelId}.`);
          return of([]);  // `of([])` crea un Observable que emite un array vacío
        }
        console.error(`Error al obtener Dimensiones del DQ Model ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  //FACTORS
  getFactorsByDQModel(dqmodelId: number): Observable<any[]> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/factors/`;
    return this.http.get<any[]>(url).pipe(
      catchError(err => {
        if (err.status === 404) {
          console.warn(`DQ Factors not found in DQ Model ${dqmodelId}.`);
          return of([]);  // `of([])` crea un Observable que emite un array vacío
        }
        console.error(`Error al obtener Factores del DQ Model ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  getMetricsByDQModel_(dqmodelId: number): Observable<any[]> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/metrics/`;
    return this.http.get<any[]>(url).pipe(
      catchError(err => {
        if (err.status === 404) {
          console.warn(`DQ Metrics not found in DQ Model ${dqmodelId}.`);
          return of([]);  // `of([])` crea un Observable que emite un array vacío
        }
        console.error(`Error al obtener Metrics del DQ Model ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  getMetricsByDQModel(dqmodelId: number): Observable<any[]> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/metrics/`;

    return this.http.get<any[]>(url).pipe(
      tap(response => {
        console.log('DQ Metrics fetched', response); 
      }),
      catchError(err => {
        console.error(`Error in getMetricsByDQModel for ID ${dqmodelId}:`, err); // Diagnóstico 4
        if (err.status === 404) {
          console.warn(`DQ Metrics not found in DQ Model ${dqmodelId}.`);
          return of([]);
        }
        throw err;
      })
    );
  }

  getMethodsByDQModel(dqmodelId: number): Observable<any[]> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/methods/`;
    return this.http.get<any[]>(url).pipe(
      catchError(err => {
        if (err.status === 404) {
          console.warn(`DQ Methods not found in DQ Model ${dqmodelId}.`);
          return of([]);  // `of([])` crea un Observable que emite un array vacío
        }
        console.error(`Error al obtener Methods del DQ Model ${dqmodelId}:`, err);
        throw err;
      })
    );
  }


  getDQDimensionDetails(dqmodelId: number, dimensionId: number): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/dimensions/${dimensionId}`;
    return this.http.get<any>(url);
  }

  /*getDimensionsByDQModel2(dqmodelId: number): Observable<any[]> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/dimensions/`;
    console.log("DqModels/Dimensions - Accediendo a la URL:", url);
    return this.http.get<any[]>(`${this.API_URL_DQMODELS}${dqmodelId}/dimensions/`).pipe(
      catchError(err => {
        console.error(`Error al obtener Dimensiones del DQ Model ${dqmodelId}:`, err);
        throw err;
      })
    );
  }*/

  addDimensionToDQModel(dimensionData: { dimension_base: number; context_components: any[], dq_problems: number[]  }): Observable<any> {
    return this.http.post<any>(this.API_URL_DIMENSIONS_DQMODEL, dimensionData).pipe(
      catchError(err => {
        console.error('Error al agregar la dimensión:', err);
        throw err; // Re-lanzar el error para que pueda ser manejado en el componente
      })
    );
  }

  deleteDimensionFromDQModel(dimensionId: number): Observable<any> {
    return this.http.delete<any>(`${this. API_URL_DIMENSIONS_DQMODEL}${dimensionId}/`)
  }

  //readonly API_URL_DIMENSIONS_DQMODEL = `${this.baseUrl}/dimensions/`; //"http://localhost:8000/api/dimensions/"
  updateDQDimensionCtxAndProblems(dimensionId: number, updatedData: any): Observable<any> {
    //Only Ctx componentes and DQ Problems are editable
    const url = `${this.API_URL_DIMENSIONS_DQMODEL}${dimensionId}/`;
    return this.http.patch<any>(url, updatedData);
  }

  updateDQFactor(dqmodelId: number, dimensionId: number, factorId: number, updatedData: any): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/dimensions/${dimensionId}/factors/${factorId}/`;
    return this.http.patch<any>(url, updatedData);
  }

  updateDQFactorCtxAndProblems(factorId: number, updatedData: any): Observable<any> {
    //Only Ctx componentes and DQ Problems are editable
    const url = `${this.API_URL_FACTORS_DQMODEL}${factorId}/`;
    return this.http.patch<any>(url, updatedData);
  }

  updateDQMetricCtx(metricId: number, updatedData: any): Observable<any> {
    //Only Ctx componentes are editable
    const url = `${this.API_URL_METRICS_DQMODEL}${metricId}/`;
    return this.http.patch<any>(url, updatedData);
  }

  updateDQMethodCtx(methodId: number, updatedData: any): Observable<any> {
    //Only Ctx componentes are editable
    const url = `${this.API_URL_METHODS_DQMODEL}${methodId}/`;
    return this.http.patch<any>(url, updatedData);
  }

  updateMeasurementAppliedMethod(id: number, updatedData: any): Observable<any> {
    const url = `${this.API_URL_ME_METHODS_DQMODEL}${id}/`;  
    return this.http.patch<any>(url, updatedData);
  }
  
  updateAggregationAppliedMethod(id: number, updatedData: any): Observable<any> {
    const url = `${this.API_URL_AG_METHODS_DQMODEL}${id}/`;  
    return this.http.patch<any>(url, updatedData);
  }
  
  


  //FACTORS DQ MODEL
  //obtener Factores asociados a una Dimension dada en DQ Model especifico
  getFactorsByDQModelAndDimension(dqmodelId: number, dimensionId: number): Observable<any[]> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/dimensions/${dimensionId}/factors/`;
    return this.http.get<any[]>(url).pipe(
      catchError(err => {
        console.error(`Error al obtener factores para DQModel ${dqmodelId} y Dimension ${dimensionId}:`, err);
        throw err;
      })
    );
  }

  addFactorToDQModel(factorData: { factor_base: number; dimension: number }): Observable<any> {
    return this.http.post<any>(this.API_URL_FACTORS_DQMODEL, factorData).pipe(
      catchError(err => {
        console.error('Error al agregar el factor:', err);
        throw err; // Re-lanzar el error para que pueda ser manejado en el componente
      })
    );
  }

  deleteFactorFromDQModel(factorId: number): Observable<any> {
    return this.http.delete<any>(`${this. API_URL_FACTORS_DQMODEL}${factorId}/`)
  }

  
  //DIMENSIONS BASE
  /*getDQDimensionsBase(): Observable<any> {
    return this.http.get<any[]>(this.API_URL_DIMENSIONS_BASE);
  }*/
  getAllDQDimensionsBase(): Observable<any[]> {
    return this.http.get<any[]>(this.API_URL_DIMENSIONS_BASE).pipe(
      tap(data => console.log('Fetched DQ Dimensions Base:', data)),
      catchError(this.handleError<any[]>('getAllDQDimensionsBase', []))
    );
  }

  getDQDimensionBaseById(dimensionBaseId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL_DIMENSIONS_BASE}${dimensionBaseId}/`);
  }
  
  createDQDimension(dimension: { name: string; semantic: string }): Observable<any> {
    return this.http.post<any>(this.API_URL_DIMENSIONS_BASE, dimension).pipe(
      catchError(err => {
        console.error('Error al crear la dimensión:', err);
        throw err; // Re-lanzar el error para que pueda ser manejado en el componente
      })
    );
  }

  updateDQDimensionBaseDisabledStatus(dimensionBaseId: number, isDisabled: boolean): Observable<any> {
    const url = `${this.API_URL_DIMENSIONS_BASE}${dimensionBaseId}/`;
    const payload = { is_disabled: isDisabled };

    return this.http.patch<any>(url, payload).pipe(
      catchError(err => {
        console.error(`Error updating is_disabled for DQ Dimension Base ${dimensionBaseId}:`, err);
        throw err;
      })
    );
  }
  


  //FACTORS BASE
  updateDQFactorBaseDisabledStatus(factorBaseId: number, isDisabled: boolean): Observable<any> {
    const url = `${this.API_URL_FACTORS_BASE}${factorBaseId}/`;
    const payload = { is_disabled: isDisabled };

    return this.http.patch<any>(url, payload).pipe(
      catchError(err => {
        console.error(`Error updating is_disabled for DQ Factor Base ${factorBaseId}:`, err);
        throw err;
      })
    );
  }

  /*getDQFactorsBase(): Observable<any> {
    return this.http.get<any[]>(this.API_URL_FACTORS_BASE);
  }*/
  getAllDQFactorsBase(): Observable<any[]> {
    return this.http.get<any[]>(this.API_URL_FACTORS_BASE).pipe(
      catchError(this.handleError<any[]>('getAllDQFactorsBase', []))
    );
  }


  getFactorBaseById(factorBaseId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL_FACTORS_BASE}${factorBaseId}/`);
  }

  /*getFactorsBaseByDimensionId(dimensionId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL_DIMENSIONS_BASE}${dimensionId}/factors-base/`).pipe(
      catchError(err => {
        console.error(`Error al obtener factores para dimensionId ${dimensionId}:`, err);
        throw err;
      })
    );
  }*/
  getFactorsBaseByDimensionId(dimensionId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL_DIMENSIONS_BASE}${dimensionId}/factors-base/`).pipe(
      catchError(err => {
        return of([]); // No se encontraron factores para la dimension
      })
    );
  }

  createDQFactor(factor: { name: string; semantic: string }): Observable<any> {
    return this.http.post<any>(this.API_URL_FACTORS_BASE, factor).pipe(
      catchError(err => {
        console.error('Error al crear el factor:', err);
        throw err; // Re-lanzar el error para que pueda ser manejado en el componente
      })
    );
  }

  //METRICS DQ
  

  getMetricsByDQModelDimensionAndFactor(dqmodelId: number, dimensionId: number, factorId: number): Observable<any[]> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/dimensions/${dimensionId}/factors/${factorId}/metrics`;
    //console.log("Obteniendo factores de la dimensión:", url);
    return this.http.get<any[]>(url).pipe(
      catchError(err => {
        console.error(`Error al obtener metricas para DQModel ${dqmodelId}, Dimension ${dimensionId} y Factor ${factorId} :`, err);
        throw err;
      })
    );
  }

  addMetricToDQModel(metricData: { dq_model: number; metric_base: number; factor:number}): Observable<any> {
    return this.http.post<any>(this.API_URL_METRICS_DQMODEL, metricData).pipe(
      catchError(err => {
        console.error('Error al agregar el factor:', err);
        throw err; // Re-lanzar el error para que pueda ser manejado en el componente
      })
    );
  }
  deletMetricFromDQModel(metricId: number): Observable<any> {
    return this.http.delete<any>(`${this. API_URL_METRICS_DQMODEL}${metricId}/`)
  }

  //METHODS DQ

  getMethodsByDQModelDimensionFactorAndMetric(dqmodelId: number, dimensionId: number, factorId: number, metricId: number): Observable<any[]> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/dimensions/${dimensionId}/factors/${factorId}/metrics/${metricId}/methods`;
    //console.log("Obteniendo factores de la dimensión:", url);
    return this.http.get<any[]>(url).pipe(
      catchError(err => {
        console.error(`Error al obtener metricas para DQModel ${dqmodelId}, Dimension ${dimensionId}, Factor ${factorId} y Metrica ${metricId} :`, err);
        throw err;
      })
    );
  }

  addMethodsToDQModel(methodData: { method_base: number; dimension: number, factorId: number, metric: number }): Observable<any> {
    return this.http.post<any>(this.API_URL_METHODS_DQMODEL, methodData).pipe(
      catchError(err => {
        console.error('Error al agregar el metodo:', err);
        throw err; // Re-lanzar el error para que pueda ser manejado en el componente
      })
    );
  }
  deletMethodFromDQModel(methodId: number): Observable<any> {
    return this.http.delete<any>(`${this. API_URL_METHODS_DQMODEL}${methodId}/`)
  }

  

  //METRICS BASE
  updateDQMetricBaseDisabledStatus(metricBaseId: number, isDisabled: boolean): Observable<any> {
    const url = `${this.API_URL_METRICS_BASE}${metricBaseId}/`;
    const payload = { is_disabled: isDisabled };

    return this.http.patch<any>(url, payload).pipe(
      catchError(err => {
        console.error(`Error updating is_disabled for DQ Metric Base ${metricBaseId}:`, err);
        throw err;
      })
    );
  }

  getDQMetricsBase(): Observable<any> {
    return this.http.get<any[]>(this.API_URL_METRICS_BASE).pipe(
      tap(data => console.log('Fetched DQ Metrics Base:', data)),
      catchError(this.handleError<any[]>('getAllDMetricsBase', []))
    );
  }

  getDQMetricBaseById(metricBaseId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL_METRICS_BASE}${metricBaseId}/`);
  }

  getMetricsBaseByDimensionAndFactorId(dimensionId: number, factorId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL_DIMENSIONS_BASE}${dimensionId}/factors-base/${factorId}/metrics-base/`).pipe(
      catchError(err => {
        //console.error(`Error al obtener metricas para dimension ${dimensionId} y factor ${factorId}:`, err);
        throw err;
      })
    );
  }

  createDQMetric(metric: { name: string; purpose: string, granularity: string, resultDomain: string, measures: number }): Observable<any> {
    return this.http.post<any>(this.API_URL_METRICS_BASE, metric).pipe(
      catchError(err => {
        console.error('Error al crear el factor:', err);
        throw err; // Re-lanzar el error para que pueda ser manejado en el componente
      })
    );
  }




  //METHODS BASE
  updateDQMethodBaseDisabledStatus(methodBaseId: number, isDisabled: boolean): Observable<any> {
    const url = `${this.API_URL_METHODS_BASE}${methodBaseId}/`;
    const payload = { is_disabled: isDisabled };

    return this.http.patch<any>(url, payload).pipe(
      catchError(err => {
        console.error(`Error updating is_disabled for DQ Method Base ${methodBaseId}:`, err);
        throw err;
      })
    );
  }


  getDQMethodsBase(): Observable<any> {
    return this.http.get<any[]>(this.API_URL_METHODS_BASE);
  }

  getDQMethodBaseById(methodBaseId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL_METHODS_BASE}${methodBaseId}/`);
  }

  getMethodsBaseByDimensionFactorAndMetricId(dimensionId: number, factorId: number, metricId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL_DIMENSIONS_BASE}${dimensionId}/factors-base/${factorId}/metrics-base/${metricId}/methods-base/`).pipe(
      catchError(err => {
        console.error(`Error al obtener metodos para dimension ${dimensionId} , factor ${factorId} y metrica ${metricId}:`, err);
        throw err;
      })
    );
  }

  createDQMethod(method: { name: string; inputDataType: string, outputDataType: string, algorithm: string, implements: number }): Observable<any> {
    return this.http.post<any>(this.API_URL_METHODS_BASE, method).pipe(
      catchError(err => {
        console.error('Error al crear el factor:', err);
        throw err; // Re-lanzar el error para que pueda ser manejado en el componente
      })
    );
  }

  createAggregatedMethod(agMeth: {name: string, appliedTo: string, associatedTo: number}){
    return this.http.post<any>(this.API_URL_AG_METHODS_DQMODEL, agMeth).pipe(
      catchError(err => {
        console.error('Error al crear el factor:', err);
        throw err; // Re-lanzar el error para que pueda ser manejado en el componente
      })
    );
  }

  createMeasurementMethod(agMeth: {name: string, appliedTo: string, associatedTo: number}){
    return this.http.post<any>(this.API_URL_ME_METHODS_DQMODEL, agMeth).pipe(
      catchError(err => {
        console.error('Error al crear el factor:', err);
        throw err; // Re-lanzar el error para que pueda ser manejado en el componente
      })
    );
  }

  deleteAggregatedMethod(agMeth: number){
    return this.http.delete<any>(`${this. API_URL_AG_METHODS_DQMODEL}${agMeth}/`)
  }

  deleteMeasurementdMethod(agMeth: number){
    return this.http.delete<any>(`${this. API_URL_ME_METHODS_DQMODEL}${agMeth}/`)
  }

  





  getDimensionBaseDetails(dimensionBaseId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL_DIMENSIONS_BASE}${dimensionBaseId}/`);
  }

  getFactorBaseDetails(factorBaseId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL_FACTORS_BASE}${factorBaseId}/`);
  }

  getMetricBaseDetails(metricBaseId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL_METRICS_BASE}${metricBaseId}/`);
  }
  getMethodBaseDetails(methodBaseId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL_METHODS_BASE}${methodBaseId}/`);
  }

  // Obtener detalles de un measurement
  getMeasurementAppliedMethodDetails(measurementId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL_ME_METHODS_DQMODEL}${measurementId}/`);
  }

  // Obtener detalles de una aggregation
  getAggregationAppliedMethodDetails(aggregationId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL_AG_METHODS_DQMODEL}${aggregationId}/`);
  }


  getMethodsBaseByMetricBase(metricBaseId: number): Observable<any[]> {
    const url = `${this.API_URL_METRICS_BASE}${metricBaseId}/methods-base/`;
    return this.http.get<any[]>(url).pipe(
      catchError(err => {
        if (err.status === 404) {
          console.warn(`No base methods found for metric base ${metricBaseId}`);
          return of([]);
        }
        throw err;
      })
    );
  }

  //APPLIED DQ METHODS
  /*http://localhost:8000/api/measurement-methods/
  http://localhost:8000/api/aggregation-methods/*/

  // APPLIED DQ METHODS OPERATIONS

  /**
   * Fetches a specific applied DQ method by DQModel ID and Applied Method ID.
   * @param dqmodelId - The ID of the DQModel.
   * @param appliedMethodId - The ID of the applied method.
   * @returns Observable with the applied method data.
   */
  getAppliedDQMethod(dqmodelId: number, appliedMethodId: number): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/applied-dq-methods/${appliedMethodId}/`;
    return this.http.get<any>(url).pipe(
      catchError(err => {
        console.error(`Error fetching applied DQ method ${appliedMethodId} for DQModel ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Creates a new applied DQ method for a specific DQModel.
   * @param dqmodelId - The ID of the DQModel.
   * @param methodData - The data for the new applied method.
   * @returns Observable with the created applied method data.
   */
  createAppliedDQMethod(dqmodelId: number, methodData: any): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/applied-dq-methods/`;
    return this.http.post<any>(url, methodData).pipe(
      catchError(err => {
        console.error(`Error creating applied DQ method for DQModel ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Updates a specific applied DQ method by DQModel ID and Applied Method ID.
   * @param dqmodelId - The ID of the DQModel.
   * @param appliedMethodId - The ID of the applied method.
   * @param updatedData - The data to update the applied method.
   * @returns Observable with the updated applied method data.
   */
  updateAppliedDQMethod(dqmodelId: number, appliedMethodId: number, updatedData: any): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/applied-dq-methods/${appliedMethodId}/`;
    return this.http.put<any>(url, updatedData).pipe(
      catchError(err => {
        console.error(`Error updating applied DQ method ${appliedMethodId} for DQModel ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Deletes a specific applied DQ method by DQModel ID and Applied Method ID.
   * @param dqmodelId - The ID of the DQModel.
   * @param appliedMethodId - The ID of the applied method.
   * @returns Observable with the deletion response.
   */
  deleteAppliedDQMethod(dqmodelId: number, appliedMethodId: number): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/applied-dq-methods/${appliedMethodId}/`;
    return this.http.delete<any>(url).pipe(
      catchError(err => {
        console.error(`Error deleting applied DQ method ${appliedMethodId} for DQModel ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Partially updates a specific applied DQ method by DQModel ID and Applied Method ID.
   * @param dqmodelId - The ID of the DQModel.
   * @param appliedMethodId - The ID of the applied method.
   * @param updatedData - The partial data to update the applied method.
   * @returns Observable with the updated applied method data.
   */
  patchAppliedDQMethod(dqmodelId: number, appliedMethodId: number, updatedData: any): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/applied-dq-methods/${appliedMethodId}/`;
    return this.http.patch<any>(url, updatedData).pipe(
      catchError(err => {
        console.error(`Error partially updating applied DQ method ${appliedMethodId} for DQModel ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Fetches all applied DQ methods for a specific DQModel.
   * @param dqmodelId - The ID of the DQModel.
   * @returns Observable with the list of applied methods.
   */
  getAllAppliedDQMethods(dqmodelId: number): Observable<any[]> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/applied-dq-methods/`;
    return this.http.get<any[]>(url).pipe(
      catchError(err => {
        console.error(`Error fetching applied DQ methods for DQModel ${dqmodelId}:`, err);
        throw err;
      })
    );
  }


  // Given a DQ Model: Dimensions, Factors, Metrics and Methods operations
  /**
 * Fetches a specific dimension by DQModel ID and Dimension ID.
 * @param dqmodelId - The ID of the DQModel.
 * @param dimensionId - The ID of the dimension.
 * @returns Observable with the dimension data.
 */
  getDimensionInDQModel(dqmodelId: number, dimensionId: number): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/dimensions/${dimensionId}/`;
    return this.http.get<any>(url).pipe(
      catchError(err => {
        console.error(`Error fetching dimension ${dimensionId} for DQModel ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Updates a specific dimension by DQModel ID and Dimension ID.
   * @param dqmodelId - The ID of the DQModel.
   * @param dimensionId - The ID of the dimension.
   * @param updatedData - The data to update the dimension.
   * @returns Observable with the updated dimension data.
   */
  updateDimensionInDQModel(dqmodelId: number, dimensionId: number, updatedData: any): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/dimensions/${dimensionId}/`;
    return this.http.put<any>(url, updatedData).pipe(
      catchError(err => {
        console.error(`Error updating dimension ${dimensionId} for DQModel ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Deletes a specific dimension by DQModel ID and Dimension ID.
   * @param dqmodelId - The ID of the DQModel.
   * @param dimensionId - The ID of the dimension.
   * @returns Observable with the deletion response.
   */
  deleteDimensionInDQModel(dqmodelId: number, dimensionId: number): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/dimensions/${dimensionId}/`;
    return this.http.delete<any>(url).pipe(
      catchError(err => {
        console.error(`Error deleting dimension ${dimensionId} for DQModel ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Partially updates a specific dimension by DQModel ID and Dimension ID.
   * @param dqmodelId - The ID of the DQModel.
   * @param dimensionId - The ID of the dimension.
   * @param updatedData - The partial data to update the dimension.
   * @returns Observable with the updated dimension data.
   */
  patchDimensionInDQModel(dqmodelId: number, dimensionId: number, updatedData: any): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/dimensions/${dimensionId}/`;
    return this.http.patch<any>(url, updatedData).pipe(
      catchError(err => {
        console.error(`Error partially updating dimension ${dimensionId} for DQModel ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

    /**
   * Fetches a specific factor by DQModel ID and Factor ID.
   * @param dqmodelId - The ID of the DQModel.
   * @param factorId - The ID of the factor.
   * @returns Observable with the factor data.
   */
  getFactorInDQModel(dqmodelId: number, factorId: number): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/factors/${factorId}/`;
    return this.http.get<any>(url).pipe(
      catchError(err => {
        console.error(`Error fetching factor ${factorId} for DQModel ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Updates a specific factor by DQModel ID and Factor ID.
   * @param dqmodelId - The ID of the DQModel.
   * @param factorId - The ID of the factor.
   * @param updatedData - The data to update the factor.
   * @returns Observable with the updated factor data.
   */
  updateFactorInDQModel(dqmodelId: number, factorId: number, updatedData: any): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/factors/${factorId}/`;
    return this.http.put<any>(url, updatedData).pipe(
      catchError(err => {
        console.error(`Error updating factor ${factorId} for DQModel ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Deletes a specific factor by DQModel ID and Factor ID.
   * @param dqmodelId - The ID of the DQModel.
   * @param factorId - The ID of the factor.
   * @returns Observable with the deletion response.
   */
  deleteFactorInDQModel(dqmodelId: number, factorId: number): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/factors/${factorId}/`;
    return this.http.delete<any>(url).pipe(
      catchError(err => {
        console.error(`Error deleting factor ${factorId} for DQModel ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Partially updates a specific factor by DQModel ID and Factor ID.
   * @param dqmodelId - The ID of the DQModel.
   * @param factorId - The ID of the factor.
   * @param updatedData - The partial data to update the factor.
   * @returns Observable with the updated factor data.
   */
  patchFactorInDQModel(dqmodelId: number, factorId: number, updatedData: any): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/factors/${factorId}/`;
    return this.http.patch<any>(url, updatedData).pipe(
      catchError(err => {
        console.error(`Error partially updating factor ${factorId} for DQModel ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  /**
 * Fetches a specific metric by DQModel ID and Metric ID.
 * @param dqmodelId - The ID of the DQModel.
 * @param metricId - The ID of the metric.
 * @returns Observable with the metric data.
 */
  getMetricInDQModel(dqmodelId: number, metricId: number): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/metrics/${metricId}/`;
    return this.http.get<any>(url).pipe(
      catchError(err => {
        console.error(`Error fetching metric ${metricId} for DQModel ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Updates a specific metric by DQModel ID and Metric ID.
   * @param dqmodelId - The ID of the DQModel.
   * @param metricId - The ID of the metric.
   * @param updatedData - The data to update the metric.
   * @returns Observable with the updated metric data.
   */
  updateMetricInDQModel(dqmodelId: number, metricId: number, updatedData: any): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/metrics/${metricId}/`;
    return this.http.put<any>(url, updatedData).pipe(
      catchError(err => {
        console.error(`Error updating metric ${metricId} for DQModel ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Deletes a specific metric by DQModel ID and Metric ID.
   * @param dqmodelId - The ID of the DQModel.
   * @param metricId - The ID of the metric.
   * @returns Observable with the deletion response.
   */
  deleteMetricInDQModel(dqmodelId: number, metricId: number): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/metrics/${metricId}/`;
    return this.http.delete<any>(url).pipe(
      catchError(err => {
        console.error(`Error deleting metric ${metricId} for DQModel ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Partially updates a specific metric by DQModel ID and Metric ID.
   * @param dqmodelId - The ID of the DQModel.
   * @param metricId - The ID of the metric.
   * @param updatedData - The partial data to update the metric.
   * @returns Observable with the updated metric data.
   */
  patchMetricInDQModel(dqmodelId: number, metricId: number, updatedData: any): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/metrics/${metricId}/`;
    return this.http.patch<any>(url, updatedData).pipe(
      catchError(err => {
        console.error(`Error partially updating metric ${metricId} for DQModel ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

    /**
   * Fetches a specific method by DQModel ID and Method ID.
   * @param dqmodelId - The ID of the DQModel.
   * @param methodId - The ID of the method.
   * @returns Observable with the method data.
   */
  getMethodInDQModel(dqmodelId: number, methodId: number): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/methods/${methodId}/`;
    return this.http.get<any>(url).pipe(
      catchError(err => {
        console.error(`Error fetching method ${methodId} for DQModel ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Updates a specific method by DQModel ID and Method ID.
   * @param dqmodelId - The ID of the DQModel.
   * @param methodId - The ID of the method.
   * @param updatedData - The data to update the method.
   * @returns Observable with the updated method data.
   */
   updateMethodInDQModel(dqmodelId: number, methodId: number, updatedData: any): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/methods/${methodId}/`;
    return this.http.put<any>(url, updatedData).pipe(
      catchError(err => {
        console.error(`Error updating method ${methodId} for DQModel ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Deletes a specific method by DQModel ID and Method ID.
   * @param dqmodelId - The ID of the DQModel.
   * @param methodId - The ID of the method.
   * @returns Observable with the deletion response.
   */
  deleteMethodInDQModel(dqmodelId: number, methodId: number): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/methods/${methodId}/`;
    return this.http.delete<any>(url).pipe(
      catchError(err => {
        console.error(`Error deleting method ${methodId} for DQModel ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Partially updates a specific method by DQModel ID and Method ID.
   * @param dqmodelId - The ID of the DQModel.
   * @param methodId - The ID of the method.
   * @param updatedData - The partial data to update the method.
   * @returns Observable with the updated method data.
   */
  patchMethodInDQModel(dqmodelId: number, methodId: number, updatedData: any): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/methods/${methodId}/`;
    return this.http.patch<any>(url, updatedData).pipe(
      catchError(err => {
        console.error(`Error partially updating method ${methodId} for DQModel ${dqmodelId}:`, err);
        throw err;
      })
    );
  }


  

  /**
   * Get the latest execution results for a DQ Model
   * @param dqModelId The ID of the DQ Model
   * @returns Observable with the latest execution results
   */
  getLatestExecutionResults(dqModelId: number): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqModelId}/latest-results/`;
    return this.http.get<any>(url).pipe(
      catchError(err => {
        console.error(`Error fetching latest execution results for DQ Model ${dqModelId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Get execution results for a specific DQ Model and execution ID
   * @param dqModelId The ID of the DQ Model
   * @param executionId The ID of the execution
   * @returns Observable with the execution results
   */
  getDQModelExecutionResults(dqModelId: number, executionId: string): Observable<any> {
    // Construimos la URL utilizando los parámetros de ID del modelo y ejecución
    const url = `${this.API_URL_DQMODELS}${dqModelId}/execution-results/${executionId}/`;

    // Realizamos la solicitud HTTP GET a la URL
    return this.http.get<any>(url).pipe(
      // Capturamos cualquier error y lo mostramos en la consola
      catchError(err => {
        console.error(`Error fetching execution results for DQ Model ${dqModelId} with execution ID ${executionId}:`, err);
        throw err;
      })
    );
  }


  /**
   * Get specific method execution result
   * @param dqModelId The ID of the DQ Model
   * @param appliedMethodId The ID of the applied method (measurement or aggregation)
   * @returns Observable with the method execution result
   */
  getMethodExecutionResult(dqModelId: number, appliedMethodId: number): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqModelId}/applied-dq-methods/${appliedMethodId}/execution-method-results/`;
    return this.http.get<any>(url).pipe(
      catchError(err => {
        console.error(`Error fetching execution result for method ${appliedMethodId} in DQ Model ${dqModelId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Get execution row results for a specific applied DQ method
   * @param dqModelId The ID of the DQ Model
   * @param appliedMethodId The ID of the applied method (measurement or aggregation)
   * @returns Observable with the row-level execution results
   */
  getMethodExecutionRowResults(dqModelId: number, appliedMethodId: number): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqModelId}/applied-dq-methods/${appliedMethodId}/execution-row-results/`;
    return this.http.get<any>(url).pipe(
      catchError(err => {
        console.error(`Error fetching execution row results for method ${appliedMethodId} in DQ Model ${dqModelId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Get execution column results for a specific applied DQ method
   * @param dqModelId The ID of the DQ Model
   * @param appliedMethodId The ID of the applied method (measurement or aggregation)
   * @returns Observable with the column-level execution results
   */
   getMethodExecutionColumnResults(dqModelId: number, appliedMethodId: number): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqModelId}/applied-dq-methods/${appliedMethodId}/execution-column-results/`;
    return this.http.get<any>(url).pipe(
      catchError(err => {
        console.error(`Error fetching execution column results for method ${appliedMethodId} in DQ Model ${dqModelId}:`, err);
        throw err;
      })
    );
  }


  getMethodExecutionResult0(dqModelId: number, appliedMethodId: number): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqModelId}/applied-dq-methods/${appliedMethodId}/execution-result/`;
    return this.http.get<any>(url).pipe(
      catchError(err => {
        console.error(`Error fetching execution result for method ${appliedMethodId} in DQ Model ${dqModelId}:`, err);
        throw err;
      })
    );
  }


  /**
   * Ejecuta el assessment para un método aplicado de un DQ Model
   * @param dqModelId El ID del DQ Model
   * @param appliedMethodId El ID del método aplicado
   * @returns Observable con el resultado del assessment
   */
  assessAppliedMethod(dqModelId: number, appliedMethodId: number): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqModelId}/applied-dq-methods/${appliedMethodId}/assess/`;
    return this.http.post<any>(url, {}).pipe(
      catchError(err => {
        console.error(`Error al ejecutar assessment para el método ${appliedMethodId} en DQ Model ${dqModelId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Ejecuta un solo método aplicado para un DQ Model
   * @param dqModelId El ID del DQ Model
   * @param appliedMethodId El ID del método aplicado
   * @returns Observable con el resultado de la ejecución
   */
  executeAppliedMethod(dqModelId: number, appliedMethodId: number, connConfig: any): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqModelId}/applied-dq-methods/${appliedMethodId}/execute/`;
    return this.http.post<any>(url, { connection_config: connConfig }).pipe(
      catchError(err => {
        console.error(`Error al ejecutar el método aplicado ${appliedMethodId} para el DQ Model ${dqModelId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Inicia una nueva ejecución
   * @param dqModelId ID del modelo
   * @returns Observable con el execution_id
   */
  startDQModelExecution(dqModelId: number): Observable<{ execution_id: string }> {
    return this.http.post<{ execution_id: string }>(
      `${this.API_URL_DQMODELS}${dqModelId}/start-dq-model-execution/`,
      {}
    ).pipe(
      catchError(error => {
        console.error('Error al crear ejecución:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Ejecuta múltiples métodos aplicados de manera concurrente para un DQ Model
   * @param dqModelId El ID del DQ Model
   * @param appliedMethodIds Un array con los IDs de los métodos aplicados
   * @returns Observable con los resultados de las ejecuciones
   */
  executeMultipleAppliedMethods(dqModelId: number, appliedMethodIds: number[], connConfig: any): Observable<any[]> {
    //array de observables para cada método aplicado
    const requests = appliedMethodIds.map(appliedMethodId =>
      this.executeAppliedMethod(dqModelId, appliedMethodId, connConfig)
    );

    //forkJoin para ejecutar todas las solicitudes concurrentemente
    return forkJoin(requests).pipe(
      catchError(err => {
        console.error('Error al ejecutar los métodos aplicados:', err);
        throw err;
      })
    );
  }


  
  /**
   * Updates assessment thresholds for a method execution result
   * @param dqModelId The ID of the DQ Model
   * @param methodId The ID of the applied method
   * @param resultId The ID of the execution result
   * @param thresholds Array of threshold definitions
   * @returns Observable with the response
   */
  updateAssessmentThresholds(
    dqModelId: number,
    methodId: number,
    resultId: number,
    thresholds: any[]
  ): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqModelId}/applied-dq-methods/${methodId}/execution-method-results/${resultId}/thresholds/`;
    
    return this.http.patch(url, { thresholds }).pipe(
      catchError(err => {
        console.error(`Error updating thresholds for result ${resultId}:`, err);
        throw err;
      })
    );
  }



  updateAssessmentThresholds0(dqModelId: number, methodId: number,  resultId: number, thresholds: any[]
  ): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqModelId}/applied-dq-methods/${methodId}/execution-result/${resultId}/thresholds/`;
    
    return this.http.patch(url, { thresholds }).pipe(
      catchError(err => {
        console.error(`Error updating thresholds for result ${resultId}:`, err);
        throw err;
      })
    );
  }


  /**
   * Get all measurement executions for a specific DQ Model
   * @param dqModelId The ID of the DQ Model
   * @returns Observable with the list of executions
   */
  getAllDQModelExecutions(dqModelId: number): Observable<any[]> {
    const url = `${this.API_URL_DQMODELS}${dqModelId}/measurement-executions/`;

    return this.http.get<any[]>(url).pipe(
      catchError(err => {
        console.error(`Error fetching executions for DQ Model ${dqModelId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Get a specific measurement execution for a DQ Model
   * @param dqModelId The ID of the DQ Model
   * @param executionId The UUID of the execution
   * @returns Observable with execution details
   */
  getSpecificDQModelExecution(dqModelId: number, executionId: string): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqModelId}/measurement-executions/${executionId}/`;

    return this.http.get<any>(url).pipe(
      catchError(err => {
        console.error(`Error fetching execution ${executionId} for DQ Model ${dqModelId}:`, err);
        throw err;
      })
    );
  }





  

}
