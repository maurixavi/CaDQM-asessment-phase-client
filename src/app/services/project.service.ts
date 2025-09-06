import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject, forkJoin  } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'  // asegura que el servicio esté disponible a nivel de toda la app
})
export class ProjectService {
  // URLs base para los endpoints de la API
  private readonly baseUrl = "http://localhost:8000/api"

  // URLs para endpoints específicos
  readonly API_URL_PROJECTS = `${this.baseUrl}/projects/`;
  readonly API_URL_CONTEXT_VERSIONS = `${this.baseUrl}/context-versions/`;
  readonly API_URL_DQ_PROBLEMS = `${this.baseUrl}/dq-problems/`;

  // Almacenamiento en memoria para datos cacheados
  private projectId: number | null = null;
  private project: any = null; 
  private projectSubject = new BehaviorSubject<any>(null); 
  public project$ = this.projectSubject.asObservable(); 

  constructor(private http: HttpClient) { }

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
  // PROJECTS
  // =============================================

  /**
   * Obtiene todos los proyectos
   * @returns Observable con la lista de proyectos
   */
  getAllProjects(): Observable<any[]> {
    return this.http.get<any[]>(this.API_URL_PROJECTS).pipe(
      //tap(data => console.log('Fetched Projects:', data)),
      catchError(this.handleError<any[]>('getAllProjects', []))
    );
  }

  /**
   * Obtiene un proyecto específico por ID
   * @param id - ID del proyecto a obtener
   * @returns Observable con los detalles del proyecto
   */
  getProjectById(id: number | null | undefined): Observable<any> {
    if (id == null) {
      console.warn('El ID proporcionado es invalido.');
      return of(null); // Devuelve un observable vacio o un valor alternativo
    }
    const url = `${this.API_URL_PROJECTS}${id}/`;
    return this.http.get<any>(url).pipe(
      catchError(this.handleError<any>(`getProjectById id=${id}`))
    );
  }

  /**
   * Crea un nuevo proyecto
   * @param name - Nombre del proyecto
   * @param description - Descripción del proyecto
   * @param dqmodel_version - ID de la versión del DQModel
   * @param context - ID del contexto
   * @param user - ID del usuario
   * @param data_at_hand - ID de los datos disponibles
   */
  createProject(name: string, description: string, dqmodel_version: number | null, context: number | null, user: number | null, data_at_hand: number | null): Observable<any> {
    const newProject = {
      name,
      description,
      dqmodel_version, 
      context,
      user,
      data_at_hand,
    };
  
    return this.http.post<any>(this.API_URL_PROJECTS, newProject).pipe(
      catchError((err) => {
        console.error('Error al crear el proyecto:', err);
        throw err;
      })
    );
  }
  
