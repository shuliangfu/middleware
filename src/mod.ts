/**
 * @module @dreamer/middleware
 *
 * @dreamer/middleware 通用中间件系统
 *
 * 提供中间件链式调用、错误处理等功能，可用于多种场景（HTTP、WebSocket、消息队列等）。
 *
 * 特性：
 * - 中间件链式调用
 * - 中间件注册和执行
 * - 异步中间件支持
 * - 错误处理中间件
 * - 条件中间件（路径匹配、方法匹配等）
 * - 中间件上下文传递
 * - 中间件跳过（条件执行）
 * - 中间件错误捕获和处理
 * - 中间件性能监控
 * - 中间件调试工具
 *
 * 环境兼容性：
 * - 服务端：✅ 支持（Deno 运行时）
 * - 客户端：❌ 不支持（浏览器环境）
 *
 * @example
 * ```typescript
 * import { MiddlewareChain } from "jsr:@dreamer/middleware";
 *
 * const chain = new MiddlewareChain();
 *
 * chain.use(async (ctx, next) => {
 *   console.log("处理请求:", ctx.path);
 *   await next();
 * });
 *
 * await chain.execute({ path: "/api/users" });
 * ```
 */

/**
 * 中间件上下文接口
 * 可以扩展以包含特定场景的数据（如 HTTP 请求、WebSocket 连接等）
 */
export interface MiddlewareContext {
  /** 路径（用于路径匹配） */
  path?: string;
  /** 方法（用于方法匹配，如 HTTP 方法） */
  method?: string;
  /** 错误信息 */
  error?: {
    status?: number;
    message?: string;
    [key: string]: unknown;
  };
  /** 其他自定义数据 */
  [key: string]: unknown;
}

/**
 * 中间件函数类型
 *
 * @param ctx 中间件上下文
 * @param next 调用下一个中间件的函数
 */
export type Middleware<T extends MiddlewareContext = MiddlewareContext> = (
  ctx: T,
  next: () => Promise<void>,
) => void | Promise<void>;

/**
 * 错误处理中间件函数类型
 *
 * @param ctx 中间件上下文
 * @param error 错误对象
 * @param next 调用下一个错误处理中间件的函数
 */
export type ErrorMiddleware<T extends MiddlewareContext = MiddlewareContext> = (
  ctx: T,
  error: Error,
  next: () => Promise<void>,
) => void | Promise<void>;

/**
 * 中间件匹配条件
 */
export interface MiddlewareCondition {
  /** 路径匹配（支持字符串、正则表达式、函数） */
  path?: string | RegExp | ((path: string) => boolean);
  /** 方法匹配（支持字符串、字符串数组、函数） */
  method?: string | string[] | ((method: string) => boolean);
  /** 自定义匹配函数 */
  match?: (ctx: MiddlewareContext) => boolean;
}

/**
 * 中间件注册信息
 */
interface MiddlewareRegistration<
  T extends MiddlewareContext = MiddlewareContext,
> {
  /** 中间件名称（必须字段，用于标识和防止重复注册） */
  name: string;
  /** 中间件函数 */
  middleware: Middleware<T>;
  /** 匹配条件（可选） */
  condition?: MiddlewareCondition;
}

/**
 * 错误处理中间件注册信息
 */
interface ErrorMiddlewareRegistration<
  T extends MiddlewareContext = MiddlewareContext,
> {
  /** 错误处理中间件函数 */
  middleware: ErrorMiddleware<T>;
  /** 中间件名称（必须字段，用于标识和防止重复注册） */
  name: string;
}

/**
 * 中间件执行统计
 */
export interface MiddlewareStats {
  /** 中间件名称 */
  name: string;
  /** 执行次数 */
  count: number;
  /** 总执行时间（毫秒） */
  totalTime: number;
  /** 平均执行时间（毫秒） */
  averageTime: number;
  /** 最大执行时间（毫秒） */
  maxTime: number;
  /** 最小执行时间（毫秒） */
  minTime: number;
  /** 错误次数 */
  errorCount: number;
}

