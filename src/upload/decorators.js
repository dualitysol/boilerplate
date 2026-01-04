/**
 * File Upload Decorators
 * 
 * Decorators for automatic file upload handling in GraphQL resolvers
 * 
 * @example
 * class UserService {
 *   @Upload({ field: 'avatar', maxSize: 5 * 1024 * 1024 })
 *   async updateAvatar(userId, { avatar }) {
 *     // avatar is already uploaded and contains file metadata
 *     return await db.users.update({ id: userId }, { avatar: avatar.url });
 *   }
 * }
 */

import { FileUploadHandler } from './FileUploadHandler.js';

// Global upload handler registry
const uploadHandlers = new Map();

/**
 * Set global upload handler
 */
export function setGlobalUploadHandler(handler) {
  uploadHandlers.set('default', handler);
}

/**
 * Get global upload handler
 */
export function getGlobalUploadHandler() {
  return uploadHandlers.get('default');
}

/**
 * @Upload decorator
 * Automatically handles file uploads in method
 * 
 * @example
 * @Upload({ field: 'avatar', maxSize: 5MB, allowedTypes: ['image/jpeg', 'image/png'] })
 * async updateAvatar(userId, { avatar }) {
 *   // avatar contains: { id, filename, url, size, mimeType, hash }
 * }
 */
