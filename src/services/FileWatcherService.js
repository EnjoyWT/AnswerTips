const chokidar = require("chokidar");
const fs = require("fs-extra");
const path = require("path");
const { EventEmitter } = require("events");

class FileWatcherService extends EventEmitter {
  constructor(config, logger, errorHandler) {
    super();
    this.config = config;
    this.logger = logger;
    this.errorHandler = errorHandler;
    this.watcher = null;
    this.isRunning = false;
    this.watchedFiles = new Set();
  }

  async startWatching() {
    try {
      const watchFolder = this.config.get("watchFolder");
      
      this.logger.info("开始启动文件监听", { folder: watchFolder });

      // 检查监听目录是否存在
      if (!await fs.pathExists(watchFolder)) {
        throw this.errorHandler.createFileError(`监听目录不存在: ${watchFolder}`);
      }

      // 创建文件监听器
      this.watcher = chokidar.watch(watchFolder, {
        ignored: /(^|[\/\\])\../, // 忽略隐藏文件
        persistent: true,
        ignoreInitial: true, // 忽略启动时已存在的文件
        awaitWriteFinish: {
          stabilityThreshold: 2000,
          pollInterval: 100,
        },
      });

      // 设置事件监听
      this.watcher
        .on("add", (filePath) => {
          this._handleFileAdded(filePath);
        })
        .on("change", (filePath) => {
          this._handleFileChanged(filePath);
        })
        .on("unlink", (filePath) => {
          this._handleFileRemoved(filePath);
        })
        .on("error", (error) => {
          this._handleWatcherError(error);
        })
        .on("ready", () => {
          this.isRunning = true;
          this.logger.info("文件监听已启动", { folder: watchFolder });
          this.emit('ready');
        });

      return true;
    } catch (error) {
      const watchError = this.errorHandler.createServiceError(
        `启动文件监听失败: ${error.message}`,
        error
      );
      
      this.errorHandler.handle(watchError, "文件监听启动");
      this.emit('error', watchError);
      throw watchError;
    }
  }

  stopWatching() {
    try {
      if (this.watcher) {
        this.watcher.close();
        this.watcher = null;
      }
      
      this.isRunning = false;
      this.watchedFiles.clear();
      
      this.logger.info("文件监听已停止");
      this.emit('stopped');
      
      return true;
    } catch (error) {
      this.errorHandler.handle(error, "文件监听停止");
      return false;
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      watchFolder: this.config.get("watchFolder"),
      watchedFilesCount: this.watchedFiles.size
    };
  }

  // 手动处理文件（用于测试）
  async processFile(filePath) {
    if (this.config.isImageFile(filePath)) {
      await this._processImageFile(filePath);
    }
  }

  async _handleFileAdded(filePath) {
    try {
      const fileName = path.basename(filePath);
      
      // 检查是否是图片文件
      if (!this.config.isImageFile(filePath)) {
        this.logger.debug("忽略非图片文件", { file: fileName });
        return;
      }

      // 避免重复处理
      if (this.watchedFiles.has(filePath)) {
        this.logger.debug("文件已在处理中，跳过", { file: fileName });
        return;
      }

      this.watchedFiles.add(filePath);
      this.logger.info("检测到新图片文件", { file: fileName });

      // 等待文件完全写入
      await this._waitForFileStable(filePath);

      // 处理图片文件
      await this._processImageFile(filePath);

    } catch (error) {
      this.errorHandler.handle(error, `处理新增文件: ${filePath}`);
      this.emit('fileError', { filePath, error });
    } finally {
      this.watchedFiles.delete(filePath);
    }
  }

  async _handleFileChanged(filePath) {
    // 对于图片文件，变更通常意味着文件正在写入，我们等待稳定后再处理
    if (this.config.isImageFile(filePath)) {
      this.logger.debug("图片文件发生变更", { file: path.basename(filePath) });
    }
  }

  _handleFileRemoved(filePath) {
    if (this.config.isImageFile(filePath)) {
      this.logger.debug("图片文件被删除", { file: path.basename(filePath) });
      this.watchedFiles.delete(filePath);
      this.emit('fileRemoved', { filePath });
    }
  }

  _handleWatcherError(error) {
    const watcherError = this.errorHandler.createServiceError(
      `文件监听器错误: ${error.message}`,
      error
    );
    
    this.errorHandler.handle(watcherError, "文件监听器");
    this.emit('error', watcherError);
  }

  async _processImageFile(filePath) {
    try {
      // 检查文件是否仍然存在且可读
      await fs.access(filePath, fs.constants.R_OK);

      const fileName = path.basename(filePath);
      this.logger.info("开始处理图片文件", { file: fileName });

      // 发出文件处理事件
      this.emit('imageDetected', {
        filePath,
        fileName,
        timestamp: new Date()
      });

    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.warn("文件已被删除，跳过处理", { file: path.basename(filePath) });
      } else {
        throw error;
      }
    }
  }

  async _waitForFileStable(filePath, maxWait = 5000) {
    const startTime = Date.now();
    let lastSize = 0;
    let stableCount = 0;

    while (Date.now() - startTime < maxWait) {
      try {
        const stats = await fs.stat(filePath);
        
        if (stats.size === lastSize) {
          stableCount++;
          if (stableCount >= 3) { // 连续3次大小不变认为稳定
            break;
          }
        } else {
          stableCount = 0;
          lastSize = stats.size;
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new Error('文件在等待过程中被删除');
        }
        throw error;
      }
    }

    this.logger.debug("文件稳定性检查完成", { 
      file: path.basename(filePath),
      finalSize: lastSize,
      waitTime: Date.now() - startTime
    });
  }
}

module.exports = FileWatcherService;