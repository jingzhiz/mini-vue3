// packages/reactivity/src/effect.ts
function effect(fn, options) {
  const _effect = new ReactiveEffect(fn, () => {
    _effect.run();
  });
  _effect.run();
}
var activeEffect;
var ReactiveEffect = class {
  constructor(fn, scheduler) {
    this.fn = fn;
    this.scheduler = scheduler;
    this._trackId = 0;
    // 用于记录当前 effect 执行了多少次
    this._deps = [];
    // 用于记录收集器
    this._depsLen = 0;
    // 创建的 effect 默认是响应式的
    this.active = true;
  }
  run() {
    if (!this.active) {
      return this.fn();
    }
    const lastEffect = activeEffect;
    try {
      activeEffect = this;
      return this.fn();
    } finally {
      activeEffect = lastEffect;
    }
  }
  stop() {
    this.active = false;
  }
};
function trackEffect(effect2, dep) {
  dep.set(effect2, effect2._trackId);
  effect2._deps[effect2._depsLen++] = dep;
}
function triggerEffect(dep) {
  for (const effect2 of dep.keys()) {
    effect2?.scheduler();
  }
}

// packages/shared/src/index.ts
function isObject(value) {
  return value !== null && typeof value === "object";
}

// packages/reactivity/src/reactivityEffect.ts
var effectBuckets = /* @__PURE__ */ new WeakMap();
function createDep(key, cleanup) {
  const dep = /* @__PURE__ */ new Map();
  dep.name = key;
  dep.cleanup = cleanup;
  return dep;
}
function tracker(target, key) {
  if (activeEffect) {
    let depsMap = effectBuckets.get(target);
    if (!depsMap) {
      effectBuckets.set(target, depsMap = /* @__PURE__ */ new Map());
    }
    let dep = depsMap.get(key);
    if (!dep) {
      depsMap.set(
        key,
        dep = createDep(key, () => depsMap.delete(key))
      );
    }
    trackEffect(activeEffect, dep);
  }
}
function trigger(target, key, newValue, oldValue) {
  const depsMap = effectBuckets.get(target);
  if (!depsMap) return;
  const deps = depsMap.get(key);
  if (deps) {
    triggerEffect(deps);
  }
}

// packages/reactivity/src/baseHandler.ts
var mutableHandlers = {
  get(target, key, receiver) {
    if (key === "__v_isReactive" /* IS_REACTIVE */) return true;
    const res = Reflect.get(target, key, receiver);
    tracker(target, key);
    return res;
  },
  set(target, key, value, receiver) {
    const oldValue = target[key];
    if (oldValue === value) return;
    const res = Reflect.set(target, key, value, receiver);
    trigger(target, key, value, oldValue);
    return res;
  }
};

// packages/reactivity/src/reactivity.ts
var reactiveMap = /* @__PURE__ */ new WeakMap();
function createReactiveObject(target) {
  if (!isObject(target)) return target;
  if (target["__v_isReactive" /* IS_REACTIVE */]) return target;
  if (reactiveMap.has(target)) return reactiveMap.get(target);
  const proxy = new Proxy(target, mutableHandlers);
  reactiveMap.set(target, proxy);
  return proxy;
}
function reactive(target) {
  return createReactiveObject(target);
}
export {
  activeEffect,
  effect,
  reactive,
  trackEffect,
  triggerEffect
};
//# sourceMappingURL=reactivity.js.map
