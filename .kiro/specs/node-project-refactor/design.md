# 设计文档

## 概述

重构现有 OCR 工具为简洁清晰的分层架构，保持功能不变的同时提高代码可维护性。采用简单的三层结构：服务层、工具层和模型层。

## 架构

### 目录结构

```
src/
├── services/           # 业务服务层
│   ├── FileWatcherService.js
│   ├── OCRService.js
│   ├── LLMService.js
│   ├── NotificationService.js
│   └── ResultManager.js
├── utils/              # 工具层
│   ├── ConfigManager.js
│   ├── Logger.js
│   └── ErrorHandler.js
└── app.js              # 应用入口
```

### 设计原则

- **单一职责**：每个文件只负责一个明确的功能
- **简单依赖**：通过构造函数传递依赖，避免复杂的依赖注入
- **统一接口**：所有服务使用一致的错误处理和日志记录

## 组件和接口

### 1. 应用入口 (app.js)

```javascript
class Application {
  constructor()
  async start()
  async stop()
}
```

- 负责初始化所有服务
- 协调各服务间的交互
- 处理应用生命周期

### 2. 文件监听服务 (FileWatcherService.js)

```javascript
class FileWatcherService {
  constructor(config, logger, errorHandler)
  startWatching()
  stopWatching()
  on(event, callback)  // 事件监听
}
```

- 监听指定目录的文件变化
- 过滤图片文件类型
- 发出文件事件通知

### 3. OCR 服务 (OCRService.js)

```javascript
class OCRService {
  constructor(config, logger, errorHandler)
  async checkHealth()
  async recognizeText(imagePath)
}
```

- 调用外部 OCR API
- 处理图片文件上传
- 返回识别的文本内容

### 4. 大模型服务 (LLMService.js)

```javascript
class LLMService {
  constructor(config, logger, errorHandler)
  async processText(text)
}
```

- 调用本地大模型 API
- 处理 OCR 识别结果
- 返回处理后的内容

### 5. 通知服务 (NotificationService.js)

```javascript
class NotificationService {
  constructor(logger, errorHandler)
  async showNotification(title, message, options)
  async showResult(result)
}
```

- 调用 macOS 系统通知
- 显示处理结果给用户
- 支持点击通知的交互

### 6. 结果管理器 (ResultManager.js)

```javascript
class ResultManager {
  constructor(logger)
  addResult(result)
  getResults()
  getStats()
  clearResults()
}
```

- 管理所有处理结果
- 提供结果查询和统计
- 内存存储，支持清理

### 7. 配置管理器 (ConfigManager.js)

```javascript
class ConfigManager {
  constructor()
  load()
  get(key)
  validate()
}
```

- 加载配置文件
- 支持环境变量覆盖
- 配置验证和默认值

### 8. 日志工具 (Logger.js)

```javascript
class Logger {
  info(message, meta)
  error(message, error)
  debug(message, meta)
}
```

- 统一的日志格式
- 不同级别的日志输出
- 包含时间戳和上下文信息

### 9. 错误处理器 (ErrorHandler.js)

```javascript
class ErrorHandler {
  handle(error, context)
  createError(message, code)
}
```

- 统一的错误处理逻辑
- 错误分类和格式化
- 错误日志记录

## 数据格式

### 处理结果对象

使用简单的 JavaScript 对象存储处理结果：

```javascript
{
  id: string,
  timestamp: Date,
  imagePath: string,
  ocrText: string,
  llmResult: string,
  status: 'processing' | 'completed' | 'failed',
  error: Error | null
}
```

## 错误处理

### 错误分类

- **ConfigError**: 配置相关错误
- **ServiceError**: 外部服务调用错误
- **FileError**: 文件操作错误
- **ValidationError**: 数据验证错误

### 错误处理流程

1. 服务层捕获具体错误
2. 通过 ErrorHandler 统一处理
3. 记录错误日志
4. 返回标准化错误响应
