import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject  } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';


@Injectable({
  providedIn: 'root'  // asegura que el servicio esté disponible a nivel de toda la app
})
export class ProjectService {

  private readonly baseUrl = "http://localhost:8000/api"

  //API ENDPOINT PROJECTS
  readonly API_URL_PROJECTS = `${this.baseUrl}/projects/`;
  //readonly API_URL_PROJECTS = "http://localhost:8000/api/projects/"


  private projectId: number | null = null;

  private project: any = null; 
  private projectSubject = new BehaviorSubject<any>(null); // BehaviorSubject para emitir el proyecto actual
  public project$ = this.projectSubject.asObservable(); // Exponer el observable para que los componentes se suscriban



  //projects: any[];

  constructor(private http: HttpClient) { 
    //this.projects = [];
  }

  getAllProjects(): Observable<any[]> {
    return this.http.get<any[]>(this.API_URL_PROJECTS).pipe(
      tap(data => console.log('Fetched Projects:', data)),
      catchError(this.handleError<any[]>('getAllProjects', []))
    );
  }

  getProjectById(id: number | null | undefined): Observable<any> {
    if (id == null) {
      console.warn('El ID proporcionado es invalido.');
      return of(null); // Devuelve un observable vacio o un valor alternativo
    }
    
    const url = `${this.API_URL_PROJECTS}${id}/`;
    return this.http.get<any>(url).pipe(
      tap(data => console.log(`Fetched Project with ID=${id}:`, data)),
      catchError(this.handleError<any>(`getProjectById id=${id}`))
    );
  }


  /*setProjectId(id: number): void {
    this.projectId = id;
  }*/
  setProjectId(id: number): void {
    this.projectId = id;
    this.project = null; // Limpiar el caché del proyecto actual
  
    // Emitir el proyecto actualizado en el BehaviorSubject
    this.getCurrentProject().subscribe(); // Forzar actualización en caché y notificación
  }

  getProjectId(): number | null {
    return this.projectId;
  }

  hasProjectId(): boolean {
    return this.projectId !== null;
  }

  private loadCurrentProject2(): void {
    if (this.projectId === null) {
      console.error('No se ha establecido un ID de proyecto.');
      this.projectSubject.next(null); // Asegura que el observable emita `null`
      return;
    }

    this.http.get(`${this.API_URL_PROJECTS}${this.projectId}/`).pipe(
      tap((project) => this.projectSubject.next(project)), // Emitir el proyecto a todos los suscriptores
      catchError(err => {
        console.error('Error al obtener el proyecto:', err);
        this.projectSubject.next(null); // Emitir `null` si hay un error
        throw err;
      })
    ).subscribe();
  }

  /*getProject(): Observable<any> {
    return this.projectSubject.asObservable(); // Expone el proyecto como un observable
  }*/

  /* 
  El BehaviorSubject emitirá el valor del proyecto actual si está disponible en caché, 
  o hará la solicitud HTTP si no está en caché.
  Cualquier componente suscrito a project$ recibirá el proyecto ya sea desde el caché o de la respuesta HTTP.
  */
  getCurrentProjectSinBehaviorSubject(): Observable<any> {
    const projectId = this.getProjectId();
    if (!projectId) {
      console.error('No se ha establecido un ID de proyecto.');
      return of(null);
    }

    // Si el proyecto ya ha sido cargado, devolverlo directamente
    if (this.project) {
      console.log('Proyecto ya en caché:', this.project); // Log para caché
      return of(this.project); /* no se notifica a ningún suscriptor nuevo que se haya suscrito al observable,  simplemente se devuelve el valor almacenado en caché como un valor estático. */
    }

    // Si no, obtenerlo del servidor y almacenarlo
    return this.http.get(`${this.API_URL_PROJECTS}${projectId}/`).pipe(
      tap((project) => {
        this.project = project; /* Guardar en caché. Cuando la respuesta se recibe, se guarda en la variable this.project para usarla en futuras solicitudes, pero no se notifica a ningún observador.*/
        console.log('Proyecto obtenido del servidor:', project); 
      }),
      catchError(err => {
        console.error('Error al obtener el proyecto:', err);
        throw err;
      })
    );
  }

  getCurrentProject(): Observable<any> {
    const projectId = this.getProjectId();
    if (!projectId) {
      console.error('No se ha establecido un ID de proyecto.');
      return of(null); // Si no hay ID de proyecto, retornar null
    }

    // Si el proyecto ya está en caché, devolverlo
    if (this.project) {
      console.log('Proyecto ya en caché:', this.project);
      this.projectSubject.next(this.project); // Emitir el proyecto actual a los suscriptores
      return this.project$; // Retorna el Observable del BehaviorSubject
    }

    // Si no está en caché, obtenerlo del servidor
    return this.http.get(`${this.API_URL_PROJECTS}${projectId}/`).pipe(
      tap((project) => {
        this.project = project; // Guardar en caché
        this.projectSubject.next(project); // Emitir el nuevo proyecto a los suscriptores
        console.log('Fetched Current Project:', project);
      }),
      catchError(err => {
        console.error('Error al obtener el proyecto:', err);
        throw err;
      })
    );
  }

  // Método para cargar el proyecto y emitirlo
  loadCurrentProject(): Observable<any> {
    return this.getCurrentProject(); 
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

  // Metodo PATCH para actualizar parcialmente un proyecto
  patchProject(projectId: number, updatedData: any): Observable<any> {
    const url = `${this.API_URL_PROJECTS}${projectId}/`;
    return this.http.patch<any>(url, updatedData).pipe(
      catchError(err => {
        console.error(`Error al actualizar el Project ${projectId}:`, err);
        throw err;
      })
    );
  }

  createProject(name: string, description: string, dqmodel_version: number | null, context_version: number | null): Observable<any> {
    const newProject = {
      name,
      description,
      dqmodel_version, 
      context_version, 
      stage: 4,
      status: 'in_progress'
    };
  
    return this.http.post<any>(this.API_URL_PROJECTS, newProject).pipe(
      catchError((err) => {
        console.error('Error al crear el proyecto:', err);
        throw err;
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
  
}
