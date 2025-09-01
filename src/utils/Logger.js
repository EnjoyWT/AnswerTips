class Logger {
  constructor(name = 'App') {
    this.name = name;
  }

  info(message, meta = {}) {
    this._log('INFO', message, meta);
  }

  error(message, error = null) {
    const meta = error ? { error: error.message, stack: error.stack } : {};
    this._log('ERROR', message, meta);
  }

  debug(message, meta = {}) {
    this._log('DEBUG', message, meta);
  }

  warn(message, meta = {}) {
    this._log('WARN', message, meta);
  }

  _log(level, message, meta) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      module: this.name,
      message,
      ...meta
    };

    // 格式化输出
    const prefix = `[${timestamp}] ${level} [${this.name}]`;
    
    if (level === 'ERROR') {
      console.error(`${prefix} ${message}`, meta.error ? `\n${meta.stack}` : '');
    } else {
      console.log(`${prefix} ${message}`, Object.keys(meta).length > 0 ? meta : '');
    }
  }
}

module.exports = Logger;