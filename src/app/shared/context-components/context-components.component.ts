import { Component, OnInit } from '@angular/core';
import { ContextComponentsService } from './context-components.service';

@Component({
  selector: 'app-context-components',
  templateUrl: './context-components.component.html',
  styleUrls: ['./context-components.component.css'],
})
export class ContextComponentsComponent implements OnInit {
  contextData: any[] = [];
  isModalOpen = false;

  constructor(private contextService: ContextComponentsService) {}

  ngOnInit() {
    this.contextData = this.contextService.getContextData();
  }

  openModal() {
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  toggleAccordion(id: string) {
    const element = document.getElementById(id);
    if (element) {
      element.classList.toggle('show');
    }
  }
}
