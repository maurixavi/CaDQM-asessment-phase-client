import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationSubject = new BehaviorSubject<{message: string, type: 'success' | 'error' | 'warning'} | null>(null);
  notification$ = this.notificationSubject.asObservable();

  showSuccess(message: string) {
    this.notificationSubject.next({message, type: 'success'});
    setTimeout(() => this.clear(), 5000);
  }

  showError(message: string) {
    this.notificationSubject.next({message, type: 'error'});
    setTimeout(() => this.clear(), 5000);
  }

  showWarning(message: string) {
    this.notificationSubject.next({message, type: 'warning'});
    setTimeout(() => this.clear(), 5000);
  }

  clear() {
    this.notificationSubject.next(null);
  }
}