import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { HomeComponent } from './pages/home/home.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

// Stage 4: DQ Model Definition
import { DQProblemsPriorizationComponent } from './pages/stage4-dq-model-definition/dqproblems-priorization/dqproblems-priorization.component';
import { DQProblemsSelectionComponent } from './pages/stage4-dq-model-definition/dqproblems-selection/dqproblems-selection.component';
import { DqDimensionsFactorsSelectionComponent } from './pages/stage4-dq-model-definition/dq-dimensions-factors-selection/dq-dimensions-factors-selection.component';
import { DQMetricsDefinitionComponent} from './pages/stage4-dq-model-definition/dq-metrics-definition/dq-metrics-definition.component';
import { DqMethodsDefinitionComponent } from './pages/stage4-dq-model-definition/dq-methods-definition/dq-methods-definition.component';
import { DQModelConfirmationComponent } from './pages/dqmodel-confirmation/dqmodel-confirmation.component';

// Stage 5: DQ Measurement
import { DqMeasurementExecutionComponent } from './pages/stage5-dq-measurement/dq-measurement-execution/dq-measurement-execution.component';
import { DqMeasurementResultsComponent } from './pages/stage5-dq-measurement/dq-measurement-results/dq-measurement-results.component';
 
// Stage 6: DQ Assessment
import { DqAssessmentApproachesDefinitionComponent } from  './pages/stage6-dq-assessment/dq-assessment-approaches-definition/dq-assessment-approaches-definition.component';
import { DqAssessmentExecutionComponent } from  './pages/stage6-dq-assessment/dq-assessment-execution/dq-assessment-execution.component';
 
const routes: Routes = [
  { path: '', component: HomeComponent },
  {
    path: 'phase2',
    children: [
      { path: 'dashboard', component: DashboardComponent },
      {
        path: 'st4',
        children: [
          { path: 'dq-problems-priorization', component: DQProblemsPriorizationComponent },
          { path: 'dq-problems-selection', component: DQProblemsSelectionComponent },
          { path: 'dq-dimensions-factors', component: DqDimensionsFactorsSelectionComponent },
          { path: 'dq-metrics', component: DQMetricsDefinitionComponent },
          { path: 'dq-methods', component: DqMethodsDefinitionComponent },
          { path: 'dq-model', component: DQModelConfirmationComponent }
        ]
      },
      {
        path: 'st5',
        children: [
          { path: 'measurement-execution', component: DqMeasurementExecutionComponent },
          { path: 'measurement-results', component: DqMeasurementResultsComponent }
        ]
      },
      {
        path: 'st6',
        children: [
          { path: 'assessment-approaches', component: DqAssessmentApproachesDefinitionComponent },
          { path: 'assessment-execution', component: DqAssessmentExecutionComponent }
        ]
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }