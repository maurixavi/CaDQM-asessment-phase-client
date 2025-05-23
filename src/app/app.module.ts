import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http'; 
import { ReactiveFormsModule } from '@angular/forms'; 


import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MainViewComponent } from './pages/main-view/main-view.component';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { FormsModule } from '@angular/forms';

import { DQProblemsPriorizationComponent } from './pages/dqproblems-priorization/dqproblems-priorization.component';
import { DQProblemsSelectionComponent } from './pages/dqproblems-selection/dqproblems-selection.component';

import {DQMetricDefinitionComponent} from './pages/dqmeasurement-metric-definition/dqmeasurement-metric-definition.component';
import {DqDimensionsMethodsDefinitionComponent} from './pages/dq-dimensions-methods-definition/dq-dimensions-methods-definition.component';

import { DqDimensionsFactorsSelectionComponent } from './pages/dq-dimensions-factors-selection/dq-dimensions-factors-selection.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

import { DQMeasurementPreviewComponent } from './pages/dqmeasurement-preview-run/dqmeasurement-preview-run.component';

import { HeaderComponent } from './shared/header/header.component';
import { ContextComponentsComponent } from './shared/context-components/context-components.component';
import { ContextComponentsService } from './shared/context-components/context-components.service';
import { DQModelConfirmationComponent } from './pages/dqmodel-confirmation/dqmodel-confirmation.component';
import { StepNavigatorComponent } from './shared/step-navigator/step-navigator.component';

// Importar el servicio DqModelService
import { DqModelService } from './services/dq-model.service';
import { StepperComponent } from './shared/stepper/stepper.component';
import { HomeComponent } from './pages/home/home.component';
import { ModalComponent } from './components/modal/modal.component';
import { ConfirmationModalComponent } from './components/confirmation-modal/confirmation-modal.component';
import { DqMeasurementExecutionComponent } from './pages/dq-measurement-execution/dq-measurement-execution.component';
import { DataAtHandViewModalComponent } from './shared/data-at-hand-view-modal/data-at-hand-view-modal.component';
import { ContextComponentViewModalComponent } from './shared/context-component-view-modal/context-component-view-modal.component';
import { NotificationComponent } from './components/notification/notification.component';
import { DqMeasurementResultsComponent } from './pages/dq-measurement-results/dq-measurement-results.component';
import { DqAssessmentApproachesDefinitionComponent } from './pages/dq-assessment-approaches-definition/dq-assessment-approaches-definition.component';
import { DqAssessmentExecutionComponent } from './pages/dq-assessment-execution/dq-assessment-execution.component';


@NgModule({
  declarations: [
    AppComponent,
    DQProblemsPriorizationComponent,
    MainViewComponent,
    DQProblemsSelectionComponent,
    DqDimensionsFactorsSelectionComponent,
    HeaderComponent,
    DashboardComponent,
    DQMetricDefinitionComponent,
    DqDimensionsMethodsDefinitionComponent,
    DQMeasurementPreviewComponent,
    ContextComponentsComponent,
    DQModelConfirmationComponent,
    StepNavigatorComponent,
    StepperComponent,
    HomeComponent,
    ModalComponent,
    ConfirmationModalComponent,
    DqMeasurementExecutionComponent,
    DataAtHandViewModalComponent,
    ContextComponentViewModalComponent,
    NotificationComponent,
    DqMeasurementResultsComponent,
    DqAssessmentApproachesDefinitionComponent,
    DqAssessmentExecutionComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    DragDropModule,
    FormsModule,
    HttpClientModule,
    ReactiveFormsModule
  ],
  providers: [
    ContextComponentsService,
    DqModelService,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
