# @dreamer/middleware

> 一个兼容 Deno 和 Bun 的通用中间件系统，提供中间件链式调用、错误处理等功能

[![JSR](https://jsr.io/badges/@dreamer/middleware)](https://jsr.io/@dreamer/middleware)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🎯 功能

通用中间件系统，可用于多种场景（HTTP、WebSocket、消息队列等）。

## 特性

- **中间件链式调用**：
  - 中间件注册和执行
  - 中间件链构建
  - 中间件执行顺序控制
  - 异步中间件支持
- **中间件类型**：
  - 请求处理中间件
  - 错误处理中间件
  - 条件中间件（路径匹配、方法匹配等）
  - 组合中间件（多个中间件组合）
- **中间件上下文**：
  - 上下文对象传递
  - 上下文扩展和修改
  - 中间件间数据共享
- **高级功能**：
  - 中间件跳过（条件执行）
  - 中间件错误捕获和处理
  - 中间件性能监控
  - 中间件调试工具

## 依赖

无（独立库）

## 使用场景

- HTTP 请求处理（配合 @dreamer/http）
- WebSocket 连接处理（配合 @dreamer/websocket）
- 消息队列处理（配合 @dreamer/queue）
- 数据管道处理
- 事件处理链

## 架构说明

- **中间件系统独立于 HTTP**，保持通用性
- HTTP 库依赖中间件库来实现中间件功能
- 这样设计更灵活，中间件系统可以用于多种场景

## 安装

```bash
deno add jsr:@dreamer/middleware
```

## 环境兼容性

- **运行时要求**：Deno 2.6+ 或 Bun 1.3.5
- **服务端**：✅ 支持（兼容 Deno 和 Bun 运行时，中间件系统主要用于服务端）
- **客户端**：❌ 不支持（中间件系统是服务端架构模式，客户端不需要，如需客户端请求拦截等功能，需要另外实现客户端专用库）
- **依赖**：无外部依赖（纯 TypeScript 实现）

---

## 🚀 快速开始

### 基础用法

```typescript
import { MiddlewareChain } from "jsr:@dreamer/middleware";

// 创建中间件链
const chain = new MiddlewareChain();

// 注册中间件
chain.use(async (ctx, next) => {
  // 请求日志中间件
  console.log(`Processing: ${ctx.path}`);
  await next();
});

chain.use(async (ctx, next) => {
  // 认证中间件
  const token = ctx.headers?.get("authorization");
  if (!token) {
    ctx.error = { status: 401, message: "Unauthorized" };
    return;
  }
  await next();
});

// 执行中间件链
const context = { path: "/api/users", headers: new Headers() };
await chain.execute(context);
```

### 条件中间件（路径匹配）

```typescript
import { MiddlewareChain } from "jsr:@dreamer/middleware";

const chain = new MiddlewareChain();

// 方式1：使用字符串路径（前缀匹配）
chain.use("/api", async (ctx, next) => {
  // 只对 /api 开头的路径生效
  console.log("API 请求:", ctx.path);
  await next();
});

// 方式2：使用正则表达式
chain.use(
  async (ctx, next) => {
    console.log("匹配正则的路径:", ctx.path);
    await next();
  },
  { path: /^\/api\/v\d+/ },
);

// 方式3：使用函数
chain.use(
  async (ctx, next) => {
    console.log("匹配函数的路径:", ctx.path);
    await next();
  },
  { path: (path) => path.includes("/admin") },
);
```

### 方法匹配

```typescript
import { MiddlewareChain } from "jsr:@dreamer/middleware";

const chain = new MiddlewareChain();

// 方式1：匹配单个方法
chain.use(
  async (ctx, next) => {
    console.log("GET 请求");
    await next();
  },
  { method: "GET" },
);

// 方式2：匹配多个方法
chain.use(
  async (ctx, next) => {
    console.log("POST 或 PUT 请求");
    await next();
  },
  { method: ["POST", "PUT"] },
);

// 方式3：使用函数
chain.use(
  async (ctx, next) => {
    console.log("非 GET 请求");
    await next();
  },
  { method: (method) => method !== "GET" },
);
```

### 组合条件

```typescript
import { MiddlewareChain, combineConditions, matchPath, matchMethod } from "jsr:@dreamer/middleware";

const chain = new MiddlewareChain();

// 方式1：使用 combineConditions
chain.use(
  async (ctx, next) => {
    console.log("API POST 请求");
    await next();
  },
  combineConditions(
    matchPath("/api"),
    matchMethod("POST"),
  ),
);

// 方式2：直接在条件对象中指定
chain.use(
  async (ctx, next) => {
    console.log("API GET 请求");
    await next();
  },
  {
    path: "/api",
    method: "GET",
  },
);
```

### 错误处理中间件

```typescript
import { MiddlewareChain } from "jsr:@dreamer/middleware";

const chain = new MiddlewareChain();

// 注册普通中间件
chain.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    // 中间件内部错误会被错误处理中间件捕获
    throw error;
  }
});

chain.use(async (ctx, next) => {
  // 模拟错误
  throw new Error("处理失败");
});

// 注册错误处理中间件
chain.useError(async (ctx, error, next) => {
  console.error("捕获错误:", error.message);
  ctx.error = {
    status: 500,
    message: "Internal Server Error",
    details: error.message,
  };
});

// 执行中间件链
const context = { path: "/api/test" };
await chain.execute(context);
console.log(context.error); // { status: 500, message: "Internal Server Error", ... }
```

### 性能监控

```typescript
import { MiddlewareChain } from "jsr:@dreamer/middleware";

const chain = new MiddlewareChain();

// 启用性能监控
chain.enablePerformanceMonitoring();

// 注册中间件（带名称，便于统计）
chain.use(
  async (ctx, next) => {
    await next();
  },
  undefined,
  "logger-middleware",
);

chain.use(
  async (ctx, next) => {
    await next();
  },
  undefined,
  "auth-middleware",
);

// 执行多次
for (let i = 0; i < 10; i++) {
  await chain.execute({ path: "/api/test" });
}

// 获取性能统计
const stats = chain.getStats();
console.log(stats);
// [
//   {
//     name: "logger-middleware",
//     count: 10,
//     totalTime: 5,
//     averageTime: 0.5,
//     maxTime: 2,
//     minTime: 0,
//     errorCount: 0
//   },
//   ...
// ]

// 清空统计
chain.clearStats();
```

---

## 📚 API 文档

```typescript
import { MiddlewareChain, matchPath, matchMethod } from "jsr:@dreamer/middleware";

// 定义上下文类型
interface HttpContext {
  path: string;
  method: string;
  headers: Headers;
  body?: unknown;
  error?: {
    status: number;
    message: string;
  };
}

// 创建中间件链
const chain = new MiddlewareChain<HttpContext>();

// 启用性能监控
chain.enablePerformanceMonitoring();

// 1. 日志中间件（所有请求）
chain.use(
  async (ctx, next) => {
    console.log(`${ctx.method} ${ctx.path}`);
    const start = Date.now();
    await next();
    const duration = Date.now() - start;
    console.log(`耗时: ${duration}ms`);
  },
  undefined,
  "logger",
);

// 2. CORS 中间件（所有请求）
chain.use(
  async (ctx, next) => {
    // 设置 CORS 头（示例）
    console.log("设置 CORS 头");
    await next();
  },
  undefined,
  "cors",
);

// 3. 认证中间件（仅 API 路径）
chain.use(
  async (ctx, next) => {
    const token = ctx.headers.get("authorization");
    if (!token) {
      ctx.error = { status: 401, message: "Unauthorized" };
      return;
    }
    console.log("认证通过");
    await next();
  },
  matchPath("/api"),
  "auth",
);

// 4. 请求体解析中间件（仅 POST/PUT）
chain.use(
  async (ctx, next) => {
    // 解析请求体（示例）
    console.log("解析请求体");
    await next();
  },
  matchMethod(["POST", "PUT"]),
  "body-parser",
);

// 5. 错误处理中间件
chain.useError(async (ctx, error, next) => {
  console.error("错误:", error);
  ctx.error = {
    status: ctx.error?.status || 500,
    message: ctx.error?.message || "Internal Server Error",
  };
});

// 执行中间件链
const context: HttpContext = {
  path: "/api/users",
  method: "POST",
  headers: new Headers({
    authorization: "Bearer token123",
  }),
};

await chain.execute(context);

// 检查结果
if (context.error) {
  console.log("错误:", context.error);
} else {
  console.log("处理成功");
}

// 查看性能统计
const stats = chain.getStats();
console.log("性能统计:", stats);
```

## API 文档

### MiddlewareChain 类

#### 构造函数

```typescript
const chain = new MiddlewareChain<T extends MiddlewareContext>();
```

#### 方法

##### `use(middleware, condition?, name?)`
注册中间件

**重载**：
- `use(middleware: Middleware<T>, condition?: MiddlewareCondition, name?: string): void`
- `use(path: string, middleware: Middleware<T>, name?: string): void`

**参数**：
- `middleware`: 中间件函数
- `condition`: 匹配条件（可选）
- `name`: 中间件名称（可选，用于调试和性能监控）

**示例**：
```typescript
// 方式1：简单注册
chain.use(async (ctx, next) => {
  await next();
});

// 方式2：路径匹配
chain.use("/api", async (ctx, next) => {
  await next();
});

// 方式3：条件匹配
chain.use(
  async (ctx, next) => {
    await next();
  },
  { path: "/api", method: "GET" },
  "api-get-middleware",
);
```

##### `useError(middleware, name?)`
注册错误处理中间件

**参数**：
- `middleware`: 错误处理中间件函数
- `name`: 中间件名称（可选）

**示例**：
```typescript
chain.useError(async (ctx, error, next) => {
  console.error("错误:", error);
  ctx.error = { status: 500, message: "Internal Server Error" };
});
```

##### `execute(ctx)`
执行中间件链

**参数**：
- `ctx`: 上下文对象

**返回**：`Promise<void>`

**示例**：
```typescript
await chain.execute({ path: "/api/users" });
```

##### `enablePerformanceMonitoring()`
启用性能监控

##### `disablePerformanceMonitoring()`
禁用性能监控

##### `getStats()`
获取性能统计

**返回**：`MiddlewareStats[]`

##### `clearStats()`
清空性能统计

##### `clear()`
清空所有中间件

##### `getMiddlewareCount()`
获取中间件数量

##### `getErrorMiddlewareCount()`
获取错误处理中间件数量

### 辅助函数

#### `createMiddlewareChain<T>()`
创建中间件链实例

#### `createMiddleware<T>(middleware)`
创建中间件辅助函数（用于类型推断）

#### `matchPath(path)`
路径匹配辅助函数

**参数**：
- `path`: 路径模式（字符串、正则表达式、函数）

**返回**：`MiddlewareCondition`

#### `matchMethod(method)`
方法匹配辅助函数

**参数**：
- `method`: 方法模式（字符串、字符串数组、函数）

**返回**：`MiddlewareCondition`

#### `combineConditions(...conditions)`
组合匹配条件

**参数**：
- `conditions`: 匹配条件数组

**返回**：`MiddlewareCondition`

### 类型定义

#### `MiddlewareContext`
中间件上下文接口

```typescript
interface MiddlewareContext {
  path?: string;
  method?: string;
  error?: {
    status?: number;
    message?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
```

#### `Middleware<T>`
中间件函数类型

```typescript
type Middleware<T extends MiddlewareContext> = (
  ctx: T,
  next: () => Promise<void>,
) => void | Promise<void>;
```

#### `ErrorMiddleware<T>`
错误处理中间件函数类型

```typescript
type ErrorMiddleware<T extends MiddlewareContext> = (
  ctx: T,
  error: Error,
  next: () => Promise<void>,
) => void | Promise<void>;
```

#### `MiddlewareCondition`
中间件匹配条件

```typescript
interface MiddlewareCondition {
  path?: string | RegExp | ((path: string) => boolean);
  method?: string | string[] | ((method: string) => boolean);
  match?: (ctx: MiddlewareContext) => boolean;
}
```

#### `MiddlewareStats`
中间件性能统计

```typescript
interface MiddlewareStats {
  name: string;
  count: number;
  totalTime: number;
  averageTime: number;
  maxTime: number;
  minTime: number;
  errorCount: number;
}
```

## 设计原则

- **通用性**：中间件系统独立于 HTTP，可用于多种场景
- **灵活性**：支持条件匹配、错误处理、性能监控等多种功能
- **类型安全**：完整的 TypeScript 类型支持
- **易用性**：简洁的 API，支持多种调用方式

---

## 📝 备注

- **服务端专用**：中间件系统是服务端架构模式，客户端不需要
- **统一接口**：提供统一的中间件 API 接口，降低学习成本
- **类型安全**：完整的 TypeScript 类型支持
- **无外部依赖**：纯 TypeScript 实现

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

MIT License - 详见 [LICENSE.md](./LICENSE.md)

---

<div align="center">

**Made with ❤️ by Dreamer Team**

</div>
