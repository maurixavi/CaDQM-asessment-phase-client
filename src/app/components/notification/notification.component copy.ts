// notification.component.ts
import { Component } from '@angular/core';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification',
  template: `
    <div *ngIf="notification" class="notification" [ngClass]="'notification-' + notification.type">
      {{ notification.message }}
      <button (click)="dismiss()" class="close-btn">&times;</button>
    </div>
  `,
  styles: [`
    .notification {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px;
      border-radius: 5px;
      color: white;
      max-width: 300px;
      z-index: 1000;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .notification-success {
      background-color: #28a745;
    }
    .notification-error {
      background-color: #dc3545;
    }
    .notification-warning {
      background-color: #ffc107;
      color: #212529;
    }
    .close-btn {
      background: none;
      border: none;
      color: inherit;
      font-size: 1.2rem;
      cursor: pointer;
      margin-left: 10px;
    }
  `]
})
export class NotificationComponent {
  notification: {message: string, type: 'success' | 'error' | 'warning'} | null = null;

  constructor(private notificationService: NotificationService) {
    this.notificationService.notification$.subscribe(notification => {
      this.notification = notification;
    });
  }

  dismiss() {
    this.notificationService.clear();
  }
}