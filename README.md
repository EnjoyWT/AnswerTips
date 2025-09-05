# AnswerTips 


一个用于监听Mac桌面文件夹并自动识别新增图片文字的Node.js应用。将识别的内容调用llm 接口(本示例中调用的本地Dify接口)，本地通知提示结果，可以过浏览器防作弊检测。

## 功能特性

- 🔍 自动监听指定文件夹的新增图片文件
- 📝 调用OCR API识别图片中的文字
- 🖥️ 支持多种图片格式 (jpg, jpeg, png, gif, bmp, webp)
- ⚙️ 可配置的监听路径和OCR参数
- 📦 可打包成Mac OS和Windows可执行文件

## 安装依赖

```bash
npm install
```

## 配置

编辑 `config.json` 文件来配置应用参数：

```json
{
  "watchFolder": "~/Desktop",
  "ocrApiUrl": "http://localhost:7321/api/v1/ocr",
  "healthCheckUrl": "http://localhost:7321/health",
  "supportedImageExtensions": [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"],
  "language": "zh-CN",
  "checkInterval": 1000,
  "maxRetries": 3,
  "retryDelay": 2000
}
```

### 配置说明

- `watchFolder`: 监听的文件夹路径（支持 `~` 表示用户主目录）
- `ocrApiUrl`: OCR识别API地址
- `healthCheckUrl`: OCR服务健康检查地址
- `supportedImageExtensions`: 支持的图片文件扩展名
- `language`: OCR识别语言（默认中文）
- `checkInterval`: 检查间隔（毫秒）
- `maxRetries`: 最大重试次数
- `retryDelay`: 重试延迟（毫秒）

## 使用方法

### 开发模式运行

```bash
npm run dev
```

### 生产模式运行

```bash
npm start
```

## 打包成可执行文件

### 安装pkg

```bash
npm install -g pkg
```

### 打包命令

```bash
npm run build
```

打包后的文件将生成在 `dist/` 目录下：
- `answer-tips-macos`: Mac OS可执行文件
- `answer-tips-win.exe`: Windows可执行文件

## 使用说明

1. 确保OCR服务已启动并运行在 `http://localhost:7321`
2. 运行应用：`npm start`
3. 将图片文件拖拽到监听的文件夹中
4. 应用会自动识别图片中的文字并输出结果

## OCR服务要求

应用需要配合OCR服务使用，服务应提供以下接口：

- `GET /health` - 健康检查
- `GET /api/v1/ocr/info` - 服务信息
- `POST /api/v1/ocr` - 图片识别（支持multipart/form-data和二进制上传）

## 注意事项

- 应用会忽略隐藏文件（以 `.` 开头的文件）
- 文件写入完成后会等待2秒再进行OCR识别，确保文件完全写入
- 支持优雅退出（Ctrl+C）
- 监听目录不存在时会自动退出

## 错误处理

- OCR服务不可用时会在启动时提示
- 文件处理失败时会记录错误日志
- 网络请求超时时间为30秒
- 支持自动重试机制

## 许可证

MIT License
