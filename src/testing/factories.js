/**
 * Test Data Factories
 * 
 * Pre-configured factories for common data structures
 * 
 * @example
 * import { UserFactory, ProductFactory } from '@dualitysol/boilerplate/testing';
 * 
 * const user = UserFactory.build();
 * const users = UserFactory.buildMany(10);
 * const admin = UserFactory.build({ roles: ['admin'] });
 */

import { DataGenerator } from './TestingUtilities.js';

/**
 * Base Factory
 */
export class Factory {
  constructor(schema, options = {}) {
    this.schema = schema;
    this.generator = new DataGenerator(options);
    this.traits = new Map();
    this.sequences = new Map();
  }

  /**
   * Build single object
   */
  build(overrides = {}) {
    const obj = this.generator.object(this.schema);
    return { ...obj, ...overrides };
  }

  /**
   * Build many objects
   */
  buildMany(count, overrides = {}) {
    return Array.from({ length: count }, () => this.build(overrides));
  }

  /**
   * Build with trait
   */
  buildWithTrait(traitName, overrides = {}) {
    const trait = this.traits.get(traitName);
    
    if (!trait) {
      throw new Error(`Trait "${traitName}" not found`);
    }
    
    const obj = this.build();
    return { ...obj, ...trait(obj), ...overrides };
  }

  /**
   * Define trait
   */
  trait(name, attributes) {
    this.traits.set(name, attributes);
    return this;
  }

  /**
   * Create sequence
   */
  sequence(name, start = 1) {
    return () => this.generator.sequence(name, start);
  }
}

/**
 * User Factory
 */
export class UserFactory extends Factory {
  constructor() {
    super({
      id: (gen) => `user_${gen.sequence('user')}`,
      email: (gen) => gen.email(),
      username: (gen) => gen.string(8).toLowerCase(),
      password: () => 'password123',
      firstName: (gen) => gen.pick(['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana']),
      lastName: (gen) => gen.pick(['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia']),
      age: (gen) => gen.number(18, 80),
      roles: () => ['user'],
      isActive: () => true,
      createdAt: (gen) => gen.date(),
      updatedAt: (gen) => gen.date()
    });

    // Define common traits
    this.trait('admin', {
      roles: ['admin', 'user']
    });

    this.trait('inactive', {
      isActive: false
    });

    this.trait('verified', {
      emailVerified: true,
      emailVerifiedAt: new Date()
    });
  }
}

/**
 * Product Factory
 */
export class ProductFactory extends Factory {
  constructor() {
    super({
      id: (gen) => `product_${gen.sequence('product')}`,
      name: (gen) => `Product ${gen.string(5)}`,
      description: (gen) => `Description for ${gen.string(20)}`,
      price: (gen) => gen.number(10, 1000) / 10,
      currency: () => 'USD',
      stock: (gen) => gen.number(0, 100),
      category: (gen) => gen.pick(['Electronics', 'Clothing', 'Books', 'Home', 'Sports']),
      tags: (gen) => gen.array(() => gen.string(5), gen.number(1, 5)),
      isPublished: () => true,
      createdAt: (gen) => gen.date(),
      updatedAt: (gen) => gen.date()
    });

    this.trait('outOfStock', {
      stock: 0
    });

    this.trait('onSale', (product) => ({
      salePrice: product.price * 0.8,
      onSale: true
    }));

    this.trait('featured', {
      isFeatured: true
    });
  }
}

/**
 * Order Factory
 */
