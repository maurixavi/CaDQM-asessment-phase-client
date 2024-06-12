import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainViewComponent } from './pages/main-view/main-view.component';
import { DQProblemsPriorizationComponent } from './pages/dqproblems-priorization/dqproblems-priorization.component'
import { DQProblemsSelectionComponent } from './pages/dqproblems-selection/dqproblems-selection.component';
import { AppComponent } from './app.component'
import { DqDimensionsFactorsSelectionComponent } from './pages/dq-dimensions-factors-selection/dq-dimensions-factors-selection.component';

const routes: Routes = [
  { path: 'step1', component: DQProblemsPriorizationComponent },
  { path: 'step2', component: DQProblemsSelectionComponent },
  { path: 'step3', component: DqDimensionsFactorsSelectionComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
