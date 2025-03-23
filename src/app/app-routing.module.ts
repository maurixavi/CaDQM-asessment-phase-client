import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainViewComponent } from './pages/main-view/main-view.component';
import { DQProblemsPriorizationComponent } from './pages/dqproblems-priorization/dqproblems-priorization.component'
import { DQProblemsSelectionComponent } from './pages/dqproblems-selection/dqproblems-selection.component';
import { AppComponent } from './app.component'
import { DqDimensionsFactorsSelectionComponent } from './pages/dq-dimensions-factors-selection/dq-dimensions-factors-selection.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component'
import { DQMeasurementPreviewComponent } from './pages/dqmeasurement-preview-run/dqmeasurement-preview-run.component';
import { DQModelConfirmationComponent } from './pages/dqmodel-confirmation/dqmodel-confirmation.component';
import {DQMetricDefinitionComponent} from './pages/dqmeasurement-metric-definition/dqmeasurement-metric-definition.component';
import { DqDimensionsMethodsDefinitionComponent } from './pages/dq-dimensions-methods-definition/dq-dimensions-methods-definition.component';
import { HomeComponent } from './pages/home/home.component'

import { DqMeasurementExecutionComponent } from './pages/dq-measurement-execution/dq-measurement-execution.component';
 
/*const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'st4/a09-1', component: DQProblemsPriorizationComponent },
  { path: 'st4/a09-2', component: DQProblemsSelectionComponent },
  { path: 'st4/a10', component: DqDimensionsFactorsSelectionComponent },
  {path: 'st4/a11', component: DQMetricDefinitionComponent},
  {path: 'st4/a12', component: DqDimensionsMethodsDefinitionComponent},
  { path: 'st4/confirmation-stage-4', component: DQModelConfirmationComponent }
];*/
const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'phase2/dashboard', component: DashboardComponent },
  { path: 'st5/execution', component: DqMeasurementExecutionComponent },
  { path: 'st4', children: [
    { path: 'a09-1', component: DQProblemsPriorizationComponent },
    { path: 'a09-2', component: DQProblemsSelectionComponent },
    { path: 'a10', component: DqDimensionsFactorsSelectionComponent },
    { path: 'a11', component: DQMetricDefinitionComponent },
    { path: 'a12', component: DqDimensionsMethodsDefinitionComponent },
    { path: 'confirmation-stage-4', component: DQModelConfirmationComponent }
  ]}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
