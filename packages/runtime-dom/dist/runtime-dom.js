// packages/runtime-dom/src/modules/patch-class.ts
function patchClass(el, value) {
  if (!value) {
    el.removeAttribute("class");
  } else {
    el.className = value;
  }
}

// packages/runtime-dom/src/modules/patch-style.ts
function patchStyle(el, prevValue, nextValue) {
  const style = el.style;
  for (const key in nextValue) {
    style[key] = nextValue[key];
  }
  if (prevValue) {
    for (const key in prevValue) {
      if (nextValue[key] == null) {
        style[key] = "";
      }
    }
  }
}

// packages/runtime-dom/src/modules/patch-event.ts
function createInvoker(value) {
  const invoker = (e) => invoker.value(e);
  invoker.value = value;
  return invoker;
}
function patchEvent(el, key, nextValue) {
  const invokers = el._evi || (el._evi = {});
  const eventName = key.slice(2).toLowerCase();
  const existingInvoker = invokers[key];
  if (existingInvoker && nextValue) {
    return existingInvoker.value = nextValue;
  }
  if (nextValue) {
    const invoker = invokers[key] = createInvoker(nextValue);
    return el.addEventListener(eventName, invoker);
  }
  if (existingInvoker) {
    el.removeEventListener(eventName, existingInvoker);
    invokers[key] = void 0;
  }
}

// packages/runtime-dom/src/modules/patch-attr.ts
function patchAttr(el, key, value) {
  if (!value) {
    el.removeAttribute(key);
  } else {
    el.setAttribute(key, value);
  }
}

// packages/runtime-dom/src/patch-prop.ts
function patchProp(el, key, prevValue, nextValue) {
  if (key === "class") {
    return patchClass(el, nextValue);
  } else if (key === "style") {
    return patchStyle(el, prevValue, nextValue);
  } else if (/^on[^a-z]/.test(key)) {
    return patchEvent(el, key, nextValue);
  } else {
    return patchAttr(el, key, nextValue);
  }
}

// packages/runtime-dom/src/node-ops.ts
var nodeOps = {
  insert: (el, parent, anchor = null) => parent.insertBefore(el, anchor),
  remove: (el) => el?.parentNode.removeChild(el),
  createElement: (type) => document.createElement(type),
  createText: (text) => document.createTextNode(text),
  setElementText: (el, text) => el.textContent = text,
  setText: (node, text) => node.nodeValue = text,
  parentNode: (node) => node.parentNode,
  nextSibling: (node) => node.nextSibling
};

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
    if (this.active) {
      this.active = false;
      preCleanEffect(this);
      postCleanEffect(this);
    }
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

// packages/shared/src/is.ts
function is(value, type) {
  return Object.prototype.toString.call(value) === `[object ${type}]`;
}
function hasOwn(target, key) {
  return Object.hasOwn(target, key);
}
function isObject(value) {
  return is(value, "Object");
}
function isFunction(value) {
  return is(value, "Function");
}
function isArray(value) {
  return Array.isArray(value);
}
function isString(value) {
  return is(value, "String");
}

// packages/shared/src/sequence.ts
function getSequence(arr) {
  const result = [0];
  const p = result.slice(0);
  let start, end, middle;
  const length = arr.length;
  for (let i = 0; i < length; i++) {
    const arrI = arr[i];
    if (arrI !== 0) {
      if (arr[result.at(-1)] < arrI) {
        p[i] = result.at(-1);
        result.push(i);
        continue;
      }
    }
    start = 0;
    end = result.length - 1;
    while (start < end) {
      middle = (start + end) / 2 | 0;
      if (arr[result[middle]] < arrI) {
        start = middle + 1;
      } else {
        end = middle;
      }
    }
    if (arrI < arr[result[start]]) {
      p[i] = result[start - 1];
      result[start] = i;
    }
  }
  let l = result.length;
  let last = result.at(-1);
  while (l-- > 0) {
    result[l] = last;
    last = p[last];
  }
  return result;
}

