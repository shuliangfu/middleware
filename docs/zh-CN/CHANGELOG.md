# 变更日志

[English](../en-US/CHANGELOG.md) | 中文 (Chinese)

本文档记录 @dreamer/middleware 的所有重要变更。格式基于
[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本遵循
[Semantic Versioning](https://semver.org/lang/zh-CN/)。

---

## [1.0.1] - 2026-02-19

### 变更

- **i18n**：翻译方法由 `$t` 重命名为 `$tr`，避免与全局 `$t`
  冲突。请将现有代码中本包消息改为使用 `$tr`。
- **文档**：文档结构调整为 `docs/en-US/`（CHANGELOG、TEST_REPORT）与
  `docs/zh-CN/`（README、CHANGELOG、TEST_REPORT 全文中文）。根目录
  CHANGELOG、TEST_REPORT 已移除，根目录 README 精简并链接至 docs。
- **许可证**：在 `deno.json` 及文档中明确为 Apache-2.0。

---

## [1.0.0] - 2026-02-06

### 新增

首个稳定版。兼容 Deno 与 Bun
的通用中间件系统，提供链式中间件执行、错误处理、条件匹配及服务容器集成。

#### MiddlewareChain

- **注册**（`use`、`useError`）：注册中间件与错误处理函数，支持可选
  path、condition、name
- **执行**（`execute`）：在上下文中运行中间件链；当 `ctx.error` 被设置时停止
- **条件匹配**：路径（字符串、正则、函数）、方法（字符串、数组、函数）、自定义
  `match` 函数
- **重载**：`use(middleware)`、`use(path, middleware)`、`use(middleware, condition, name)`
- **性能监控**：`enablePerformanceMonitoring`、`disablePerformanceMonitoring`、`getStats`、`clearStats`
- **管理**：`remove`、`removeError`、`getMiddleware`、`getErrorMiddleware`、`hasMiddleware`、`hasErrorMiddleware`
- **列表**：`listMiddlewares`、`listErrorMiddlewares`
- **插入**：`insertBefore`、`insertAfter` 动态调整中间件顺序
- **工具**：`clear`、`getMiddlewareCount`、`getErrorMiddlewareCount`

#### MiddlewareManager

- **服务容器集成**：通过 `@dreamer/service` 管理中间件
- **多链**：具名中间件链，`chain` 选项
- **注册**：`register`、`registerError`、`registerAll`（按优先级排序）
- **管理**：`remove`、`has`、`get`、`list`、`listByChain`、`listChains`
- **执行**：`execute(ctx, chainName?)`、`getChain(chainName)`
- **统计**：`getStats`、`clearStats`、`getMiddlewareCount`、`getChainCount`
- **清理**：`clearChain`、`clear`、`dispose`
- **性能**：`enablePerformanceMonitoring`、`disablePerformanceMonitoring`
- 自动将管理器与链注册到服务容器

#### 工具函数

- `createMiddlewareChain<T>()`：创建链实例
- `createMiddleware<T>(middleware)`：类型推断辅助
- `matchPath(path)`：路径匹配条件
- `matchMethod(method)`：方法匹配条件
- `combineConditions(...conditions)`：组合多个条件
- `matchCondition(condition, ctx)`：统一匹配逻辑（路径、方法、自定义）
- `createMiddlewareManager<T>(container, options?)`：创建管理器实例

#### 类型导出

- `MiddlewareContext`、`Middleware<T>`、`ErrorMiddleware<T>`
- `MiddlewareCondition`、`MiddlewareStats`
- `MiddlewareManagerOptions`、`MiddlewareDefinition`、`ErrorMiddlewareDefinition`
