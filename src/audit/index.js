/**
 * Audit Logging System
 * 
 * Complete audit trail for compliance and security
 */

export {
  AuditLogger,
  createAuditMiddleware,
  MongoAuditStorage,
  PostgresAuditStorage,
  MemoryAuditStorage
} from './AuditLogger.js';

export {
  Audited,
  AuditCreate,
  AuditUpdate,
  AuditDelete,
  AuditRead,
  Audit,
  setGlobalAuditLogger,
  getGlobalAuditLogger
} from './decorators.js';

import { AuditLogger, createAuditMiddleware } from './AuditLogger.js';
import { 
  Audited, 
  AuditCreate, 
  AuditUpdate, 
  AuditDelete, 
  AuditRead, 
  Audit,
  setGlobalAuditLogger,
  getGlobalAuditLogger
} from './decorators.js';

export default {
  AuditLogger,
  createAuditMiddleware,
  Audited,
  AuditCreate,
  AuditUpdate,
  AuditDelete,
  AuditRead,
  Audit,
  setGlobalAuditLogger,
  getGlobalAuditLogger
};
