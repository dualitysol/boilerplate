/**
 * Binary Filter Utilities
 * 
 * Helper utilities for working with binary filters
 */

/**
 * Bitwise Operations Helper
 */
export class BitwiseOps {
  /**
   * Set bit at position
   */
  static setBit(num, position) {
    return num | (1n << BigInt(position));
  }

  /**
   * Clear bit at position
   */
  static clearBit(num, position) {
    return num & ~(1n << BigInt(position));
  }

  /**
   * Toggle bit at position
   */
  static toggleBit(num, position) {
    return num ^ (1n << BigInt(position));
  }

  /**
   * Check if bit is set
   */
  static isBitSet(num, position) {
    return (num & (1n << BigInt(position))) !== 0n;
  }

  /**
   * Count set bits (population count)
   */
  static popcount(num) {
    let count = 0;
    while (num > 0n) {
      count += Number(num & 1n);
      num >>= 1n;
    }
    return count;
  }

  /**
   * Get bits in range [start, end]
   */
  static getBitsInRange(num, start, end) {
    const length = end - start + 1;
    const mask = (1n << BigInt(length)) - 1n;
    return (num >> BigInt(start)) & mask;
  }

  /**
   * Set bits in range
   */
  static setBitsInRange(num, start, end, value) {
    const length = end - start + 1;
    const mask = (1n << BigInt(length)) - 1n;
    
    // Clear existing bits
    const clearMask = ~(mask << BigInt(start));
    num &= clearMask;
    
    // Set new value
    const shiftedValue = (BigInt(value) & mask) << BigInt(start);
    return num | shiftedValue;
  }

  /**
   * Find first set bit (rightmost)
   */
  static findFirstSetBit(num) {
    if (num === 0n) return -1;
    
    let position = 0;
    while ((num & 1n) === 0n) {
      num >>= 1n;
      position++;
    }
    return position;
  }

  /**
   * Reverse bits
   */
  static reverseBits(num, totalBits = 64) {
    let result = 0n;
    for (let i = 0; i < totalBits; i++) {
      if ((num & (1n << BigInt(i))) !== 0n) {
        result |= 1n << BigInt(totalBits - 1 - i);
      }
    }
    return result;
  }

  /**
   * Hamming distance (number of different bits)
   */
  static hammingDistance(num1, num2) {
    return this.popcount(num1 ^ num2);
  }

  /**
   * Create bit mask
   */
  static createMask(numBits, offset = 0) {
    const mask = (1n << BigInt(numBits)) - 1n;
    return mask << BigInt(offset);
  }
}

/**
 * Binary Filter Cache
 * Cache for frequently used filter combinations
 */
export class BinaryFilterCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 10000;
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cached filter
   */
  get(key) {
    const cached = this.cache.get(key);
    
    if (cached) {
      this.hits++;
      return cached;
    }
    
    this.misses++;
    return null;
  }

  /**
   * Set cached filter
   */
  set(key, value) {
    // LRU eviction
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, value);
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits / (this.hits + this.misses) || 0
    };
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

/**
 * Batch Matcher
 * Efficiently match one entity against many requirements
 */
export class BatchMatcher {
  constructor(builder) {
    this.builder = builder;
  }

  /**
   * Match user against multiple marketplaces
   * 
   * @param {bigint} userFilter - Encoded user filter
   * @param {array} marketplaces - Array of marketplace requirements
   * @returns {array} Matching marketplaces
   */
  matchMany(userFilter, marketplaces) {
    const matches = [];
    
    for (const marketplace of marketplaces) {
      const req = typeof marketplace.requirements === 'object'
        ? marketplace.requirements
        : { filter: BigInt(marketplace.filter), mask: BigInt(marketplace.mask) };
      
      if (this.builder.match(userFilter, req)) {
        matches.push(marketplace);
      }
    }
    
    return matches;
  }

  /**
   * Match multiple users against one marketplace
   */
  matchUsers(users, marketplaceReq) {
    const matches = [];
    
    for (const user of users) {
      const userFilter = typeof user.binaryFilter === 'string'
        ? BigInt(user.binaryFilter)
        : user.binaryFilter;
      
      if (this.builder.match(userFilter, marketplaceReq)) {
        matches.push(user);
      }
    }
    
    return matches;
  }

  /**
   * Batch match with scoring
   * Returns matches with similarity scores
   */
  matchWithScore(userFilter, marketplaces) {
    const results = [];
    
    for (const marketplace of marketplaces) {
      const req = marketplace.requirements;
      const matches = this.builder.match(userFilter, req);
      
      if (matches) {
        // Calculate similarity score (number of matching bits)
        const matchingBits = BitwiseOps.popcount(
          (userFilter & req.mask) & req.filter
        );
        const totalBits = BitwiseOps.popcount(req.mask);
        const score = totalBits > 0 ? matchingBits / totalBits : 0;
        
        results.push({
          marketplace,
          score,
          matchingBits,
          totalBits
        });
      }
    }
    
    // Sort by score (descending)
    return results.sort((a, b) => b.score - a.score);
  }
}

/**
 * Migration Helper
 * Help with schema migrations when adding/removing filters
 */
export class FilterMigration {
  constructor(oldBuilder, newBuilder) {
    this.oldBuilder = oldBuilder;
    this.newBuilder = newBuilder;
  }

