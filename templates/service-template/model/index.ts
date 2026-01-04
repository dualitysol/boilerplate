/**
 * Service Model
 * 
 * Business logic and service data models
 */

export class {{ServiceName}}Model {
  constructor({ storage, eventBus, queueManager }) {
    this.storage = storage;
    this.eventBus = eventBus;
    this.queueManager = queueManager;
  }

  /**
   * Initialize model
   */
  async initialize() {
    console.log('📦 {{ServiceName}}Model initialized');
    
    // Subscribe to events
    await this.subscribeToEvents();
  }

  /**
   * Subscribe to events from other services
   */
  async subscribeToEvents() {
    // Example:
    // await this.eventBus.subscribe('user.created', async (data) => {
    //   await this.handleUserCreated(data);
    // });
  }

  /**
   * Example business logic method
   */
  async create(data) {
    // Validation
    this.validate(data);

    // Create record
    const item = await this.storage.insertOne('{{serviceName}}', {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Publish event
    await this.eventBus.publish('{{serviceName}}.created', {
      id: item.id,
      ...data
    });

    return item;
  }

  async findById(id) {
    return await this.storage.findOne('{{serviceName}}', { id });
  }

  async findAll(filter = {}) {
    return await this.storage.find('{{serviceName}}', filter);
  }

  async update(id, data) {
    const updated = await this.storage.updateOne('{{serviceName}}', { id }, {
      ...data,
      updatedAt: new Date().toISOString()
    });

    await this.eventBus.publish('{{serviceName}}.updated', {
      id,
      changes: data
    });

    return updated;
  }

  async delete(id) {
    const deleted = await this.storage.deleteOne('{{serviceName}}', { id });

    if (deleted) {
      await this.eventBus.publish('{{serviceName}}.deleted', { id });
    }

    return deleted;
  }

  validate(data) {
    // Implement validation
    if (!data) {
      throw new Error('Data is required');
    }
  }
}

export default {{ServiceName}}Model;
