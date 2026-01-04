/**
 * Logger - Structured logging with multiple levels and outputs
 */

export class Logger {
    constructor(config = {}) {
        this.config = config
        this.level = config.level || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')
        this.context = config.context || {}
        this.transports = config.transports || ['console']
        
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        }
    }

    shouldLog(level) {
        return this.levels[level] <= this.levels[this.level]
    }

    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString()
        const contextStr = Object.keys(this.context).length > 0 
            ? ` [${Object.entries(this.context).map(([k, v]) => `${k}=${v}`).join(' ')}]`
            : ''

        return {
            timestamp,
            level,
            message,
            context: this.context,
            ...meta
        }
    }

    log(level, message, ...args) {
        if (!this.shouldLog(level)) return

        const meta = args.length > 0 && typeof args[args.length - 1] === 'object' 
            ? args.pop() 
            : {}

        const formattedMessage = this.formatMessage(level, message, meta)

        // Console transport
        if (this.transports.includes('console')) {
            this.logToConsole(level, formattedMessage, ...args)
        }

        // File transport (if configured)
        if (this.transports.includes('file')) {
            this.logToFile(formattedMessage)
        }

        // Custom transports
        if (this.config.customTransport) {
            this.config.customTransport(formattedMessage)
        }
    }

    logToConsole(level, formatted, ...args) {
        const colors = {
            error: '\x1b[31m', // Red
            warn: '\x1b[33m',  // Yellow
            info: '\x1b[36m',  // Cyan
            debug: '\x1b[90m'  // Gray
        }

        const reset = '\x1b[0m'
        const color = colors[level] || ''
        
        const prefix = `${color}[${formatted.timestamp}] ${level.toUpperCase()}${reset}`
        const contextStr = Object.keys(formatted.context).length > 0
            ? ` ${JSON.stringify(formatted.context)}`
            : ''

        console.log(`${prefix}${contextStr}: ${formatted.message}`, ...args)
    }

    logToFile(formatted) {
        // Simple file logging (could be enhanced with rotation, etc.)
        if (!this.config.filePath) return

        const fs = require('fs')
        const line = JSON.stringify(formatted) + '\n'
        
        fs.appendFileSync(this.config.filePath, line)
    }

    error(message, ...args) {
        this.log('error', message, ...args)
    }

    warn(message, ...args) {
        this.log('warn', message, ...args)
    }

    info(message, ...args) {
        this.log('info', message, ...args)
    }

    debug(message, ...args) {
        this.log('debug', message, ...args)
    }

    /**
     * Create child logger with additional context
     */
    child(context) {
        return new Logger({
            ...this.config,
            context: { ...this.context, ...context }
        })
    }

    /**
     * Set log level
     */
    setLevel(level) {
        if (!this.levels.hasOwnProperty(level)) {
            throw new Error(`Invalid log level: ${level}`)
        }
        this.level = level
    }
}

export default Logger
