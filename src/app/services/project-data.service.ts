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
  //readonly API_URL_CONTEXT_VERSIONS = `${this.baseUrl}/context-versions/`;
  readonly API_URL_CONTEXT_VERSIONS = `${this.baseUrl}/contexts/`;
  readonly API_URL_DQ_PROBLEMS = `${this.baseUrl}/dq-problems/`;
  

  private projectId: number | null = null;
  private contextVersionId: number | null = null; // Nuevo atributo para almacenar el context_version
  private dqModelVersionId: number | null = null; // Nuevo atributo para almacenar el context_version

  private project: any = null;
  private contextComponents: any = null;
  private dqProblems: any[] = [];
  //private dqModel: any = null;
  private dataAtHand: any = null;

  private projectSubject = new BehaviorSubject<any>(null);
  private contextVersionSubject = new BehaviorSubject<any>(null);
  private contextComponentsSubject = new BehaviorSubject<any>(null);
  private dqProblemsSubject = new BehaviorSubject<any[]>([]);
  private dqModelVersionSubject = new BehaviorSubject<number | null>(null); 
  //private dqModelSubject = new BehaviorSubject<any>(null);
  private dataAtHandSubject = new BehaviorSubject<any>(null);

  public project$ = this.projectSubject.asObservable();
  public contextVersion$ = this.contextVersionSubject.asObservable();
  public contextComponents$ = this.contextComponentsSubject.asObservable();
  public dqProblems$ = this.dqProblemsSubject.asObservable();
  public dqModelVersion$ = this.dqModelVersionSubject.asObservable(); 
  //public dqModel$ = this.dqModelSubject.asObservable();
  public dataAtHand$ = this.dataAtHandSubject.asObservable();
  

  private dataSchema: any = null;
  private dataSchemaSubject = new BehaviorSubject<any>(null);
  public dataSchema$ = this.dataSchemaSubject.asObservable();
  
  
  

  
  constructor(private http: HttpClient) {
    this.loadFromStorage(); // cargar datos almacenados al iniciar el servicio
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      return of(result as T);
    };
  }

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
  
    // Solo cargar datos si hay projectId válido
    if (projectId !== null) {
      this.loadProjectAndComponents().subscribe();
    }
  }

  
  setProjectId__(projectId: number): void {
    this.projectId = projectId;
    localStorage.setItem('projectId', projectId.toString()); // Guardar en localStorage

    this.project = null;
    this.contextComponents = null;
    this.dqProblems = [];
    //this.dqModel = null;
    this.contextVersionId = null; // Limpiar context_version
    this.dqModelVersionId = null; // Limpiar dqmodel_version

    this.projectSubject.next(null);
    this.contextComponentsSubject.next(null);
    this.dqProblemsSubject.next([]);
    //this.dqModelSubject.next(null);
    this.dqModelVersionSubject.next(null); // Notificar que dqmodel_version ha sido limpiado

    this.loadProjectAndComponents().subscribe();
  }

  getProjectId(): number | null {
    return this.projectId;
  }

  /** Recuperar el Project ID almacenado en localStorage **/
  private loadFromStorage_(): void {
    const storedProjectId = localStorage.getItem('projectId');
    if (storedProjectId) {
      this.projectId = +storedProjectId; // Convertir a número
      this.loadProjectAndComponents().subscribe(); //  Cargar datos nuevamente
    }
  }

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

  public loadProjectAndComponents(): Observable<any> {
    if (!this.projectId) {
      console.error('No se ha establecido un ID de proyecto.');
      return of(null);
    }

    return this.getProjectById(this.projectId).pipe(
      tap((project) => {
        this.project = project;
        //this.contextVersionId = project.context_version; // Extraer context_version de project
        this.contextVersionId = project.context; // Extraer context id asociacion real (nueva definicion models)
        this.dqModelVersionId = project.dqmodel_version; // Extraer dqmodel_version
        
        this.projectSubject.next(project);
        this.dqModelVersionSubject.next(this.dqModelVersionId); // Notificar el nuevo dqmodel_version

        //console.log('Project Data:', project);
        
        if (this.contextVersionId) {
          // Cargar el objeto context_version primero
          this.getContextVersionById(this.contextVersionId).subscribe(contextVersion => {
          this.contextVersionSubject.next(contextVersion);
          // Luego cargar los demás datos
          this.loadAdditionalData();
        });
        }

        // Obtener el esquema de datos usando el data_at_hand del proyecto
        if (project.data_at_hand) {
          this.getDataSchemaByDataAtHandId(project.data_at_hand).subscribe();
        }

      }),
      catchError(this.handleError<any>('loadProjectAndComponents'))
    );
  }

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
      //this.dqModel = dqModel;
      //this.dataSchema = data;
       

      this.contextComponentsSubject.next(contextComponents);
      this.dqProblemsSubject.next(dqProblems);
      //this.dqModelSubject.next(dqModel);
      this.dataAtHandSubject.next(dataAtHand); 

      this.dataSchemaSubject.next(dataSchema);

      /* console.log('Context Components:', contextComponents);
      console.log('DQ Problems:', dqProblems); */
      //console.log('DQ Model:', dqModel);
    });
  }

  // Función para obtener los detalles de un data_at_hand por su ID
  public getDataAtHandByIdAllDetails(dataAtHandId: number): Observable<any> {
    const url = `${this.baseUrl}/data-at-hand/${dataAtHandId}/`;
    return this.http.get<any>(url).pipe(
      //tap((data) => console.log('Fetched Data at Hand Details:', data)),
      catchError(this.handleError<any>('getDataAtHandDetails'))
    );
  }

  // No enviar datos desde el backend?
  /* class DataAtHandSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataAtHand
        fields = ['id', 'dbname', 'description', 'type']  # Excluye user, password, host, port */
  public getDataAtHandById(dataAtHandId: number): Observable<any> {
    const url = `${this.baseUrl}/data-at-hand/${dataAtHandId}/`;
    return this.http.get<any>(url).pipe(
      map((data) => {
        // Eliminar campos confidenciales
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
        // Eliminar campos confidenciales
        const { user, password, host, port, ...safeData } = data;  
        console.log("Data at Hand (safe data)", safeData)
        return safeData;
      }),
      catchError(this.handleError<any>('getDataAtHandDetails'))
    );
  }

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

  private getProjectById(projectId: number): Observable<any> {
    const url = `${this.API_URL_PROJECTS}${projectId}/`;
    return this.http.get<any>(url).pipe(
      tap((data) => console.log(`Fetched Project with ID=${projectId}:`, data)),
      catchError(this.handleError<any>(`getProjectById id=${projectId}`))
    );
  }

  getContextVersionById(contextVersionId: number): Observable<any> {
    const url = `${this.API_URL_CONTEXT_VERSIONS}${contextVersionId}/`;
    return this.http.get<any>(url).pipe(
      catchError(this.handleError<any>(`getContextVersionById id=${contextVersionId}`))
    );
  }

  private getContextComponentsByContextVersion(contextVersionId: number): Observable<any> {
    const url = `${this.API_URL_CONTEXT_VERSIONS}${contextVersionId}/context-components/`;
    return this.http.get<any>(url).pipe(
      //tap((data) => console.log(`Fetched Context Components for Version ID=${contextVersionId}:`, data)),
      catchError(this.handleError<any>(`getContextComponentsByContextVersion id=${contextVersionId}`))
    );
  }

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

  /*getCurrentDQModel(): any {
    return this.dqModel;
  }*/
  getCurrentDQModelVersion(): number | null {
    return this.dqModelVersionId;
  }
}
