# @dreamer/middleware

> General-purpose middleware system compatible with Deno and Bun. Provides chained middleware execution, error handling, and service container integration.

English | [中文 (Chinese)](./README-zh.md)

[![JSR](https://jsr.io/badges/@dreamer/middleware)](https://jsr.io/@dreamer/middleware)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE.md)
[![Tests](https://img.shields.io/badge/tests-75%20passed-brightgreen)](./TEST_REPORT.md)

---

## 🎯 Features

General-purpose middleware system for HTTP, WebSocket, message queues, and more. Integrates with `@dreamer/service` via `MiddlewareManager` to manage multiple middleware chains.

---

## 📦 Installation

### Deno

```bash
deno add jsr:@dreamer/middleware
```

### Bun

```bash
bunx jsr add @dreamer/middleware
```

---

## 🌍 Environment Compatibility

| Environment | Version | Status |
|-------------|---------|--------|
| **Deno** | 2.5+ | ✅ Fully supported |
| **Bun** | 1.0+ | ✅ Fully supported |
| **Server** | - | ✅ Supported (middleware is primarily server-side) |
| **Client** | - | ❌ Not supported (middleware is a server-side pattern) |
| **Dependencies** | @dreamer/service (optional) | 📦 For MiddlewareManager service container integration |

**Note**: @dreamer/middleware is server-only; no client subpackage.

---

## ✨ Capabilities

- **Chained middleware**:
  - Middleware registration and execution
  - Middleware chain construction
  - Execution order control
  - Async middleware support

- **Middleware types**:
  - Request handling middleware
  - Error handling middleware
  - Conditional middleware (path, method, etc.)
  - Combined middleware (multiple conditions)

- **Middleware context**:
  - Context object passing
  - Context extension and modification
  - Data sharing between middleware
  - Stop subsequent middleware when `ctx.error` is set

- **Middleware management** (new):
  - Remove: `remove(name)`
  - Query: `getMiddleware(name)`, `hasMiddleware(name)`
  - List: `listMiddlewares()`
  - Insert: `insertBefore()`, `insertAfter()`

- **Advanced**:
  - Conditional execution (skip)
  - Error capture and handling
  - Performance monitoring
  - Debug utilities

- **MiddlewareManager** (new):
  - Manage middleware via service container
  - Multiple named middleware chains
  - Priority-based sorting
  - Batch registration
  - Auto-register chains to service container

---

## 🎯 Use Cases

- HTTP request handling (with @dreamer/http)
- WebSocket connection handling (with @dreamer/websocket)
- Message queue processing (with @dreamer/queue)
- Data pipelines
- Event handling chains
- Microservice gateway middleware management

---

## 📐 Architecture

- **Middleware is HTTP-agnostic** for generality
- HTTP libraries depend on middleware for middleware features
- MiddlewareManager integrates with service container, similar to PluginManager

---

## 🚀 Quick Start

### Basic usage

```typescript
import { MiddlewareChain } from "jsr:@dreamer/middleware";

const chain = new MiddlewareChain();

chain.use(async (ctx, next) => {
  console.log(`Processing: ${ctx.path}`);
  await next();
});

chain.use(async (ctx, next) => {
  const token = ctx.headers?.get("authorization");
  if (!token) {
    ctx.error = { status: 401, message: "Unauthorized" };
    return;
  }
  await next();
});

const context = { path: "/api/users", headers: new Headers() };
await chain.execute(context);
```

### Conditional middleware (path matching)

```typescript
import { MiddlewareChain } from "jsr:@dreamer/middleware";

const chain = new MiddlewareChain();

// String path (prefix match)
chain.use("/api", async (ctx, next) => {
  console.log("API request:", ctx.path);
  await next();
});

// Regex
chain.use(
  async (ctx, next) => {
    console.log("Matched path:", ctx.path);
    await next();
  },
  { path: /^\/api\/v\d+/ },
);

// Function
chain.use(
  async (ctx, next) => {
    console.log("Matched path:", ctx.path);
    await next();
  },
  { path: (path) => path.includes("/admin") },
);
```

### Method matching

```typescript
import { MiddlewareChain } from "jsr:@dreamer/middleware";

const chain = new MiddlewareChain();

chain.use(
  async (ctx, next) => {
    console.log("GET request");
    await next();
  },
  { method: "GET" },
);

chain.use(
  async (ctx, next) => {
    console.log("POST or PUT request");
    await next();
  },
  { method: ["POST", "PUT"] },
);

chain.use(
  async (ctx, next) => {
    console.log("Non-GET request");
    await next();
  },
  { method: (method) => method !== "GET" },
);
```

### Combined conditions

```typescript
import {
  combineConditions,
  matchMethod,
  matchPath,
  MiddlewareChain,
} from "jsr:@dreamer/middleware";

const chain = new MiddlewareChain();

chain.use(
  async (ctx, next) => {
    console.log("API POST request");
    await next();
  },
  combineConditions(matchPath("/api"), matchMethod("POST")),
);

chain.use(
  async (ctx, next) => {
    console.log("API GET request");
    await next();
  },
  { path: "/api", method: "GET" },
);
```

### Error handling middleware

```typescript
import { MiddlewareChain } from "jsr:@dreamer/middleware";

const chain = new MiddlewareChain();

chain.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    throw error;
  }
});

chain.use(async () => {
  throw new Error("Processing failed");
});

chain.useError(async (ctx, error) => {
  console.error("Caught error:", error.message);
  ctx.error = {
    status: 500,
    message: "Internal Server Error",
    details: error.message,
  };
});

const context = { path: "/api/test" };
await chain.execute(context);
console.log(context.error);
```

### Performance monitoring

```typescript
import { MiddlewareChain } from "jsr:@dreamer/middleware";

const chain = new MiddlewareChain();

chain.enablePerformanceMonitoring();

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

for (let i = 0; i < 10; i++) {
  await chain.execute({ path: "/api/test" });
}

const stats = chain.getStats();
console.log(stats);

chain.clearStats();
```

---

## 📚 API Reference

### MiddlewareChain class

#### Constructor

```typescript
const chain = new MiddlewareChain<T extends MiddlewareContext>();
```

#### Methods

##### `use(middleware, condition?, name?)`

Register middleware.

**Overloads**:

- `use(middleware: Middleware<T>, condition?: MiddlewareCondition, name?: string): void`
- `use(path: string, middleware: Middleware<T>, name?: string): void`

**Parameters**:

- `middleware`: Middleware function
- `condition`: Match condition (optional)
- `name`: Middleware name (optional, for debugging and performance)

**Example**:

```typescript
chain.use(async (ctx, next) => {
  await next();
});

chain.use("/api", async (ctx, next) => {
  await next();
});

chain.use(
  async (ctx, next) => {
    await next();
  },
  { path: "/api", method: "GET" },
  "api-get-middleware",
);
```

##### `useError(middleware, name?)`

Register error handler middleware.

##### `execute(ctx)`

Execute middleware chain.

##### `enablePerformanceMonitoring()` / `disablePerformanceMonitoring()`

Enable or disable performance monitoring.

##### `getStats()` / `clearStats()`

Get or clear performance stats.

##### `clear()`

Clear all middleware.

##### `getMiddlewareCount()` / `getErrorMiddlewareCount()`

Get middleware counts.

##### `remove(name)` (new)

Remove middleware by name. Returns `boolean`.

##### `removeError(name)` (new)

Remove error handler middleware by name.

##### `getMiddleware(name)` (new)

Get middleware by name. Returns `Middleware<T> | undefined`.

##### `getErrorMiddleware(name)` (new)

Get error handler middleware by name.

##### `hasMiddleware(name)` / `hasErrorMiddleware(name)` (new)

Check if middleware exists.

##### `listMiddlewares()` / `listErrorMiddlewares()` (new)

List all middleware names.

##### `insertBefore(targetName, middleware, condition?, name?)` (new)

Insert middleware before target. Returns `boolean`.

##### `insertAfter(targetName, middleware, condition?, name?)` (new)

Insert middleware after target.

### Helper functions

#### `createMiddlewareChain<T>()`

Create middleware chain instance.

#### `createMiddleware<T>(middleware)`

Create middleware (for type inference).

#### `matchPath(path)`

Path match helper. Returns `MiddlewareCondition`.

#### `matchMethod(method)`

Method match helper. Returns `MiddlewareCondition`.

#### `combineConditions(...conditions)`

Combine match conditions. Returns `MiddlewareCondition`.

#### `matchCondition(condition, ctx)` (new)

Check if condition matches context. Returns `boolean`.

#### `createMiddlewareManager<T>(container, options?)` (new)

Create middleware manager instance.

### Type definitions

#### `MiddlewareContext`

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

```typescript
type Middleware<T extends MiddlewareContext> = (
  ctx: T,
  next: () => Promise<void>,
) => void | Promise<void>;
```

#### `ErrorMiddleware<T>`

```typescript
type ErrorMiddleware<T extends MiddlewareContext> = (
  ctx: T,
  error: Error,
  next: () => Promise<void>,
) => void | Promise<void>;
```

#### `MiddlewareCondition`

```typescript
interface MiddlewareCondition {
  path?: string | RegExp | ((path: string) => boolean);
  method?: string | string[] | ((method: string) => boolean);
  match?: (ctx: MiddlewareContext) => boolean;
}
```

#### `MiddlewareStats`

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

### MiddlewareManager class

Manages multiple middleware chains via service container.

#### Constructor

```typescript
new MiddlewareManager(
  container: ServiceContainer,
  options?: MiddlewareManagerOptions
)
```

**Options**:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enablePerformanceMonitoring` | `boolean` | `false` | Enable performance monitoring |
| `continueOnError` | `boolean` | `true` | Continue on error |

#### Registration

| Method | Description |
|--------|-------------|
| `register(definition)` | Register middleware |
| `registerError(definition)` | Register error handler |
| `registerAll(definitions)` | Batch register (priority sorted) |

#### Management

| Method | Description |
|--------|-------------|
| `remove(name)` | Remove middleware |
| `has(name)` | Check if exists |
| `get(name)` | Get definition |
| `list()` | List all names |
| `listByChain(chainName)` | List by chain |
| `listChains()` | List chain names |

#### Execution

| Method | Description |
|--------|-------------|
| `execute(ctx, chainName?)` | Execute chain |
| `getChain(chainName)` | Get chain instance |

#### Statistics

| Method | Description |
|--------|-------------|
| `getStats(chainName?)` | Get performance stats |
| `clearStats(chainName?)` | Clear stats |
| `getMiddlewareCount()` | Total middleware count |
| `getChainCount()` | Total chain count |

#### Cleanup

| Method | Description |
|--------|-------------|
| `clearChain(chainName)` | Clear specified chain |
| `clear()` | Clear all |
| `dispose()` | Dispose manager |

**Example**:

```typescript
import { ServiceContainer } from "@dreamer/service";
import { MiddlewareManager } from "@dreamer/middleware";

const container = new ServiceContainer();
const manager = new MiddlewareManager(container);

manager.register({
  name: "logger",
  priority: 10,
  handler: async (ctx, next) => {
    console.log("Request:", ctx.path);
    await next();
  },
});

manager.register({
  name: "auth",
  priority: 20,
  condition: { path: "/api" },
  handler: async (ctx, next) => {
    await next();
  },
});

await manager.execute({ path: "/api/users" });
```

### MiddlewareDefinition interface

```typescript
interface MiddlewareDefinition<T extends MiddlewareContext> {
  name: string;
  handler: Middleware<T>;
  condition?: MiddlewareCondition;
  priority?: number; // default 100
  chain?: string; // default "default"
}
```

---

## 🔧 Design Principles

- **Generality**: HTTP-agnostic, usable in many scenarios
- **Flexibility**: Conditional matching, error handling, performance monitoring
- **Type safety**: Full TypeScript support
- **Usability**: Simple API, multiple call styles
- **Service container**: MiddlewareManager integrates with @dreamer/service

---

## 📊 Test Report

| Metric | Value |
|--------|-------|
| Test date | 2026-01-30 |
| Test files | 1 |
| Total cases | 75 |
| Pass rate | 100% |
| Execution time | ~70ms |

**Coverage**:

- ✅ All public API methods (47)
- ✅ MiddlewareChain full functionality
- ✅ MiddlewareManager full functionality
- ✅ Edge cases (10 types)
- ✅ Error handling (5 scenarios)

See [TEST_REPORT.md](./TEST_REPORT.md) for details.

---

## 📝 Notes

1. **Server-only**: Middleware is a server-side pattern.

2. **ctx.error stops execution**: When `ctx.error` is set, subsequent middleware is skipped.

3. **Unique names**: Each middleware must have a unique name; duplicate registration throws.

4. **Priority**: With `registerAll()`, middleware is sorted by `priority` (lower runs first).

5. **Chain isolation**: Different chains are fully isolated.

6. **Service container**: MiddlewareManager auto-registers itself and chains to the container.

7. **Type safety**: Full TypeScript support with generic context types.

---

## 🤝 Contributing

Issues and Pull Requests are welcome.

---

## 📄 License

MIT License - see [LICENSE.md](./LICENSE.md)

---

<div align="center">

**Made with ❤️ by Dreamer Team**

</div>
