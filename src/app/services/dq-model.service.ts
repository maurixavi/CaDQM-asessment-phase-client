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
  //readonly API_PATH_DIMENSIONS = "/assets/dq_dimensions.json"
  //readonly API_PATH_DIMENSIONS = "/assets/test/dq_dimensions.json";

  //API PROJECTS
  readonly API_URL = "http://localhost:8000/api/projects/"

  //API CONTEXT
  readonly API_URL_CTX = "http://localhost:8000/api/context-model/"

  //API DIMENSIONS AND FACTORS BASE
  readonly API_URL_DIMENSIONS_BASE = "http://localhost:8000/api/dimensions-base/"
  readonly API_URL_FACTORS_BASE = "http://localhost:8000/api/factors-base/"

  //API DQ MODEL
  readonly API_URL_DQMODELS = "http://localhost:8000/api/dqmodels/"
  readonly API_URL_DIMENSIONS_DQMODEL = "http://localhost:8000/api/dimensions/"
  readonly API_URL_FACTORS_DQMODEL = "http://localhost:8000/api/factors/"

  projects: any[];
  dqmodels: any[];
  dimensions: any[];
  factors: any[];
  
  ctx_components: any[];

  constructor(private http: HttpClient) {
    this.projects = [];
    this.dimensions = [];
    this.factors = [];
    this.dqmodels = [];
    this.ctx_components = [];
  }

  //PROJECTS 
  getProjects() {
    return this.http.get<any[]>(this.API_URL);
  }

  //DQ MODELS
  getDQModels(): Observable<any> {
    return this.http.get<any[]>(this.API_URL_DQMODELS);
  }

  getDQModel(dqmodelId: number): Observable<any[]> {
    /*const url = `${this.API_URL_DQMODELS}${dqmodelId}/`;
    console.log("Accediendo a la URL:", url);*/
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


  //---- CONTEXT ------
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