/**
 * 检查单个条件是否匹配上下文
 * 这是一个共享的匹配逻辑函数，被 MiddlewareChain.matches() 和 combineConditions() 使用
 *
 * @param condition 匹配条件
 * @param ctx 上下文对象
 * @returns 是否匹配
 */
export function matchCondition(
  condition: MiddlewareCondition,
  ctx: MiddlewareContext,
): boolean {
  // 路径匹配
  if (condition.path !== undefined && ctx.path !== undefined) {
    if (typeof condition.path === "string") {
      // 字符串匹配（前缀匹配）
      if (!ctx.path.startsWith(condition.path)) {
        return false;
      }
    } else if (condition.path instanceof RegExp) {
      // 正则表达式匹配
      if (!condition.path.test(ctx.path)) {
        return false;
      }
    } else if (typeof condition.path === "function") {
      // 函数匹配
      if (!condition.path(ctx.path)) {
        return false;
      }
    }
  }

  // 方法匹配
  if (condition.method !== undefined && ctx.method !== undefined) {
    if (typeof condition.method === "string") {
      // 字符串匹配（不区分大小写）
      if (ctx.method.toLowerCase() !== condition.method.toLowerCase()) {
        return false;
      }
    } else if (Array.isArray(condition.method)) {
      // 数组匹配（任一匹配）
      const methodLower = ctx.method.toLowerCase();
      if (!condition.method.some((m) => m.toLowerCase() === methodLower)) {
        return false;
      }
    } else if (typeof condition.method === "function") {
      // 函数匹配
      if (!condition.method(ctx.method)) {
        return false;
      }
    }
  }

  // 自定义匹配函数
  if (condition.match !== undefined) {
    if (!condition.match(ctx)) {
      return false;
    }
  }

  return true;
}

/**
 * 中间件链类
 * 提供中间件注册、执行、错误处理等功能
 */
export class MiddlewareChain<T extends MiddlewareContext = MiddlewareContext> {
  /** 普通中间件列表 */
  private middlewares: MiddlewareRegistration<T>[] = [];
  /** 错误处理中间件列表 */
  private errorMiddlewares: ErrorMiddlewareRegistration<T>[] = [];
  /** 是否启用性能监控 */
  private enableStats: boolean = false;
  /** 性能统计 */
  private stats: Map<string, MiddlewareStats> = new Map();

  /**
   * 注册中间件
   *
   * @param middleware 中间件函数
   * @param condition 匹配条件（可选）
   * @param name 中间件名称（可选，如果未提供则使用函数名或自动生成）
   * @throws {Error} 如果中间件名称已存在，抛出错误
   */
  use(
    middleware: Middleware<T>,
    condition?: MiddlewareCondition | string,
    name?: string,
  ): void;
  use(
    path: string,
    middleware: Middleware<T>,
    name?: string,
  ): void;
  use(
    middlewareOrPath: Middleware<T> | string,
    conditionOrMiddleware?: MiddlewareCondition | string | Middleware<T>,
    nameOrCondition?: string | MiddlewareCondition,
  ): void {
    let middleware: Middleware<T>;
    let condition: MiddlewareCondition | undefined;
    let name: string | undefined;

    // 处理不同的调用方式
    if (typeof middlewareOrPath === "string") {
      // use(path, middleware, name?)
      middleware = conditionOrMiddleware as Middleware<T>;
      condition = { path: middlewareOrPath };
      name = nameOrCondition as string | undefined;
    } else if (typeof conditionOrMiddleware === "string") {
      // use(middleware, path, name?)
      middleware = middlewareOrPath;
      condition = { path: conditionOrMiddleware };
      name = nameOrCondition as string;
    } else if (
      conditionOrMiddleware !== undefined &&
      typeof conditionOrMiddleware === "object" &&
      !("call" in conditionOrMiddleware)
    ) {
      // use(middleware, condition, name?)
      middleware = middlewareOrPath;
      condition = conditionOrMiddleware as MiddlewareCondition;
      name = nameOrCondition as string | undefined;
    } else if (conditionOrMiddleware === undefined && nameOrCondition !== undefined) {
      // use(middleware, undefined, name) - 明确传入 undefined 作为条件
      middleware = middlewareOrPath;
      condition = undefined;
      name = nameOrCondition as string;
    } else {
      // use(middleware) 或 use(middleware, name?)
      middleware = middlewareOrPath;
      name = conditionOrMiddleware as string | undefined;
    }

    // 自动生成 name（如果未提供，使用函数名或自动生成）
    const middlewareName = name || middleware.name ||
      `middleware-${this.middlewares.length}`;

    // 检查是否重复注册
    if (this.middlewares.some((m) => m.name === middlewareName)) {
      throw new Error(
        `中间件 "${middlewareName}" 已存在，不能重复注册`,
      );
    }

    this.middlewares.push({
      middleware,
      condition,
      name: middlewareName,
    });
  }

