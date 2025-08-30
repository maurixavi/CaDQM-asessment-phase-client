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

@Injectable({
  providedIn: 'root'
})
export class DqModelService {
  // URLs base para los endpoints de la API
  private readonly baseUrl = "http://localhost:8000/api"

  // URLs para endpoints específicos
  readonly API_URL_PRIORITIZED_DQ_PROBLEMS = `${this.baseUrl}/prioritized-dq-problems/`;
  readonly API_URL_METHODS_BASE_GENERATION = `${this.baseUrl}/generate-dqmethod-suggestion/`;
  readonly API_URL_DIM_FACTOR_GENERATION = `${this.baseUrl}/generate-dq-dimension-factor-suggestion/`;
  readonly API_URL_PROJECTS = `${this.baseUrl}/projects/`;

  // URLs para entidades base
  readonly API_URL_DIMENSIONS_BASE = `${this.baseUrl}/dimensions-base/`;
  readonly API_URL_FACTORS_BASE = `${this.baseUrl}/factors-base/`;
  readonly API_URL_METRICS_BASE = `${this.baseUrl}/metrics-base/`;
  readonly API_URL_METHODS_BASE = `${this.baseUrl}/methods-base/`;

  // URLs para DQ Model y sus entidades
  readonly API_URL_DQMODELS = `${this.baseUrl}/dqmodels/`;
  readonly API_URL_DIMENSIONS_DQMODEL = `${this.baseUrl}/dimensions/`;
  readonly API_URL_FACTORS_DQMODEL = `${this.baseUrl}/factors/`;
  readonly API_URL_METRICS_DQMODEL = `${this.baseUrl}/metrics/`; 
  readonly API_URL_METHODS_DQMODEL = `${this.baseUrl}/methods/`; 
  readonly API_URL_AG_METHODS_DQMODEL = `${this.baseUrl}/aggregation-methods/`;
  readonly API_URL_ME_METHODS_DQMODEL = `${this.baseUrl}/measurement-methods/`; 

  // Almacenamiento en memoria para datos cacheados
  private currentDQModel: any | null = null;
  dimensions: any[];
  factors: any[];
  metrics: any[];
  methods: any[];
  ctx_components: any[];

  constructor(private http: HttpClient) {
    this.dimensions = [];
    this.factors = [];
    this.metrics = [];
    this.methods = [];
    this.ctx_components = [];
  }

  // =============================================
  // MANEJO DE ERRORES
  // =============================================

