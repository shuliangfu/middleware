/**
 * @fileoverview MiddlewareChain 测试
 *
 * 测试前初始化 i18n 并设置为 zh-CN，以便错误信息为中文。
 */

import { assertRejects, describe, expect, it } from "@dreamer/test";
import { ServiceContainer } from "@dreamer/service";
import { setMiddlewareLocale } from "../src/i18n.ts";
import {
  combineConditions,
  createMiddleware,
  createMiddlewareChain,
  createMiddlewareManager,
  matchCondition,
  matchMethod,
  matchPath,
  MiddlewareChain,
  MiddlewareContext,
  MiddlewareManager,
} from "../src/mod.ts";

setMiddlewareLocale("zh-CN");

describe("MiddlewareChain", () => {
  describe("use", () => {
    it("应该注册中间件", async () => {
      const chain = new MiddlewareChain();
      let executed = false;

      chain.use(async (ctx, next) => {
        executed = true;
        await next();
      });

      await chain.execute({});
      expect(executed).toBeTruthy();
    });

    it("应该按顺序执行中间件", async () => {
      const chain = new MiddlewareChain();
      const order: number[] = [];

      chain.use(async (ctx, next) => {
        order.push(1);
        await next();
        order.push(2);
      });

      chain.use(async (ctx, next) => {
        order.push(3);
        await next();
        order.push(4);
      });

      await chain.execute({});
      expect(order).toEqual([1, 3, 4, 2]);
    });

    it("应该支持 use(path, middleware) 形式", async () => {
      const chain = new MiddlewareChain();
      let executed = false;

      chain.use("/api", async (ctx, next) => {
        executed = true;
        await next();
      });

      await chain.execute({ path: "/api/users" });
      expect(executed).toBeTruthy();

      executed = false;
      await chain.execute({ path: "/other" });
      expect(executed).toBeFalsy();
    });

    it("应该支持 use(path, middleware, name) 形式", async () => {
      const chain = new MiddlewareChain();
      let executed = false;

      chain.use("/api", async (ctx, next) => {
        executed = true;
        await next();
      }, "api-middleware");

      await chain.execute({ path: "/api/users" });
      expect(executed).toBeTruthy();
    });

    it("应该支持 use(middleware, name) 形式", async () => {
      const chain = new MiddlewareChain();
      let executed = false;

      chain.use(async (ctx, next) => {
        executed = true;
        await next();
      }, "my-middleware");

      await chain.execute({});
      expect(executed).toBeTruthy();
    });

    it("应该支持中间件名称", async () => {
      const chain = new MiddlewareChain();
      chain.enablePerformanceMonitoring();

      // 使用 use(middleware, condition, name) 形式指定名称
      // 注意：condition 需要是对象，不能是 undefined
      chain.use(
        async (ctx, next) => {
          await next();
        },
        {},
        "test-middleware",
      );

      await chain.execute({});
      const stats = chain.getStats();
      expect(stats.length).toBe(1);
      expect(stats[0].name).toBe("test-middleware");
      expect(stats[0].count).toBe(1);
    });
  });

  describe("条件匹配", () => {
    it("应该根据路径匹配中间件（字符串）", async () => {
      const chain = new MiddlewareChain();
      let executed = false;

      chain.use("/api", async (ctx, next) => {
        executed = true;
        await next();
      });

      await chain.execute({ path: "/api/users" });
      expect(executed).toBeTruthy();

      executed = false;
      await chain.execute({ path: "/other" });
      expect(executed).toBeFalsy();
    });

    it("应该根据路径匹配中间件（正则表达式）", async () => {
      const chain = new MiddlewareChain();
      let executed = false;

      chain.use(
        async (ctx, next) => {
          executed = true;
          await next();
        },
        { path: /^\/api\/users\/\d+$/ },
      );

      await chain.execute({ path: "/api/users/123" });
      expect(executed).toBeTruthy();

      executed = false;
      await chain.execute({ path: "/api/users" });
      expect(executed).toBeFalsy();
    });

    it("应该根据路径匹配中间件（函数）", async () => {
      const chain = new MiddlewareChain();
      let executed = false;

      chain.use(
        async (ctx, next) => {
          executed = true;
          await next();
        },
        { path: (path: string) => path.length > 10 },
      );

      await chain.execute({ path: "/api/users/123" });
      expect(executed).toBeTruthy();

      executed = false;
      await chain.execute({ path: "/short" });
      expect(executed).toBeFalsy();
    });

    it("应该根据方法匹配中间件（字符串）", async () => {
      const chain = new MiddlewareChain();
      let executed = false;

      chain.use(
        async (ctx, next) => {
          executed = true;
          await next();
        },
        { method: "GET" },
      );

      await chain.execute({ method: "GET", path: "/test" });
      expect(executed).toBeTruthy();

      executed = false;
      await chain.execute({ method: "POST", path: "/test" });
      expect(executed).toBeFalsy();
    });

    it("应该根据方法匹配中间件（数组）", async () => {
      const chain = new MiddlewareChain();
      let executed = false;

      chain.use(
        async (ctx, next) => {
          executed = true;
          await next();
        },
        { method: ["GET", "POST"] },
      );

      await chain.execute({ method: "GET", path: "/test" });
      expect(executed).toBeTruthy();

      executed = false;
      await chain.execute({ method: "POST", path: "/test" });
      expect(executed).toBeTruthy();

      executed = false;
      await chain.execute({ method: "PUT", path: "/test" });
      expect(executed).toBeFalsy();
    });

    it("应该根据方法匹配中间件（函数）", async () => {
      const chain = new MiddlewareChain();
      let executed = false;

      chain.use(
        async (ctx, next) => {
          executed = true;
          await next();
        },
        { method: (method: string) => method === "GET" || method === "POST" },
      );

      await chain.execute({ method: "GET", path: "/test" });
      expect(executed).toBeTruthy();

      executed = false;
      await chain.execute({ method: "PUT", path: "/test" });
      expect(executed).toBeFalsy();
    });

    it("应该支持自定义匹配函数", async () => {
      const chain = new MiddlewareChain();
      let executed = false;

      chain.use(
        async (ctx, next) => {
          executed = true;
          await next();
        },
        {
          match: (ctx: MiddlewareContext) => {
            return ctx.path === "/special" && ctx.method === "GET";
          },
        },
      );

      await chain.execute({ path: "/special", method: "GET" });
      expect(executed).toBeTruthy();

      executed = false;
      await chain.execute({ path: "/special", method: "POST" });
      expect(executed).toBeFalsy();
    });

    it("应该支持组合条件（路径和方法）", async () => {
      const chain = new MiddlewareChain();
      let executed = false;

      chain.use(
        async (ctx, next) => {
          executed = true;
          await next();
        },
        {
          path: "/api",
          method: "GET",
        },
      );

      await chain.execute({ path: "/api/users", method: "GET" });
      expect(executed).toBeTruthy();

      executed = false;
      await chain.execute({ path: "/api/users", method: "POST" });
      expect(executed).toBeFalsy();

      executed = false;
      await chain.execute({ path: "/other", method: "GET" });
      expect(executed).toBeFalsy();
    });

    it("应该在没有匹配条件时执行所有中间件", async () => {
      const chain = new MiddlewareChain();
      let executed = false;

      chain.use(async (ctx, next) => {
        executed = true;
        await next();
      });

      await chain.execute({});
      expect(executed).toBeTruthy();
    });
  });

  describe("错误处理", () => {
    it("应该捕获中间件错误", async () => {
      const chain = new MiddlewareChain();
      let errorCaught = false;

      chain.use(async () => {
        throw new Error("测试错误");
      });

      chain.useError(async (ctx, error, next) => {
        errorCaught = true;
        expect(error.message).toBe("测试错误");
        await next();
      });

      await chain.execute({});
      expect(errorCaught).toBeTruthy();
    });

    it("应该在没有错误处理中间件时抛出错误", async () => {
      const chain = new MiddlewareChain();

      chain.use(async () => {
        throw new Error("测试错误");
      });

      await assertRejects(
        async () => {
          await chain.execute({});
        },
        Error,
        "测试错误",
      );
    });

    it("应该支持多个错误处理中间件", async () => {
      const chain = new MiddlewareChain();
      const order: number[] = [];

      chain.use(async () => {
        throw new Error("测试错误");
      });

      chain.useError(async (ctx, error, next) => {
        order.push(1);
        await next();
      });

      chain.useError(async (ctx, error, next) => {
        order.push(2);
        await next();
      });

      await chain.execute({});
      expect(order).toEqual([1, 2]);
    });

    it("应该处理错误处理中间件本身的错误", async () => {
      const chain = new MiddlewareChain();

      chain.use(async () => {
        throw new Error("原始错误");
      });

      chain.useError(async () => {
        throw new Error("错误处理中间件错误");
      });

      await assertRejects(
        async () => {
          await chain.execute({});
        },
        Error,
        "错误处理中间件错误",
      );
    });

    it("应该在上下文有错误时停止执行", async () => {
      const chain = new MiddlewareChain();
      let secondExecuted = false;

      chain.use(async (ctx, next) => {
        // 设置错误后，继续执行 next，但下一个中间件不应该执行
        ctx.error = { message: "上下文错误" };
        await next();
      });

      chain.use(async (ctx, next) => {
        secondExecuted = true;
        await next();
      });

      await chain.execute({});
      // 新实现：ctx.error 设置后，next() 会跳过后续中间件
      expect(secondExecuted).toBeFalsy();
    });
  });

  describe("性能监控", () => {
    it("应该启用和禁用性能监控", () => {
      const chain = new MiddlewareChain();
      expect(chain.getStats().length).toBe(0);

      chain.enablePerformanceMonitoring();
      chain.disablePerformanceMonitoring();
      expect(chain.getStats().length).toBe(0);
    });

    it("应该记录性能统计", async () => {
      const chain = new MiddlewareChain();
      chain.enablePerformanceMonitoring();

      // 使用路径匹配确保中间件被执行
      chain.use("/test", async (ctx, next) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        await next();
      }, "test-middleware");

      await chain.execute({ path: "/test" });
      const stats = chain.getStats();
      expect(stats.length).toBe(1);
      expect(stats[0].name).toBe("test-middleware");
      expect(stats[0].count).toBe(1);
      expect(stats[0].totalTime).toBeGreaterThan(0);
      expect(stats[0].averageTime).toBeGreaterThan(0);
      expect(stats[0].maxTime).toBeGreaterThan(0);
      expect(stats[0].minTime).toBeGreaterThan(0);
      expect(stats[0].errorCount).toBe(0);
    });

    it("应该记录错误统计", async () => {
      const chain = new MiddlewareChain();
      chain.enablePerformanceMonitoring();

      // 使用 use(middleware, condition, name) 形式指定名称
      // 注意：condition 需要是对象，不能是 undefined
      chain.use(
        async () => {
          throw new Error("测试错误");
        },
        {},
        "error-middleware",
      );

      chain.useError(async (ctx, error, next) => {
        await next();
      });

      await chain.execute({});
      const stats = chain.getStats();
      expect(stats.length).toBe(1);
      expect(stats[0].name).toBe("error-middleware");
      expect(stats[0].errorCount).toBe(1);
    });

    it("应该清空性能统计", async () => {
      const chain = new MiddlewareChain();
      chain.enablePerformanceMonitoring();

      chain.use("test-middleware", async (ctx, next) => {
        await next();
      });

      await chain.execute({});
      expect(chain.getStats().length).toBe(1);

      chain.clearStats();
      expect(chain.getStats().length).toBe(0);
    });
  });

  describe("工具方法", () => {
    it("应该获取中间件数量", () => {
      const chain = new MiddlewareChain();
      expect(chain.getMiddlewareCount()).toBe(0);

      chain.use(async (ctx, next) => {
        await next();
      });
      expect(chain.getMiddlewareCount()).toBe(1);

      chain.use(async (ctx, next) => {
        await next();
      });
      expect(chain.getMiddlewareCount()).toBe(2);
    });

    it("应该获取错误处理中间件数量", () => {
      const chain = new MiddlewareChain();
      expect(chain.getErrorMiddlewareCount()).toBe(0);

      chain.useError(async (ctx, error, next) => {
        await next();
      });
      expect(chain.getErrorMiddlewareCount()).toBe(1);

      chain.useError(async (ctx, error, next) => {
        await next();
      });
      expect(chain.getErrorMiddlewareCount()).toBe(2);
    });

    it("应该清空所有中间件", () => {
      const chain = new MiddlewareChain();

      chain.use(async (ctx, next) => {
        await next();
      });
      chain.useError(async (ctx, error, next) => {
        await next();
      });

      expect(chain.getMiddlewareCount()).toBe(1);
      expect(chain.getErrorMiddlewareCount()).toBe(1);

      chain.clear();
      expect(chain.getMiddlewareCount()).toBe(0);
      expect(chain.getErrorMiddlewareCount()).toBe(0);
    });
  });

  describe("辅助函数", () => {
    it("应该使用 createMiddlewareChain 创建实例", () => {
      const chain = createMiddlewareChain();
      expect(chain).toBeInstanceOf(MiddlewareChain);
    });

    it("应该使用 createMiddleware 创建中间件", async () => {
      const chain = new MiddlewareChain();
      let executed = false;

      const middleware = createMiddleware(async (ctx, next) => {
        executed = true;
        await next();
      });

      chain.use(middleware);
      await chain.execute({});
      expect(executed).toBeTruthy();
    });

    it("应该使用 matchPath 创建路径匹配条件", async () => {
      const chain = new MiddlewareChain();
      let executed = false;

      chain.use(
        async (ctx, next) => {
          executed = true;
          await next();
        },
        matchPath("/api"),
      );

      await chain.execute({ path: "/api/users" });
      expect(executed).toBeTruthy();

      executed = false;
      await chain.execute({ path: "/other" });
      expect(executed).toBeFalsy();
    });

    it("应该使用 matchMethod 创建方法匹配条件", async () => {
      const chain = new MiddlewareChain();
      let executed = false;

      chain.use(
        async (ctx, next) => {
          executed = true;
          await next();
        },
        matchMethod("GET"),
      );

      await chain.execute({ method: "GET", path: "/test" });
      expect(executed).toBeTruthy();

      executed = false;
      await chain.execute({ method: "POST", path: "/test" });
      expect(executed).toBeFalsy();
    });

    it("应该使用 matchMethod 支持方法数组", async () => {
      const chain = new MiddlewareChain();
      let executed = false;

      chain.use(
        async (ctx, next) => {
          executed = true;
          await next();
        },
        matchMethod(["GET", "POST"]),
      );

      await chain.execute({ method: "GET", path: "/test" });
      expect(executed).toBeTruthy();

      executed = false;
      await chain.execute({ method: "POST", path: "/test" });
      expect(executed).toBeTruthy();

      executed = false;
      await chain.execute({ method: "PUT", path: "/test" });
      expect(executed).toBeFalsy();
    });

    it("应该使用 combineConditions 组合多个条件", async () => {
      const chain = new MiddlewareChain();
      let executed = false;

      chain.use(
        async (ctx, next) => {
          executed = true;
          await next();
        },
        combineConditions(
          matchPath("/api"),
          matchMethod("GET"),
        ),
      );

      await chain.execute({ path: "/api/users", method: "GET" });
      expect(executed).toBeTruthy();

      executed = false;
      await chain.execute({ path: "/api/users", method: "POST" });
      expect(executed).toBeFalsy();

      executed = false;
      await chain.execute({ path: "/other", method: "GET" });
      expect(executed).toBeFalsy();
    });
  });

  describe("中间件管理", () => {
    it("应该移除中间件", async () => {
      const chain = new MiddlewareChain();
      let executed = false;

      chain.use(
        async (ctx, next) => {
          executed = true;
          await next();
        },
        {},
        "test-middleware",
      );

      expect(chain.getMiddlewareCount()).toBe(1);

      // 移除中间件
      const removed = chain.remove("test-middleware");
      expect(removed).toBeTruthy();
      expect(chain.getMiddlewareCount()).toBe(0);

      // 执行后不应该触发已移除的中间件
      await chain.execute({});
      expect(executed).toBeFalsy();
    });

    it("应该返回 false 如果移除不存在的中间件", () => {
      const chain = new MiddlewareChain();
      const removed = chain.remove("non-existent");
      expect(removed).toBeFalsy();
    });

    it("应该移除错误处理中间件", () => {
      const chain = new MiddlewareChain();

      chain.useError(async (ctx, error, next) => {
        await next();
      }, "error-handler");

      expect(chain.getErrorMiddlewareCount()).toBe(1);

      const removed = chain.removeError("error-handler");
      expect(removed).toBeTruthy();
      expect(chain.getErrorMiddlewareCount()).toBe(0);
    });

    it("应该获取中间件", () => {
      const chain = new MiddlewareChain();
      const middleware = async (
        ctx: MiddlewareContext,
        next: () => Promise<void>,
      ) => {
        await next();
      };

      chain.use(middleware, {}, "my-middleware");

      const retrieved = chain.getMiddleware("my-middleware");
      expect(retrieved).toBe(middleware);
    });

    it("应该返回 undefined 如果中间件不存在", () => {
      const chain = new MiddlewareChain();
      const retrieved = chain.getMiddleware("non-existent");
      expect(retrieved).toBeUndefined();
    });

    it("应该获取错误处理中间件", () => {
      const chain = new MiddlewareChain();
      const errorMiddleware = async (
        ctx: MiddlewareContext,
        error: Error,
        next: () => Promise<void>,
      ) => {
        await next();
      };

      chain.useError(errorMiddleware, "my-error-handler");

      const retrieved = chain.getErrorMiddleware("my-error-handler");
      expect(retrieved).toBe(errorMiddleware);
    });

    it("应该检查中间件是否存在", () => {
      const chain = new MiddlewareChain();

      chain.use(
        async (ctx, next) => {
          await next();
        },
        {},
        "existing-middleware",
      );

      expect(chain.hasMiddleware("existing-middleware")).toBeTruthy();
      expect(chain.hasMiddleware("non-existent")).toBeFalsy();
    });

    it("应该检查错误处理中间件是否存在", () => {
      const chain = new MiddlewareChain();

      chain.useError(async (ctx, error, next) => {
        await next();
      }, "existing-error-handler");

      expect(chain.hasErrorMiddleware("existing-error-handler")).toBeTruthy();
      expect(chain.hasErrorMiddleware("non-existent")).toBeFalsy();
    });

    it("应该列出所有中间件名称", () => {
      const chain = new MiddlewareChain();

      chain.use(
        async (ctx, next) => {
          await next();
        },
        {},
        "middleware-a",
      );

      chain.use(
        async (ctx, next) => {
          await next();
        },
        {},
        "middleware-b",
      );

      chain.use(
        async (ctx, next) => {
          await next();
        },
        {},
        "middleware-c",
      );

      const names = chain.listMiddlewares();
      expect(names).toEqual(["middleware-a", "middleware-b", "middleware-c"]);
    });

    it("应该列出所有错误处理中间件名称", () => {
      const chain = new MiddlewareChain();

      chain.useError(async (ctx, error, next) => {
        await next();
      }, "error-a");

      chain.useError(async (ctx, error, next) => {
        await next();
      }, "error-b");

      const names = chain.listErrorMiddlewares();
      expect(names).toEqual(["error-a", "error-b"]);
    });
  });

  describe("插入中间件", () => {
    it("应该在指定中间件之前插入", async () => {
      const chain = new MiddlewareChain();
      const order: string[] = [];

      chain.use(
        async (ctx, next) => {
          order.push("first");
          await next();
        },
        {},
        "first",
      );

      chain.use(
        async (ctx, next) => {
          order.push("last");
          await next();
        },
        {},
        "last",
      );

      // 在 last 之前插入
      const inserted = chain.insertBefore(
        "last",
        async (ctx, next) => {
          order.push("middle");
          await next();
        },
        undefined,
        "middle",
      );

      expect(inserted).toBeTruthy();
      expect(chain.listMiddlewares()).toEqual(["first", "middle", "last"]);

      await chain.execute({});
      expect(order).toEqual(["first", "middle", "last"]);
    });

    it("应该在指定中间件之后插入", async () => {
      const chain = new MiddlewareChain();
      const order: string[] = [];

      chain.use(
        async (ctx, next) => {
          order.push("first");
          await next();
        },
        {},
        "first",
      );

      chain.use(
        async (ctx, next) => {
          order.push("last");
          await next();
        },
        {},
        "last",
      );

      // 在 first 之后插入
      const inserted = chain.insertAfter(
        "first",
        async (ctx, next) => {
          order.push("middle");
          await next();
        },
        undefined,
        "middle",
      );

      expect(inserted).toBeTruthy();
      expect(chain.listMiddlewares()).toEqual(["first", "middle", "last"]);

      await chain.execute({});
      expect(order).toEqual(["first", "middle", "last"]);
    });

    it("应该返回 false 如果目标中间件不存在（insertBefore）", () => {
      const chain = new MiddlewareChain();

      const inserted = chain.insertBefore("non-existent", async (ctx, next) => {
        await next();
      });

      expect(inserted).toBeFalsy();
    });

    it("应该返回 false 如果目标中间件不存在（insertAfter）", () => {
      const chain = new MiddlewareChain();

      const inserted = chain.insertAfter("non-existent", async (ctx, next) => {
        await next();
      });

      expect(inserted).toBeFalsy();
    });

    it("应该抛出错误如果插入的中间件名称已存在", () => {
      const chain = new MiddlewareChain();

      chain.use(
        async (ctx, next) => {
          await next();
        },
        {},
        "existing",
      );

      chain.use(
        async (ctx, next) => {
          await next();
        },
        {},
        "target",
      );

      let error: Error | null = null;
      try {
        chain.insertBefore(
          "target",
          async (ctx, next) => {
            await next();
          },
          undefined,
          "existing",
        );
      } catch (e) {
        error = e as Error;
      }

      expect(error).not.toBeNull();
      expect(error?.message).toContain("已存在");
    });
  });

  describe("matchCondition 函数", () => {
    it("应该匹配路径前缀", () => {
      const condition = { path: "/api" };
      expect(matchCondition(condition, { path: "/api/users" })).toBeTruthy();
      expect(matchCondition(condition, { path: "/other" })).toBeFalsy();
    });

    it("应该匹配正则表达式", () => {
      const condition = { path: /^\/api\/v\d+/ };
      expect(matchCondition(condition, { path: "/api/v1/users" })).toBeTruthy();
      expect(matchCondition(condition, { path: "/api/users" })).toBeFalsy();
    });

    it("应该匹配函数条件", () => {
      const condition = { path: (p: string) => p.length > 10 };
      expect(matchCondition(condition, { path: "/long/path/here" }))
        .toBeTruthy();
      expect(matchCondition(condition, { path: "/short" })).toBeFalsy();
    });

    it("应该匹配方法（不区分大小写）", () => {
      const condition = { method: "GET" };
      expect(matchCondition(condition, { method: "get" })).toBeTruthy();
      expect(matchCondition(condition, { method: "GET" })).toBeTruthy();
      expect(matchCondition(condition, { method: "POST" })).toBeFalsy();
    });

    it("应该匹配方法数组", () => {
      const condition = { method: ["GET", "POST"] };
      expect(matchCondition(condition, { method: "GET" })).toBeTruthy();
      expect(matchCondition(condition, { method: "post" })).toBeTruthy();
      expect(matchCondition(condition, { method: "PUT" })).toBeFalsy();
    });

    it("应该支持自定义 match 函数", () => {
      const condition = {
        match: (ctx: MiddlewareContext) => ctx.path === "/special",
      };
      expect(matchCondition(condition, { path: "/special" })).toBeTruthy();
      expect(matchCondition(condition, { path: "/other" })).toBeFalsy();
    });
  });
});

