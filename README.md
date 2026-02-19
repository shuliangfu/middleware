# @dreamer/middleware

> A general-purpose middleware system compatible with Deno and Bun, providing
> chained middleware execution, error handling, service container integration,
> and more.

> [English](./README.md) (root) | [中文 (Chinese)](./docs/zh-CN/README.md)

[![JSR](https://jsr.io/badges/@dreamer/middleware)](https://jsr.io/@dreamer/middleware)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](./LICENSE)
[![Tests: 75 passed](https://img.shields.io/badge/Tests-75%20passed-brightgreen)](./docs/en-US/TEST_REPORT.md)

---

## 📝 Changelog

### [1.0.2] - 2026-02-19

- **Changed**: i18n auto-initializes on module load; `initMiddlewareI18n` no
  longer exported. Use `setMiddlewareLocale` to set locale. Dependencies bumped:
  @dreamer/runtime-adapter ^1.0.15, @dreamer/service ^1.0.2, @dreamer/test
  ^1.0.10.
- Full history: [Changelog](./docs/en-US/CHANGELOG.md)

---

## 🎯 Overview

A general-purpose middleware system for various scenarios (HTTP, WebSocket,
message queues, etc.). Supports integration with the `@dreamer/service` service
container via `MiddlewareManager` to manage multiple middleware chains in one
place.

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

## 🌍 Environment compatibility

| Environment    | Version requirement         | Status                                                              |
| -------------- | --------------------------- | ------------------------------------------------------------------- |
| **Deno**       | 2.5+                        | ✅ Fully supported                                                  |
| **Bun**        | 1.0+                        | ✅ Fully supported                                                  |
| **Server**     | -                           | ✅ Supported (middleware is primarily used on the server)           |
| **Client**     | -                           | ❌ Not supported (middleware is a server-side architecture pattern) |
| **Dependency** | @dreamer/service (optional) | 📦 Used for MiddlewareManager service container integration         |

**Note**: @dreamer/middleware is a server-side-only package and does not provide
a client sub-package.

---

## ✨ Features

- **Chained middleware execution**:
  - Middleware registration and execution
  - Middleware chain construction
  - Middleware execution order control
  - Async middleware support

- **Middleware types**:
  - Request-handling middleware
  - Error-handling middleware
  - Conditional middleware (path match, method match, etc.)
  - Composite middleware (combining multiple middlewares)

- **Middleware context**:
  - Context object passing
  - Context extension and modification
  - Data sharing between middlewares
  - When `ctx.error` is set, subsequent middleware execution is automatically
    stopped

- **Middleware management** (new):
  - Remove middleware: `remove(name)`
  - Query middleware: `getMiddleware(name)`, `hasMiddleware(name)`
  - List middlewares: `listMiddlewares()`
  - Insert middleware: `insertBefore()`, `insertAfter()`

- **Advanced capabilities**:
  - Middleware skip (conditional execution)
  - Middleware error capture and handling
  - Middleware performance monitoring
  - Middleware debugging utilities

- **MiddlewareManager** (new):
  - Unified middleware management via service container
  - Multiple named middleware chains
  - Middleware priority ordering
  - Batch registration of middlewares
  - Automatic registration of middleware chains into the service container

---

## 🎯 Use cases

- HTTP request handling (with @dreamer/http)
- WebSocket connection handling (with @dreamer/websocket)
- Message queue handling (with @dreamer/queue)
- Data pipeline processing
- Event handling chains
- Microservice gateway middleware management

---

## 📐 Architecture

- **Middleware system is independent of HTTP**, keeping it generic
- The HTTP package depends on the middleware package to implement middleware
  functionality
- This design is more flexible; the middleware system can be used in many
  scenarios
- **MiddlewareManager** provides integration with the service container, similar
  to PluginManager

---

## 🚀 Quick start

### Basic usage

```typescript
import { MiddlewareChain } from "jsr:@dreamer/middleware";

// Create middleware chain
const chain = new MiddlewareChain();

// Register middleware
chain.use(async (ctx, next) => {
  // Request logging middleware
  console.log(`Processing: ${ctx.path}`);
  await next();
});

chain.use(async (ctx, next) => {
  // Auth middleware
  const token = ctx.headers?.get("authorization");
  if (!token) {
    ctx.error = { status: 401, message: "Unauthorized" };
    return;
  }
  await next();
});

// Execute middleware chain
const context = { path: "/api/users", headers: new Headers() };
await chain.execute(context);
```

### Conditional middleware (path matching)

```typescript
import { MiddlewareChain } from "jsr:@dreamer/middleware";

const chain = new MiddlewareChain();

// Option 1: String path (prefix match)
chain.use("/api", async (ctx, next) => {
  // Only applies to paths starting with /api
  console.log("API request:", ctx.path);
  await next();
});

// Option 2: Regular expression
chain.use(
  async (ctx, next) => {
    console.log("Path matched by regex:", ctx.path);
    await next();
  },
  { path: /^\/api\/v\d+/ },
);

// Option 3: Function
chain.use(
  async (ctx, next) => {
    console.log("Path matched by function:", ctx.path);
    await next();
  },
  { path: (path) => path.includes("/admin") },
);
```

### Method matching

```typescript
import { MiddlewareChain } from "jsr:@dreamer/middleware";

const chain = new MiddlewareChain();

// Option 1: Single method
chain.use(
  async (ctx, next) => {
    console.log("GET request");
    await next();
  },
  { method: "GET" },
);

// Option 2: Multiple methods
chain.use(
  async (ctx, next) => {
    console.log("POST or PUT request");
    await next();
  },
  { method: ["POST", "PUT"] },
);

// Option 3: Function
chain.use(
  async (ctx, next) => {
    console.log("Non-GET request");
    await next();
  },
  { method: (method) => method !== "GET" },
);
```

### Combining conditions

```typescript
import {
  combineConditions,
  matchMethod,
  matchPath,
  MiddlewareChain,
} from "jsr:@dreamer/middleware";

const chain = new MiddlewareChain();

// Option 1: combineConditions
chain.use(
  async (ctx, next) => {
    console.log("API POST request");
    await next();
  },
  combineConditions(
    matchPath("/api"),
    matchMethod("POST"),
  ),
);

// Option 2: Specify in condition object directly
chain.use(
  async (ctx, next) => {
    console.log("API GET request");
    await next();
  },
  {
    path: "/api",
    method: "GET",
  },
);
```

### Error-handling middleware

```typescript
import { MiddlewareChain } from "jsr:@dreamer/middleware";

const chain = new MiddlewareChain();

// Register normal middleware
chain.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    // Errors inside middleware are caught by error-handling middleware
    throw error;
  }
});

chain.use(async (ctx, next) => {
  // Simulate error
  throw new Error("Processing failed");
});

// Register error-handling middleware
chain.useError(async (ctx, error, next) => {
  console.error("Caught error:", error.message);
  ctx.error = {
    status: 500,
    message: "Internal Server Error",
    details: error.message,
  };
});

// Execute middleware chain
const context = { path: "/api/test" };
await chain.execute(context);
console.log(context.error); // { status: 500, message: "Internal Server Error", ... }
```

### Performance monitoring

```typescript
import { MiddlewareChain } from "jsr:@dreamer/middleware";

const chain = new MiddlewareChain();

// Enable performance monitoring
chain.enablePerformanceMonitoring();

// Register middleware (with name for stats)
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

// Execute multiple times
for (let i = 0; i < 10; i++) {
  await chain.execute({ path: "/api/test" });
}

// Get performance stats
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

// Clear stats
chain.clearStats();
```

---

## 📚 API documentation

```typescript
import {
  matchMethod,
  matchPath,
  MiddlewareChain,
} from "jsr:@dreamer/middleware";

// Define context type
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

// Create middleware chain
const chain = new MiddlewareChain<HttpContext>();

// Enable performance monitoring
chain.enablePerformanceMonitoring();

// 1. Logger middleware (all requests)
chain.use(
  async (ctx, next) => {
    console.log(`${ctx.method} ${ctx.path}`);
    const start = Date.now();
    await next();
    const duration = Date.now() - start;
    console.log(`Duration: ${duration}ms`);
  },
  undefined,
  "logger",
);

// 2. CORS middleware (all requests)
chain.use(
  async (ctx, next) => {
    // Set CORS headers (example)
    console.log("Setting CORS headers");
    await next();
  },
  undefined,
  "cors",
);

// 3. Auth middleware (API path only)
chain.use(
  async (ctx, next) => {
    const token = ctx.headers.get("authorization");
    if (!token) {
      ctx.error = { status: 401, message: "Unauthorized" };
      return;
    }
    console.log("Auth passed");
    await next();
  },
  matchPath("/api"),
  "auth",
);

// 4. Body parser middleware (POST/PUT only)
chain.use(
  async (ctx, next) => {
    // Parse request body (example)
    console.log("Parsing request body");
    await next();
  },
  matchMethod(["POST", "PUT"]),
  "body-parser",
);

// 5. Error-handling middleware
chain.useError(async (ctx, error, next) => {
  console.error("Error:", error);
  ctx.error = {
    status: ctx.error?.status || 500,
    message: ctx.error?.message || "Internal Server Error",
  };
});

// Execute middleware chain
const context: HttpContext = {
  path: "/api/users",
  method: "POST",
  headers: new Headers({
    authorization: "Bearer token123",
  }),
};

await chain.execute(context);

// Check result
if (context.error) {
  console.log("Error:", context.error);
} else {
  console.log("Processing succeeded");
}

// View performance stats
const stats = chain.getStats();
console.log("Performance stats:", stats);
```

## API documentation

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
- `name`: Middleware name (optional; used for debugging and performance
  monitoring)

**Example**:

```typescript
// Option 1: Simple registration
chain.use(async (ctx, next) => {
  await next();
});

// Option 2: Path match
chain.use("/api", async (ctx, next) => {
  await next();
});

// Option 3: Condition match
chain.use(
  async (ctx, next) => {
    await next();
  },
  { path: "/api", method: "GET" },
  "api-get-middleware",
);
```

##### `useError(middleware, name?)`

Register error-handling middleware.

**Parameters**:

- `middleware`: Error-handling middleware function
- `name`: Middleware name (optional)

**Example**:

```typescript
chain.useError(async (ctx, error, next) => {
  console.error("Error:", error);
  ctx.error = { status: 500, message: "Internal Server Error" };
});
```

##### `execute(ctx)`

Execute the middleware chain.

**Parameters**:

- `ctx`: Context object

**Returns**: `Promise<void>`

**Example**:

```typescript
await chain.execute({ path: "/api/users" });
```

##### `enablePerformanceMonitoring()`

Enable performance monitoring.

##### `disablePerformanceMonitoring()`

Disable performance monitoring.

##### `getStats()`

Get performance statistics.

**Returns**: `MiddlewareStats[]`

##### `clearStats()`

Clear performance statistics.

##### `clear()`

Clear all middleware.

##### `getMiddlewareCount()`

Get the number of middlewares.

##### `getErrorMiddlewareCount()`

Get the number of error-handling middlewares.

##### `remove(name)` (new)

Remove the middleware with the given name.

**Parameters**:

- `name`: Middleware name

**Returns**: `boolean` — whether removal succeeded

##### `removeError(name)` (new)

Remove the error-handling middleware with the given name.

##### `getMiddleware(name)` (new)

Get the middleware function with the given name.

**Returns**: `Middleware<T> | undefined`

##### `getErrorMiddleware(name)` (new)

Get the error-handling middleware function with the given name.

##### `hasMiddleware(name)` (new)

Check whether a middleware with the given name exists.

**Returns**: `boolean`

##### `hasErrorMiddleware(name)` (new)

Check whether an error-handling middleware with the given name exists.

##### `listMiddlewares()` (new)

Get the list of all middleware names.

**Returns**: `string[]`

##### `listErrorMiddlewares()` (new)

Get the list of all error-handling middleware names.

##### `insertBefore(targetName, middleware, condition?, name?)` (new)

Insert a new middleware before the specified middleware.

**Parameters**:

- `targetName`: Target middleware name
- `middleware`: Middleware function to insert
- `condition`: Match condition (optional)
- `name`: New middleware name (optional)

**Returns**: `boolean` — whether insertion succeeded

##### `insertAfter(targetName, middleware, condition?, name?)` (new)

Insert a new middleware after the specified middleware.

### Helper functions

#### `createMiddlewareChain<T>()`

Create a middleware chain instance.

#### `createMiddleware<T>(middleware)`

Create middleware helper (for type inference).

#### `matchPath(path)`

Path-matching helper.

**Parameters**:

- `path`: Path pattern (string, RegExp, or function)

**Returns**: `MiddlewareCondition`

#### `matchMethod(method)`

Method-matching helper.

**Parameters**:

- `method`: Method pattern (string, string array, or function)

**Returns**: `MiddlewareCondition`

#### `combineConditions(...conditions)`

Combine match conditions.

**Parameters**:

- `conditions`: Array of match conditions

**Returns**: `MiddlewareCondition`

#### `matchCondition(condition, ctx)` (new)

Check whether a single condition matches the context (shared matching logic).

**Parameters**:

- `condition`: Match condition
- `ctx`: Context object

**Returns**: `boolean`

#### `createMiddlewareManager<T>(container, options?)` (new)

Create a middleware manager instance.

**Parameters**:

- `container`: Service container instance
- `options`: Configuration options (optional)

**Returns**: `MiddlewareManager<T>`

### Type definitions

#### `MiddlewareContext`

Middleware context interface.

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

Middleware function type.

```typescript
type Middleware<T extends MiddlewareContext> = (
  ctx: T,
  next: () => Promise<void>,
) => void | Promise<void>;
```

#### `ErrorMiddleware<T>`

Error-handling middleware function type.

```typescript
type ErrorMiddleware<T extends MiddlewareContext> = (
  ctx: T,
  error: Error,
  next: () => Promise<void>,
) => void | Promise<void>;
```

#### `MiddlewareCondition`

Middleware match condition.

```typescript
interface MiddlewareCondition {
  path?: string | RegExp | ((path: string) => boolean);
  method?: string | string[] | ((method: string) => boolean);
  match?: (ctx: MiddlewareContext) => boolean;
}
```

#### `MiddlewareStats`

Middleware performance statistics.

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

Middleware manager class; manages multiple middleware chains via the service
container.

#### Constructor

```typescript
new MiddlewareManager(
  container: ServiceContainer,
  options?: MiddlewareManagerOptions
)
```

**Parameters**:

| Parameter   | Type                       | Description                |
| ----------- | -------------------------- | -------------------------- |
| `container` | `ServiceContainer`         | Service container instance |
| `options`   | `MiddlewareManagerOptions` | Configuration (optional)   |

**Options**:

| Option                        | Type      | Default | Description                       |
| ----------------------------- | --------- | ------- | --------------------------------- |
| `enablePerformanceMonitoring` | `boolean` | `false` | Whether to enable perf monitoring |
| `continueOnError`             | `boolean` | `true`  | Whether to continue on error      |

#### Registration methods

| Method                      | Description                         |
| --------------------------- | ----------------------------------- |
| `register(definition)`      | Register middleware                 |
| `registerError(definition)` | Register error-handling middleware  |
| `registerAll(definitions)`  | Batch register (sorted by priority) |

#### Management methods

| Method                   | Description                     |
| ------------------------ | ------------------------------- |
| `remove(name)`           | Remove middleware               |
| `has(name)`              | Check if middleware exists      |
| `get(name)`              | Get middleware definition       |
| `list()`                 | List all middleware names       |
| `listByChain(chainName)` | List middlewares by chain       |
| `listChains()`           | List all middleware chain names |

#### Execution methods

| Method                     | Description                   |
| -------------------------- | ----------------------------- |
| `execute(ctx, chainName?)` | Execute specified chain       |
| `getChain(chainName)`      | Get middleware chain instance |

#### Statistics methods

| Method                   | Description                |
| ------------------------ | -------------------------- |
| `getStats(chainName?)`   | Get performance stats      |
| `clearStats(chainName?)` | Clear performance stats    |
| `getMiddlewareCount()`   | Get total middleware count |
| `getChainCount()`        | Get total chain count      |

#### Cleanup methods

| Method                  | Description           |
| ----------------------- | --------------------- |
| `clearChain(chainName)` | Clear specified chain |
| `clear()`               | Clear all middleware  |
| `dispose()`             | Dispose the manager   |

**Example**:

```typescript
import { ServiceContainer } from "@dreamer/service";
import { MiddlewareManager } from "@dreamer/middleware";

const container = new ServiceContainer();
const manager = new MiddlewareManager(container);

// Register middleware
manager.register({
  name: "logger",
  priority: 10, // Lower number runs first
  handler: async (ctx, next) => {
    console.log("Request:", ctx.path);
    await next();
  },
});

manager.register({
  name: "auth",
  priority: 20,
  condition: { path: "/api" }, // Condition match
  handler: async (ctx, next) => {
    // Auth logic
    await next();
  },
});

// Execute middleware chain
await manager.execute({ path: "/api/users" });
```

### MiddlewareDefinition interface

```typescript
interface MiddlewareDefinition<T extends MiddlewareContext> {
  name: string; // Middleware name (unique id)
  handler: Middleware<T>; // Middleware function
  condition?: MiddlewareCondition; // Match condition (optional)
  priority?: number; // Priority (default 100)
  chain?: string; // Middleware chain name (default "default")
}
```

---

## 🔧 Design principles

- **Genericity**: Middleware system is independent of HTTP and usable in many
  scenarios
- **Flexibility**: Supports condition matching, error handling, performance
  monitoring, and more
- **Type safety**: Full TypeScript typing
- **Ease of use**: Simple API and multiple calling styles
- **Service container integration**: MiddlewareManager integrates with
  @dreamer/service

---

## 📊 Test report

| Metric      | Value      |
| ----------- | ---------- |
| Test date   | 2026-01-30 |
| Test files  | 1          |
| Total cases | 75         |
| Pass rate   | 100%       |
| Duration    | ~70ms      |

**Coverage**:

- ✅ All public API methods (47)
- ✅ Full MiddlewareChain behavior
- ✅ Full MiddlewareManager behavior
- ✅ Edge cases (10)
- ✅ Error-handling scenarios (5)

Full test report: [TEST_REPORT.md](./docs/en-US/TEST_REPORT.md).

---

## 📝 Notes

1. **Server-only**: The middleware system is a server-side pattern; the client
   does not need it.

2. **ctx.error stops execution**: When `ctx.error` is set, calling `next()` will
   skip subsequent middlewares.

3. **Unique middleware names**: Each middleware must have a unique name;
   registering the same name again throws.

4. **Priority ordering**: With `registerAll()`, middlewares are ordered by
   `priority` (lower number runs first).

5. **Chain isolation**: Different chains are fully isolated and do not affect
   each other.

6. **Service container integration**: MiddlewareManager registers itself and its
   chains in the service container.

7. **Type safety**: Full TypeScript support, including generic context types.

---

## 🤝 Contributing

Issues and Pull Requests are welcome!

---

## 📄 License

Apache License 2.0 - see [LICENSE](./LICENSE)

---

<div align="center">

**Made with ❤️ by Dreamer Team**

</div>
