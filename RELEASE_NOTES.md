# MF RSS Reader v1.1.0 Release Notes

**Release Date:** 2026-01-06

## 🎉 插件介绍

MF RSS Reader 是基于 Fluent Reader 的 Chrome 扩展版本，专为浏览器环境优化。

---

## ✨ 新功能

### AI 智能翻译
- 支持 OpenAI 兼容的 AI 翻译服务
- 自动语言检测，智能判断是否需要翻译
- 翻译结果实时显示在原文下方

### 多服务支持
- **Fever API** - 兼容 FreshRSS、TT-RSS 等
- **Feedbin**
- **GReader / Inoreader**
- **Miniflux**
- **Nextcloud News**

---

## 🐛 修复

### 标记已读功能
- 修复"标记以上/以下为已读"后刷新导致状态重置的问题
- 修复服务端同步时覆盖本地已读状态的问题
- 优化 API 请求：现在只为实际有未读文章的 feeds 发送请求，大幅减少不必要的网络请求

### 右键菜单
- 修复浏览器默认右键菜单与自定义菜单同时出现的问题

### 媒体加载
- 更新 CSP 策略，支持加载外部图片和媒体资源

---

## 🔧 技术改进

### 构建流程
- 新增自动打包脚本：运行 `npm run build:extension` 后自动生成 `{name}-{version}.zip`

### 代码优化
- 优化所有第三方服务的 `markAllRead` 函数，减少冗余 API 调用
- 改进内存状态与数据库同步逻辑

---

## 📦 安装方式

1. 下载 `mf-rss-reader-1.0.0.zip`
2. 解压到任意目录
3. 打开 Chrome，进入 `chrome://extensions/`
4. 开启"开发者模式"
5. 点击"加载已解压的扩展程序"，选择解压目录

---

## ⚠️ 已知问题

- iframe sandbox 警告：这是渲染文章内容所必需的配置
- aria-hidden 辅助功能警告：来自 Fluent UI 库，不影响功能

---

## 🙏 致谢

基于 [Fluent Reader](https://github.com/yang991178/fluent-reader) 开发
