const fs = require("fs-extra");
const path = require("path");
const os = require("os");

class ConfigManager {
  constructor(logger, errorHandler) {
    this.logger = logger;
    this.errorHandler = errorHandler;
    this.config = null;
    this.defaultConfig = {
      watchFolder: "~/Desktop",
      ocrApiUrl: "http://localhost:7321/api/v1/ocr",
      healthCheckUrl: "http://localhost:7321/health",
      supportedImageExtensions: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"],
      language: "zh-CN",
      checkInterval: 1000,
      maxRetries: 3,
      retryDelay: 2000,
      localLLMUrl: "http://localhost/v1/workflows/run",
      localLLMApiKey: null // 大模型API密钥
    };
  }

  load() {
    try {
      const configPath = path.join(__dirname, "../../config.json");
      
      if (!fs.existsSync(configPath)) {
        this.logger.warn("配置文件不存在，使用默认配置");
        this.config = { ...this.defaultConfig };
      } else {
        const fileConfig = fs.readJsonSync(configPath);
        this.config = { ...this.defaultConfig, ...fileConfig };
      }

      // 应用环境变量覆盖
      this._applyEnvironmentOverrides();
      
      // 处理路径
      this._processPath();
      
      // 验证配置
      this.validate();
      
      this.logger.info("配置加载成功", { watchFolder: this.config.watchFolder });
      
      return this.config;
    } catch (error) {
      const configError = this.errorHandler.createConfigError("配置加载失败", error);
      throw configError;
    }
  }

  get(key) {
    if (!this.config) {
      this.load();
    }
    return this.config[key];
  }

  getConfig() {
    if (!this.config) {
      this.load();
    }
    return { ...this.config };
  }

  validate() {
    const required = ['watchFolder', 'ocrApiUrl', 'healthCheckUrl'];
    
    for (const key of required) {
      if (!this.config[key]) {
        throw this.errorHandler.createValidationError(`缺少必需的配置项: ${key}`);
      }
    }

    // 验证URL格式
    const urls = ['ocrApiUrl', 'healthCheckUrl', 'localLLMUrl'];
    for (const urlKey of urls) {
      if (this.config[urlKey] && !this._isValidUrl(this.config[urlKey])) {
        throw this.errorHandler.createValidationError(`无效的URL配置: ${urlKey}`);
      }
    }

    // 验证数字配置
    const numbers = ['checkInterval', 'maxRetries', 'retryDelay'];
    for (const numKey of numbers) {
      if (this.config[numKey] && !Number.isInteger(this.config[numKey])) {
        throw this.errorHandler.createValidationError(`配置项必须是整数: ${numKey}`);
      }
    }
  }

  isImageFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this.get("supportedImageExtensions").includes(ext);
  }

  _applyEnvironmentOverrides() {
    const envMappings = {
      'WATCH_FOLDER': 'watchFolder',
      'OCR_API_URL': 'ocrApiUrl',
      'HEALTH_CHECK_URL': 'healthCheckUrl',
      'LANGUAGE': 'language',
      'LOCAL_LLM_URL': 'localLLMUrl',
      'LOCAL_LLM_API_KEY': 'localLLMApiKey'
    };

    for (const [envKey, configKey] of Object.entries(envMappings)) {
      if (process.env[envKey]) {
        this.config[configKey] = process.env[envKey];
        this.logger.debug(`环境变量覆盖配置: ${configKey} = ${process.env[envKey]}`);
      }
    }
  }

  _processPath() {
    if (this.config.watchFolder.startsWith("~")) {
      this.config.watchFolder = path.join(
        os.homedir(),
        this.config.watchFolder.slice(1)
      );
    }
  }

  _isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = ConfigManager;