  /**
   * Actualiza un proyecto existente
   * @param projectId - ID del proyecto a actualizar
   * @param updatedData - Datos actualizados del proyecto
   */
  updateProject(projectId: number, updatedData: any): Observable<any> {
    const url = `${this.API_URL_PROJECTS}${projectId}/`;
    return this.http.put<any>(url, updatedData).pipe(
      catchError(err => {
        console.error(`Error al actualizar el Project ${projectId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Actualiza parcialmente un proyecto existente
   * @param projectId - ID del proyecto a actualizar
   * @param updatedData - Datos parciales para actualizar
   */
  patchProject(projectId: number, updatedData: any): Observable<any> {
    const url = `${this.API_URL_PROJECTS}${projectId}/`;
    return this.http.patch<any>(url, updatedData).pipe(
      catchError(err => {
        console.error(`Error al actualizar el Project ${projectId}:`, err);
        throw err;
      })
    );
  }

  /**
   * Obtiene un proyecto filtrado por versión de DQModel
   * @param dqmodelVersionId - ID de la versión del DQModel
   */
   getProjectByDQModelVersion(dqmodelVersionId: number): Observable<any> {
    const url = `${this.baseUrl}/projects/by-dqmodel/?dqmodel_version=${dqmodelVersionId}`;
    return this.http.get<any>(url).pipe(
      // tap((data) => console.log(`Fetched project for dqmodel_version=${dqmodelVersionId}:`, data)),
      catchError(this.handleError<any>(`getProjectByDQModelVersion id=${dqmodelVersionId}`))
    );
  }

  
  // =============================================
  // GESTIÓN DEL PROYECTO ACTUAL
  // =============================================

  /**
   * Establece el ID del proyecto actual
   * @param id - ID del proyecto
   */
  setProjectId(id: number): void {
    this.projectId = id;
    this.project = null; // limpiar cache del proyecto actual
    this.getCurrentProject().subscribe(); 
  }

  /**
   * Obtiene el ID del proyecto actual
   * @returns ID del proyecto actual o null si no está establecido
   */
  getProjectId(): number | null {
    return this.projectId;
  }

  /**
   * Verifica si hay un ID de proyecto establecido
   */
  hasProjectId(): boolean {
    return this.projectId !== null;
  }

  /**
   * Obtiene el proyecto actual (usa caché si está disponible)
   * @returns Observable con el proyecto actual
   */
   getCurrentProject(): Observable<any> {
    const projectId = this.getProjectId();
    if (!projectId) {
      console.error('No se ha establecido un ID de proyecto.');
      return of(null); 
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

  /**
   * Carga el proyecto actual y lo emite a los suscriptores
   */
  loadCurrentProject(): Observable<any> {
    return this.getCurrentProject(); 
  }


  // =============================================
  // CONTEXT VERSIONS - CONTEXT COMPONENTS
  // =============================================
  
  /**
   * Obtiene todas las versiones de contexto
   */
  getContextVersions(): Observable<any> {
    return this.http.get<any>(this.API_URL_CONTEXT_VERSIONS).pipe(
      catchError(this.handleError<any[]>('getContextVersions', []))
    );
  }

  /**
   * Obtiene un contexto específico por ID de versión
   * @param contextVersionId - ID de la versión del contexto
   */
  getContextByVersion(contextVersionId: number): Observable<any> {
    const url = `${this.API_URL_CONTEXT_VERSIONS}${contextVersionId}/`; // URL para obtener el contexto por ID
    return this.http.get<any>(url).pipe(
      catchError(this.handleError<any>(`getContextByVersion id=${contextVersionId}`))
    );
  }

  /**
   * Obtiene los componentes de contexto de una versión específica
   * @param contextVersionId - ID de la versión del contexto
   */
  getContextComponents(contextVersionId: number): Observable<any> {
    const url = `${this.API_URL_CONTEXT_VERSIONS}${contextVersionId}/context-components/`;
    return this.http.get<any>(url).pipe(
      catchError(this.handleError<any>(`getContextComponents id=${contextVersionId}`))
    );
  }

  /**
   * Obtiene un componente de contexto específico por tipo e ID
   * @param contextVersionId - ID de la versión del contexto
   * @param componentType - Tipo del componente
   * @param componentId - ID del componente
   * @returns Observable con los detalles del componente
   */
  getContextComponentById(contextVersionId: number, componentType: string, componentId: number): Observable<any> {
    const url = `${this.API_URL_CONTEXT_VERSIONS}${contextVersionId}/context-components/${componentType}/${componentId}/`;
    return this.http.get<any>(url).pipe(
      catchError(err => {
        console.error(`Error al obtener el componente de contexto ${componentType} con ID ${componentId}:`, err);
        throw err;
      })
    );
  }


  // =============================================
  // DQ PROBLEMS
  // =============================================

  /**
   * Obtiene todos los problemas de calidad de datos
   * @returns Observable con la lista de problemas DQ
   */
   getDQProblems(): Observable<any> {
    return this.http.get<any>(this.API_URL_DQ_PROBLEMS).pipe(
      tap(data => console.log('Fetched DQ Problems:', data)), 
      catchError(this.handleError<any[]>('getDQProblems', [])) 
    );
  }

  /**
   * Obtiene los problemas de calidad de un proyecto específico
   * @param projectId - ID del proyecto
   * @returns Observable con la lista de problemas de calidad
   */
  getDQProblemsByProjectId(projectId: number): Observable<any> {
    const url = `${this.API_URL_PROJECTS}${projectId}/quality-problems/`;
    return this.http.get<any>(url).pipe(
      //tap((data) => console.log(`Fetched DQ Problems for Project ID=${projectId}:`, data)),
      catchError(this.handleError<any[]>(`getDQProblemsByProjectId id=${projectId}`, []))
    );
  }

  /**
   * Obtiene un problema de calidad específico por su ID.
   * @param projectId ID del proyecto.
   * @param problemId ID del problema de calidad.
   * @returns Observable con los detalles del problema.
   */
   getDQProblemById(projectId: number, problemId: number): Observable<any> {
    //const url = `${this.API_URL_PROJECTS}${projectId}/dq-problems/${problemId}/`;
    const url = `${this.API_URL_PROJECTS}${projectId}/quality-problems/${problemId}/`;
    return this.http.get<any>(url).pipe(
      /*tap((data) => console.log(`Fetched DQ Problem ID=${problemId} for Project ID=${projectId}:`, data) ),
      */
      catchError(this.handleError<any>(`getDQProblemById id=${problemId}`))
    );
  }


  // DQ PROBLEMS PRIORITIZATION

  /**
   * Actualiza la prioridad de problemas de calidad priorizados
   * @param projectId - ID del proyecto
   * @param problems - Lista de problemas con prioridades actualizadas
   * @returns Observable con las respuestas de actualización
   */
  updatePrioritizedDQProblem(projectId: number, problems: any[]): Observable<any> {
    const url = `${this.API_URL_PROJECTS}${projectId}/prioritized-quality-problems/`;
    //const url = `${this.API_URL_PROJECTS}${projectId}/prioritized-dq-problems/`;
    const patchRequests = problems.map(problem => {
      const problemUrl = `${url}${problem.id}/`;
      const patchBody = { priority: problem.priority };
      return this.http.patch(problemUrl, patchBody).pipe(
        catchError(this.handleError<any>('updatePrioritizedDQProblem'))
      );
    });
    // Ejecutar todas las solicitudes en paralelo
    return forkJoin(patchRequests);
  }

  /**
   * Obtiene los problemas de calidad priorizados de un proyecto
   * @param projectId - ID del proyecto
   * @returns Observable con la lista de problemas priorizados
   */
   getPrioritizedDQProblemsByProjectId(projectId: number): Observable<any> {
    //const url = `${this.API_URL_PROJECTS}${projectId}/prioritized-dq-problems/`;
    const url = `${this.API_URL_PROJECTS}${projectId}/prioritized-quality-problems/`;
    return this.http.get<any>(url).pipe(
      /*tap((data) => console.log(`Prioritized DQ Problems for Project ID=${projectId}:`, data)),*/
      catchError(this.handleError<any[]>(`getPrioritizedDQProblemsByProjectId id=${projectId}`, []))
    );
  }


  // DQ PROBLEMS SELECTION

  /**
   * Actualiza el campo de selección de problemas de calidad priorizados
   * @param projectId - ID del proyecto
   * @param problems - Lista de problemas con estado de selección actualizado
   */
  updateIsSelectedFieldPrioritizedDQProblem(projectId: number, problems: any[]): Observable<any> {
    const url = `${this.API_URL_PROJECTS}${projectId}/prioritized-quality-problems/`;
    //const url = `${this.API_URL_PROJECTS}${projectId}/prioritized-dq-problems/`;
    const patchRequests = problems.map(problem => {
      const problemUrl = `${url}${problem.id}/`;
      const patchBody = { is_selected: problem.is_selected };
      return this.http.patch(problemUrl, patchBody).pipe(
        tap((response) => console.log('Updated field is_selected in Prioritized DQ Problem:', response)),
        catchError(this.handleError<any>('updatePrioritizedDQProblem'))
      );
    });
    return forkJoin(patchRequests);
  }

  /**
   * Elimina la selección de problemas de calidad priorizados
   * @param projectId - ID del proyecto
   * @param problems - Lista de problemas a deseleccionar
   */
  removeSelectedPrioritizedDQProblem(projectId: number, problems: any[]): Observable<any> {
    const url = `${this.API_URL_PROJECTS}${projectId}/prioritized-quality-problems/`;
    const patchRequests = problems.map(problem => {
      const problemUrl = `${url}${problem.id}/`;
  
      const patchBody = { is_selected: false };
      return this.http.patch(problemUrl, patchBody).pipe(
        catchError(this.handleError<any>('updatePrioritizedDQProblem'))
      );
    });
    return forkJoin(patchRequests);
  }

  /**
   * Obtiene los problemas de calidad priorizados seleccionados de un proyecto
   * @param projectId - ID del proyecto
   * @returns Observable con la lista de problemas priorizados seleccionados
   */
   getSelectedPrioritizedDQProblemsByProjectId(projectId: number): Observable<any> {
    const url = `${this.API_URL_PROJECTS}${projectId}/selected-prioritized-quality-problems/`;
    return this.http.get<any>(url).pipe(
      /*tap((data) => console.log(`Fetched Selected Prioritized DQ Problems for Project ID=${projectId}:`, data)),*/
      catchError(this.handleError<any[]>(`getSelectedPrioritizedDQProblemsByProjectId id=${projectId}`, []))
    );
  }

  
  // DQ PROBLEMS (DQ MODEL NEW VERSION)

  /**
   * Copia problemas priorizados de un proyecto a otro
   * @param sourceProjectId - ID del proyecto fuente
   * @param targetProjectId - ID del proyecto destino
   */
   copyPrioritizedProblems(sourceProjectId: number, targetProjectId: number): Observable<any> {
    return this.http.post(
      `${this.API_URL_PROJECTS}${sourceProjectId}/copy-problems-to/${targetProjectId}/`,
      {}  // Body vacío (no se necesitan datos adicionales)
    );
  }

  syncPrioritizedDQProblems(projectId: number, problems: any[]): Observable<any> {
    //const url = `${this.API_URL_PROJECTS}${projectId}/prioritized-dq-problems/`;
    const url = `${this.API_URL_PROJECTS}${projectId}/prioritized-quality-problems/`;
  
    const patchRequests = problems.map(problem => {
      const problemUrl = `${url}${problem.id}/`;
      const patchBody = {
        priority: problem.priority,
        is_selected: problem.is_selected
      };
  
      return this.http.patch(problemUrl, patchBody).pipe(
        //tap(response => console.log('Synced Prioritized DQ Problem:', response)),
        catchError(this.handleError<any>('syncPrioritizedDQProblems'))
      );
    });
    return forkJoin(patchRequests);
  }
  
  
}
