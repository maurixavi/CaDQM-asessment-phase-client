import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MainViewComponent } from './pages/main-view/main-view.component';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { FormsModule } from '@angular/forms';

import { DQProblemsPriorizationComponent } from './pages/dqproblems-priorization/dqproblems-priorization.component';
import { DQProblemsSelectionComponent } from './pages/dqproblems-selection/dqproblems-selection.component';

import { DqDimensionsFactorsSelectionComponent } from './pages/dq-dimensions-factors-selection/dq-dimensions-factors-selection.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

import {DQMetricDefinitionComponent} from './pages/dqmeasurement-metric-definition/dqmeasurement-metric-definition.component';
import {DqDimensionsMethodsDefinitionComponent} from './pages/dq-dimensions-methods-definition/dq-dimensions-methods-definition.component';
import { HeaderComponent } from './shared/header/header.component';

import { ContextComponentsComponent } from './shared/context-components/context-components.component';
import { ContextComponentsService } from './shared/context-components/context-components.service';
import { DQModelConfirmationComponent } from './pages/dqmodel-confirmation/dqmodel-confirmation.component';
import { StepNavigatorComponent } from './shared/step-navigator/step-navigator.component';



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
    ContextComponentsComponent,
    DQModelConfirmationComponent,
    StepNavigatorComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    DragDropModule,
    FormsModule 
  ],
  providers: [ContextComponentsService],
  bootstrap: [AppComponent]
})
export class AppModule { }