  /**
   * 注册错误处理中间件
   *
   * @param middleware 错误处理中间件函数
   * @param name 中间件名称（可选，如果未提供则使用函数名或自动生成）
   * @throws {Error} 如果中间件名称已存在，抛出错误
   */
  useError(middleware: ErrorMiddleware<T>, name?: string): void {
    // 自动生成 name（如果未提供，使用函数名或自动生成）
    const middlewareName = name || middleware.name ||
      `error-middleware-${this.errorMiddlewares.length}`;

    // 检查是否重复注册
    if (this.errorMiddlewares.some((m) => m.name === middlewareName)) {
      throw new Error(
        `错误处理中间件 "${middlewareName}" 已存在，不能重复注册`,
      );
    }

    this.errorMiddlewares.push({
      middleware,
      name: middlewareName,
    });
  }

  /**
   * 检查中间件是否匹配条件
   * 使用共享的 matchCondition 函数进行匹配检查
   *
   * @param registration 中间件注册信息
   * @param ctx 上下文
   * @returns 是否匹配
   */
  private matches(
    registration: MiddlewareRegistration<T>,
    ctx: T,
  ): boolean {
    if (!registration.condition) {
      return true; // 无条件，总是匹配
    }
    // 使用共享的匹配函数
    return matchCondition(registration.condition, ctx);
  }

  /**
   * 执行中间件链
   *
   * @param ctx 上下文对象
   * @returns Promise<void>
   */
  async execute(ctx: T): Promise<void> {
    // 过滤匹配的中间件
    const matchedMiddlewares = this.middlewares.filter((registration) =>
      this.matches(registration, ctx)
    );

    // 执行中间件链
    let index = 0;

    const next = async (): Promise<void> => {
      // 如果上下文中已有错误，停止执行后续中间件
      if (ctx.error) {
        return;
      }

      if (index >= matchedMiddlewares.length) {
        return; // 所有中间件执行完毕
      }

      const registration = matchedMiddlewares[index++];
      const middleware = registration.middleware;
      const middlewareName = registration.name;

      try {
        // 性能监控
        const startTime = this.enableStats ? Date.now() : 0;

        // 执行中间件
        await middleware(ctx, next);

        // 记录性能统计
        if (this.enableStats) {
          const duration = Date.now() - startTime;
          this.updateStats(middlewareName, duration, false);
        }
      } catch (error) {
        // 记录错误统计
        if (this.enableStats) {
          this.updateStats(middlewareName, 0, true);
        }

        // 执行错误处理中间件
        await this.handleError(
          ctx,
          error instanceof Error ? error : new Error(String(error)),
        );
        return;
      }
    };

    await next();
  }

