import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainViewComponent } from './pages/main-view/main-view.component';
import { DQProblemsPriorizationComponent } from './pages/dqproblems-priorization/dqproblems-priorization.component'
import { DQProblemsSelectionComponent } from './pages/dqproblems-selection/dqproblems-selection.component';
import { AppComponent } from './app.component'
import { DqDimensionsFactorsSelectionComponent } from './pages/dq-dimensions-factors-selection/dq-dimensions-factors-selection.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component'
import { DQMetricDefinitionComponent } from './pages/dqmeasurement-metric-definition/dqmeasurement-metric-definition.component';
import { DqDimensionsMethodsDefinitionComponent } from './pages/dq-dimensions-methods-definition/dq-dimensions-methods-definition.component';
import { DQModelConfirmationComponent } from './pages/dqmodel-confirmation/dqmodel-confirmation.component';

const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'step1', component: DQProblemsPriorizationComponent },
  { path: 'step2', component: DQProblemsSelectionComponent },
  { path: 'step3', component: DqDimensionsFactorsSelectionComponent },
  {path: 'step4', component: DQMetricDefinitionComponent},
  {path: 'step5', component: DqDimensionsMethodsDefinitionComponent},
  { path: 'step7', component: DQModelConfirmationComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