  /**
   * Migrate old filter to new schema
   */
  migrate(oldFilter) {
    const decoded = this.oldBuilder.decode(oldFilter);
    const entity = {};
    
    // Extract values from decoded filter
    for (const [path, value] of Object.entries(decoded)) {
      // Get actual value from rule
      const filter = this.oldBuilder.filterMap.get(path);
      const rule = filter.rules[value.variantIndex - 1];
      
      // Extract representative value
      if (rule.eq !== undefined) {
        entity[path] = rule.eq;
      } else if (rule.gte !== undefined) {
        entity[path] = rule.gte;
      } else if (rule.in !== undefined) {
        entity[path] = rule.in[0];
      }
    }
    
    // Re-encode with new schema
    return this.newBuilder.encode(entity);
  }

  /**
   * Batch migrate collection
   */
  async migrateCollection(collection, options = {}) {
    const batchSize = options.batchSize || 1000;
    const fieldName = options.fieldName || 'binaryFilter';
    
    let migrated = 0;
    let offset = 0;
    
    while (true) {
      const entities = await collection
        .find({})
        .skip(offset)
        .limit(batchSize);
      
      if (entities.length === 0) break;
      
      const updates = [];
      
      for (const entity of entities) {
        const oldFilter = BigInt(entity[fieldName]);
        const newFilter = this.migrate(oldFilter);
        
        updates.push({
          updateOne: {
            filter: { _id: entity._id },
            update: { $set: { [fieldName]: newFilter.toString() } }
          }
        });
      }
      
      if (updates.length > 0) {
        await collection.bulkWrite(updates);
        migrated += updates.length;
      }
      
      offset += batchSize;
      
      if (options.onProgress) {
        options.onProgress(migrated);
      }
    }
    
    return migrated;
  }
}

/**
 * Performance Analyzer
 * Analyze and optimize filter performance
 */
export class FilterAnalyzer {
  constructor(builder) {
    this.builder = builder;
  }

  /**
   * Analyze filter distribution
   */
  analyzeDistribution(entities) {
    const distribution = new Map();
    
    for (const entity of entities) {
      const filter = typeof entity.binaryFilter === 'string'
        ? BigInt(entity.binaryFilter)
        : entity.binaryFilter;
      
      const key = filter.toString();
      distribution.set(key, (distribution.get(key) || 0) + 1);
    }
    
    return {
      unique: distribution.size,
      total: entities.length,
      uniqueRatio: distribution.size / entities.length,
      distribution: Array.from(distribution.entries())
        .map(([filter, count]) => ({ filter, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10) // Top 10
    };
  }

  /**
   * Analyze filter selectivity
   * How many entities each filter variant selects
   */
  analyzeSelectivity(entities) {
    const results = {};
    
    for (const filter of this.builder.filters) {
      const variantCounts = new Array(filter.variants + 1).fill(0);
      
      for (const entity of entities) {
        const encoded = typeof entity.binaryFilter === 'string'
          ? BigInt(entity.binaryFilter)
          : entity.binaryFilter;
        
        const bits = (encoded & filter.bitMask) >> BigInt(filter.bitOffset);
        const variantIndex = Number(bits);
        variantCounts[variantIndex]++;
      }
      
      results[filter.path] = {
        total: entities.length,
        variants: variantCounts.map((count, index) => ({
          variant: index,
          count,
          percentage: (count / entities.length * 100).toFixed(2) + '%',
          rule: index > 0 ? filter.rules[index - 1] : null
        }))
      };
    }
    
    return results;
  }

  /**
   * Suggest optimizations
   */
  suggestOptimizations(entities) {
    const suggestions = [];
    const selectivity = this.analyzeSelectivity(entities);
    
    for (const [path, data] of Object.entries(selectivity)) {
      // Check for unused variants
      const unusedVariants = data.variants.filter(v => v.count === 0 && v.variant > 0);
      if (unusedVariants.length > 0) {
        suggestions.push({
          type: 'UNUSED_VARIANTS',
          filter: path,
          message: `${unusedVariants.length} unused variants can be removed`,
          variants: unusedVariants
        });
      }
      
      // Check for over-selective filters (>90% in one variant)
      const dominant = data.variants.find(v => v.count / data.total > 0.9);
      if (dominant) {
        suggestions.push({
          type: 'LOW_SELECTIVITY',
          filter: path,
          message: `${dominant.percentage} of entities in variant ${dominant.variant}`,
          suggestion: 'Consider removing this filter or adding more variants'
        });
      }
      
      // Check for under-selective filters (too evenly distributed)
      const avgCount = data.total / (data.variants.length - 1);
      const variance = data.variants
        .filter(v => v.variant > 0)
        .reduce((sum, v) => sum + Math.pow(v.count - avgCount, 2), 0) / (data.variants.length - 1);
      
      if (variance < avgCount * 0.1) {
        suggestions.push({
          type: 'HIGH_UNIFORMITY',
          filter: path,
          message: 'Filter variants are too evenly distributed',
          suggestion: 'Consider consolidating variants or using different rules'
        });
      }
    }
    
    return suggestions;
  }
}

export default {
  BitwiseOps,
  BinaryFilterCache,
  BatchMatcher,
  FilterMigration,
  FilterAnalyzer
};