  /**
   * 处理错误
   *
   * @param ctx 上下文对象
   * @param error 错误对象
   */
  private async handleError(ctx: T, error: Error): Promise<void> {
    if (this.errorMiddlewares.length === 0) {
      // 没有错误处理中间件，抛出错误
      throw error;
    }

    let index = 0;

    const next = async (): Promise<void> => {
      if (index >= this.errorMiddlewares.length) {
        return; // 所有错误处理中间件执行完毕
      }

      const registration = this.errorMiddlewares[index++];
      const middleware = registration.middleware;

      try {
        await middleware(ctx, error, next);
      } catch (err) {
        // 错误处理中间件本身出错，抛出错误
        throw err instanceof Error ? err : new Error(String(err));
      }
    };

    await next();
  }

  /**
   * 更新性能统计
   *
   * @param name 中间件名称
   * @param duration 执行时间（毫秒）
   * @param isError 是否出错
   */
  private updateStats(name: string, duration: number, isError: boolean): void {
    let stats = this.stats.get(name);
    if (!stats) {
      stats = {
        name,
        count: 0,
        totalTime: 0,
        averageTime: 0,
        maxTime: 0,
        minTime: Infinity,
        errorCount: 0,
      };
      this.stats.set(name, stats);
    }

    stats.count++;
    stats.totalTime += duration;
    stats.averageTime = stats.totalTime / stats.count;
    stats.maxTime = Math.max(stats.maxTime, duration);
    stats.minTime = Math.min(stats.minTime, duration);

    if (isError) {
      stats.errorCount++;
    }
  }

  /**
   * 启用性能监控
   */
  enablePerformanceMonitoring(): void {
    this.enableStats = true;
  }

  /**
   * 禁用性能监控
   */
  disablePerformanceMonitoring(): void {
    this.enableStats = false;
  }

  /**
   * 获取性能统计
   *
   * @returns 性能统计数组
   */
  getStats(): MiddlewareStats[] {
    return Array.from(this.stats.values());
  }

  /**
   * 清空性能统计
   */
  clearStats(): void {
    this.stats.clear();
  }

  /**
   * 清空所有中间件
   */
  clear(): void {
    this.middlewares = [];
    this.errorMiddlewares = [];
    this.stats.clear();
  }

  /**
   * 获取中间件数量
   *
   * @returns 中间件数量
   */
  getMiddlewareCount(): number {
    return this.middlewares.length;
  }

  /**
   * 获取错误处理中间件数量
   *
   * @returns 错误处理中间件数量
   */
  getErrorMiddlewareCount(): number {
    return this.errorMiddlewares.length;
  }

  /**
   * 移除指定名称的中间件
   *
   * @param name 中间件名称
   * @returns 是否成功移除（如果中间件不存在则返回 false）
   */
  remove(name: string): boolean {
    const index = this.middlewares.findIndex((m) => m.name === name);
    if (index === -1) {
      return false;
    }
    this.middlewares.splice(index, 1);
    // 同时清除该中间件的统计数据
    this.stats.delete(name);
    return true;
  }

  /**
   * 移除指定名称的错误处理中间件
   *
   * @param name 错误处理中间件名称
   * @returns 是否成功移除（如果中间件不存在则返回 false）
   */
  removeError(name: string): boolean {
    const index = this.errorMiddlewares.findIndex((m) => m.name === name);
    if (index === -1) {
      return false;
    }
    this.errorMiddlewares.splice(index, 1);
    return true;
  }

  /**
   * 获取指定名称的中间件
   *
   * @param name 中间件名称
   * @returns 中间件函数，如果不存在则返回 undefined
   */
  getMiddleware(name: string): Middleware<T> | undefined {
    const registration = this.middlewares.find((m) => m.name === name);
    return registration?.middleware;
  }

