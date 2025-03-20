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
    HomeComponent
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
