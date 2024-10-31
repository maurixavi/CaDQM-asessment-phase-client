import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

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

  //readonly API_URL = "https://jsonplaceholder.typicode.com/users"
  readonly API_URL = "http://localhost:8000/api/projects/"
  readonly API_URL_CTX = "http://localhost:8000/api/context-model/"
  readonly API_URL_DIMENSIONS_BASE = "http://localhost:8000/api/dimensions-base/"
  readonly API_URL_FACTORS_BASE = "http://localhost:8000/api/factors-base/"

  readonly API_URL_DQMODELS = "http://localhost:8000/api/dqmodels/"
  readonly API_URL_DIMENSIONS_DQMODEL = "http://localhost:8000/api/dimensions/"
  readonly API_URL_FACTORS_DQMODEL = "http://localhost:8000/api/factors/"

  //readonly API_PATH_DIMENSIONS = "/assets/dq_dimensions.json"
  //readonly API_PATH_DIMENSIONS = "/assets/test/dq_dimensions.json";

  users: any[];
  dimensions: any[];
  factors: any[];
  dqmodels: any[];

  ctx_components: any[];

  constructor(private http: HttpClient) {
    this.users = [];
    this.dimensions = [];
    this.factors = [];
    this.dqmodels = [];
    this.ctx_components = [];
  }

  addDimension(dimensionData: { dimension_base: number; context_components: any[] }): Observable<any> {
    return this.http.post<any>(this.API_URL_DIMENSIONS_DQMODEL, dimensionData).pipe(
      catchError(err => {
        console.error('Error al agregar la dimensión:', err);
        throw err; // Re-lanzar el error para que pueda ser manejado en el componente
      })
    );
  }

  addFactor(factorData: { factor_base: number; dimension: number }): Observable<any> {
  return this.http.post<any>(this.API_URL_FACTORS_DQMODEL, factorData).pipe(
    catchError(err => {
      console.error('Error al agregar el factor:', err);
      throw err; // Re-lanzar el error para que pueda ser manejado en el componente
    })
  );
}

  getUsers() {
    return this.http.get<any[]>(this.API_URL);
  }


  getDQModels(): Observable<any> {
    return this.http.get<any[]>(this.API_URL_DQMODELS);
  }

  getDQModel(dqmodelId: number): Observable<any[]> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/`;
    console.log("Accediendo a la URL:", url);
    return this.http.get<any[]>(`${this.API_URL_DQMODELS}${dqmodelId}/`).pipe(
      catchError(err => {
        console.error(`Error al obtener DQ Model ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  getDQModelDimensions(dqmodelId: number): Observable<any[]> {
    const url = `${this.API_URL_DQMODELS}${dqmodelId}/dimensions/`;
    console.log("DqModels/Dimensions - Accediendo a la URL:", url);
    return this.http.get<any[]>(`${this.API_URL_DQMODELS}${dqmodelId}/dimensions/`).pipe(
      catchError(err => {
        console.error(`Error al obtener Dimensiones del DQ Model ${dqmodelId}:`, err);
        throw err;
      })
    );
  }

  // obtener los factores de una dimensión específica en un DQModel
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

  // Método para obtener todo el modelo de contexto con DQDimensions, DQFactors, etc.
  /*getDQModel(): Observable<any> {
    return this.http.get<any[]>(`${this.basePath}/dq_models.json`);
  }*/



  // Método para obtener solo las dimensiones de 
  getDQDimensionsBase(): Observable<any> {
    return this.http.get<any[]>(this.API_URL_DIMENSIONS_BASE);
  }

  getDQDimensionBaseById(dimensionBaseId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL_DIMENSIONS_BASE}${dimensionBaseId}/`);
  }

  /*getDQDimensions(): Observable<any> {
    return this.http.get<any[]>(`${this.basePath}/dq_dimensions.json`);
  }*/
  // Método para crear una nueva DQDimensionBase
  createDQDimension(dimension: { name: string; semantic: string }): Observable<any> {
    return this.http.post<any>(this.API_URL_DIMENSIONS_BASE, dimension).pipe(
      catchError(err => {
        console.error('Error al crear la dimensión:', err);
        throw err; // Re-lanzar el error para que pueda ser manejado en el componente
      })
    );
  }

  // Método para crear una nueva DQDimensionBase
  createDQFactor(factor: { name: string; semantic: string }): Observable<any> {
    return this.http.post<any>(this.API_URL_FACTORS_BASE, factor).pipe(
      catchError(err => {
        console.error('Error al crear el factor:', err);
        throw err; // Re-lanzar el error para que pueda ser manejado en el componente
      })
    );
  }


  // Método para obtener solo los factores de calidad
  getDQFactorsBase(): Observable<any> {
    return this.http.get<any[]>(this.API_URL_FACTORS_BASE);
  }

  getFactorBaseById(factorBaseId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL_FACTORS_BASE}${factorBaseId}/`);
  }
  /*getDQFactors(): Observable<any> {
    return this.http.get<any[]>(`${this.basePath}/dq_factors.json`);
  }*/

  // Método para obtener los factores por dimensionId
  getFactorsByDimensionId(dimensionId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL_DIMENSIONS_BASE}${dimensionId}/factors-base/`).pipe(
      catchError(err => {
        console.error(`Error al obtener factores para dimensionId ${dimensionId}:`, err);
        throw err;
      })
    );
  }

  /*getCtxComponents(): Observable<any> {
    return this.http.get<any[]>(`${this.basePath}/ctx_components.json`);
  }*/

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