// packages/reactivity/src/reactivity-effect.ts
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

// packages/reactivity/src/base-handler.ts
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
  if (isReactive(target)) return target;
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
function isReactive(value) {
  return !!(value && value["__v_isReactive" /* IS_REACTIVE */]);
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
function isRef(value) {
  return !!(value && value["__v_isRef" /* IS_REF */]);
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
      // ref._deps = ref._deps || createDep('undefined', () => ref.dep = undefined)
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
function watchEffect(source, options = {}) {
  return doWatch(source, null, options);
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
function doWatch(source, cb, { deep, immediate }) {
  const reactiveGetter = (source2) => traverse(source2, deep === false ? 1 : void 0);
  let getter;
  if (isReactive(source)) {
    getter = () => reactiveGetter(source);
  } else if (isRef(source)) {
    getter = () => source.value;
  } else if (isFunction(source)) {
    getter = source;
  }
  let clean;
  let oldValue;
  const onCleanup = (fn) => {
    clean = () => {
      fn();
      clean = void 0;
    };
  };
  const job = () => {
    if (cb) {
      const newValue = effect2.run();
      if (clean) clean();
      cb(newValue, oldValue, onCleanup);
      oldValue = newValue;
    } else {
      effect2.run();
    }
  };
  const effect2 = new ReactiveEffect(getter, job);
  if (cb) {
    if (immediate) {
      job();
    } else {
      oldValue = effect2.run();
    }
  } else {
    effect2.run();
  }
  const unwatch = () => {
    effect2.stop();
  };
  return unwatch;
}

// packages/runtime-core/src/create-vnode.ts
var Text = Symbol("Text");
var Fragment = Symbol("Fragment");
function isVnode(value) {
  return !!value?.__v_isVnode;
}
function isSameVnodeType(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key;
}
function createVnode(type, props, children) {
  const shapeFlag = isString(type) ? 1 /* ELEMENT */ : isObject(type) ? 4 /* STATEFUL_COMPONENT */ : 0;
  const vnode = {
    __v_isVnode: true,
    type,
    props,
    children,
    key: props?.key,
    shapeFlag,
    el: null
  };
  if (children) {
    if (isArray(children)) {
      vnode.shapeFlag |= 16 /* ARRAY_CHILDREN */;
    } else if (isObject(children)) {
      vnode.shapeFlag |= 32 /* SLOTS_CHILDREN */;
    } else {
      children = String(children);
      vnode.shapeFlag |= 8 /* TEXT_CHILDREN */;
    }
  }
  return vnode;
}

// packages/runtime-core/src/scheduler.ts
var queue = [];
var pResolve = Promise.resolve();
var isFlushing = false;
function queueJob(job) {
  if (!queue.includes(job)) {
    queue.push(job);
  }
  if (!isFlushing) {
    isFlushing = true;
    pResolve.then(() => {
      isFlushing = false;
      const copy = queue.slice(0);
      queue.length = 0;
      copy.forEach((job2) => job2());
    });
  }
}

// packages/runtime-core/src/component.ts
function createComponentInstance(vnode) {
  const instance = {
    vnode,
    props: {},
    attrs: {},
    slots: {},
    propsOptions: vnode.props,
    data: null,
    subTree: null,
    isMounted: false,
    update: null,
    component: null,
    proxy: null,
    // 代理 props/attrs/data
    setupState: null
  };
  return instance;
}
var publicProperty = {
  $attrs: (instance) => instance.attrs,
  $slots: (instance) => instance.slots
};
var handler = {
  get(target, key) {
    const { data, props, setupState } = target;
    if (data && hasOwn(data, key)) {
      return data[key];
    } else if (props && hasOwn(props, key)) {
      return props[key];
    } else if (setupState && hasOwn(setupState, key)) {
      return setupState[key];
    }
    const getter = publicProperty[key];
    if (getter) {
      return getter(target);
    }
  },
  set(target, key, value) {
    const { data, props } = target;
    if (data && hasOwn(data, key)) {
      data[key] = value;
    } else if (props && hasOwn(props, key)) {
      console.warn("Props is readonly");
      return false;
    }
    return true;
  }
};
function initProxy(instance) {
  instance.proxy = new Proxy(instance, handler);
}
function initSlots(instance, children) {
  if (instance.vnode.shapeFlag & 32 /* SLOTS_CHILDREN */) {
    instance.slots = children;
  } else {
    instance.slots = {};
  }
}
function initProps(instance, rawProps) {
  const props = {};
  const attrs = {};
  const propsOptions = instance.propsOptions || {};
  Object.keys(rawProps).forEach((key) => {
    const value = rawProps[key];
    if (key in propsOptions) {
      props[key] = value;
    } else {
      attrs[key] = value;
    }
  });
  instance.props = reactive(props);
  instance.attrs = attrs;
}
function initData(instance, data = () => {
}) {
  if (isFunction(data)) {
    instance.data = reactive(data.call(instance.proxy));
  } else {
    console.warn("data must be a function");
  }
}
function setupComponent(instance) {
  const { vnode } = instance;
  initProxy(instance);
  initProps(instance, vnode.props);
  initSlots(instance, vnode.children);
  const { data, setup, render: render2 } = vnode.type;
  initData(instance, data);
  if (setup) {
    const setupContext = {};
    const setupResult = setup(instance.props, setupContext);
    if (isFunction(setupResult)) {
      instance.render = setupResult;
    } else {
      instance.setupState = proxyRefs(setupResult);
    }
  }
  instance.render || (instance.render = render2);
}

// packages/runtime-core/src/renderer.ts
function createRenderer(renderOptions) {
  const {
    insert: hostInsert,
    remove: hostRemove,
    createElement: hostCreateElement,
    createText: hostCreateText,
    setElementText: hostSetElementText,
    setText: hostSetText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    patchProp: hostPatchProp
  } = renderOptions;
  const mountChildren = (children, container) => {
    children.forEach((child) => {
      patch(null, child, container);
    });
  };
  const mountElement = (vnode, container, anchor = null) => {
    const { type, props, children, shapeFlag } = vnode;
    const el = vnode.el = hostCreateElement(type);
    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key]);
      }
    }
    if (shapeFlag & 8 /* TEXT_CHILDREN */) {
      hostSetElementText(el, children);
    } else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
      mountChildren(children, el);
    }
    hostInsert(el, container, anchor);
  };
  const setupRenderEffect = (instance, container, anchor) => {
    const { render: render3 } = instance;
    const componentFn = () => {
      if (!instance.isMounted) {
        const subTree = instance.subTree = render3.call(instance.proxy, instance.proxy);
        patch(null, subTree, container, anchor);
        instance.isMounted = true;
      } else {
        const { next } = instance;
        if (next) {
          updateComponentPreRender(instance, next);
        }
        const subTree = render3.call(instance.proxy, instance.proxy);
        patch(instance.subTree, subTree, container, anchor);
        instance.subTree = subTree;
      }
    };
    const update = instance.update = () => effect2.run();
    const effect2 = new ReactiveEffect(componentFn, () => {
      queueJob(update);
    });
    update();
  };
  const mountComponent = (vnode, container, anchor = null) => {
    const instance = vnode.component = createComponentInstance(vnode);
    setupComponent(instance);
    setupRenderEffect(instance, container, anchor);
  };
  const processText = (n1, n2, container) => {
    if (n1 === null) {
      n2.el = hostCreateText(n2.children);
      hostInsert(n2.el, container);
    } else {
      const el = n2.el = n1.el;
      if (n1.children !== n2.children) {
        hostSetText(el, n2.children);
      }
    }
  };
  const processFragment = (n1, n2, container) => {
    if (n1 === null) {
      mountChildren(n2.children, container);
    } else {
      patchChildren(n1, n2, container);
    }
  };
  const processElement = (n1, n2, container, anchor = null) => {
    if (n1 === null) {
      mountElement(n2, container, anchor);
    } else {
      patchElement(n1, n2, container);
    }
  };
  const processComponent = (n1, n2, container, anchor) => {
    if (n1 === null) {
      mountComponent(n2, container, anchor);
    } else {
      updateComponent(n1, n2);
    }
  };
  const patchProps = (el, oldProps, newProps) => {
    for (const key in newProps) {
      const prev = oldProps[key];
      const next = newProps[key];
      hostPatchProp(el, key, prev, next);
    }
    for (const key in oldProps) {
      const next = newProps[key];
      hostPatchProp(el, key, null, next);
    }
  };
  const patchKeyedChildren = (c1, c2, container) => {
    let index = 0;
    let e1 = c1.length - 1;
    let e2 = c2.length - 1;
    while (index <= e1 && index <= e2) {
      const prevChild = c1[index];
      const nextChild = c2[index];
      if (isSameVnodeType(prevChild, nextChild)) {
        patch(prevChild, nextChild, container);
      } else {
        break;
      }
      index++;
    }
    while (index <= e1 && index <= e2) {
      const prevChild = c1[e1];
      const nextChild = c2[e2];
      if (isSameVnodeType(prevChild, nextChild)) {
        patch(prevChild, nextChild, container);
      } else {
        break;
      }
      e1--;
      e2--;
    }
    if (index > e1) {
      if (index <= e2) {
        let nextPos = e2 + 1;
        const anchor = c2[nextPos]?.el;
        while (index <= e2) {
          patch(null, c2[index], container, anchor);
          index++;
        }
      }
    } else if (index > e2) {
      if (index <= e1) {
        while (index <= e1) {
          unmount(c1[index]);
          index++;
        }
      }
    } else {
      let s1 = index;
      let s2 = index;
      const keyToNewIndexMap = /* @__PURE__ */ new Map();
      let toBePatched = e2 - s2 + 1;
      const newIndexToOldMapIndex = new Array(toBePatched).fill(0);
      for (let i = s2; i <= e2; i++) {
        const nextChild = c2[i];
        keyToNewIndexMap.set(nextChild.key, i);
      }
      for (let i = s1; i <= e1; i++) {
        const prevChild = c1[i];
        if (keyToNewIndexMap.has(prevChild.key)) {
          const nextIndex = keyToNewIndexMap.get(prevChild.key);
          patch(prevChild, c2[nextIndex], container);
          newIndexToOldMapIndex[nextIndex - s2] = i + 1;
        } else {
          unmount(prevChild);
        }
      }
      const sequence = getSequence(newIndexToOldMapIndex);
      let lastIndex = sequence.length - 1;
      for (let i = toBePatched - 1; i >= 0; i--) {
        const nextIndex = i + s2;
        const anchor = c2[nextIndex + 1]?.el;
        const vnode = c2[nextIndex];
        if (!vnode.el) {
          patch(null, vnode, container, anchor);
        } else {
          if (i === sequence[lastIndex]) {
            lastIndex--;
          } else {
            hostInsert(vnode.el, container, anchor);
          }
        }
      }
    }
  };
  const patchChildren = (n1, n2, container) => {
    const c1 = n1.children;
    const c2 = n2.children;
    const prevShapeFlag = n1.shapeFlag;
    const shapeFlag = n2.shapeFlag;
    if (shapeFlag & 8 /* TEXT_CHILDREN */) {
      if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) {
        unmountChildren(c1);
      }
      if (c1 !== c2) {
        hostSetElementText(container, c2);
      }
    } else {
      if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) {
        if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
          patchKeyedChildren(c1, c2, container);
        } else {
          unmountChildren(c1);
        }
      } else {
        if (prevShapeFlag & 8 /* TEXT_CHILDREN */) {
          hostSetElementText(container, "");
        }
        if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
          mountChildren(c2, container);
        }
      }
    }
  };
  const patchElement = (n1, n2, container) => {
    const el = n2.el = n1.el;
    const oldProps = n1.props || {};
    const newProps = n2.props || {};
    patchProps(el, oldProps, newProps);
    patchChildren(n1, n2, el);
  };
  const hasPropsChange = (oldProps, newProps) => {
    const oldKeys = Object.keys(oldProps);
    const newKeys = Object.keys(newProps);
    if (oldKeys.length !== newKeys.length) {
      return true;
    }
    for (let i = 0; i < newKeys.length; i++) {
      const key = newKeys[i];
      if (oldProps[key] !== newProps[key]) {
        return true;
      }
    }
    return false;
  };
  const updateProps = (instance, prevProps, nextProps) => {
    for (let key in nextProps) {
      instance.props[key] = nextProps[key];
    }
    for (let key in prevProps) {
      if (!(key in nextProps)) {
        delete instance.props[key];
      }
    }
  };
  const shouldComponentUpdate = (n1, n2) => {
    const { props: prevProps, children: prevChildren } = n1;
    const { props: nextProps, children: nextChildren } = n2;
    if (prevChildren || nextChildren) return true;
    if (Object.is(prevProps, nextProps)) return false;
    return hasPropsChange(prevProps, nextProps);
  };
  const updateComponentPreRender = (instance, nextVNode) => {
    instance.next = null;
    instance.vnode = nextVNode;
    updateProps(instance, nextVNode.props, nextVNode.props);
  };
  const updateComponent = (n1, n2) => {
    const instance = n2.component = n1.component;
    if (shouldComponentUpdate(n1, n2)) {
      instance.next = n2;
      instance.update();
    }
  };
  const patch = (n1, n2, container, anchor = null) => {
    if (n1 === n2) return;
    if (n1 && !isSameVnodeType(n1, n2)) {
      unmount(n1);
      n1 = null;
    }
    const { type, shapeFlag } = n2;
    switch (type) {
      case Text:
        processText(n1, n2, container);
        break;
      case Fragment:
        processFragment(n1, n2, container);
        break;
      default:
        if (shapeFlag & 1 /* ELEMENT */) {
          processElement(n1, n2, container, anchor);
        } else if (shapeFlag & 6 /* COMPONENT */) {
          processComponent(n1, n2, container, anchor);
        }
    }
  };
  const unmount = (vnode) => {
    if (vnode.type === Fragment) {
      unmountChildren(vnode.children);
    } else {
      hostRemove(vnode.el);
    }
  };
  const unmountChildren = (children) => {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      unmount(child);
    }
  };
  const render2 = (vnode, container) => {
    if (vnode === null) {
      if (container._vnode) {
        unmount(container._vnode);
      }
    } else {
      patch(container._vnode || null, vnode, container);
      container._vnode = vnode;
    }
  };
  return {
    render: render2
  };
}

