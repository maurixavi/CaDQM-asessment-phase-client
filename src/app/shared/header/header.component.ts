import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProjectDataService } from '../../services/project-data.service';


@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {

  currentProject: any = null;
  currentProjectId: number | null = null;

  constructor(
    private router: Router,
    private projectDataService: ProjectDataService
  ) {}

  ngOnInit() {
    this.currentProjectId = this.projectDataService.getProjectId();
    this.subscribeToData();
  }

  subscribeToData(): void {
    this.projectDataService.project$.subscribe((data) => {
      this.currentProject = data;
    });
  }

  // Método para determinar si Phase 2 debe estar activo
  isPhase2Active(): boolean {
    const currentRoute = this.router.url;
    return currentRoute !== '/'; // Activo en todas las rutas excepto en la raíz
  }

  getHomeRoute(): string {
    return this.isPhase2Enabled() ? '/phase2/dashboard' : '/';
  }
  
  isPhase2Enabled(): boolean {
    return this.currentProjectId !== null;
  }

  
  getStageStatus(stageCode: string): string | null {
    const project = this.currentProject;
    if (!project) return null;

    return project.stages.find((st: { stage: string; }) => st.stage === stageCode)?.status || null;
  }

  
  isStageEnabled(stageCode: string): boolean {
    const status = this.getStageStatus(stageCode);
  
    // Si el stage está en progreso o ya fue completado, se considera habilitado
    if (status === 'IN_PROGRESS' || status === 'DONE') {
      return true;
    }
  
    // Si el stage está en TO_DO, verificar si el stage anterior fue completado
    // Regla: ST5 se habilita si ST4 está DONE
    if (stageCode === 'ST5') {
      return this.getStageStatus('ST4') === 'DONE';
    }
  
    // Regla: ST6 se habilita si ST5 está DONE
    if (stageCode === 'ST6') {
      return this.getStageStatus('ST5') === 'DONE';
    }
  
    // Si no se cumplen condiciones, se considera deshabilitado
    return false;
  }
  

  getStageRoute(stageCode: string): string | null {

    const status = this.getStageStatus(stageCode);
    if (!status) return null;

    const routes: { [key: string]: { IN_PROGRESS: string, DONE: string } } = {
      'ST4': {
        IN_PROGRESS: '/phase2/st4/dq-problems-priorization',
        DONE: '/phase2/st4/dq-model'
      },
      'ST5': {
        IN_PROGRESS: '/phase2/st5/measurement-execution',
        DONE: '/phase2/st5/measurement-results'
      },
      'ST6': {
        IN_PROGRESS: '/phase2/st6/assessment-approaches',
        DONE: '/phase2/st6/assessment-execution'
      }
    };

    // Si el status es IN_PROGRESS o DONE, usar directamente la ruta correspondiente
    if (status === 'IN_PROGRESS' || status === 'DONE') {
      return routes[stageCode]?.[status] || null;
    }

    // Lógica adicional: si está en TO_DO pero la etapa anterior ya está DONE
    if (status === 'TO_DO') {
      if (stageCode === 'ST5' && this.getStageStatus('ST4') === 'DONE') {
        return routes['ST5'].IN_PROGRESS;
      }

      if (stageCode === 'ST6' && this.getStageStatus('ST5') === 'DONE') {
        return routes['ST6'].IN_PROGRESS;
      }
    }

    return null;
  }
  
  
}