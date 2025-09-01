class ResultManager {
  constructor(logger) {
    this.logger = logger;
    this.results = [];
    this.maxResults = 1000; // 最大保存结果数量
  }

  addResult(result) {
    try {
      // 生成唯一ID
      const id = this._generateId();
      const timestamp = new Date();
      
      const processResult = {
        id,
        timestamp,
        imagePath: result.imagePath,
        ocrText: result.ocrText || null,
        llmResult: result.llmResult || null,
        status: result.status || 'processing',
        error: result.error || null
      };

      this.results.push(processResult);
      
      // 限制结果数量，删除最旧的结果
      if (this.results.length > this.maxResults) {
        const removed = this.results.shift();
        this.logger.debug("删除最旧的处理结果", { id: removed.id });
      }

      this.logger.debug("添加处理结果", { 
        id: processResult.id, 
        status: processResult.status,
        imagePath: processResult.imagePath
      });

      return processResult;
    } catch (error) {
      this.logger.error("添加处理结果失败", error);
      return null;
    }
  }

  updateResult(id, updates) {
    try {
      const result = this.results.find(r => r.id === id);
      
      if (!result) {
        this.logger.warn("未找到要更新的结果", { id });
        return null;
      }

      // 更新结果
      Object.assign(result, updates);
      result.updatedAt = new Date();

      this.logger.debug("更新处理结果", { id, updates: Object.keys(updates) });
      
      return result;
    } catch (error) {
      this.logger.error("更新处理结果失败", error);
      return null;
    }
  }

  getResult(id) {
    return this.results.find(r => r.id === id) || null;
  }

  getResults(filter = {}) {
    let filteredResults = [...this.results];

    // 按状态过滤
    if (filter.status) {
      filteredResults = filteredResults.filter(r => r.status === filter.status);
    }

    // 按时间范围过滤
    if (filter.since) {
      const sinceDate = new Date(filter.since);
      filteredResults = filteredResults.filter(r => r.timestamp >= sinceDate);
    }

    // 限制数量
    if (filter.limit) {
      filteredResults = filteredResults.slice(-filter.limit);
    }

    return filteredResults;
  }

  getStats() {
    const total = this.results.length;
    const completed = this.results.filter(r => r.status === 'completed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const processing = this.results.filter(r => r.status === 'processing').length;

    const successRate = total > 0 ? ((completed / total) * 100).toFixed(2) + '%' : '0%';

    // 最近一小时的统计
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentResults = this.results.filter(r => r.timestamp >= oneHourAgo);
    
    return {
      total,
      completed,
      failed,
      processing,
      successRate,
      recent: {
        total: recentResults.length,
        completed: recentResults.filter(r => r.status === 'completed').length,
        failed: recentResults.filter(r => r.status === 'failed').length
      }
    };
  }

  clearResults(olderThan = null) {
    try {
      const beforeCount = this.results.length;
      
      if (olderThan) {
        const cutoffDate = new Date(olderThan);
        this.results = this.results.filter(r => r.timestamp >= cutoffDate);
      } else {
        this.results = [];
      }

      const afterCount = this.results.length;
      const cleared = beforeCount - afterCount;

      this.logger.info("清理处理结果", { cleared, remaining: afterCount });
      
      return cleared;
    } catch (error) {
      this.logger.error("清理处理结果失败", error);
      return 0;
    }
  }

  // 获取最近的结果
  getRecentResults(count = 10) {
    return this.results.slice(-count).reverse();
  }

  // 获取失败的结果
  getFailedResults() {
    return this.results.filter(r => r.status === 'failed');
  }

  // 获取成功的结果
  getCompletedResults() {
    return this.results.filter(r => r.status === 'completed');
  }

  // 导出结果为JSON
  exportResults(filter = {}) {
    const results = this.getResults(filter);
    return {
      exportTime: new Date().toISOString(),
      count: results.length,
      results: results
    };
  }

  // 生成唯一ID
  _generateId() {
    return 'result_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // 打印结果摘要
  printResultSummary(result) {
    const separator = "=".repeat(60);
    
    this.logger.info("\n" + separator);
    this.logger.info("📊 处理结果摘要");
    this.logger.info(separator);
    this.logger.info(`🆔 结果ID: ${result.id}`);
    this.logger.info(`📅 处理时间: ${result.timestamp.toISOString()}`);
    this.logger.info(`🖼️  图片路径: ${result.imagePath}`);
    this.logger.info(`📝 OCR文本: ${result.ocrText || '无'}`);
    this.logger.info(`🤖 大模型结果: ${result.llmResult || '无'}`);
    this.logger.info(`📊 状态: ${result.status}`);
    
    if (result.error) {
      this.logger.info(`❌ 错误信息: ${result.error.message || result.error}`);
    }
    
    this.logger.info(separator + "\n");
  }
}

module.exports = ResultManager;