export class OrderFactory extends Factory {
  constructor() {
    super({
      id: (gen) => `order_${gen.sequence('order')}`,
      userId: (gen) => `user_${gen.number(1, 100)}`,
      status: (gen) => gen.pick(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
      total: (gen) => gen.number(10, 1000) / 10,
      currency: () => 'USD',
      items: (gen) => gen.array(() => ({
        productId: `product_${gen.number(1, 100)}`,
        quantity: gen.number(1, 5),
        price: gen.number(10, 100) / 10
      }), gen.number(1, 5)),
      shippingAddress: (gen) => ({
        street: `${gen.number(1, 999)} ${gen.string(8)} St`,
        city: gen.pick(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix']),
        state: gen.pick(['NY', 'CA', 'IL', 'TX', 'AZ']),
        zipCode: gen.string(5, '0123456789'),
        country: 'USA'
      }),
      createdAt: (gen) => gen.date(),
      updatedAt: (gen) => gen.date()
    });

    this.trait('completed', {
      status: 'delivered',
      deliveredAt: new Date()
    });

    this.trait('cancelled', {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancellationReason: 'Customer request'
    });
  }
}

/**
 * Post Factory
 */
export class PostFactory extends Factory {
  constructor() {
    super({
      id: (gen) => `post_${gen.sequence('post')}`,
      title: (gen) => `Post Title ${gen.string(10)}`,
      content: (gen) => gen.array(() => gen.string(50), 5).join(' '),
      authorId: (gen) => `user_${gen.number(1, 100)}`,
      status: (gen) => gen.pick(['draft', 'published', 'archived']),
      tags: (gen) => gen.array(() => gen.string(5), gen.number(1, 5)),
      viewCount: (gen) => gen.number(0, 10000),
      likeCount: (gen) => gen.number(0, 1000),
      commentCount: (gen) => gen.number(0, 100),
      createdAt: (gen) => gen.date(),
      updatedAt: (gen) => gen.date()
    });

    this.trait('published', {
      status: 'published',
      publishedAt: new Date()
    });

    this.trait('popular', {
      viewCount: 10000,
      likeCount: 1000,
      commentCount: 100
    });
  }
}

/**
 * Comment Factory
 */
export class CommentFactory extends Factory {
  constructor() {
    super({
      id: (gen) => `comment_${gen.sequence('comment')}`,
      content: (gen) => gen.array(() => gen.string(30), gen.number(1, 3)).join(' '),
      authorId: (gen) => `user_${gen.number(1, 100)}`,
      postId: (gen) => `post_${gen.number(1, 100)}`,
      parentId: () => null,
      likeCount: (gen) => gen.number(0, 100),
      isEdited: () => false,
      createdAt: (gen) => gen.date(),
      updatedAt: (gen) => gen.date()
    });

    this.trait('reply', (comment) => ({
      parentId: `comment_${new DataGenerator().number(1, 100)}`
    }));
  }
}

/**
 * Category Factory
 */
export class CategoryFactory extends Factory {
  constructor() {
    super({
      id: (gen) => `category_${gen.sequence('category')}`,
      name: (gen) => gen.pick(['Technology', 'Fashion', 'Food', 'Travel', 'Health', 'Education']),
      slug: (gen) => gen.string(8).toLowerCase(),
      description: (gen) => gen.string(50),
      parentId: () => null,
      order: (gen) => gen.sequence('category_order'),
      isActive: () => true,
      createdAt: (gen) => gen.date(),
      updatedAt: (gen) => gen.date()
    });

    this.trait('subcategory', {
      parentId: (gen) => `category_${gen.number(1, 10)}`
    });
  }
}

/**
 * Notification Factory
 */
export class NotificationFactory extends Factory {
  constructor() {
    super({
      id: (gen) => `notification_${gen.sequence('notification')}`,
      userId: (gen) => `user_${gen.number(1, 100)}`,
      type: (gen) => gen.pick(['info', 'success', 'warning', 'error']),
      title: (gen) => `Notification ${gen.string(10)}`,
      message: (gen) => gen.string(50),
      isRead: () => false,
      readAt: () => null,
      data: () => ({}),
      createdAt: (gen) => gen.date()
    });

    this.trait('read', {
      isRead: true,
      readAt: new Date()
    });
  }
}

/**
 * Message Factory
 */
export class MessageFactory extends Factory {
  constructor() {
    super({
      id: (gen) => `message_${gen.sequence('message')}`,
      chatId: (gen) => `chat_${gen.number(1, 50)}`,
      senderId: (gen) => `user_${gen.number(1, 100)}`,
      content: (gen) => gen.string(100),
      type: () => 'text',
      isRead: () => false,
      readAt: () => null,
      createdAt: (gen) => gen.date(),
      updatedAt: (gen) => gen.date()
    });

    this.trait('read', {
      isRead: true,
      readAt: new Date()
    });

    this.trait('image', {
      type: 'image',
      imageUrl: (gen) => `https://example.com/images/${gen.string(10)}.jpg`
    });
  }
}

/**
 * File Factory
 */
export class FileFactory extends Factory {
  constructor() {
    super({
      id: (gen) => `file_${gen.sequence('file')}`,
      filename: (gen) => `${gen.string(8)}.${gen.pick(['jpg', 'png', 'pdf', 'docx', 'xlsx'])}`,
      originalName: (gen) => `original_${gen.string(10)}`,
      mimeType: (gen) => gen.pick(['image/jpeg', 'image/png', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
      size: (gen) => gen.number(1000, 10000000),
      path: (gen) => `/uploads/${gen.string(20)}`,
      url: (gen) => `https://example.com/files/${gen.string(20)}`,
      uploadedBy: (gen) => `user_${gen.number(1, 100)}`,
      createdAt: (gen) => gen.date()
    });

    this.trait('image', {
      mimeType: 'image/jpeg',
      filename: (gen) => `${gen.string(8)}.jpg`,
      width: (gen) => gen.number(100, 2000),
      height: (gen) => gen.number(100, 2000)
    });

    this.trait('document', {
      mimeType: 'application/pdf',
      filename: (gen) => `${gen.string(8)}.pdf`
    });
  }
}

/**
 * Session Factory
 */
export class SessionFactory extends Factory {
  constructor() {
    super({
      id: (gen) => `session_${gen.sequence('session')}`,
      userId: (gen) => `user_${gen.number(1, 100)}`,
      token: (gen) => gen.string(32),
      ipAddress: (gen) => `${gen.number(1, 255)}.${gen.number(1, 255)}.${gen.number(1, 255)}.${gen.number(1, 255)}`,
      userAgent: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      expiresAt: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: (gen) => gen.date()
    });

    this.trait('expired', {
      expiresAt: new Date(Date.now() - 1000)
    });
  }
}

// Export factory instances
export const userFactory = new UserFactory();
export const productFactory = new ProductFactory();
export const orderFactory = new OrderFactory();
export const postFactory = new PostFactory();
export const commentFactory = new CommentFactory();
export const categoryFactory = new CategoryFactory();
export const notificationFactory = new NotificationFactory();
export const messageFactory = new MessageFactory();
export const fileFactory = new FileFactory();
export const sessionFactory = new SessionFactory();

export default {
  Factory,
  UserFactory,
  ProductFactory,
  OrderFactory,
  PostFactory,
  CommentFactory,
  CategoryFactory,
  NotificationFactory,
  MessageFactory,
  FileFactory,
  SessionFactory,
  userFactory,
  productFactory,
  orderFactory,
  postFactory,
  commentFactory,
  categoryFactory,
  notificationFactory,
  messageFactory,
  fileFactory,
  sessionFactory
};