describe("MiddlewareManager", () => {
  describe("创建和初始化", () => {
    it("应该创建中间件管理器实例", () => {
      const container = new ServiceContainer();
      const manager = new MiddlewareManager(container);
      expect(manager).toBeInstanceOf(MiddlewareManager);
    });

    it("应该使用 createMiddlewareManager 创建实例", () => {
      const container = new ServiceContainer();
      const manager = createMiddlewareManager(container);
      expect(manager).toBeInstanceOf(MiddlewareManager);
    });

    it("应该将管理器注册到服务容器", () => {
      const container = new ServiceContainer();
      const manager = new MiddlewareManager(container);
      expect(container.has("middlewareManager")).toBeTruthy();
    });
  });

  describe("中间件注册", () => {
    it("应该注册中间件", async () => {
      const container = new ServiceContainer();
      const manager = new MiddlewareManager(container);
      let executed = false;

      manager.register({
        name: "test-middleware",
        handler: async (ctx, next) => {
          executed = true;
          await next();
        },
      });

      expect(manager.has("test-middleware")).toBeTruthy();
      await manager.execute({});
      expect(executed).toBeTruthy();
    });

    it("应该拒绝重复注册同名中间件", () => {
      const container = new ServiceContainer();
      const manager = new MiddlewareManager(container);

      manager.register({
        name: "duplicate",
        handler: async (ctx, next) => await next(),
      });

      let error: Error | null = null;
      try {
        manager.register({
          name: "duplicate",
          handler: async (ctx, next) => await next(),
        });
      } catch (e) {
        error = e as Error;
      }

      expect(error).not.toBeNull();
      expect(error?.message).toContain("已存在");
    });

    it("应该注册错误处理中间件", async () => {
      const container = new ServiceContainer();
      const manager = new MiddlewareManager(container);
      let errorHandled = false;

      manager.register({
        name: "error-thrower",
        handler: async () => {
          throw new Error("测试错误");
        },
      });

      manager.registerError({
        name: "error-handler",
        handler: async (ctx, error, next) => {
          errorHandled = true;
          await next();
        },
      });

      await manager.execute({});
      expect(errorHandled).toBeTruthy();
    });

    it("应该批量注册中间件并按优先级排序", async () => {
      const container = new ServiceContainer();
      const manager = new MiddlewareManager(container);
      const order: string[] = [];

      manager.registerAll([
        {
          name: "low-priority",
          priority: 200,
          handler: async (ctx, next) => {
            order.push("low");
            await next();
          },
        },
        {
          name: "high-priority",
          priority: 50,
          handler: async (ctx, next) => {
            order.push("high");
            await next();
          },
        },
        {
          name: "medium-priority",
          priority: 100,
          handler: async (ctx, next) => {
            order.push("medium");
            await next();
          },
        },
      ]);

      await manager.execute({});
      expect(order).toEqual(["high", "medium", "low"]);
    });
  });

  describe("中间件管理", () => {
    it("应该移除中间件", () => {
      const container = new ServiceContainer();
      const manager = new MiddlewareManager(container);

      manager.register({
        name: "to-remove",
        handler: async (ctx, next) => await next(),
      });

      expect(manager.has("to-remove")).toBeTruthy();

      const removed = manager.remove("to-remove");
      expect(removed).toBeTruthy();
      expect(manager.has("to-remove")).toBeFalsy();
    });

    it("应该返回 false 如果移除不存在的中间件", () => {
      const container = new ServiceContainer();
      const manager = new MiddlewareManager(container);

      const removed = manager.remove("non-existent");
      expect(removed).toBeFalsy();
    });

    it("应该获取中间件定义", () => {
      const container = new ServiceContainer();
      const manager = new MiddlewareManager(container);

      manager.register({
        name: "my-middleware",
        priority: 50,
        handler: async (ctx, next) => await next(),
      });

      const definition = manager.get("my-middleware");
      expect(definition).not.toBeUndefined();
      expect(definition?.name).toBe("my-middleware");
      expect(definition?.priority).toBe(50);
    });

    it("应该列出所有中间件名称", () => {
      const container = new ServiceContainer();
      const manager = new MiddlewareManager(container);

      manager.register({
        name: "a",
        handler: async (ctx, next) => await next(),
      });
      manager.register({
        name: "b",
        handler: async (ctx, next) => await next(),
      });
      manager.register({
        name: "c",
        handler: async (ctx, next) => await next(),
      });

      const names = manager.list();
      expect(names).toContain("a");
      expect(names).toContain("b");
      expect(names).toContain("c");
    });
  });

  describe("多链管理", () => {
    it("应该支持多个中间件链", async () => {
      const container = new ServiceContainer();
      const manager = new MiddlewareManager(container);
      const order: string[] = [];

      manager.register({
        name: "default-middleware",
        chain: "default",
        handler: async (ctx, next) => {
          order.push("default");
          await next();
        },
      });

      manager.register({
        name: "api-middleware",
        chain: "api",
        handler: async (ctx, next) => {
          order.push("api");
          await next();
        },
      });

      await manager.execute({}, "default");
      expect(order).toEqual(["default"]);

      order.length = 0;
      await manager.execute({}, "api");
      expect(order).toEqual(["api"]);
    });

    it("应该列出所有中间件链名称", () => {
      const container = new ServiceContainer();
      const manager = new MiddlewareManager(container);

      manager.register({
        name: "m1",
        chain: "chain-a",
        handler: async (ctx, next) => await next(),
      });

      manager.register({
        name: "m2",
        chain: "chain-b",
        handler: async (ctx, next) => await next(),
      });

      const chains = manager.listChains();
      expect(chains).toContain("chain-a");
      expect(chains).toContain("chain-b");
    });

    it("应该按链列出中间件", () => {
      const container = new ServiceContainer();
      const manager = new MiddlewareManager(container);

      manager.register({
        name: "a1",
        chain: "chain-a",
        handler: async (ctx, next) => await next(),
      });

      manager.register({
        name: "a2",
        chain: "chain-a",
        handler: async (ctx, next) => await next(),
      });

      manager.register({
        name: "b1",
        chain: "chain-b",
        handler: async (ctx, next) => await next(),
      });

      expect(manager.listByChain("chain-a")).toEqual(["a1", "a2"]);
      expect(manager.listByChain("chain-b")).toEqual(["b1"]);
    });

    it("应该将中间件链注册到服务容器", () => {
      const container = new ServiceContainer();
      const manager = new MiddlewareManager(container);

      manager.register({
        name: "test",
        chain: "my-chain",
        handler: async (ctx, next) => await next(),
      });

      expect(container.has("middleware:my-chain")).toBeTruthy();
    });
  });

  describe("性能监控", () => {
    it("应该启用和禁用性能监控", async () => {
      const container = new ServiceContainer();
      const manager = new MiddlewareManager(container);

      manager.register({
        name: "test",
        handler: async (ctx, next) => await next(),
      });

      manager.enablePerformanceMonitoring();
      await manager.execute({});

      const stats = manager.getStats();
      expect(stats.length).toBe(1);
      expect(stats[0].name).toBe("test");

      manager.clearStats();
      expect(manager.getStats().length).toBe(0);

      manager.disablePerformanceMonitoring();
    });
  });

  describe("清理和销毁", () => {
    it("应该清空指定链", () => {
      const container = new ServiceContainer();
      const manager = new MiddlewareManager(container);

      manager.register({
        name: "a",
        chain: "chain-a",
        handler: async (ctx, next) => await next(),
      });

      manager.register({
        name: "b",
        chain: "chain-b",
        handler: async (ctx, next) => await next(),
      });

      manager.clearChain("chain-a");

      expect(manager.has("a")).toBeFalsy();
      expect(manager.has("b")).toBeTruthy();
    });

    it("应该清空所有中间件", () => {
      const container = new ServiceContainer();
      const manager = new MiddlewareManager(container);

      manager.register({
        name: "a",
        handler: async (ctx, next) => await next(),
      });

      manager.register({
        name: "b",
        handler: async (ctx, next) => await next(),
      });

      expect(manager.getMiddlewareCount()).toBe(2);

      manager.clear();
      expect(manager.getMiddlewareCount()).toBe(0);
    });

    it("应该销毁管理器", () => {
      const container = new ServiceContainer();
      const manager = new MiddlewareManager(container);

      manager.register({
        name: "test",
        handler: async (ctx, next) => await next(),
      });

      manager.dispose();
      expect(manager.getMiddlewareCount()).toBe(0);
      expect(manager.getChainCount()).toBe(0);
    });
  });

  describe("统计信息", () => {
    it("应该获取中间件总数", () => {
      const container = new ServiceContainer();
      const manager = new MiddlewareManager(container);

      expect(manager.getMiddlewareCount()).toBe(0);

      manager.register({
        name: "a",
        handler: async (ctx, next) => await next(),
      });

      expect(manager.getMiddlewareCount()).toBe(1);
    });

    it("应该获取中间件链总数", () => {
      const container = new ServiceContainer();
      const manager = new MiddlewareManager(container);

      expect(manager.getChainCount()).toBe(0);

      manager.register({
        name: "a",
        chain: "chain-1",
        handler: async (ctx, next) => await next(),
      });

      manager.register({
        name: "b",
        chain: "chain-2",
        handler: async (ctx, next) => await next(),
      });

      expect(manager.getChainCount()).toBe(2);
    });
  });
});
