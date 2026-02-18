# Changelog

[English](./CHANGELOG.md) | [中文 (Chinese)](../zh-CN/CHANGELOG.md)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

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