// packages/runtime-core/src/h.ts
function h(type, propsOrChildren, children) {
  const length = arguments.length;
  if (length === 2) {
    if (isObject(propsOrChildren)) {
      if (isVnode(propsOrChildren)) {
        return createVnode(type, null, [propsOrChildren]);
      } else {
        return createVnode(type, propsOrChildren);
      }
    }
    return createVnode(type, null, propsOrChildren);
  } else {
    if (length === 3 && isVnode(children)) {
      children = [children];
    } else if (length > 3) {
      children = Array.from(arguments).slice(2);
    }
    return createVnode(type, propsOrChildren, children);
  }
}

// packages/runtime-dom/src/index.ts
var rendererOptions = Object.assign({}, nodeOps, { patchProp });
var render = (vnode, container) => {
  return createRenderer(rendererOptions).render(vnode, container);
};
export {
  Fragment,
  ReactiveEffect,
  Text,
  activeEffect,
  computed,
  createRenderer,
  createVnode,
  effect,
  h,
  isReactive,
  isRef,
  isSameVnodeType,
  isVnode,
  proxyRefs,
  reactive,
  ref,
  render,
  toReactive,
  toRef,
  toRefs,
  trackEffect,
  trackRefValue,
  triggerEffect,
  triggerRefValue,
  watch,
  watchEffect
};
//# sourceMappingURL=runtime-dom.js.map
