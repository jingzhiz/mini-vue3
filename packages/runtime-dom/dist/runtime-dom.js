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

// packages/shared/src/is.ts
function is(value, type) {
  return Object.prototype.toString.call(value) === `[object ${type}]`;
}
function isObject(value) {
  return is(value, "Object");
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
    } else {
      children = String(children);
      vnode.shapeFlag |= 8 /* TEXT_CHILDREN */;
    }
  }
  return vnode;
}

// packages/reactivity/src/effect.ts
var activeEffect;
function preCleanEffect(effect) {
  effect._trackId++;
  effect._depsLen = 0;
}
function postCleanEffect(effect) {
  if (effect._deps.length !== effect._depsLen) {
    for (let i = effect._depsLen; i < effect._deps.length; i++) {
      cleanDepEffect(effect._deps[i], effect);
    }
  }
  effect._deps.length = effect._depsLen;
}
function cleanDepEffect(dep, effect) {
  dep.delete(effect);
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
function trackEffect(effect, dep) {
  if (dep.get(effect) !== effect._trackId) {
    dep.set(effect, effect._trackId);
    const oldDep = effect._deps[effect._depsLen];
    if (oldDep !== dep) {
      if (oldDep) {
        cleanDepEffect(oldDep, effect);
      }
      effect._deps[effect._depsLen++] = dep;
    } else {
      effect._depsLen++;
    }
  }
}
function triggerEffect(dep) {
  for (const effect of dep.keys()) {
    if (!effect.dirty) effect.dirty = true;
    if (!effect._running) {
      effect?.scheduler();
    }
  }
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
function isReactive(value) {
  return !!(value && value["__v_isReactive" /* IS_REACTIVE */]);
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
  const initProps = (instance, rawProps) => {
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
  };
  const mountComponent = (vnode, container, anchor = null) => {
    const {
      props: propsOptions = {},
      data = () => ({}),
      render: render3
    } = vnode.type;
    const state = reactive(data());
    const instance = {
      state,
      props: {},
      attrs: {},
      propsOptions,
      vnode,
      subTree: null,
      isMounted: false,
      update: null,
      component: null
    };
    vnode.component = instance;
    initProps(instance, vnode.props);
    const componentFn = () => {
      if (!instance.isMounted) {
        const subTree = instance.subTree = render3.call(state, state);
        patch(null, subTree, container, anchor);
        instance.isMounted = true;
      } else {
        const subTree = render3.call(state, state);
        patch(instance.subTree, subTree, container, anchor);
      }
    };
    const update = instance.update = () => effect.run();
    const effect = new ReactiveEffect(componentFn, () => {
      queueJob(update);
    });
    update();
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
  Text,
  createRenderer,
  createVnode,
  h,
  isSameVnodeType,
  isVnode,
  render
};
//# sourceMappingURL=runtime-dom.js.map
