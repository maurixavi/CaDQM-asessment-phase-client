import { Component } from '@angular/core';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.css']
})
export class NotificationComponent {
  notification: {message: string, type: 'success' | 'warning' | 'error'} | null = null;

  constructor(private notificationService: NotificationService) {
    this.notificationService.notification$.subscribe(notification => {
      this.notification = notification;
    });
  }

  getIcon(): string {
    if (!this.notification) return '';
    switch(this.notification.type) {
      case 'success': return 'bi-check-circle';
      case 'warning': return 'bi-exclamation-triangle';
      case 'error': return 'bi-x-circle';
      default: return 'bi-info-circle';
    }
  }

  dismiss() {
    this.notificationService.clear();
  }
}