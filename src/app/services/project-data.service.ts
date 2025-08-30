import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject, forkJoin } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ProjectDataService {
  private readonly baseUrl = 'http://localhost:8000/api';

  readonly API_URL_PROJECTS = `${this.baseUrl}/projects/`;
  readonly API_URL_CONTEXT_VERSIONS = `${this.baseUrl}/contexts/`;
  readonly API_URL_DQ_PROBLEMS = `${this.baseUrl}/dq-problems/`;
  
  // Almacenamiento en memoria para datos cacheados
  private project: any = null;
  private projectId: number | null = null;
  private dqModelVersionId: number | null = null; 
  private contextVersionId: number | null = null; 
  private contextComponents: any = null;
  private dqProblems: any[] = [];
  private dataAtHand: any = null;
  private dataSchema: any = null;
  
  // BehaviorSubjects para notificar cambios
  private projectSubject = new BehaviorSubject<any>(null);
  private dqModelVersionSubject = new BehaviorSubject<number | null>(null); 
  private contextVersionSubject = new BehaviorSubject<any>(null);
  private contextComponentsSubject = new BehaviorSubject<any>(null);
  private dqProblemsSubject = new BehaviorSubject<any[]>([]);
  private dataAtHandSubject = new BehaviorSubject<any>(null);
  private dataSchemaSubject = new BehaviorSubject<any>(null);

  // Observables públicos
  public project$ = this.projectSubject.asObservable();
  public dqModelVersion$ = this.dqModelVersionSubject.asObservable(); 
  public contextVersion$ = this.contextVersionSubject.asObservable();
  public contextComponents$ = this.contextComponentsSubject.asObservable();
  public dqProblems$ = this.dqProblemsSubject.asObservable();
  public dataAtHand$ = this.dataAtHandSubject.asObservable();
  public dataSchema$ = this.dataSchemaSubject.asObservable();
  
  constructor(private http: HttpClient) {
    this.loadFromStorage(); // cargar datos almacenados al iniciar el servicio
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
  // GESTIÓN DEL PROYECTO ACTUAL
  // =============================================

  /**
   * Establece el ID del proyecto actual
   * @param projectId - ID del proyecto
   */
  setProjectId(projectId: number | null): void {
    this.projectId = projectId;
  
    if (projectId === null) {
      localStorage.removeItem('projectId');
    } else {
      localStorage.setItem('projectId', projectId.toString());
    }
  
    // Resetear el estado relacionado al proyecto
    this.project = null;
    this.contextComponents = null;
    this.dqProblems = [];
    this.contextVersionId = null;
    this.dqModelVersionId = null;
  
    this.projectSubject.next(null);
    this.contextComponentsSubject.next(null);
    this.dqProblemsSubject.next([]);
    this.dqModelVersionSubject.next(null);
  
    // cargar datos solo si hay projectId válido
    if (projectId !== null) {
      this.loadProjectAndComponents().subscribe();
    }
  }

  /**
   * Obtiene el ID del proyecto actual
   * @returns ID del proyecto actual o null si no está establecido
   */
  getProjectId(): number | null {
    return this.projectId;
  }

  /**
   * Carga datos al iniciar el servicio
   */
  private loadFromStorage(): void {
    try {
      const storedProjectId = localStorage.getItem('projectId');
      if (storedProjectId) {
        this.projectId = +storedProjectId;
        this.loadProjectAndComponents().subscribe({
          error: (err) => console.error('Error loading project:', err)
        });
      }
    } catch (error) {
      console.error('Error loading from storage:', error);
    }
  }

  /**
   * Carga el proyecto y sus componentes relacionados
   * @returns Observable con los datos del proyecto
   */
  public loadProjectAndComponents(): Observable<any> {
    if (!this.projectId) {
      console.error('No se ha establecido un ID de proyecto.');
      return of(null);
    }

    return this.getProjectById(this.projectId).pipe(
      tap((project) => {
        this.project = project;
        this.contextVersionId = project.context;
        this.dqModelVersionId = project.dqmodel_version;
        
        this.projectSubject.next(project);
        this.dqModelVersionSubject.next(this.dqModelVersionId); 
        
        if (this.contextVersionId) {
          // Primero cargar contexto
          this.getContextVersionById(this.contextVersionId).subscribe(contextVersion => {
          this.contextVersionSubject.next(contextVersion);
          // Luego cargar los demás datos (incluye componentes de contexto)
          this.loadAdditionalData();
        });
        }

        if (project.data_at_hand) {
          this.getDataSchemaByDataAtHandId(project.data_at_hand).subscribe();
        }
      }),
      catchError(this.handleError<any>('loadProjectAndComponents'))
    );
  }

  private getProjectById(projectId: number): Observable<any> {
    const url = `${this.API_URL_PROJECTS}${projectId}/`;
    return this.http.get<any>(url).pipe(
      tap((data) => console.log(`Fetched Project with ID=${projectId}:`, data)),
      catchError(this.handleError<any>(`getProjectById id=${projectId}`))
    );
  }


  /**
   * Carga datos adicionales del proyecto (componentes de contexto, DQ problems, data at hand, data schema)
   */
  private loadAdditionalData(): void {
    if (!this.contextVersionId || !this.projectId) return;

    forkJoin({
      contextComponents: this.getContextComponentsByContextVersion(this.contextVersionId),
      dqProblems: this.getDQProblemsByProjectId(this.projectId),
      dataAtHand: this.getDataAtHandById_(this.project.data_at_hand),
      dataSchema: this.getDataSchemaByDataAtHandId_(this.project.data_at_hand),
    }).subscribe(({ contextComponents, dqProblems, dataAtHand, dataSchema  }) => {
      this.contextComponents = contextComponents;
      this.dqProblems = dqProblems;
      this.contextComponentsSubject.next(contextComponents);
      this.dqProblemsSubject.next(dqProblems);
      this.dataAtHandSubject.next(dataAtHand); 
      this.dataSchemaSubject.next(dataSchema);
    });
  }


  /**
   * Obtiene detalles completos de datos disponibles por ID
   * @param dataAtHandId - ID de los datos disponibles
   * @returns Observable con los detalles completos
   */
  public getDataAtHandByIdAllDetails(dataAtHandId: number): Observable<any> {
    const url = `${this.baseUrl}/data-at-hand/${dataAtHandId}/`;
    return this.http.get<any>(url).pipe(
      //tap((data) => console.log('Fetched Data at Hand Details:', data)),
      catchError(this.handleError<any>('getDataAtHandDetails'))
    );
  }

  /**
   * Obtiene detalles seguros de datos disponibles por ID (sin información confidencial)
   * @param dataAtHandId - ID de los datos disponibles
   */
  public getDataAtHandById(dataAtHandId: number): Observable<any> {
    const url = `${this.baseUrl}/data-at-hand/${dataAtHandId}/`;
    return this.http.get<any>(url).pipe(
      map((data) => {
        // Ocultar campos confidenciales
        const { user, password, host, port, ...safeData } = data;
        return safeData;
      }),
      //tap((safeData) => console.log('Fetched Data at Hand Details:', safeData)),
      catchError(this.handleError<any>('getDataAtHandDetails'))
    );
  }

  private getDataAtHandById_(dataAtHandId: number): Observable<any> {
    const url = `${this.baseUrl}/data-at-hand/${dataAtHandId}/`;
    return this.http.get<any>(url).pipe(
      map((data) => {
        // Ocultar campos confidenciales
        const { user, password, host, port, ...safeData } = data;  
        return safeData;
      }),
      catchError(this.handleError<any>('getDataAtHandDetails'))
    );
  }

  /**
   * Obtiene el esquema de datos por ID de datos disponibles (uso interno)
   * @param dataAtHandId - ID de los datos disponibles
   */
  private getDataSchemaByDataAtHandId_(dataAtHandId: number): Observable<any> {
    const url = `${this.baseUrl}/data-at-hand/${dataAtHandId}/data-schema/`;
    return this.http.get<any>(url).pipe(
      tap((data) => {
        /*this.dataSchema = data;
        this.dataSchemaSubject.next(data);*/
        console.log(`Data schema with Data at Hand ID=${dataAtHandId}:`, data);
      }),
      catchError(this.handleError<any>('getDataSchemaByDataAtHandId'))
    );
  }

  private getDataSchemaByDataAtHandId(dataAtHandId: number): Observable<any> {
    const url = `${this.baseUrl}/data-at-hand/${dataAtHandId}/data-schema/`;
    return this.http.get<any>(url).pipe(
      tap((data) => {
        this.dataSchema = data;
        this.dataSchemaSubject.next(data);
      }),
      catchError(this.handleError<any>('getDataSchemaByDataAtHandId'))
    );
  }

  /**
   * Obtiene una versión de contexto por ID
   * @param contextVersionId - ID de la versión del contexto
   * @returns Observable con los detalles del contexto
   */
  getContextVersionById(contextVersionId: number): Observable<any> {
    const url = `${this.API_URL_CONTEXT_VERSIONS}${contextVersionId}/`;
    return this.http.get<any>(url).pipe(
      catchError(this.handleError<any>(`getContextVersionById id=${contextVersionId}`))
    );
  }

  /**
   * Obtiene componentes de contexto por versión de contexto
   * @param contextVersionId - ID de la versión del contexto
   * @returns Observable con los componentes de contexto
   */
  private getContextComponentsByContextVersion(contextVersionId: number): Observable<any> {
    const url = `${this.API_URL_CONTEXT_VERSIONS}${contextVersionId}/context-components/`;
    return this.http.get<any>(url).pipe(
      //tap((data) => console.log(`Fetched Context Components for Version ID=${contextVersionId}:`, data)),
      catchError(this.handleError<any>(`getContextComponentsByContextVersion id=${contextVersionId}`))
    );
  }

  /**
   * Obtiene problemas DQ por ID de proyecto
   * @param projectId - ID del proyecto
   * @returns Observable con la lista de problemas DQ
   */
  private getDQProblemsByProjectId(projectId: number): Observable<any[]> {
    //const url = `${this.API_URL_PROJECTS}${projectId}/dq-problems/`;
    const url = `${this.API_URL_PROJECTS}${projectId}/quality-problems/`;
    return this.http.get<any[]>(url).pipe(
      //tap((data) => console.log(`Fetched DQ Problems for Project ID=${projectId}:`, data)),
      catchError(this.handleError<any[]>(`getDQProblemsByProjectId id=${projectId}`, []))
    );
  }


  public getCurrentProject(): any {
    return this.projectSubject.value;
  }

  getProject(): Observable<any> {
    return this.project$; 
  }

  getCurrentContextComponents(): any {
    return this.contextComponents;
  }

  getCurrentDQProblems(): any[] {
    return this.dqProblems;
  }

  getCurrentDQModelVersion(): number | null {
    return this.dqModelVersionId;
  }

}
