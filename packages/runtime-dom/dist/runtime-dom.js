// packages/runtime-dom/src/modules/patch-class.ts
function patchClass(el, value) {
  if (value === null) {
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
  if (value === null) {
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
  const mountElement = (vnode, container) => {
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
    hostInsert(el, container);
  };
  const patch = (n1, n2, container = null, anchor = null) => {
    if (n1 === n2) {
      return;
    }
    if (n1 === null) {
      mountElement(n2, container);
    }
  };
  const render2 = (vnode, container) => {
    patch(container._vnode || null, vnode, container);
    container._vnode = vnode;
  };
  return {
    render: render2
  };
}

// packages/runtime-core/src/create-vnode.ts
function isVnode(value) {
  return !!value?.__v_isVnode;
}
function createVnode(type, props, children) {
  const shapeFlag = isString(type) ? 1 /* ELEMENT */ : 0;
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
  createRenderer,
  h,
  render
};
//# sourceMappingURL=runtime-dom.js.map
