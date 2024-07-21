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
function isVnode(value) {
  return !!value?.__v_isVnode;
}
function isSameVnodeType(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key;
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
  const processElement = (n1, n2, container, anchor = null) => {
    if (n1 === null) {
      mountElement(n2, container, anchor);
    } else {
      patchElement(n1, n2, container);
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
    processElement(n1, n2, container, anchor);
  };
  const unmount = (vnode) => hostRemove(vnode.el);
  const unmountChildren = (children) => {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      unmount(child);
    }
  };
  const render2 = (vnode, container) => {
    if (vnode === null) {
      if (container._vnode) {
        return unmount(container._vnode);
      }
    }
    patch(container._vnode || null, vnode, container);
    container._vnode = vnode;
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
  createRenderer,
  h,
  render
};
//# sourceMappingURL=runtime-dom.js.map
