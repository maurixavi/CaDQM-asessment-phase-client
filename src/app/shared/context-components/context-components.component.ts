import { Component, OnInit } from '@angular/core';
import { ContextComponentsService } from './context-components.service';
import { ChangeDetectorRef } from '@angular/core';
import { ProjectService } from '../../services/project.service';
import { ProjectDataService } from '../../services/project-data.service';
import { formatCtxCompCategoryName, getFirstNonIdAttribute, getCategoryAbbreviation, contextComponentCategories  } from '../../shared/utils/utils';

declare var bootstrap: any; 

@Component({
  selector: 'app-context-components',
  templateUrl: './context-components.component.html',
  styleUrls: ['./context-components.component.css'],
})
export class ContextComponentsComponent implements OnInit {

  contextData: any = {};
  isModalOpen = false;
  activeTab: string = 'context';
  dqProblems: any[] = [];
  projectId: number | null = null;
  project: any;
  allContextComponents: any = null;
  allDQProblems: any = null;
  dataSchema: any = null;
  selectedComponent: any = null;

  // Utilidades para el template
  public formatCtxCompCategoryName = formatCtxCompCategoryName;
  public getFirstNonIdAttribute = getFirstNonIdAttribute;
  public getCategoryAbbreviation = getCategoryAbbreviation;

  categories = contextComponentCategories;

  constructor(
    private contextService: ContextComponentsService,
    private projectService: ProjectService,
    private projectDataService: ProjectDataService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.contextData = this.contextService.getContextData();
    this.projectId = this.projectDataService.getProjectId();
    this.subscribeToData();
  }

  subscribeToData(): void {
    this.projectDataService.project$.subscribe((data) => {
      this.project = data;
    });

    this.projectDataService.contextComponents$.subscribe((data) => {
      this.allContextComponents = data;
      console.log('Context Components:', data);
    });

    this.projectDataService.dqProblems$.subscribe((data) => {
      this.allDQProblems = data;
      if (this.projectId) {
        this.loadDQProblems(this.projectId);
      }
    });
  }

  openModal() {
    this.isModalOpen = true;
    this.activeTab = 'context';
  }

  closeModal() {
    this.isModalOpen = false;
  }

  switchTab(tab: string) {
    this.activeTab = tab;
  }

  toggleAccordion(id: string) {
    const element = document.getElementById(id);
    if (element) {
      element.classList.toggle('show');
    }
  }

  private loadDQProblems(projectId: number): void {
    this.projectService.getDQProblemsByProjectId(projectId).subscribe({
      next: (data) => {
        this.dqProblems = data;
      },
      error: (err) => {
        console.error('Error loading DQ problems:', err);
      }
    });
  }

  // Obtener el primer atributo no 'id' de un componente
  getFirstAttribute(component: any): string {
    const keys = Object.keys(component).filter(key => key !== 'id');
    return keys.length > 0 ? component[keys[0]] : 'No details';
  }

  // Verificar si una categoría tiene componentes
  hasComponents(category: string): boolean {
    return this.allContextComponents && 
           this.allContextComponents[category] && 
           this.allContextComponents[category].length > 0;
  }

  getComponentKeys(component: any): string[] {
    return Object.keys(component).filter(key => key !== 'id');
  }

  formatKey(key: string): string {
    return key.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

}