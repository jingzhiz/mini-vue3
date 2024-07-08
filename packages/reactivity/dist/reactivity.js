// packages/reactivity/src/effect.ts
function effect(fn, options) {
  const _effect = new ReactiveEffect(fn, () => {
    _effect.run();
  });
  if (options) {
    Object.assign(_effect, options);
  }
  _effect.run();
  const runner = _effect.run.bind(_effect);
  runner.effect = _effect;
  return runner;
}
var activeEffect;
function preCleanEffect(effect2) {
  effect2._trackId++;
  effect2._depsLen = 0;
}
function postCleanEffect(effect2) {
  if (effect2._deps.length !== effect2._depsLen) {
    for (let i = effect2._depsLen; i < effect2._deps.length; i++) {
      cleanDepEffect(effect2._deps[i], effect2);
    }
  }
  effect2._deps.length = effect2._depsLen;
}
function cleanDepEffect(dep, effect2) {
  dep.delete(effect2);
  if (dep.size === 0) {
    dep.cleanup();
  }
}
var ReactiveEffect = class {
  constructor(fn, scheduler) {
    this.fn = fn;
    this.scheduler = scheduler;
    this._trackId = 0;
    // 用于记录当前 effect 执行次数（防止一个依赖在同一个 effect 中多次被收集）
    this._deps = [];
    // 用于记录收集器
    this._depsLen = 0;
    this._running = 0;
    this._dirtyLevel = 4 /* Dirty */;
    // 创建的 effect 默认是响应式的
    this.active = true;
  }
  get dirty() {
    return this._dirtyLevel === 4 /* Dirty */;
  }
  set dirty(v) {
    this._dirtyLevel = v ? 4 /* Dirty */ : 0 /* NoDirty */;
  }
  run() {
    this._dirtyLevel = 0 /* NoDirty */;
    if (!this.active) {
      return this.fn();
    }
    const lastEffect = activeEffect;
    try {
      activeEffect = this;
      preCleanEffect(this);
      this._running++;
      return this.fn();
    } finally {
      this._running--;
      postCleanEffect(this);
      activeEffect = lastEffect;
    }
  }
  stop() {
    this.active = false;
  }
};
function trackEffect(effect2, dep) {
  if (dep.get(effect2) !== effect2._trackId) {
    dep.set(effect2, effect2._trackId);
    const oldDep = effect2._deps[effect2._depsLen];
    if (oldDep !== dep) {
      if (oldDep) {
        cleanDepEffect(oldDep, effect2);
      }
      effect2._deps[effect2._depsLen++] = dep;
    } else {
      effect2._depsLen++;
    }
  }
}
function triggerEffect(dep) {
  for (const effect2 of dep.keys()) {
    if (!effect2.dirty) effect2.dirty = true;
    if (!effect2._running) {
      effect2?.scheduler();
    }
  }
}

// packages/shared/src/index.ts
function is(value, type) {
  return Object.prototype.toString.call(value) === `[object ${type}]`;
}
function isObject(value) {
  return is(value, "Object");
}
function isFunction(value) {
  return is(value, "Function");
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
    if (isObject(res)) {
      return reactive(res);
    }
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
function toReactive(value) {
  return isObject(value) ? reactive(value) : value;
}

// packages/reactivity/src/ref.ts
function ref(target) {
  return createRef(target);
}
function toRef(target, key) {
  return new ObjectRefImpl(target, key);
}
function toRefs(target) {
  return Object.keys(target).reduce((result, key) => {
    result[key] = toRef(target, key);
    return result;
  }, {});
}
function isRef(target) {
  return !!target?.__v_isRef;
}
function proxyRefs(objectWithRef) {
  return new Proxy(objectWithRef, {
    get(target, key, receiver) {
      const r = Reflect.get(target, key, receiver);
      return isRef(r) ? r.value : r;
    },
    set(target, key, value, receiver) {
      const oldValue = target[key];
      if (isRef(oldValue)) {
        oldValue.value = value;
        return true;
      } else {
        return Reflect.set(target, key, value, receiver);
      }
    }
  });
}
function createRef(target) {
  return new RefImpl(target);
}
var RefImpl = class {
  constructor(rawValue) {
    this.rawValue = rawValue;
    this.__v_isRef = true;
    this._value = toReactive(rawValue);
  }
  get value() {
    trackRefValue(this);
    return this._value;
  }
  set value(newVal) {
    if (newVal !== this.rawValue) {
      this._value = newVal;
      this.rawValue = newVal;
      triggerRefValue(this);
    }
  }
};
var ObjectRefImpl = class {
  constructor(target, key) {
    this.target = target;
    this.key = key;
    this.__v_isRef = true;
  }
  get value() {
    trackRefValue(this);
    return this.target[this.key];
  }
  set value(newVal) {
    if (newVal !== this.target[this.key]) {
      this.target[this.key] = newVal;
      triggerRefValue(this);
    }
  }
};
function trackRefValue(ref2) {
  if (activeEffect) {
    trackEffect(
      activeEffect,
      ref2._deps = createDep("value", () => ref2.dep = void 0)
    );
  }
}
function triggerRefValue(ref2) {
  let dep = ref2._deps;
  if (dep) {
    triggerEffect(dep);
  }
}

// packages/reactivity/src/computed.ts
function computed(getterOrOption) {
  let getter;
  let setter;
  if (isFunction(getterOrOption)) {
    getter = getterOrOption;
    setter = () => {
    };
  } else {
    getter = getterOrOption.get;
    setter = getterOrOption.set;
  }
  return new ComputedRefImpl(getter, setter);
}
var ComputedRefImpl = class {
  constructor(getter, setter) {
    this.getter = getter;
    this.setter = setter;
    this._effect = new ReactiveEffect(
      () => getter(this._value),
      () => {
        triggerRefValue(this);
      }
    );
  }
  get value() {
    if (this._effect.dirty) {
      this._value = this._effect.run();
      trackRefValue(this);
    }
    return this._value;
  }
  set value(value) {
    this.setter(value);
  }
};

// packages/reactivity/src/watch.ts
function watch(source, cb, options = {}) {
  return doWatch(source, cb, options);
}
function traverse(source, depth, currentDepth = 0, seen = /* @__PURE__ */ new Set()) {
  if (!isObject(source)) return source;
  if (depth) {
    currentDepth++;
    if (currentDepth >= depth) return source;
  }
  if (seen.has(source)) return source;
  for (let key in source) {
    traverse(source[key], depth, currentDepth, seen);
  }
  return source;
}
function doWatch(source, cb, { deep }) {
  const reactiveGetter = (source2) => traverse(source2, deep === false ? 1 : void 0);
  const getter = () => reactiveGetter(source);
  let oldValue;
  const job = () => {
    const newValue = effect2.run();
    cb(newValue, oldValue);
    oldValue = newValue;
  };
  const effect2 = new ReactiveEffect(getter, job);
  oldValue = effect2.run();
}
export {
  ReactiveEffect,
  activeEffect,
  computed,
  effect,
  isRef,
  proxyRefs,
  reactive,
  ref,
  toReactive,
  toRef,
  toRefs,
  trackEffect,
  trackRefValue,
  triggerEffect,
  triggerRefValue,
  watch
};
//# sourceMappingURL=reactivity.js.map