export function Upload(options = {}) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args) {
      const field = options.field || 'file';
      const uploadHandler = options.handler || getGlobalUploadHandler();
      
      if (!uploadHandler) {
        throw new Error('No upload handler configured. Use setGlobalUploadHandler() first.');
      }
      
      // Find file in arguments
      let fileData = null;
      for (const arg of args) {
        if (arg && arg[field]) {
          fileData = arg[field];
          break;
        }
      }
      
      if (!fileData) {
        // No file to upload, proceed normally
        return await originalMethod.apply(this, args);
      }
      
      // Handle GraphQL Upload scalar
      if (typeof fileData.then === 'function') {
        fileData = await fileData;
      }
      
      // Upload file
      const uploadedFile = await uploadHandler.upload(fileData.createReadStream(), {
        filename: fileData.filename,
        mimeType: fileData.mimetype,
        encoding: fileData.encoding
      });
      
      // Replace file data with uploaded file metadata
      for (const arg of args) {
        if (arg && arg[field]) {
          arg[field] = uploadedFile;
          break;
        }
      }
      
      return await originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

/**
 * @MultiUpload decorator
 * Handle multiple file uploads
 * 
 * @example
 * @MultiUpload({ field: 'photos', maxFiles: 10 })
 * async uploadPhotos(albumId, { photos }) {
 *   // photos is array of uploaded files
 * }
 */
export function MultiUpload(options = {}) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args) {
      const field = options.field || 'files';
      const maxFiles = options.maxFiles || 10;
      const uploadHandler = options.handler || getGlobalUploadHandler();
      
      if (!uploadHandler) {
        throw new Error('No upload handler configured');
      }
      
      // Find files in arguments
      let filesData = null;
      for (const arg of args) {
        if (arg && arg[field]) {
          filesData = arg[field];
          break;
        }
      }
      
      if (!filesData || !Array.isArray(filesData)) {
        return await originalMethod.apply(this, args);
      }
      
      // Check max files
      if (filesData.length > maxFiles) {
        throw new Error(`Too many files: ${filesData.length} (max: ${maxFiles})`);
      }
      
      // Upload all files
      const uploadPromises = filesData.map(async (fileData) => {
        if (typeof fileData.then === 'function') {
          fileData = await fileData;
        }
        
        return await uploadHandler.upload(fileData.createReadStream(), {
          filename: fileData.filename,
          mimeType: fileData.mimetype,
          encoding: fileData.encoding
        });
      });
      
      const uploadedFiles = await Promise.all(uploadPromises);
      
      // Replace files data with uploaded files metadata
      for (const arg of args) {
        if (arg && arg[field]) {
          arg[field] = uploadedFiles;
          break;
        }
      }
      
      return await originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

/**
 * @ImageUpload decorator
 * Handle image uploads with automatic optimization
 * 
 * @example
 * @ImageUpload({ field: 'avatar', maxWidth: 500, maxHeight: 500, quality: 80 })
 * async updateAvatar(userId, { avatar }) {
 *   // avatar is optimized image
 * }
 */
export function ImageUpload(options = {}) {
  const uploadOptions = {
    ...options,
    imageOptimization: true,
    imageOptions: {
      maxWidth: options.maxWidth || 1920,
      maxHeight: options.maxHeight || 1080,
      quality: options.quality || 80,
      format: options.format || 'jpeg'
    },
    allowedTypes: options.allowedTypes || [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif'
    ]
  };
  
  return Upload(uploadOptions);
}

/**
 * Create GraphQL Upload scalar
 */
export function createUploadScalar() {
  const { GraphQLUpload } = require('graphql-upload');
  return GraphQLUpload;
}

/**
 * Create Express middleware for file uploads
 */
export function createUploadMiddleware(uploadHandler, options = {}) {
  return async (req, res, next) => {
    // This would work with libraries like multer or busboy
    // For simplicity, we'll handle basic multipart/form-data
    
    if (!req.is('multipart/form-data')) {
      return next();
    }
    
    try {
      const Busboy = (await import('busboy')).default;
      
      const busboy = Busboy({ headers: req.headers });
      const files = [];
      const fields = {};
      
      busboy.on('file', (fieldname, file, info) => {
        const { filename, encoding, mimeType } = info;
        
        files.push({
          fieldname,
          stream: file,
          filename,
          encoding,
          mimeType
        });
      });
      
      busboy.on('field', (fieldname, value) => {
        fields[fieldname] = value;
      });
      
      busboy.on('finish', async () => {
        try {
          // Upload files
          const uploadedFiles = [];
          
          for (const file of files) {
            const uploaded = await uploadHandler.upload(file.stream, {
              filename: file.filename,
              encoding: file.encoding,
              mimeType: file.mimeType
            });
            
            uploadedFiles.push({
              fieldname: file.fieldname,
              ...uploaded
            });
          }
          
          // Attach to request
          req.files = uploadedFiles;
          req.body = fields;
          
          next();
        } catch (error) {
          res.status(400).json({ error: error.message });
        }
      });
      
      req.pipe(busboy);
      
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Create chunked upload handler for large files
 */
export class ChunkedUploadHandler {
  constructor(uploadHandler, options = {}) {
    this.uploadHandler = uploadHandler;
    this.chunkSize = options.chunkSize || 5 * 1024 * 1024; // 5MB
    this.uploadDir = options.uploadDir || './temp/chunks';
    this.uploads = new Map();
  }

  /**
   * Initialize chunked upload
   */
  async initUpload(fileId, fileInfo) {
    const uploadInfo = {
      fileId,
      ...fileInfo,
      chunks: [],
      uploadedChunks: 0,
      totalChunks: Math.ceil(fileInfo.totalSize / this.chunkSize),
      startedAt: new Date()
    };
    
    this.uploads.set(fileId, uploadInfo);
    
    return uploadInfo;
  }

  /**
   * Upload chunk
   */
  async uploadChunk(fileId, chunkIndex, chunkData) {
    const uploadInfo = this.uploads.get(fileId);
    
    if (!uploadInfo) {
      throw new Error(`Upload not initialized: ${fileId}`);
    }
    
    // Save chunk to temp directory
    const chunkPath = path.join(this.uploadDir, `${fileId}_${chunkIndex}`);
    await fs.writeFile(chunkPath, chunkData);
    
    uploadInfo.chunks[chunkIndex] = chunkPath;
    uploadInfo.uploadedChunks++;
    
    return {
      fileId,
      chunkIndex,
      uploadedChunks: uploadInfo.uploadedChunks,
      totalChunks: uploadInfo.totalChunks,
      progress: (uploadInfo.uploadedChunks / uploadInfo.totalChunks) * 100
    };
  }

  /**
   * Complete chunked upload
   */
  async completeUpload(fileId) {
    const uploadInfo = this.uploads.get(fileId);
    
    if (!uploadInfo) {
      throw new Error(`Upload not initialized: ${fileId}`);
    }
    
    if (uploadInfo.uploadedChunks !== uploadInfo.totalChunks) {
      throw new Error(
        `Upload incomplete: ${uploadInfo.uploadedChunks}/${uploadInfo.totalChunks} chunks`
      );
    }
    
    // Combine chunks
    const finalPath = path.join(this.uploadDir, `${fileId}_final`);
    const writeStream = createWriteStream(finalPath);
    
    for (let i = 0; i < uploadInfo.totalChunks; i++) {
      const chunkPath = uploadInfo.chunks[i];
      const chunkData = await fs.readFile(chunkPath);
      writeStream.write(chunkData);
      
      // Delete chunk
      await fs.unlink(chunkPath);
    }
    
    writeStream.end();
    
    // Wait for write to complete
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
    
    // Upload final file
    const stream = createReadStream(finalPath);
    const uploadedFile = await this.uploadHandler.upload(stream, {
      filename: uploadInfo.filename
    });
    
    // Cleanup
    await fs.unlink(finalPath);
    this.uploads.delete(fileId);
    
    return uploadedFile;
  }

  /**
   * Cancel upload
   */
  async cancelUpload(fileId) {
    const uploadInfo = this.uploads.get(fileId);
    
    if (!uploadInfo) {
      return;
    }
    
    // Delete all chunks
    for (const chunkPath of uploadInfo.chunks) {
      if (chunkPath) {
        try {
          await fs.unlink(chunkPath);
        } catch (error) {
          // Ignore errors
        }
      }
    }
    
    this.uploads.delete(fileId);
  }
}

export default {
  Upload,
  MultiUpload,
  ImageUpload,
  createUploadScalar,
  createUploadMiddleware,
  ChunkedUploadHandler,
  setGlobalUploadHandler,
  getGlobalUploadHandler
};
