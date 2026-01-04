/**
 * NotificationService - Handles notifications (console logs for demo)
 */

export class NotificationService {
  constructor({ eventBus, queueManager }) {
    this.eventBus = eventBus;
    this.queueManager = queueManager;
    this.name = 'NotificationService';
  }

  async initialize() {
    console.log('🔔 NotificationService initialized');

    // Subscribe to events
    this.eventBus.subscribe('user.registered', (data) => {
      this.queueManager.send('notifications', {
        type: 'welcome',
        userId: data.userId,
        message: `Welcome ${data.username}! 🎉`
      });
    });

    this.eventBus.subscribe('todo.created', (data) => {
      this.queueManager.send('notifications', {
        type: 'todo_created',
        userId: data.userId,
        message: `New todo created: "${data.title}"`
      });
    });

    this.eventBus.subscribe('todo.completed', (data) => {
      this.queueManager.send('notifications', {
        type: 'todo_completed',
        userId: data.userId,
        message: `Todo completed: "${data.title}" ✅`
      });
    });

    // Process notification queue
    this.queueManager.process('notifications', async (notification) => {
      await this.sendNotification(notification);
    }, { interval: 1000 });
  }

  async sendNotification(notification) {
    // In a real app, this would send email, push notification, etc.
    console.log(`📬 [${notification.type}] User ${notification.userId}: ${notification.message}`);
  }
}
