# @dreamer/middleware

> General-purpose middleware system compatible with Deno and Bun. Provides
> chained middleware execution, error handling, and service container
> integration.

[![JSR](https://jsr.io/badges/@dreamer/middleware)](https://jsr.io/@dreamer/middleware)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](./LICENSE)
[![Tests: 75 passed](https://img.shields.io/badge/Tests-75%20passed-brightgreen)](./docs/en-US/TEST_REPORT.md)

📖 **Docs**: [English](./README.md) (root) |
[中文 (Chinese)](./docs/zh-CN/README.md)

**Changelog**: [English](./docs/en-US/CHANGELOG.md)

### [1.0.1] - 2026-02-19

- **Changed**: i18n translation method `$t` → `$tr`; docs reorganized to
  `docs/en-US/` and `docs/zh-CN/`; license explicitly Apache-2.0.

---

## Features

- **MiddlewareChain**: use, useError; run with context; conditional match; error
  handling
- **MiddlewareManager**: multiple named chains; optional @dreamer/service
  integration
- **i18n**: initMiddlewareI18n(), $tr (en-US / zh-CN)

## Installation

```bash
deno add jsr:@dreamer/middleware
```

## Quick start

```typescript
import { MiddlewareChain } from "jsr:@dreamer/middleware";

const chain = new MiddlewareChain();
chain.use(async (ctx, next) => {
  // before
  await next();
  // after
});
await chain.run(context);
```

- **Test report**: [English](./docs/en-US/TEST_REPORT.md) |
  [zh-CN](./docs/zh-CN/TEST_REPORT.md)
- Full documentation: [README](./README.md) (English) |
  [中文](./docs/zh-CN/README.md).

---

## License

Apache-2.0 - see [LICENSE](./LICENSE)
