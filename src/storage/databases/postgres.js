import { Pool, PoolClient } from 'pg'

/**
 * PostgreSQL Database Adapter
 * 
 * Provides connection pooling and query execution for PostgreSQL
 */
export class PostgreSQL {
    /** @type {Pool} */
    #pool = null
    
    /** @type {string} */
    connectionString
    
    /** @type {Object} */
    config

    /**
     * Create PostgreSQL instance
     * @param {string|Object} config - Connection string or config object
     */
    constructor(config) {
        if (typeof config === 'string') {
            this.connectionString = config
            this.config = { connectionString: config }
        } else {
            this.config = config
        }
    }

    /**
     * Connect to PostgreSQL
     * @returns {Promise<PostgreSQL>}
     */
    async connect() {
        this.#pool = new Pool({
            ...this.config,
            max: this.config.poolSize || 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        })

        // Test connection
        const client = await this.#pool.connect()
        await client.query('SELECT NOW()')
        client.release()

        console.log('✅ PostgreSQL connected')
        return this
    }

    /**
     * Get a table accessor
     * @param {string} tableName - Table name
     * @returns {Table}
     */
    getTable(tableName) {
        if (!this.#pool) {
            throw new Error('PostgreSQL not connected. Call connect() first.')
        }
        return new Table(this.#pool, tableName)
    }

    /**
     * Execute raw query
     * @param {string} text - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<any>}
     */
    async query(text, params = []) {
        if (!this.#pool) {
            throw new Error('PostgreSQL not connected. Call connect() first.')
        }
        const result = await this.#pool.query(text, params)
        return result.rows
    }

    /**
     * Get a client from the pool for transactions
     * @returns {Promise<PoolClient>}
     */
    async getClient() {
        if (!this.#pool) {
            throw new Error('PostgreSQL not connected. Call connect() first.')
        }
        return this.#pool.connect()
    }

    /**
     * Execute a transaction
     * @param {Function} callback - Transaction callback
     * @returns {Promise<any>}
     */
    async transaction(callback) {
        const client = await this.getClient()
        
        try {
            await client.query('BEGIN')
            const result = await callback(client)
            await client.query('COMMIT')
            return result
        } catch (error) {
            await client.query('ROLLBACK')
            throw error
        } finally {
            client.release()
        }
    }

    /**
     * Close all connections
     * @returns {Promise<void>}
     */
    async close() {
        if (this.#pool) {
            await this.#pool.end()
            console.log('✅ PostgreSQL disconnected')
        }
    }
}

/**
 * Table accessor with ORM-like methods
 */
export class Table {
    /** @type {Pool} */
    #pool
    
    /** @type {string} */
    tableName

    /**
     * Create table accessor
     * @param {Pool} pool - Connection pool
     * @param {string} tableName - Table name
     */
    constructor(pool, tableName) {
        this.#pool = pool
        this.tableName = tableName
    }

    /**
     * Find one row
     * @param {Object} where - WHERE conditions
     * @param {Object} options - Query options
     * @returns {Promise<Object|null>}
     */
    async findOne(where = {}, options = {}) {
        const { text, values } = this.#buildSelectQuery(where, { ...options, limit: 1 })
        const result = await this.#pool.query(text, values)
        return result.rows[0] || null
    }

    /**
     * Find multiple rows
     * @param {Object} where - WHERE conditions
     * @param {Object} options - Query options (limit, offset, orderBy)
     * @returns {Promise<Array>}
     */
    async find(where = {}, options = {}) {
        const { text, values } = this.#buildSelectQuery(where, options)
        const result = await this.#pool.query(text, values)
        return result.rows
    }

    /**
     * Insert one row
     * @param {Object} data - Row data
     * @param {Object} options - Insert options
     * @returns {Promise<Object>}
     */
    async insert(data, options = {}) {
        const keys = Object.keys(data)
        const values = Object.values(data)
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ')
        
        const returning = options.returning || '*'
        const text = `
            INSERT INTO ${this.tableName} (${keys.join(', ')})
            VALUES (${placeholders})
            RETURNING ${returning}
        `
        
        const result = await this.#pool.query(text, values)
        return result.rows[0]
    }