  /**
   * Maneja errores HTTP de manera genérica
   * @param operation - Nombre de la operación que falló
   * @param result - Valor opcional a devolver como resultado
   */
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      return of(result as T);
    };
  }
  
  // =============================================
  // DQ MODELS
  // =============================================

  /**
   * Obtiene todos los DQ Models
   */
  getAllDQModels(): Observable<any[]> {
    return this.http.get<any[]>(this.API_URL_DQMODELS).pipe(
      tap(data => console.log('Fetched DQ Models:', data)),
      catchError(this.handleError<any[]>('getAllDQModels', []))
    );
  }

  /**
   * Obtiene un DQ Model específico por ID
   * @param dqmodelId - ID del DQ Model a obtener
   */
  getDQModel(dqmodelId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL_DQMODELS}${dqmodelId}/`).pipe( 
      catchError(err => {
        console.error(`Error al obtener DQ Model ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Obtiene el DQ Model actual (usa caché si está disponible)
   * @param dqModelId - ID del DQ Model a obtener
   */
  getCurrentDQModel(dqModelId: number): Observable<any> {
    // Si el modelo está en caché y es el mismo ID, lo devuelve
    if (this.currentDQModel && this.currentDQModel.id === dqModelId) {
      console.log('Fetched DQ Model (already in cache):', this.currentDQModel);
      return of(this.currentDQModel);
    }

    // Si no está en caché o es un ID diferente, realiza petición
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

  /**
   * Crea un nuevo DQ Model
   * @param dqModelData - Datos del DQ Model a crear
   */
  createDQModel(dqModelData: DQModel): Observable<any> {
    return this.http.post<any>(this.API_URL_DQMODELS, dqModelData).pipe(
      catchError(err => {
        console.error('Error al crear el DQ Model:', err);
        throw err;
      })
    );
  }

  /**
   * Actualiza un DQ Model existente
   * @param dqmodelId - ID del DQ Model a actualizar
   * @param updatedData - Datos actualizados
   */
  updateDQModel(dqmodelId: number, updatedData: any): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/`;
    return this.http.put<any>(url, updatedData).pipe(
      catchError(err => {
        console.error(`Error al actualizar el DQ Model ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Finaliza un DQ Model cambiando su estado a 'finished'
   * @param dqmodelId - ID del DQ Model a finalizar
   */
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


  /**
   * Obtiene el DQ Model completo con todas sus relaciones
   * @param dqModelId - ID del DQ Model a obtener
   */
  getFullDQModel(dqModelId: number): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqModelId}/full/`; // URL del endpoint
    return this.http.get<any>(url).pipe(
      catchError(err => {
        console.error(`Error al obtener el DQModel completo ${dqModelId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Obtiene la siguiente versión de un DQ Model
   * @param dqModelId - ID del DQ Model original
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
  
  
  // =============================================
  // DIMENSIONES BASE
  // =============================================

  /**
   * Obtiene todas las dimensiones base
   */
  getAllDQDimensionsBase(): Observable<any[]> {
    return this.http.get<any[]>(this.API_URL_DIMENSIONS_BASE).pipe(
      tap(data => console.log('Fetched DQ Dimensions Base:', data)),
      catchError(this.handleError<any[]>('getAllDQDimensionsBase', []))
    );
  }

  /**
   * Obtiene una dimensión base por ID
   * @param dimensionBaseId - ID de la dimensión base
   */
  getDQDimensionBaseById(dimensionBaseId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL_DIMENSIONS_BASE}${dimensionBaseId}/`);
  }
  
  /**
   * Obtiene detalles de una dimensión base
   * @param dimensionBaseId - ID de la dimensión base
   */
  getDimensionBaseDetails(dimensionBaseId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL_DIMENSIONS_BASE}${dimensionBaseId}/`);
  }
  
  /**
   * Crea una dimensión base
   * @param dimension - Datos de la dimensión
   */
  createDQDimension(dimension: { name: string; semantic: string }): Observable<any> {
    return this.http.post<any>(this.API_URL_DIMENSIONS_BASE, dimension).pipe(
      catchError(err => {
        console.error('Error al crear la dimensión:', err);
        throw err;
      })
    );
  }

  /**
   * Actualiza el estado is_disabled de una dimensión base (borrado logico)
   * @param dimensionBaseId - ID de la dimensión base
   * @param isDisabled - Nuevo estado disabled
   */
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


  // =============================================
  // FACTORES BASE
  // =============================================

  /**
   * Obtiene todos los factores base
   */
  getAllDQFactorsBase(): Observable<any[]> {
    return this.http.get<any[]>(this.API_URL_FACTORS_BASE).pipe(
      catchError(this.handleError<any[]>('getAllDQFactorsBase', []))
    );
  }

  /**
   * Obtiene un factor base por ID
   * @param factorBaseId - ID del factor base
   */
  getFactorBaseById(factorBaseId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL_FACTORS_BASE}${factorBaseId}/`);
  }

  /**
   * Obtiene detalles de un factor base
   * @param factorBaseId - ID del factor base
   */
  getFactorBaseDetails(factorBaseId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL_FACTORS_BASE}${factorBaseId}/`);
  }

  /**
   * Crea un factor base
   * @param factor - Datos del factor
   */
  createDQFactor(factor: { name: string; semantic: string }): Observable<any> {
    return this.http.post<any>(this.API_URL_FACTORS_BASE, factor).pipe(
      catchError(err => {
        console.error('Error al crear el factor:', err);
        throw err;
      })
    );
  }

  /**
   * Actualiza el estado disabled de un factor base (borrado logico)
   * @param factorBaseId - ID del factor base
   * @param isDisabled - Nuevo estado disabled
   */
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

  /**
   * Obtiene factores base asociados a una dimensión
   * @param dimensionId - ID de la dimensión
   */
  getFactorsBaseByDimensionId(dimensionId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL_DIMENSIONS_BASE}${dimensionId}/factors-base/`).pipe(
      catchError(err => {
        return of([]); // No se encontraron factores para la dimension
      })
    );
  }

  
  // =============================================
  // METRICAS BASE
  // =============================================

  /**
   * Obtiene todas las métricas base
   */
  getDQMetricsBase(): Observable<any> {
    return this.http.get<any[]>(this.API_URL_METRICS_BASE).pipe(
      tap(data => console.log('Fetched DQ Metrics Base:', data)),
      catchError(this.handleError<any[]>('getAllDMetricsBase', []))
    );
  }

  /**
   * Obtiene una métrica base por ID
   * @param metricBaseId - ID de la métrica base
   */
  getDQMetricBaseById(metricBaseId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL_METRICS_BASE}${metricBaseId}/`);
  }

  /**
   * Obtiene detalles de una métrica base
   * @param metricBaseId - ID de la métrica base
   */
  getMetricBaseDetails(metricBaseId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL_METRICS_BASE}${metricBaseId}/`);
  }

  /**
   * Crea una métrica base
   * @param metric - Datos de la métrica
   */
  createDQMetric(metric: { name: string; purpose: string, granularity: string, resultDomain: string, measures: number }): Observable<any> {
    return this.http.post<any>(this.API_URL_METRICS_BASE, metric).pipe(
      catchError(err => {
        console.error('Error al crear el factor:', err);
        throw err; 
      })
    );
  }

  /**
   * Actualiza el estado disabled de una métrica base (borrado logico)
   * @param metricBaseId - ID de la métrica base
   * @param isDisabled - Nuevo estado disabled
   */
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

  /**
   * Obtiene métricas base asociadas a una dimensión y factor
   * @param dimensionId - ID de la dimensión
   * @param factorId - ID del factor
   */
  getMetricsBaseByDimensionAndFactorId(dimensionId: number, factorId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL_DIMENSIONS_BASE}${dimensionId}/factors-base/${factorId}/metrics-base/`).pipe(
      catchError(err => {
        //console.error(`Error al obtener metricas para dimension ${dimensionId} y factor ${factorId}:`, err);
        throw err;
      })
    );
  }


  // =============================================
  // METODOS BASE
  // =============================================

  /**
   * Obtiene todos los métodos base
   */
  getDQMethodsBase(): Observable<any> {
    return this.http.get<any[]>(this.API_URL_METHODS_BASE);
  }
  
  /**
   * Obtiene un método base por ID
   * @param methodBaseId - ID del método base
   */
  getDQMethodBaseById(methodBaseId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL_METHODS_BASE}${methodBaseId}/`);
  }

  /**
   * Obtiene detalles de un método base
   * @param methodBaseId - ID del método base
   */
  getMethodBaseDetails(methodBaseId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL_METHODS_BASE}${methodBaseId}/`);
  }

  /**
   * Crea un método base
   * @param method - Datos del método
   */
  createDQMethod(method: { name: string; inputDataType: string, outputDataType: string, algorithm: string, implements: number }): Observable<any> {
    return this.http.post<any>(this.API_URL_METHODS_BASE, method).pipe(
      catchError(err => {
        console.error('Error al crear el factor:', err);
        throw err;
      })
    );
  }

  createDQMethodBase(method: { name: string; inputDataType: string; outputDataType: string; algorithm: string; implements: number  }): Observable<any> {
    return this.http.post<any>(this.API_URL_METHODS_BASE, method).pipe(
      catchError(err => {
        console.error('Error al crear el DQ Method:', err);
        throw err; 
      })
    );
  }

  /**
   * Actualiza el estado disabled de un método base (borrado logico)
   * @param methodBaseId - ID del método base
   * @param isDisabled - Nuevo estado disabled
   */
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

  /**
   * Obtiene métodos base asociados a una dimensión, factor y métrica
   * @param dimensionId - ID de la dimensión
   * @param factorId - ID del factor
   * @param metricId - ID de la métrica
   */
  getMethodsBaseByDimensionFactorAndMetricId(dimensionId: number, factorId: number, metricId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL_DIMENSIONS_BASE}${dimensionId}/factors-base/${factorId}/metrics-base/${metricId}/methods-base/`).pipe(
      catchError(err => {
        console.error(`Error al obtener metodos para dimension ${dimensionId} , factor ${factorId} y metrica ${metricId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Obtiene métodos base asociados a una métrica base
   * @param metricBaseId - ID de la métrica base
   */
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


  // =============================================
  // DIMENSIONES DQ MODEL
  // =============================================

  /**
   * Obtiene todas las dimensiones asociadas a un DQ Model
   * @param dqmodelId - ID del DQ Model
   * @returns Observable con la lista de dimensiones
   */
  getDimensionsByDQModel(dqmodelId: number): Observable<any[]> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/dimensions/`;
    return this.http.get<any[]>(url).pipe(
      catchError(err => {
        if (err.status === 404) {
          // Si el error es 404, devolvemos un array vacío
          console.warn(`No se encontraron dimensiones para el DQ Model ${dqmodelId}.`);
          return of([]);  //observable que emite un array vacío
        }
        console.error(`Error al obtener Dimensiones del DQ Model ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Obtiene una dimensión específica de un DQModel
   * @param dqmodelId - ID del DQModel
   * @param dimensionId - ID de la dimensión
   * @returns Observable con los datos de la dimensión
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
   * Obtiene detalles específicos de una dimensión en un DQ Model
   * @param dqmodelId - ID del DQ Model
   * @param dimensionId - ID de la dimensión
   * @returns Observable con los detalles de la dimensión
   */
  getDQDimensionDetails(dqmodelId: number, dimensionId: number): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/dimensions/${dimensionId}`;
    return this.http.get<any>(url);
  }

  /**
   * Agrega una dimensión a un DQ Model
   * @param dimensionData - Datos de la dimensión a agregar
   */
  addDimensionToDQModel(dimensionData: { dimension_base: number; context_components: any[], dq_problems: number[]  }): Observable<any> {
    return this.http.post<any>(this.API_URL_DIMENSIONS_DQMODEL, dimensionData).pipe(
      catchError(err => {
        console.error('Error al agregar la dimensión:', err);
        throw err; // Re-lanzar el error para que pueda ser manejado en el componente
      })
    );
  }

  /**
   * Actualiza componentes de contexto y problemas de una dimensión
   * @param dimensionId - ID de la dimensión
   * @param updatedData - Datos actualizados
   */
  updateDQDimensionCtxAndProblems(dimensionId: number, updatedData: any): Observable<any> {
  const url = `${this.API_URL_DIMENSIONS_DQMODEL}${dimensionId}/`;
  return this.http.patch<any>(url, updatedData);
}

  /**
   * Actualiza una dimensión específica de un DQModel
   * @param dqmodelId - ID del DQModel
   * @param dimensionId - ID de la dimensión
   * @param updatedData - Datos actualizados de la dimensión
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
   * Actualiza parcialmente una dimensión específica de un DQModel
   * @param dqmodelId - ID del DQModel
   * @param dimensionId - ID de la dimensión
   * @param updatedData - Datos parciales para actualizar la dimensión
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
   * Elimina una dimensión específica de un DQModel
   * @param dqmodelId - ID del DQModel
   * @param dimensionId - ID de la dimensión a eliminar
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

  deleteDimensionFromDQModel(dimensionId: number): Observable<any> {
    return this.http.delete<any>(`${this. API_URL_DIMENSIONS_DQMODEL}${dimensionId}/`)
  }


  // =============================================
  // FACTORES DQ MODEL
  // =============================================

  /**
   * Obtiene factores asociados a un DQ Model
   * @param dqmodelId - ID del DQ Model
   */
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

  /**
   * Obtiene un factor específico por ID de DQModel e ID de Factor
   * @param dqmodelId - ID del DQModel
   * @param factorId - ID del factor
   * @returns Observable con los datos del factor
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
   * Agrega un nuevo factor a un DQ Model
   * @param factorData - Datos del factor a agregar
   */
  addFactorToDQModel(factorData: { factor_base: number; dimension: number }): Observable<any> {
    return this.http.post<any>(this.API_URL_FACTORS_DQMODEL, factorData).pipe(
      catchError(err => {
        console.error('Error al agregar el factor:', err);
        throw err; // Re-lanzar el error para que pueda ser manejado en el componente
      })
    );
  }

  /**
   * Actualiza componentes de contexto y problemas DQ de un factor
   * @param factorId - ID del factor
   * @param updatedData - Datos actualizados (solo componentes de contexto y problemas DQ editables)
   */
   updateDQFactorCtxAndProblems(factorId: number, updatedData: any): Observable<any> {
    const url = `${this.API_URL_FACTORS_DQMODEL}${factorId}/`;
    return this.http.patch<any>(url, updatedData);
  }

  /**
   * Actualiza un factor específico por ID de DQModel e ID de Factor
   * @param dqmodelId - ID del DQModel
   * @param factorId - ID del factor
   * @param updatedData - Datos actualizados del factor
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
   * Actualiza un factor específico en un DQ Model
   * @param dqmodelId - ID del DQ Model
   * @param dimensionId - ID de la dimensión
   * @param factorId - ID del factor
   * @param updatedData - Datos actualizados del factor
   */
  updateDQFactor(dqmodelId: number, dimensionId: number, factorId: number, updatedData: any): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/dimensions/${dimensionId}/factors/${factorId}/`;
    return this.http.patch<any>(url, updatedData);
  }

  /**
   * Actualiza parcialmente un factor específico por ID de DQModel e ID de Factor
   * @param dqmodelId - ID del DQModel
   * @param factorId - ID del factor
   * @param updatedData - Datos parciales para actualizar el factor
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
   * Elimina un factor específico de un DQModel
   * @param dqmodelId - ID del DQModel
   * @param factorId - ID del factor
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

  deleteFactorFromDQModel(factorId: number): Observable<any> {
    return this.http.delete<any>(`${this. API_URL_FACTORS_DQMODEL}${factorId}/`)
  }

  /**
   * Obtiene factores asociados a una dimensión específica en un DQ Model
   * @param dqmodelId - ID del DQ Model
   * @param dimensionId - ID de la dimensión
   * @returns Observable con la lista de factores
   */
  getFactorsByDQModelAndDimension(dqmodelId: number, dimensionId: number): Observable<any[]> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/dimensions/${dimensionId}/factors/`;
    return this.http.get<any[]>(url).pipe(
      catchError(err => {
        console.error(`Error al obtener factores para DQModel ${dqmodelId} y Dimension ${dimensionId}:`, err);
        throw err;
      })
    );
  }


  // =============================================
  // METRICAS DQ MODEL
  // =============================================

  /**
   * Obtiene métricas asociadas a un DQ Model
   * @param dqmodelId - ID del DQ Model
   */
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
  
  getMetricsByDQModel_(dqmodelId: number): Observable<any[]> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/metrics/`;
    return this.http.get<any[]>(url).pipe(
      catchError(err => {
        if (err.status === 404) {
          console.warn(`DQ Metrics not found in DQ Model ${dqmodelId}.`);
          return of([]);  
        }
        console.error(`Error al obtener Metrics del DQ Model ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Obtiene una métrica específica por ID de DQModel e ID de Métrica
   * @param dqmodelId - ID del DQModel
   * @param metricId - ID de la métrica
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
   * Agrega una nueva métrica a un DQ Model
   * @param metricData - Datos de la métrica a agregar
   */
  addMetricToDQModel(metricData: { dq_model: number; metric_base: number; factor:number}): Observable<any> {
    return this.http.post<any>(this.API_URL_METRICS_DQMODEL, metricData).pipe(
      catchError(err => {
        console.error('Error al agregar el factor:', err);
        throw err; // Re-lanzar el error para que pueda ser manejado en el componente
      })
    );
  }

  /**
   * Actualiza componentes de contexto de una métrica
   * @param metricId - ID de la métrica
   * @param updatedData - Datos actualizados (solo componentes de contexto editables)
   */
  updateDQMetricCtx(metricId: number, updatedData: any): Observable<any> {
    const url = `${this.API_URL_METRICS_DQMODEL}${metricId}/`;
    return this.http.patch<any>(url, updatedData);
  }

  /**
   * Actualiza una métrica específica por ID de DQModel e ID de Métrica
   * @param dqmodelId - ID del DQModel
   * @param metricId - ID de la métrica
   * @param updatedData - Datos actualizados de la métrica
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
   * Actualiza parcialmente una métrica específica por ID de DQModel e ID de Métrica
   * @param dqmodelId - ID del DQModel
   * @param metricId - ID de la métrica
   * @param updatedData - Datos parciales para actualizar la métrica
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
   * Elimina una métrica específica por ID de DQModel e ID de Métrica
   * @param dqmodelId - ID del DQModel
   * @param metricId - ID de la métrica
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

  deletMetricFromDQModel(metricId: number): Observable<any> {
    return this.http.delete<any>(`${this. API_URL_METRICS_DQMODEL}${metricId}/`)
  }

  /**
   * Obtiene métricas asociadas a una dimensión y factor específicos en un DQ Model
   * @param dqmodelId - ID del DQ Model
   * @param dimensionId - ID de la dimensión
   * @param factorId - ID del factor
   * @returns Observable con la lista de métricas
   */
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


  // =============================================
  // METODOS DQ MODEL
  // =============================================
  
  /**
   * Obtiene métodos asociados a un DQ Model
   * @param dqmodelId - ID del DQ Model
   */
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

  /**
   * Obtiene un método específico por ID de DQModel e ID de Método
   * @param dqmodelId - ID del DQModel
   * @param methodId - ID del método
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
   * Agrega un método a un DQ Model
   * @param methodData - Datos del método a agregar
   */
  addMethodsToDQModel(methodData: { method_base: number; dimension: number, factorId: number, metric: number }): Observable<any> {
    return this.http.post<any>(this.API_URL_METHODS_DQMODEL, methodData).pipe(
      catchError(err => {
        console.error('Error al agregar el metodo:', err);
        throw err; 
      })
    );
  }

  /**
   * Actualiza componentes de contexto de un método
   * @param methodId - ID del método
   * @param updatedData - Datos actualizados
   */
  updateDQMethodCtx(methodId: number, updatedData: any): Observable<any> {
    const url = `${this.API_URL_METHODS_DQMODEL}${methodId}/`;
    return this.http.patch<any>(url, updatedData);
  }
  
  /**
   * Actualiza un método específico por ID de DQModel e ID de Método
   * @param dqmodelId - ID del DQModel
   * @param methodId - ID del método
   * @param updatedData - Datos actualizados del método
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
   * Actualiza parcialmente un método específico de un DQModel
   * @param dqmodelId - ID del DQModel
   * @param methodId - ID del método
   * @param updatedData - Datos parciales para actualizar el método
   * @returns Observable con los datos actualizados del método
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
   * Elimina un método específico por ID de DQModel e ID de Método
   * @param dqmodelId - ID del DQModel
   * @param methodId - ID del método
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

  deletMethodFromDQModel(methodId: number): Observable<any> {
    return this.http.delete<any>(`${this. API_URL_METHODS_DQMODEL}${methodId}/`)
  }

  /**
   * Obtiene métodos asociados a una dimensión, factor y métrica específicos en un DQ Model
   * @param dqmodelId - ID del DQ Model
   * @param dimensionId - ID de la dimensión
   * @param factorId - ID del factor
   * @param metricId - ID de la métrica
   */
  getMethodsByDQModelDimensionFactorAndMetric(dqmodelId: number, dimensionId: number, factorId: number, metricId: number): Observable<any[]> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/dimensions/${dimensionId}/factors/${factorId}/metrics/${metricId}/methods`;
    return this.http.get<any[]>(url).pipe(
      catchError(err => {
        console.error(`Error al obtener metricas para DQModel ${dqmodelId}, Dimension ${dimensionId}, Factor ${factorId} y Metrica ${metricId} :`, err);
        throw err;
      })
    );
  }


  // =============================================
  // METODOS APLICADOS DQ MODEL
  // =============================================
  
  /**
   * Obtiene todos los métodos DQ aplicados para un DQModel específico
   * @param dqmodelId - ID del DQModel
   * @returns Observable con la lista de métodos aplicados
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

  /**
   * Obtiene un método aplicado específico de un DQModel
   * @param dqmodelId - ID del DQModel
   * @param appliedMethodId - ID del método aplicado
   * @returns Observable con los datos del método aplicado
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
   * Crea un nuevo método aplicado
   * @param dqmodelId - ID del DQ Model
   * @param methodData - Datos del método aplicado a crear
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
   * Actualiza un método DQ aplicado específico por ID de DQModel e ID de Método Aplicado
   * @param dqmodelId - ID del DQModel
   * @param appliedMethodId - ID del método aplicado
   * @param updatedData - Datos para actualizar el método aplicado
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
   * Actualiza parcialmente un método DQ aplicado específico por ID de DQModel e ID de Método Aplicado
   * @param dqmodelId - ID del DQModel
   * @param appliedMethodId - ID del método aplicado
   * @param updatedData - Datos parciales para actualizar el método aplicado
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
   * Elimina un método DQ aplicado específico por ID de DQModel e ID de Método Aplicado
   * @param dqmodelId - ID del DQModel
   * @param appliedMethodId - ID del método aplicado
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
   * Obtiene detalles de un método de medición aplicado
   * @param measurementId - ID del método de medición
   */
  getMeasurementAppliedMethodDetails(measurementId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL_ME_METHODS_DQMODEL}${measurementId}/`);
  }

  /**
   * Obtiene detalles de un método de agregación aplicado
   * @param aggregationId - ID del método de agregación
   */
  getAggregationAppliedMethodDetails(aggregationId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL_AG_METHODS_DQMODEL}${aggregationId}/`);
  }

  /**
   * Crea un nuevo método de medición
   * @param agMeth - Datos del método de medición
   * @returns Observable con el método de medición creado
   */
  createMeasurementMethod(agMeth: {name: string, appliedTo: string, associatedTo: number}){
    return this.http.post<any>(this.API_URL_ME_METHODS_DQMODEL, agMeth).pipe(
      catchError(err => {
        console.error('Error al crear el factor:', err);
        throw err; // Re-lanzar el error para que pueda ser manejado en el componente
      })
    );
  }
  
  /**
   * Crea un nuevo método de agregación
   * @param agMeth - Datos del método de agregación
   * @returns Observable con el método de agregación creado
   */
  createAggregatedMethod(agMeth: {name: string, appliedTo: string, associatedTo: number}){
    return this.http.post<any>(this.API_URL_AG_METHODS_DQMODEL, agMeth).pipe(
      catchError(err => {
        console.error('Error al crear el factor:', err);
        throw err; // Re-lanzar el error para que pueda ser manejado en el componente
      })
    );
  }

  /**
   * Actualiza un método de medición aplicado
   * @param id - ID del método de medición
   * @param updatedData - Datos actualizados
   */
  updateMeasurementAppliedMethod(id: number, updatedData: any): Observable<any> {
    const url = `${this.API_URL_ME_METHODS_DQMODEL}${id}/`;  
    return this.http.patch<any>(url, updatedData);
  }
  
  /**
   * Actualiza un método de agregación  aplicado
   * @param id - ID del método de agregación 
   * @param updatedData - Datos agregación 
   */
  updateAggregationAppliedMethod(id: number, updatedData: any): Observable<any> {
    const url = `${this.API_URL_AG_METHODS_DQMODEL}${id}/`;  
    return this.http.patch<any>(url, updatedData);
  }

  /**
   * Elimina un método de medición
   * @param agMeth - ID del método de medición a eliminar
   */
  deleteMeasurementdMethod(agMeth: number){
    return this.http.delete<any>(`${this. API_URL_ME_METHODS_DQMODEL}${agMeth}/`)
  }

  /**
   * Elimina un método de agregación
   * @param agMeth - ID del método de agregación a eliminar
   */
  deleteAggregatedMethod(agMeth: number){
    return this.http.delete<any>(`${this. API_URL_AG_METHODS_DQMODEL}${agMeth}/`)
  }


  // =============================================
  // GENERACIÓN DE SUGERENCIAS (AI)
  // =============================================

  /**
   * Genera sugerencia de dimensión y factor de calidad
   * @param data - Datos para la generación de sugerencias
   */
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

  /**
   * Genera sugerencia de DQ Method
   * @param dqMetricData - Datos de la métrica DQ
   */
  generateDQMethodSuggestion(dqMetricData: any): Observable<any> {
    return this.http.post<any>(this.API_URL_METHODS_BASE_GENERATION, dqMetricData).pipe(
      catchError(err => {
        console.error('Error al generar la sugerencia de DQMethod:', err);
        return throwError(() => err);
      })
    );
  }


  // =============================================
  // EJECUCIÓN DQ MEASUREMENT y DQ ASSESSMENT
  // =============================================

  /**
   * Inicia una nueva ejecución para un DQ Model
   * @param dqModelId - ID del DQ Model
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
   * Obtiene los últimos resultados de ejecución para un DQ Model
   * @param dqModelId - ID del DQ Model
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
   * Obtiene resultados de ejecución específicos para un DQ Model
   * @param dqModelId - ID del DQ Model
   * @param executionId - ID de la ejecución
   */
  getDQModelExecutionResults(dqModelId: number, executionId: string): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqModelId}/execution-results/${executionId}/`;
    return this.http.get<any>(url).pipe(
      catchError(err => {
        console.error(`Error fetching execution results for DQ Model ${dqModelId} with execution ID ${executionId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Obtiene todos las ejecuciones de un DQ Model
   * @param dqModelId - ID del DQ Model
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
   * Obtiene todos las ejecuciones de un DQ Model
   * @param dqModelId - ID del DQ Model
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

  /**
   * Obtiene el resultado de ejecución de un método específico
   * @param dqModelId - ID del DQ Model
   * @param appliedMethodId - ID del método aplicado
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
   * Obtiene resultados de ejecución a nivel de fila para un método aplicado
   * @param dqModelId - ID del DQ Model
   * @param appliedMethodId - ID del método aplicado
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
   * Obtiene resultados de ejecución a nivel de columna para un método aplicado
   * @param dqModelId - ID del DQ Model
   * @param appliedMethodId - ID del método aplicado
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

  /**
   * Ejecuta un método aplicado
   * @param dqModelId - ID del DQ Model
   * @param appliedMethodId - ID del método aplicado
   * @param connConfig - Configuración de conexión
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
   * Ejecuta múltiples métodos aplicados de manera concurrente
   * @param dqModelId - ID del DQ Model
   * @param appliedMethodIds - IDs de los métodos a ejecutar
   * @param connConfig - Configuración de conexión
   */
  executeMultipleAppliedMethods(dqModelId: number, appliedMethodIds: number[], connConfig: any): Observable<any[]> {
    //Array de observables para cada metodo aplicado
    const requests = appliedMethodIds.map(appliedMethodId =>
      this.executeAppliedMethod(dqModelId, appliedMethodId, connConfig)
    );
    //Ejecutar todas las solicitudes concurrentemente
    return forkJoin(requests).pipe(
      catchError(err => {
        console.error('Error al ejecutar los métodos aplicados:', err);
        throw err;
      })
    );
  }


  /**
   * Ejecuta assessment de un método aplicado
   * @param dqModelId - ID del DQ Model
   * @param appliedMethodId - ID del método aplicado
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
   * Actualiza umbrales de assessment para un resultado de ejecución
   * @param dqModelId - ID del DQ Model
   * @param methodId - ID del método aplicado
   * @param resultId - ID del resultado de ejecución
   * @param thresholds - Definición de umbrales
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

  
  // Other
  getSelectedPrioritizedDqProblems(dqModelId: number): Observable<any> {
    const url = `${this.API_URL_DQMODELS}${dqModelId}/selected-prioritized-dq-problems/`;
    return this.http.get(url);
  }

  createPrioritizedProblems(dqProblems: any[], dqModelId: number): Observable<any> {
    const prioritizedProblems = dqProblems.map(problem => ({
      dq_model: dqModelId,
      description: problem.description,
      date: new Date(problem.date * 1000).toISOString() 
    }));

    return this.http.post(this.API_URL_PRIORITIZED_DQ_PROBLEMS, prioritizedProblems);
  }

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
    return this.http.patch(url, updatedData);
  }

}
