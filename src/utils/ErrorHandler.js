class ErrorHandler {
  constructor(logger) {
    this.logger = logger;
  }

  handle(error, context = '') {
    const errorInfo = {
      message: error.message,
      type: error.constructor.name,
      context,
      timestamp: new Date().toISOString()
    };

    this.logger.error(`Error in ${context}`, error);
    
    return errorInfo;
  }

  createError(message, code = 'GENERIC_ERROR', originalError = null) {
    const error = new Error(message);
    error.code = code;
    
    if (originalError) {
      error.originalError = originalError;
      error.stack = originalError.stack;
    }
    
    return error;
  }

  // 预定义的错误类型
  createConfigError(message, originalError = null) {
    return this.createError(message, 'CONFIG_ERROR', originalError);
  }

  createServiceError(message, originalError = null) {
    return this.createError(message, 'SERVICE_ERROR', originalError);
  }

  createFileError(message, originalError = null) {
    return this.createError(message, 'FILE_ERROR', originalError);
  }

  createValidationError(message, originalError = null) {
    return this.createError(message, 'VALIDATION_ERROR', originalError);
  }
}

module.exports = ErrorHandler;