    /**
     * Insert multiple rows
     * @param {Array<Object>} rows - Array of rows to insert
     * @param {Object} options - Insert options
     * @returns {Promise<Array>}
     */
    async insertMany(rows, options = {}) {
        if (!rows || rows.length === 0) return []
        
        const keys = Object.keys(rows[0])
        const returning = options.returning || '*'
        
        const placeholders = rows.map((row, rowIndex) => {
            const rowPlaceholders = keys.map((_, colIndex) => 
                `$${rowIndex * keys.length + colIndex + 1}`
            ).join(', ')
            return `(${rowPlaceholders})`
        }).join(', ')
        
        const values = rows.flatMap(row => Object.values(row))
        
        const text = `
            INSERT INTO ${this.tableName} (${keys.join(', ')})
            VALUES ${placeholders}
            RETURNING ${returning}
        `
        
        const result = await this.#pool.query(text, values)
        return result.rows
    }

    /**
     * Update rows
     * @param {Object} where - WHERE conditions
     * @param {Object} data - Data to update
     * @param {Object} options - Update options
     * @returns {Promise<Array>}
     */
    async update(where, data, options = {}) {
        const keys = Object.keys(data)
        const values = Object.values(data)
        
        const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ')
        
        const { clause: whereClause, values: whereValues } = this.#buildWhereClause(where, keys.length)
        const allValues = [...values, ...whereValues]
        
        const returning = options.returning || '*'
        const text = `
            UPDATE ${this.tableName}
            SET ${setClause}
            ${whereClause}
            RETURNING ${returning}
        `
        
        const result = await this.#pool.query(text, allValues)
        return result.rows
    }

    /**
     * Delete rows
     * @param {Object} where - WHERE conditions
     * @param {Object} options - Delete options
     * @returns {Promise<number>}
     */
    async delete(where, options = {}) {
        const { clause: whereClause, values } = this.#buildWhereClause(where)
        
        const text = `
            DELETE FROM ${this.tableName}
            ${whereClause}
        `
        
        const result = await this.#pool.query(text, values)
        return result.rowCount
    }

    /**
     * Count rows
     * @param {Object} where - WHERE conditions
     * @returns {Promise<number>}
     */
    async count(where = {}) {
        const { clause: whereClause, values } = this.#buildWhereClause(where)
        
        const text = `
            SELECT COUNT(*) as count
            FROM ${this.tableName}
            ${whereClause}
        `
        
        const result = await this.#pool.query(text, values)
        return parseInt(result.rows[0].count)
    }

    /**
     * Check if row exists
     * @param {Object} where - WHERE conditions
     * @returns {Promise<boolean>}
     */
    async exists(where) {
        const count = await this.count(where)
        return count > 0
    }

    /**
     * Execute raw SQL on this table
     * @param {string} text - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Array>}
     */
    async query(text, params = []) {
        const result = await this.#pool.query(text, params)
        return result.rows
    }

    /**
     * Build SELECT query
     * @private
     */
    #buildSelectQuery(where, options) {
        const { clause: whereClause, values } = this.#buildWhereClause(where)
        
        let text = `SELECT * FROM ${this.tableName} ${whereClause}`
        
        if (options.orderBy) {
            const orderBy = Object.entries(options.orderBy)
                .map(([key, direction]) => `${key} ${direction.toUpperCase()}`)
                .join(', ')
            text += ` ORDER BY ${orderBy}`
        }
        
        if (options.limit) {
            text += ` LIMIT ${options.limit}`
        }
        
        if (options.offset) {
            text += ` OFFSET ${options.offset}`
        }
        
        return { text, values }
    }

    /**
     * Build WHERE clause
     * @private
     */
    #buildWhereClause(where, startIndex = 0) {
        const keys = Object.keys(where)
        
        if (keys.length === 0) {
            return { clause: '', values: [] }
        }
        
        const conditions = keys.map((key, i) => `${key} = $${startIndex + i + 1}`)
        const clause = `WHERE ${conditions.join(' AND ')}`
        const values = Object.values(where)
        
        return { clause, values }
    }
}

export default PostgreSQL
