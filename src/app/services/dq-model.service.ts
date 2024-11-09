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
  
  private basePath = "/assets/test";
  readonly API_PATH_CONTEXT2 = "/assets/ctx_components.json"
  //readonly API_PATH_DIMENSIONS = "/assets/test/dq_dimensions.json";
  readonly API_PATH_CONTEXT = "assets/test/ctx_components.json"

  //API PROJECTS
  readonly API_URL_PROJECTS = "http://localhost:8000/api/projects/"

  //API CONTEXT
  readonly API_URL_CTX = "http://localhost:8000/api/context-model/"

  //API DIMENSIONS, FACTORS, METRICS, METHODS BASE
  readonly API_URL_DIMENSIONS_BASE = "http://localhost:8000/api/dimensions-base/"
  readonly API_URL_FACTORS_BASE = "http://localhost:8000/api/factors-base/"
  readonly API_URL_METRICS_BASE = "http://localhost:8000/api/metrics-base/"
  readonly API_URL_METHODS_BASE = "http://localhost:8000/api/methods-base/"

  //API DQ MODEL
  readonly API_URL_DQMODELS = "http://localhost:8000/api/dqmodels/"
  readonly API_URL_DIMENSIONS_DQMODEL = "http://localhost:8000/api/dimensions/"
  readonly API_URL_FACTORS_DQMODEL = "http://localhost:8000/api/factors/"

  // http://localhost:8000/api/dqmodels/1/dimensions/6/factors/52/metrics/3/methods/

  projects: any[];

  dqmodels: any[];
  dimensions: any[];
  factors: any[];
  metrics: any[];
  methods: any[];
  
  ctx_components: any[];

  constructor(private http: HttpClient) {
    this.projects = [];

    this.dqmodels = [];

    this.dimensions = [];
    this.factors = [];
    this.metrics = [];
    this.methods = [];
    
    this.ctx_components = [];
  }

  //PROJECTS 
  getProjects() {
    return this.http.get<any[]>(this.API_URL_PROJECTS);
  }

  getProject(projectId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL_PROJECTS}${projectId}/`).pipe(
      catchError(err => {
        console.error(`Error al obtener PROJECT ${projectId}:`, err);
        throw err;
      })
    );
  } 

  updateProject(projectId: number, updatedData: any): Observable<any> {
    const url = `${this.API_URL_PROJECTS}${projectId}/`;
    return this.http.put<any>(url, updatedData).pipe(
      catchError(err => {
        console.error(`Error al actualizar el Project ${projectId}:`, err);
        throw err;
      })
    );
  }

  patchProject(projectId: number, updatedField: any): Observable<any> {
    const url = `${this.API_URL_PROJECTS}${projectId}/`;
    return this.http.patch<any>(url, updatedField).pipe(
      catchError(err => {
        console.error(`Error al actualizar el campo en el Project ${projectId}:`, err);
        throw err;
      })
    );
  }


  //DQ MODELS
  getDQModels(): Observable<any> {
    return this.http.get<any[]>(this.API_URL_DQMODELS);
  }


  getDQModelById(dqmodelId: number): Observable<any[]> {
    /*const url = `${this.API_URL_DQMODELS}${dqmodelId}/`;
    console.log("Accediendo a la URL:", url);*/
    return this.http.get<any[]>(`${this.API_URL_DQMODELS}${dqmodelId}/`).pipe(
      catchError(err => {
        console.error(`Error al obtener DQ Model ${dqmodelId}:`, err);
        throw err;
      })
    );
  } 

  //private currentDQModel: DQModel | null = null; // Almacenamiento en caché del DQ Model actual
  //private currentDQModel: any = null; 
  private currentDQModel: any | null = null;


  // Obtener y setear CURRENT DQ MODEL en cache o desde servidor
  getDQModel(dqModelId: number): Observable<any> {
    // Si ya tenemos el modelo en caché y es el mismo ID, lo devolvemos
    if (this.currentDQModel && this.currentDQModel.id === dqModelId) {
      console.log('DQ Model ya en caché:', this.currentDQModel);
      return of(this.currentDQModel);
    }

    // Si no está en caché o es un ID diferente, hacemos la petición
    return this.http.get<DQModel>(`${this.API_URL_DQMODELS}${dqModelId}/`).pipe(
      map((data) => {
        this.currentDQModel = data; // Actualizamos el caché
        console.log('DQ Model obtenido del servidor:', this.currentDQModel);
        return data;
      }),
      catchError((err) => {
        console.error(`Error al obtener DQ Model ${dqModelId}:`, err);
        throw err;
      })
    );
  }



  /*
  {
    "id": 1,
    "version": "DQModel v1.01",
    "created_at": "2024-10-08T00:17:43.798748Z",
    "status": "draft",
    "finished_at": "2024-10-08T00:17:40Z",
    "previous_version": null
  } */
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
    console.log("DqModels/Dimensions - Accediendo a la URL:", url);
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

  addDimensionToDQModel(dimensionData: { dimension_base: number; context_components: any[] }): Observable<any> {
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
  getDQDimensionsBase(): Observable<any> {
    return this.http.get<any[]>(this.API_URL_DIMENSIONS_BASE);
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
  getDQFactorsBase(): Observable<any> {
    return this.http.get<any[]>(this.API_URL_FACTORS_BASE);
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


  

  //METRICS BASE
  getDQMetricsBase(): Observable<any> {
    return this.http.get<any[]>(this.API_URL_METRICS_BASE);
  }

  getDQMetricBaseById(metricBaseId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL_METRICS_BASE}${metricBaseId}/`);
  }



  //METHODS BASE
  getDQMethodsBase(): Observable<any> {
    return this.http.get<any[]>(this.API_URL_METHODS_BASE);
  }

  getDQMethodBaseById(methodBaseId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL_METHODS_BASE}${methodBaseId}/`);
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

}