# Changelog

[English](./CHANGELOG.md) | [中文 (Chinese)](../zh-CN/CHANGELOG.md)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.1.0] - 2026-07-23

### Added

- **Node.js compatibility**: middleware now runs on Node 22+ — `src/` is pure
  logic (no `Deno.*`, no `IS_NODE` branch, no timers); error messages go through
  `@dreamer/i18n` v1.1.2 and service-container integration through
  `@dreamer/service` v1.1.0 (both Node-supported).
- **Node.js test infra**: Added `tsconfig.json`, `ci.yml` (9-job: 3 Deno v2.9 +
  3 Bun + 3 Node 22); `test:node` driven by `tsx --test --test-force-exit`;
  Deno/Bun/Node share the same `tests/*.test.ts` suite.

### Changed

- **src/**: No changes (pure-logic package; `tests/mod.test.ts` already calls
  `setMiddlewareLocale("zh-CN")` at module level to lock Chinese messages, so no
  extra fix needed for CI's English locale).
- **Dependencies**: `@dreamer/i18n` ^1.1.2, `@dreamer/runtime-adapter` ^1.2.2,
  `@dreamer/service` ^1.1.0, `@dreamer/test` ^1.2.3.
- **deno.json**: Added `minimumDependencyAge: 0`.
- **.gitignore**: Added `package-lock.json`.

### Compatibility

- Deno 2.9+ / Bun 1.3+ / Node.js 22+

---

## [1.0.2] - 2026-02-19

### Changed

- **i18n**: i18n now auto-initializes when the module is loaded.
  `initMiddlewareI18n` is no longer exported; callers do not need to call it.
  Use `setMiddlewareLocale` when you need to set the locale for middleware
  messages. The translation function `$tr` initializes i18n on first use if not
  yet initialized.
- **Dependencies**: Bumped `@dreamer/runtime-adapter` to ^1.0.15,
  `@dreamer/service` to ^1.0.2, `@dreamer/test` to ^1.0.10.

---

## [1.0.1] - 2026-02-19

### Changed

- **i18n**: Renamed translation method from `$t` to `$tr` to avoid conflict with
  global `$t`. Update existing code to use `$tr` for package messages.
- **Docs**: Reorganized documentation into `docs/en-US/` (CHANGELOG,
  TEST_REPORT) and `docs/zh-CN/` (README, CHANGELOG, TEST_REPORT with full
  Chinese translations). Removed root CHANGELOG and TEST_REPORT. Root README
  shortened with links to docs.
- **License**: Explicitly Apache-2.0 in `deno.json` and documentation.

---

## [1.0.0] - 2026-02-06

### Added

First stable release. General-purpose middleware system compatible with Deno and
Bun. Provides chained middleware execution, error handling, conditional
matching, and service container integration.

#### MiddlewareChain

- **Registration** (`use`, `useError`): Register middleware and error handlers
  with optional path, condition, and name
- **Execution** (`execute`): Run middleware chain with context; stop when
  `ctx.error` is set
- **Conditional matching**: Path (string, regex, function), method (string,
  array, function), custom `match` function
- **Overloads**: `use(middleware)`, `use(path, middleware)`,
  `use(middleware, condition, name)`
- **Performance monitoring**: `enablePerformanceMonitoring`,
  `disablePerformanceMonitoring`, `getStats`, `clearStats`
- **Management**: `remove`, `removeError`, `getMiddleware`,
  `getErrorMiddleware`, `hasMiddleware`, `hasErrorMiddleware`
- **Listing**: `listMiddlewares`, `listErrorMiddlewares`
- **Insertion**: `insertBefore`, `insertAfter` for dynamic middleware ordering
- **Utility**: `clear`, `getMiddlewareCount`, `getErrorMiddlewareCount`

#### MiddlewareManager

- **Service container integration**: Manage middleware via `@dreamer/service`
- **Multiple chains**: Named middleware chains with `chain` option
- **Registration**: `register`, `registerError`, `registerAll` (priority-sorted)
- **Management**: `remove`, `has`, `get`, `list`, `listByChain`, `listChains`
- **Execution**: `execute(ctx, chainName?)`, `getChain(chainName)`
- **Statistics**: `getStats`, `clearStats`, `getMiddlewareCount`,
  `getChainCount`
- **Cleanup**: `clearChain`, `clear`, `dispose`
- **Performance**: `enablePerformanceMonitoring`, `disablePerformanceMonitoring`
- Auto-registers manager and chains to service container

#### Helper Functions

- `createMiddlewareChain<T>()`: Create chain instance
- `createMiddleware<T>(middleware)`: Type inference helper
- `matchPath(path)`: Path match condition
- `matchMethod(method)`: Method match condition
- `combineConditions(...conditions)`: Combine multiple conditions
- `matchCondition(condition, ctx)`: Shared matching logic (path, method, custom)
- `createMiddlewareManager<T>(container, options?)`: Create manager instance

#### Type Exports

- `MiddlewareContext`, `Middleware<T>`, `ErrorMiddleware<T>`
- `MiddlewareCondition`, `MiddlewareStats`
- `MiddlewareManagerOptions`, `MiddlewareDefinition`,
  `ErrorMiddlewareDefinition`
