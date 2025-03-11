import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
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


  //Manejo de errores
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      return of(result as T);
    };
  }


  //DQ MODELS
  //private currentDQModel: DQModel | null = null; // Almacenamiento en caché del DQ Model actual
  //private currentDQModel: any = null; 
  private currentDQModel: any | null = null;

  // Obtiene (desde cache o servidor) el DQ Model actual dado el currentProject
  getCurrentDQModel(dqModelId: number): Observable<any> {
    // Si el modelo está en caché y es el mismo ID, lo devolvemos
    if (this.currentDQModel && this.currentDQModel.id === dqModelId) {
      console.log('Fetched DQ Model (already in cache):', this.currentDQModel);
      return of(this.currentDQModel);
    }

    // Si no está en caché o es un ID diferente, hacemos la petición
    return this.http.get<DQModel>(`${this.API_URL_DQMODELS}${dqModelId}/`).pipe(
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

  // Método para finalizar un DQ Model
  finishDQModel(dqmodelId: number): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/`;
    const updatedData = { status: 'finished' }; 

    return this.http.patch<any>(url, updatedData).pipe(
      catchError((err) => {
        console.error(`Error al finalizar el DQ Model ${dqmodelId}:`, err);
        throw err;
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

  // Obtiene cualquier DQ Model por id
  getDQModelById(dqmodelId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL_DQMODELS}${dqmodelId}/`).pipe(
      catchError(err => {
        console.error(`Error al obtener DQ Model ${dqmodelId}:`, err);
        throw err;
      })
    );
  } 


  //DIMENSIONS DQ MODEL
  getDimensionsByDQModel(dqmodelId: number): Observable<any[]> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/dimensions/`;
    //console.log("DqModels/Dimensions - Accediendo a la URL:", url);
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


  getDQDimensionDetails(dqmodelId: number, dimensionId: number): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/dimensions/${dimensionId}`;
    return this.http.get<any>(url);
  }

  getDimensionsByDQModel2(dqmodelId: number): Observable<any[]> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/dimensions/`;
    console.log("DqModels/Dimensions - Accediendo a la URL:", url);
    return this.http.get<any[]>(`${this.API_URL_DQMODELS}${dqmodelId}/dimensions/`).pipe(
      catchError(err => {
        console.error(`Error al obtener Dimensiones del DQ Model ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  addDimensionToDQModel(dimensionData: { dimension_base: number; context_components: any[], dq_problems: number[]  }): Observable<any> {
    console.log("Sending dimensionData to backend:", dimensionData); // Verificar el cuerpo de la solicitud
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
  updateDQDimensionContextComponents(dimensionId: number, updatedData: any): Observable<any> {
    const url = `${this.API_URL_DIMENSIONS_DQMODEL}${dimensionId}/`;
    return this.http.patch<any>(url, updatedData);
  }

  


  //FACTORS DQ MODEL
  //obtener Factores asociados a una Dimension dada en DQ Model especifico
  getFactorsByDQModelAndDimension(dqmodelId: number, dimensionId: number): Observable<any[]> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/dimensions/${dimensionId}/factors/`;
    //console.log("Obteniendo factores de la dimensión:", url);
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


  //FACTORS BASE
  /*getDQFactorsBase(): Observable<any> {
    return this.http.get<any[]>(this.API_URL_FACTORS_BASE);
  }*/
  getAllDQFactorsBase(): Observable<any[]> {
    return this.http.get<any[]>(this.API_URL_FACTORS_BASE).pipe(
      tap(data => console.log('Fetched DQ Factors Base:', data)),
      catchError(this.handleError<any[]>('getAllDQFactorsBase', []))
    );
  }


  getFactorBaseById(factorBaseId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL_FACTORS_BASE}${factorBaseId}/`);
  }

  getFactorsBaseByDimensionId(dimensionId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL_DIMENSIONS_BASE}${dimensionId}/factors-base/`).pipe(
      catchError(err => {
        console.error(`Error al obtener factores para dimensionId ${dimensionId}:`, err);
        throw err;
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
        console.error(`Error al obtener metricas para dimension ${dimensionId} y factor ${factorId}:`, err);
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

  



  //---- CONTEXT ------
  getContext(): Observable<any> {
    return this.http.get<any[]>(this.API_PATH_CONTEXT);
  }

  getContextComponents(): Observable<any> {
    console.log('Iniciando petición al JSON en:', this.API_PATH_CONTEXT);
    
    return this.http.get<any[]>(this.API_PATH_CONTEXT).pipe(
      tap(response => {
        console.log('Respuesta JSON recibida:', response);
        console.log('Estructura de la respuesta:', JSON.stringify(response, null, 2));
      }),
      catchError(error => {
        console.error('Error al cargar el JSON:', error);
        console.error('Mensaje de error:', error.message);
        console.error('Status:', error.status);
        return throwError(() => error);
      })
    );
  }

  getCtxComponents2(): Observable<any> {
    return this.http.get<any[]>(`${this.basePath}/ctx_components.json`);
  }

  getCtxComponents(): Observable<any> {
    return this.http.get<any[]>(this.API_URL_CTX);
  }

  getContextById(id: number): Observable<any> {
    return this.http.get<Context[]>(this.API_URL_CTX).pipe(
      map(data => data.find((item: Context) => item.id === id)),
      catchError(err => {
        console.error('Error:', err);
        throw err;
      })
    );
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
  getMeasurementDetails(measurementId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL_AG_METHODS_DQMODEL}${measurementId}/`);
  }

  // Obtener detalles de una aggregation
  getAggregationDetails(aggregationId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL_ME_METHODS_DQMODEL}${aggregationId}/`);
  }

  //APPLIED DQ METHODS
  /*http://localhost:8000/api/measurement-methods/
  http://localhost:8000/api/aggregation-methods/*/




}
