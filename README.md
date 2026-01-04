# 幻觉翻译 arXiv 翻译插件 | hjfy.top arXiv Translation for Zotero

[![zotero target version](https://img.shields.io/badge/Zotero-7-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org)
[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)
[![License](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](LICENSE)

基于 [幻觉翻译 hjfy.top](https://hjfy.top) 的 Zotero 插件，用于获取基于 LaTeX 源码翻译的 arXiv 论文中文 PDF，并自动添加为附件。

A Zotero plugin that downloads Chinese translations of arXiv papers based on LaTeX source code from [幻觉翻译 hjfy.top](https://hjfy.top).

[English](#english) | [简体中文](#简体中文)

---

## 简体中文

### ✨ 功能特点

- 🎯 **一键翻译**：右键点击即可翻译 arXiv 论文
- 📥 **自动下载**：从 [幻觉翻译 hjfy.top](https://hjfy.top) 获取高质量的中文翻译 PDF
- 🔄 **批量处理**：支持同时翻译多篇论文
- 📎 **智能附件**：自动添加为 Zotero 条目附件，标题为"中文翻译 - 原标题"
- 🔍 **智能识别**：自动从 DOI、URL、Extra 字段提取 arXiv ID
- 🌐 **多语言支持**：支持中文、英文界面

### 📸 使用示例

1. 在 Zotero 中选择包含 arXiv DOI 的条目
2. 右键点击选择 **"hjfy.top arXiv: 翻译当前文章"**
3. 插件会自动下载并添加翻译 PDF 为附件

### 🚀 安装方法

#### 方法 1：从 XPI 文件安装（推荐）

1. 在 [Releases](https://github.com/angjustinl/zotero-plugin-hjfy/releases) 页面下载最新的 `.xpi` 文件
2. 在 Zotero 中：**工具 → 插件 → 安装插件** → 选择下载的 XPI 文件
3. 重启 Zotero

#### 方法 2：开发模式安装

```bash
# 克隆仓库
git clone https://github.com/angjustinl/zotero-plugin-hjfy.git
cd zotero-plugin-hjfy

# 安装依赖
npm install

# 复制环境配置
cp .env.example .env

# 编辑 .env 文件，设置 Zotero 路径
# Windows:
# ZOTERO_PLUGIN_ZOTERO_BIN_PATH=C:/Program Files/Zotero/zotero.exe
# ZOTERO_PLUGIN_PROFILE_PATH=C:/Users/YourName/Zotero/Profiles/xxxxx.default

# 启动开发模式
npm start
```

### 📖 使用说明

#### 支持的 DOI 格式

插件支持以下 arXiv DOI 格式：

- `10.48550/arxiv.2410.07087`（标准格式）
- `arxiv.2410.07087`（简化格式）

#### 数据来源

插件从 [hjfy.top](https://hjfy.top) API 获取翻译文件：

```
API: https://hjfy.top/api/arxivFiles/{arxiv_id}
```

返回数据包括：

- `origin`: 原文 PDF
- `zhCN`: 中文翻译 PDF（优先使用）
- `zhCNTar`: 中文翻译压缩包

#### 批量翻译

选中多个包含 arXiv DOI 的条目，右键选择翻译即可批量处理。

### 🛠️ 开发指南

#### 环境要求

- **Zotero 7+**（Beta 版本）
- **Node.js**（最新 LTS 版本）
- **Git**

#### 项目结构

```
zotero-plugin-hjfy/
├── src/
│   ├── modules/
│   │   └── arxivTranslation.ts    # 核心翻译功能
│   ├── hooks.ts                    # 生命周期钩子
│   ├── index.ts                    # 入口文件
│   └── addon.ts                    # 插件基类
├── addon/
│   ├── locale/                     # 本地化文件
│   │   ├── en-US/addon.ftl
│   │   └── zh-CN/addon.ftl
│   └── manifest.json
├── package.json
└── README.md
```

#### 开发命令

```bash
# 启动开发服务器（自动热重载）
npm start

# 构建生产版本
npm run build

# 代码检查
npm run lint:check

# 自动修复代码格式
npm run lint:fix

# 发布新版本
npm run release
```

### 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 📄 许可证

[AGPL-3.0-or-later](LICENSE)

### 🙏 致谢

- [hjfy.top](https://hjfy.top) - 提供高质量的 arXiv 论文翻译服务
- [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template) - 插件开发模板
- [Zotero Plugin Toolkit](https://github.com/windingwind/zotero-plugin-toolkit) - 开发工具库
- [Zotero Plugin Scaffold](https://github.com/northword/zotero-plugin-scaffold) - 构建工具

---

## English

### ✨ Features

- 🎯 **One-Click Translation**: Right-click to translate arXiv papers instantly
- 📥 **Auto Download**: Fetch high-quality Chinese translations from hjfy.top
- 🔄 **Batch Processing**: Translate multiple papers simultaneously
- 📎 **Smart Attachments**: Automatically add as Zotero attachments with "中文翻译 - [Original Title]"
- 🔍 **Smart Recognition**: Extract arXiv ID from DOI, URL, or Extra fields
- 🌐 **Multi-language**: Support for both Chinese and English interfaces

### 📸 Quick Start

1. Select an arXiv item in Zotero
2. Right-click and choose **"hjfy.top arXiv: Translate Current Article"**
3. The plugin will automatically download and attach the translated PDF

### 🚀 Installation

#### Method 1: Install from XPI (Recommended)

1. Download the latest `.xpi` from [Releases](https://github.com/angjustinl/zotero-plugin-hjfy/releases)
2. In Zotero: **Tools → Plugins → Install Plugin** → Select the XPI file
3. Restart Zotero

#### Method 2: Development Mode

```bash
# Clone repository
git clone https://github.com/angjustinl/zotero-plugin-hjfy.git
cd zotero-plugin-hjfy

# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Edit .env file to set Zotero paths
# Then start development mode
npm start
```

### 📖 Usage

#### Supported DOI Formats

- `10.48550/arxiv.2410.07087` (Standard format)
- `arxiv.2410.07087` (Simplified format)

#### Data Source

The plugin fetches translations from [hjfy.top](https://hjfy.top) API:

```
API: https://hjfy.top/api/arxivFiles/{arxiv_id}
```

Response includes:

- `origin`: Original PDF
- `zhCN`: Chinese translation PDF (preferred)
- `zhCNTar`: Chinese translation archive

### 🛠️ Development

#### Requirements

- **Zotero 7+** (Beta build)
- **Node.js** (Latest LTS)
- **Git**

#### Commands

```bash
# Start development server with hot reload
npm start

# Build for production
npm run build

# Lint code
npm run lint:check

# Fix code formatting
npm run lint:fix

# Release new version
npm run release
```

### 🤝 Contributing

Issues and Pull Requests are welcome!

### 📄 License

[AGPL-3.0-or-later](LICENSE)

### 🙏 Acknowledgments

- [hjfy.top](https://hjfy.top) - High-quality arXiv paper translation service
- [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template)
- [Zotero Plugin Toolkit](https://github.com/windingwind/zotero-plugin-toolkit)
- [Zotero Plugin Scaffold](https://github.com/northword/zotero-plugin-scaffold)
