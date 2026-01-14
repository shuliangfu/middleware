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
      conditionOrMiddleware &&
      typeof conditionOrMiddleware === "object" &&
      !("call" in conditionOrMiddleware)
    ) {
      // use(middleware, condition, name?)
      middleware = middlewareOrPath;
      condition = conditionOrMiddleware as MiddlewareCondition;
      name = nameOrCondition as string | undefined;
    } else {
      // use(middleware, name?)
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

    const { condition } = registration;

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

        // 如果上下文中有错误，停止执行
        if (ctx.error) {
          return;
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
 *
 * @param conditions 匹配条件数组
 * @returns 组合后的匹配条件
 */
export function combineConditions(
  ...conditions: MiddlewareCondition[]
): MiddlewareCondition {
  return {
    match: (ctx: MiddlewareContext) => {
      return conditions.every((condition) => {
        // 检查路径匹配
        if (condition.path !== undefined && ctx.path !== undefined) {
          if (typeof condition.path === "string") {
            if (!ctx.path.startsWith(condition.path)) {
              return false;
            }
          } else if (condition.path instanceof RegExp) {
            if (!condition.path.test(ctx.path)) {
              return false;
            }
          } else if (typeof condition.path === "function") {
            if (!condition.path(ctx.path)) {
              return false;
            }
          }
        }

        // 检查方法匹配
        if (condition.method !== undefined && ctx.method !== undefined) {
          if (typeof condition.method === "string") {
            if (ctx.method.toLowerCase() !== condition.method.toLowerCase()) {
              return false;
            }
          } else if (Array.isArray(condition.method)) {
            const methodLower = ctx.method.toLowerCase();
            if (
              !condition.method.some((m) => m.toLowerCase() === methodLower)
            ) {
              return false;
            }
          } else if (typeof condition.method === "function") {
            if (!condition.method(ctx.method)) {
              return false;
            }
          }
        }

        // 检查自定义匹配函数
        if (condition.match !== undefined) {
          if (!condition.match(ctx)) {
            return false;
          }
        }

        return true;
      });
    },
  };
}