  /**
   * 获取指定名称的错误处理中间件
   *
   * @param name 错误处理中间件名称
   * @returns 错误处理中间件函数，如果不存在则返回 undefined
   */
  getErrorMiddleware(name: string): ErrorMiddleware<T> | undefined {
    const registration = this.errorMiddlewares.find((m) => m.name === name);
    return registration?.middleware;
  }

  /**
   * 检查是否存在指定名称的中间件
   *
   * @param name 中间件名称
   * @returns 是否存在
   */
  hasMiddleware(name: string): boolean {
    return this.middlewares.some((m) => m.name === name);
  }

  /**
   * 检查是否存在指定名称的错误处理中间件
   *
   * @param name 错误处理中间件名称
   * @returns 是否存在
   */
  hasErrorMiddleware(name: string): boolean {
    return this.errorMiddlewares.some((m) => m.name === name);
  }

  /**
   * 获取所有中间件名称列表
   *
   * @returns 中间件名称数组
   */
  listMiddlewares(): string[] {
    return this.middlewares.map((m) => m.name);
  }

  /**
   * 获取所有错误处理中间件名称列表
   *
   * @returns 错误处理中间件名称数组
   */
  listErrorMiddlewares(): string[] {
    return this.errorMiddlewares.map((m) => m.name);
  }

  /**
   * 在指定中间件之前插入新中间件
   *
   * @param targetName 目标中间件名称（在此之前插入）
   * @param middleware 要插入的中间件函数
   * @param condition 匹配条件（可选）
   * @param name 新中间件名称（可选）
   * @returns 是否成功插入（如果目标中间件不存在则返回 false）
   * @throws {Error} 如果新中间件名称已存在
   */
  insertBefore(
    targetName: string,
    middleware: Middleware<T>,
    condition?: MiddlewareCondition,
    name?: string,
  ): boolean {
    const targetIndex = this.middlewares.findIndex((m) => m.name === targetName);
    if (targetIndex === -1) {
      return false;
    }

    // 生成中间件名称
    const middlewareName = name || middleware.name ||
      `middleware-${this.middlewares.length}`;

    // 检查是否重复注册
    if (this.middlewares.some((m) => m.name === middlewareName)) {
      throw new Error(`中间件 "${middlewareName}" 已存在，不能重复注册`);
    }

    this.middlewares.splice(targetIndex, 0, {
      middleware,
      condition,
      name: middlewareName,
    });

    return true;
  }

  /**
   * 在指定中间件之后插入新中间件
   *
   * @param targetName 目标中间件名称（在此之后插入）
   * @param middleware 要插入的中间件函数
   * @param condition 匹配条件（可选）
   * @param name 新中间件名称（可选）
   * @returns 是否成功插入（如果目标中间件不存在则返回 false）
   * @throws {Error} 如果新中间件名称已存在
   */
  insertAfter(
    targetName: string,
    middleware: Middleware<T>,
    condition?: MiddlewareCondition,
    name?: string,
  ): boolean {
    const targetIndex = this.middlewares.findIndex((m) => m.name === targetName);
    if (targetIndex === -1) {
      return false;
    }

    // 生成中间件名称
    const middlewareName = name || middleware.name ||
      `middleware-${this.middlewares.length}`;

    // 检查是否重复注册
    if (this.middlewares.some((m) => m.name === middlewareName)) {
      throw new Error(`中间件 "${middlewareName}" 已存在，不能重复注册`);
    }

    this.middlewares.splice(targetIndex + 1, 0, {
      middleware,
      condition,
      name: middlewareName,
    });

    return true;
  }
}

/**
 * 创建中间件链实例
 *
 * @returns 中间件链实例
 */
export function createMiddlewareChain<
  T extends MiddlewareContext = MiddlewareContext,
>(): MiddlewareChain<T> {
  return new MiddlewareChain<T>();
}

/**
 * 创建中间件辅助函数（用于类型推断）
 *
 * @param middleware 中间件函数
 * @returns 中间件函数
 */
