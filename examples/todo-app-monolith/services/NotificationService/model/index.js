/**
 * NotificationService Model
 * Handles notifications (console logs for demo)
 */

export class NotificationModel {
  constructor({ storage, eventBus, queueManager }) {
    this.storage = storage;
    this.eventBus = eventBus;
    this.queueManager = queueManager;
  }

  async initialize() {
    console.log('🔔 NotificationService initialized');
    await this.subscribeToEvents();
    await this.startQueueProcessing();
  }

  async subscribeToEvents() {
    // Subscribe to user registration
    await this.eventBus.subscribe('user.registered', (data) => {
      this.queueManager.send('notifications', {
        type: 'welcome',
        userId: data.userId,
        message: `Welcome ${data.username}! 🎉`
      });
    });

    // Subscribe to todo creation
    await this.eventBus.subscribe('todo.created', (data) => {
      this.queueManager.send('notifications', {
        type: 'todo_created',
        userId: data.userId,
        message: `New todo created: "${data.title}"`
      });
    });

    // Subscribe to todo completion
    await this.eventBus.subscribe('todo.completed', (data) => {
      this.queueManager.send('notifications', {
        type: 'todo_completed',
        userId: data.userId,
        message: `Todo completed: "${data.title}" ✅`
      });
    });

    // Subscribe to user login
    await this.eventBus.subscribe('user.loggedIn', (data) => {
      this.queueManager.send('notifications', {
        type: 'login',
        userId: data.userId,
        message: `Welcome back, ${data.username}!`
      });
    });
  }

  async startQueueProcessing() {
    // Process notification queue
    this.queueManager.process('notifications', async (notification) => {
      await this.sendNotification(notification);
    }, { interval: 1000 });
  }

  async sendNotification(notification) {
    // In a real app, this would send email, push notification, SMS, etc.
    console.log(`📬 [${notification.type}] User ${notification.userId}: ${notification.message}`);
    
    // Store notification in database for history
    if (this.storage) {
      await this.storage.insertOne('notifications', {
        ...notification,
        sentAt: new Date().toISOString(),
        status: 'sent'
      });
    }
    
    return true;
  }

  // Get notifications for a user
  async findByUser(userId, limit = 10) {
    if (!this.storage) {
      return [];
    }
    return await this.storage.find('notifications', { userId }, { limit });
  }

  // Mark notification as read
  async markAsRead(id) {
    if (!this.storage) {
      return false;
    }
    return await this.storage.updateOne('notifications', { id }, {
      status: 'read',
      readAt: new Date().toISOString()
    });
  }
}

export default NotificationModel;
