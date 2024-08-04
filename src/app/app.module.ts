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
import { HeaderComponent } from './shared/header/header.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

import {DQMeasurementPreviewComponent} from './pages/dqmeasurement-preview-run/dqmeasurement-preview-run.component'
@NgModule({
  declarations: [
    AppComponent,
    DQProblemsPriorizationComponent,
    MainViewComponent,
    DQProblemsSelectionComponent,
    DqDimensionsFactorsSelectionComponent,
    HeaderComponent,
    DashboardComponent,
    DQMeasurementPreviewComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    DragDropModule,
    FormsModule 
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