export function createMiddleware<
  T extends MiddlewareContext = MiddlewareContext,
>(
  middleware: Middleware<T>,
): Middleware<T> {
  return middleware;
}

/**
 * 路径匹配辅助函数
 *
 * @param path 路径模式（支持字符串、正则表达式、函数）
 * @returns 匹配条件
 */
export function matchPath(
  path: string | RegExp | ((path: string) => boolean),
): MiddlewareCondition {
  return { path };
}

/**
 * 方法匹配辅助函数
 *
 * @param method 方法模式（支持字符串、字符串数组、函数）
 * @returns 匹配条件
 */
export function matchMethod(
  method: string | string[] | ((method: string) => boolean),
): MiddlewareCondition {
  return { method };
}

/**
 * 组合匹配条件
 * 所有条件都必须匹配才返回 true
 *
 * @param conditions 匹配条件数组
 * @returns 组合后的匹配条件
 */
export function combineConditions(
  ...conditions: MiddlewareCondition[]
): MiddlewareCondition {
  return {
    match: (ctx: MiddlewareContext) => {
      // 使用共享的 matchCondition 函数检查每个条件
      return conditions.every((condition) => matchCondition(condition, ctx));
    },
  };
}

// ============================================================================
// MiddlewareManager - 中间件管理器（通过服务容器管理）
// ============================================================================

import type { ServiceContainer } from "@dreamer/service";

/**
 * 中间件管理器配置选项
 */
export interface MiddlewareManagerOptions {
  /** 是否启用性能监控（默认 false） */
  enablePerformanceMonitoring?: boolean;
  /** 是否在错误时继续执行后续中间件（默认 true） */
  continueOnError?: boolean;
}

/**
 * 中间件定义接口（用于注册中间件）
 */
export interface MiddlewareDefinition<
  T extends MiddlewareContext = MiddlewareContext,
> {
  /** 中间件名称（唯一标识） */
  name: string;
  /** 中间件函数 */
  handler: Middleware<T>;
  /** 匹配条件（可选） */
  condition?: MiddlewareCondition;
  /** 优先级（数字越小优先级越高，默认 100） */
  priority?: number;
  /** 中间件链名称（默认 "default"） */
  chain?: string;
}

/**
 * 错误处理中间件定义接口
 */
export interface ErrorMiddlewareDefinition<
  T extends MiddlewareContext = MiddlewareContext,
> {
  /** 中间件名称（唯一标识） */
  name: string;
  /** 错误处理中间件函数 */
  handler: ErrorMiddleware<T>;
  /** 中间件链名称（默认 "default"） */
  chain?: string;
}

/**
 * 中间件管理器类
 *
 * 通过服务容器管理多个中间件链，提供统一的中间件注册、执行、管理功能
 *
 * @example
 * ```typescript
 * import { ServiceContainer } from "@dreamer/service";
 * import { MiddlewareManager } from "@dreamer/middleware";
 *
 * const container = new ServiceContainer();
 * const manager = new MiddlewareManager(container);
 *
 * // 注册中间件
 * manager.register({
 *   name: "logger",
 *   handler: async (ctx, next) => {
 *     console.log("Request:", ctx.path);
 *     await next();
 *   },
 * });
 *
 * // 执行中间件链
 * await manager.execute({ path: "/api/users" });
 * ```
 */
export class MiddlewareManager<
  T extends MiddlewareContext = MiddlewareContext,
