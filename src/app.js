// 导入工具类
const Logger = require('./utils/Logger');
const ErrorHandler = require('./utils/ErrorHandler');
const ConfigManager = require('./utils/ConfigManager');

// 导入服务类
const OCRService = require('./services/OCRService');
const LLMService = require('./services/LLMService');
const NotificationService = require('./services/NotificationService');
const ResultManager = require('./services/ResultManager');
const FileWatcherService = require('./services/FileWatcherService');

class Application {
  constructor() {
    // 初始化工具类
    this.logger = new Logger('Application');
    this.errorHandler = new ErrorHandler(this.logger);
    this.configManager = new ConfigManager(this.logger, this.errorHandler);
    
    // 服务实例
    this.ocrService = null;
    this.llmService = null;
    this.notificationService = null;
    this.resultManager = null;
    this.fileWatcherService = null;
    
    // 应用状态
    this.isRunning = false;
    this.statsInterval = null;
  }

  async start() {
    try {
      this.logger.info("🚀 AnswerTips OCR 图片识别工具启动中...");
      
      // 1. 加载配置
      await this._initializeConfig();
      
      // 2. 初始化服务
      await this._initializeServices();
      
      // 3. 检查服务健康状态
      await this._checkServicesHealth();
      
      // 4. 设置事件监听
      this._setupEventListeners();
      
      // 5. 启动文件监听
      await this._startFileWatching();
      
      // 6. 启动统计报告
      this._startStatsReporting();
      
      // 7. 设置优雅退出
      this._setupGracefulShutdown();
      
      // 8. 显示欢迎通知
      await this.notificationService.showWelcome();
      
      this.isRunning = true;
      this.logger.info("✅ 应用启动完成，开始监听文件...");
      
    } catch (error) {
      this.logger.error("应用启动失败", error);
      await this.notificationService?.showError(error, "启动失败");
      throw error;
    }
  }

  async stop() {
    try {
      this.logger.info("🛑 正在关闭应用...");
      
      this.isRunning = false;
      
      // 停止统计报告
      if (this.statsInterval) {
        clearInterval(this.statsInterval);
        this.statsInterval = null;
      }
      
      // 停止文件监听
      if (this.fileWatcherService) {
        this.fileWatcherService.stopWatching();
      }
      
      // 显示最终统计
      if (this.resultManager) {
        const stats = this.resultManager.getStats();
        // this.logger.info("📊 最终处理统计", stats);
        await this.notificationService?.showStats(stats);
      }
      
      this.logger.info("✅ 应用已安全关闭");
      
    } catch (error) {
      this.logger.error("应用关闭时发生错误", error);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.configManager?.getConfig(),
      fileWatcher: this.fileWatcherService?.getStatus(),
      results: this.resultManager?.getStats()
    };
  }

  async _initializeConfig() {
    this.logger.info("📋 加载配置...");
    this.configManager.load();
    this.logger.info("✅ 配置加载完成");
  }

  async _initializeServices() {
    this.logger.info("🔧 初始化服务...");
    
    // 初始化各个服务
    this.ocrService = new OCRService(this.configManager, new Logger('OCRService'), this.errorHandler);
    this.llmService = new LLMService(this.configManager, new Logger('LLMService'), this.errorHandler);
    this.notificationService = new NotificationService(new Logger('NotificationService'), this.errorHandler);
    this.resultManager = new ResultManager(new Logger('ResultManager'));
    this.fileWatcherService = new FileWatcherService(this.configManager, new Logger('FileWatcherService'), this.errorHandler);
    
    this.logger.info("✅ 服务初始化完成");
  }

  async _checkServicesHealth() {
    this.logger.info("🏥 检查服务健康状态...");
    
    // 检查OCR服务
    const ocrHealthy = await this.ocrService.checkHealth();
    if (!ocrHealthy) {
      this.logger.warn("⚠️  OCR服务不可用，请确保服务已启动");
    }
    
    // 检查大模型服务
    const llmHealthy = await this.llmService.checkHealth();
    if (!llmHealthy) {
      this.logger.warn("⚠️  大模型服务不可用，请确保服务已启动");
    }
    
    // 检查通知服务
    const notificationAvailable = await this.notificationService.checkAvailability();
    if (!notificationAvailable) {
      this.logger.warn("⚠️  系统通知功能不可用");
    }
    
    this.logger.info("✅ 服务健康检查完成");
  }

  _setupEventListeners() {
    this.logger.info("📡 设置事件监听...");
    
    // 监听文件检测事件
    this.fileWatcherService.on('imageDetected', async (data) => {
      await this._handleImageDetected(data);
    });
    
    // 监听文件监听器错误
    this.fileWatcherService.on('error', (error) => {
      this.logger.error("文件监听器错误", error);
    });
    
    // 监听文件监听器就绪
    this.fileWatcherService.on('ready', () => {
      this.logger.info("📁 文件监听器已就绪");
    });
    
    this.logger.info("✅ 事件监听设置完成");
  }

  async _startFileWatching() {
    this.logger.info("👀 启动文件监听...");
    await this.fileWatcherService.startWatching();
  }

  _startStatsReporting() {
    // 每30秒报告一次统计
    this.statsInterval = setInterval(() => {
      if (this.resultManager) {
        const stats = this.resultManager.getStats();
        if (stats.total > 0) {
          // this.logger.info("📊 处理统计", stats);
        }
      }
    }, 30000);
  }

  _setupGracefulShutdown() {
    const shutdown = async (signal) => {
      this.logger.info(`收到 ${signal} 信号，开始优雅关闭...`);
      await this.stop();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  async _handleImageDetected(data) {
    const { filePath, fileName } = data;
    
    try {
      this.logger.info("处理检测到的图片", { file: fileName });
      
      // 创建处理结果记录
      const result = this.resultManager.addResult({
        imagePath: filePath,
        status: 'processing'
      });
      
      if (!result) {
        throw new Error('无法创建处理结果记录');
      }

      // 执行OCR识别
      this.logger.info("开始OCR识别", { file: fileName });
      const ocrText = await this.ocrService.recognizeText(filePath);
      
      // 更新结果
      this.resultManager.updateResult(result.id, {
        ocrText: ocrText,
        status: ocrText ? 'ocr_completed' : 'ocr_failed'
      });

      if (!ocrText) {
        this.logger.warn("OCR未识别到文字，跳过大模型处理", { file: fileName });
        this.resultManager.updateResult(result.id, { status: 'completed' });
        return;
      }

      // 调用大模型处理
      this.logger.info("开始大模型处理", { file: fileName });
      try {
        const llmResult = await this.llmService.processText(ocrText);
        
        // 更新最终结果
        this.resultManager.updateResult(result.id, {
          llmResult: llmResult,
          status: 'completed'
        });
        
        this.logger.info("处理完成", { file: fileName });
        
        // 显示结果通知
        const finalResult = this.resultManager.getResult(result.id);
        await this.notificationService.showResult(finalResult);
        
        // 打印结果摘要
        this.resultManager.printResultSummary(finalResult);
        
      } catch (llmError) {
        this.logger.error("大模型处理失败", llmError);
        
        this.resultManager.updateResult(result.id, {
          status: 'failed',
          error: llmError
        });
        
        // 显示错误通知
        await this.notificationService.showError(llmError, fileName);
      }
      
    } catch (error) {
      this.logger.error("处理图片失败", error);
      
      // 显示错误通知
      await this.notificationService.showError(error, fileName);
    }
  }
}

module.exports = Application;