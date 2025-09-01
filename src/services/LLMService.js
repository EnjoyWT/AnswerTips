const axios = require("axios");

class LLMService {
  constructor(config, logger, errorHandler) {
    this.config = config;
    this.logger = logger;
    this.errorHandler = errorHandler;
  }

  async processText(ocrText) {
    try {
      if (!ocrText || ocrText.trim().length === 0) {
        this.logger.warn("输入文本为空，跳过大模型处理");
        return null;
      }

      const llmUrl = this.config.get("localLLMUrl");
      this.logger.info("开始调用大模型处理OCR结果", { 
        textLength: ocrText.length,
        preview: ocrText.substring(0, 100) + (ocrText.length > 100 ? '...' : '')
      });

      const requestData = {
        inputs: {
          question: ocrText,
        },
        response_mode: "blocking",
        user: "answer-tips-user",
      };

      this.logger.debug("发送大模型请求", { url: llmUrl });

      // 构建请求头
      const headers = {
        "Content-Type": "application/json",
      };

      // 添加Authorization头（如果配置了API密钥）
      const apiKey = this.config.get("localLLMApiKey");
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      const response = await axios.post(llmUrl, requestData, {
        headers,
        timeout: 60000, // 60秒超时
      });

      // 解析响应
      if (response.data && response.data.data && response.data.data.outputs) {
        const result = response.data.data.outputs.text;
        
        if (result) {
          this.logger.info("大模型处理成功", { 
            resultLength: result.length,
            preview: result.substring(0, 100) + (result.length > 100 ? '...' : '')
          });
          return result;
        } else {
          this.logger.warn("大模型返回结果为空");
          return null;
        }
      } else {
        this.logger.warn("大模型返回格式异常", { response: response.data });
        return null;
      }
    } catch (error) {
      if (error.code && error.code.includes('ERROR')) {
        // 已经是我们的自定义错误，直接抛出
        throw error;
      }

      // 包装为服务错误
      const serviceError = this.errorHandler.createServiceError(
        `大模型处理失败: ${error.message}`,
        error
      );
      
      this.errorHandler.handle(serviceError, "大模型处理");
      throw serviceError;
    }
  }

  // 检查大模型服务是否可用
  async checkHealth() {
    try {
      const llmUrl = this.config.get("localLLMUrl");
      
      // 发送简单的测试请求
      const testData = {
        inputs: {
          question: "test",
        },
        response_mode: "blocking",
        user: "health-check",
      };

      // 构建请求头
      const headers = {
        "Content-Type": "application/json",
      };

      // 添加Authorization头（如果配置了API密钥）
      const apiKey = this.config.get("localLLMApiKey");
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      await axios.post(llmUrl, testData, {
        headers,
        timeout: 10000,
      });

      this.logger.info("大模型服务健康检查通过");
      return true;
    } catch (error) {
      this.logger.warn("大模型服务不可用", { error: error.message });
      return false;
    }
  }

  // 批量处理文本（可选功能）
  async processMultiple(texts) {
    const results = [];
    
    for (const text of texts) {
      try {
        const result = await this.processText(text);
        results.push({ text, result, success: true });
      } catch (error) {
        results.push({ text, error: error.message, success: false });
      }
    }
    
    this.logger.info("批量大模型处理完成", { 
      total: texts.length,
      successful: results.filter(r => r.success).length
    });
    
    return results;
  }
}

module.exports = LLMService;