> {
  /** 服务容器 */
  private container: ServiceContainer;

  /** 中间件链映射表（支持多个命名的中间件链） */
  private chains: Map<string, MiddlewareChain<T>> = new Map();

  /** 中间件定义映射表（用于按优先级排序） */
  private definitions: Map<string, MiddlewareDefinition<T>> = new Map();

  /** 配置选项 */
  private options: Required<MiddlewareManagerOptions>;

  /** 服务名称前缀 */
  private static readonly SERVICE_PREFIX = "middleware:";

  /**
   * 创建中间件管理器实例
   *
   * @param container 服务容器实例
   * @param options 配置选项
   */
  constructor(
    container: ServiceContainer,
    options: MiddlewareManagerOptions = {},
  ) {
    this.container = container;
    this.options = {
      enablePerformanceMonitoring: options.enablePerformanceMonitoring ?? false,
      continueOnError: options.continueOnError ?? true,
    };

    // 将管理器自身注册到服务容器
    this.container.registerSingleton(
      "middlewareManager",
      () => this as unknown as Record<string, unknown>,
    );
  }

  /**
   * 获取或创建指定名称的中间件链
   *
   * @param chainName 中间件链名称
   * @returns 中间件链实例
   */
  private getOrCreateChain(chainName: string): MiddlewareChain<T> {
    let chain = this.chains.get(chainName);
    if (!chain) {
      chain = new MiddlewareChain<T>();
      if (this.options.enablePerformanceMonitoring) {
        chain.enablePerformanceMonitoring();
      }
      this.chains.set(chainName, chain);

      // 将中间件链注册到服务容器
      const serviceName = `${MiddlewareManager.SERVICE_PREFIX}${chainName}`;
      this.container.registerSingleton(
        serviceName,
        () => chain as unknown as Record<string, unknown>,
      );
    }
    return chain;
  }

  /**
   * 注册中间件
   *
   * @param definition 中间件定义
   * @throws {Error} 如果中间件名称已存在
   */
  register(definition: MiddlewareDefinition<T>): void {
    const { name, handler, condition, priority = 100, chain = "default" } =
      definition;

    // 检查是否重复注册
    if (this.definitions.has(name)) {
      throw new Error(`中间件 "${name}" 已存在，不能重复注册`);
    }

    // 保存定义
    this.definitions.set(name, { ...definition, priority, chain });

    // 获取或创建中间件链
    const middlewareChain = this.getOrCreateChain(chain);

    // 注册到中间件链
    middlewareChain.use(handler, condition, name);
  }

  /**
   * 注册错误处理中间件
   *
   * @param definition 错误处理中间件定义
   */
  registerError(definition: ErrorMiddlewareDefinition<T>): void {
    const { name, handler, chain = "default" } = definition;

    // 获取或创建中间件链
    const middlewareChain = this.getOrCreateChain(chain);

    // 注册到中间件链
    middlewareChain.useError(handler, name);
  }

  /**
   * 批量注册中间件
   *
   * @param definitions 中间件定义数组
   */
  registerAll(definitions: MiddlewareDefinition<T>[]): void {
    // 按优先级排序后注册
    const sorted = [...definitions].sort(
      (a, b) => (a.priority ?? 100) - (b.priority ?? 100),
    );
    for (const definition of sorted) {
      this.register(definition);
    }
  }

  /**
   * 移除中间件
   *
   * @param name 中间件名称
   * @returns 是否成功移除
   */
  remove(name: string): boolean {
    const definition = this.definitions.get(name);
    if (!definition) {
      return false;
    }

    const chain = this.chains.get(definition.chain ?? "default");
    if (chain) {
      chain.remove(name);
    }

    this.definitions.delete(name);
    return true;
  }

  /**
   * 检查中间件是否存在
   *
   * @param name 中间件名称
   * @returns 是否存在
   */
  has(name: string): boolean {
    return this.definitions.has(name);
  }

  /**
   * 获取中间件定义
   *
   * @param name 中间件名称
   * @returns 中间件定义，如果不存在则返回 undefined
   */
  get(name: string): MiddlewareDefinition<T> | undefined {
    return this.definitions.get(name);
  }

  /**
   * 获取所有中间件名称
   *
   * @returns 中间件名称数组
   */
  list(): string[] {
    return Array.from(this.definitions.keys());
  }

  /**
   * 获取指定链的所有中间件名称
   *
   * @param chainName 中间件链名称
   * @returns 中间件名称数组
   */
  listByChain(chainName: string): string[] {
    const chain = this.chains.get(chainName);
    return chain ? chain.listMiddlewares() : [];
  }

  /**
   * 获取所有中间件链名称
   *
   * @returns 中间件链名称数组
   */
  listChains(): string[] {
    return Array.from(this.chains.keys());
  }

  /**
   * 执行指定的中间件链
   *
   * @param ctx 上下文对象
   * @param chainName 中间件链名称（默认 "default"）
   */
  async execute(ctx: T, chainName: string = "default"): Promise<void> {
    const chain = this.chains.get(chainName);
    if (!chain) {
      return; // 链不存在，静默返回
    }
    await chain.execute(ctx);
  }

  /**
   * 获取中间件链实例
   *
   * @param chainName 中间件链名称
   * @returns 中间件链实例，如果不存在则返回 undefined
   */
  getChain(chainName: string): MiddlewareChain<T> | undefined {
    return this.chains.get(chainName);
  }

  /**
   * 获取性能统计
   *
   * @param chainName 中间件链名称（可选，不指定则返回所有链的统计）
   * @returns 性能统计数组
   */
  getStats(chainName?: string): MiddlewareStats[] {
    if (chainName) {
      const chain = this.chains.get(chainName);
      return chain ? chain.getStats() : [];
    }

    // 返回所有链的统计
    const allStats: MiddlewareStats[] = [];
    for (const chain of this.chains.values()) {
      allStats.push(...chain.getStats());
    }
    return allStats;
  }

  /**
   * 清空性能统计
   *
   * @param chainName 中间件链名称（可选，不指定则清空所有链的统计）
   */
  clearStats(chainName?: string): void {
    if (chainName) {
      const chain = this.chains.get(chainName);
      if (chain) {
        chain.clearStats();
      }
    } else {
      for (const chain of this.chains.values()) {
        chain.clearStats();
      }
    }
  }

  /**
   * 清空指定中间件链
   *
   * @param chainName 中间件链名称
   */
  clearChain(chainName: string): void {
    const chain = this.chains.get(chainName);
    if (chain) {
      // 移除相关的定义
      for (const [name, def] of this.definitions) {
        if (def.chain === chainName) {
          this.definitions.delete(name);
        }
      }
      chain.clear();
    }
  }

  /**
   * 清空所有中间件链
   */
  clear(): void {
    for (const chain of this.chains.values()) {
      chain.clear();
    }
    this.definitions.clear();
  }

  /**
   * 启用性能监控
   */
  enablePerformanceMonitoring(): void {
    this.options.enablePerformanceMonitoring = true;
    for (const chain of this.chains.values()) {
      chain.enablePerformanceMonitoring();
    }
  }

  /**
   * 禁用性能监控
   */
  disablePerformanceMonitoring(): void {
    this.options.enablePerformanceMonitoring = false;
    for (const chain of this.chains.values()) {
      chain.disablePerformanceMonitoring();
    }
  }

  /**
   * 获取中间件总数
   *
   * @returns 中间件总数
   */
  getMiddlewareCount(): number {
    return this.definitions.size;
  }

  /**
   * 获取中间件链总数
   *
   * @returns 中间件链总数
   */
  getChainCount(): number {
    return this.chains.size;
  }

  /**
   * 销毁管理器，清理所有资源
   */
  dispose(): void {
    this.clear();
    this.chains.clear();
  }
}

/**
 * 创建中间件管理器实例
 *
 * @param container 服务容器实例
 * @param options 配置选项
 * @returns 中间件管理器实例
 */
export function createMiddlewareManager<
  T extends MiddlewareContext = MiddlewareContext,
>(
  container: ServiceContainer,
  options?: MiddlewareManagerOptions,
): MiddlewareManager<T> {
  return new MiddlewareManager<T>(container, options);
}
