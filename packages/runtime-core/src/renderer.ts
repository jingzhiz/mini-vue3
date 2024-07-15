import { ShapeFlags } from "@vue/shared"
import { isSameVnodeType } from './create-vnode'
import patchProp from "packages/runtime-dom/src/patch-prop"

export function createRenderer(renderOptions) {
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
  } = renderOptions

  const mountChildren = (children, container) => {
    children.forEach(child => {
      patch(null, child, container)
    })
  }

  const mountElement = (vnode, container) => {
    const { type, props, children, shapeFlag } = vnode

    const el = vnode.el = hostCreateElement(type)

    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key])
      }
    }

    /**
     * shapeFlag 是用于对元素组合的判断
     * 当前元素的 shapeFlag 是它本身类型对所有子元素的 shapeFlag 进行或运算计算出来的
     * 例如：1 | 8 = 9
     * 而通过与运算，可以判断出当前元素是否是文本节点
     * 例如：9 & 8 > 0，与运算的结果大于 0，则包含这个值
     */
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children)
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el)
    }

    hostInsert(el, container)
  }

  const processElement = (n1, n2, container) => {
    if (n1 === null) {
      mountElement(n2, container)
    } else {
      patchElement(n1, n2, container)
    }
  }

  const patchProps = (el, oldProps, newProps) => {
    for (const key in newProps) {
      const prev = oldProps[key]
      const next = newProps[key]
      hostPatchProp(el, key, prev, next)
    }

    for (const key in oldProps) {
      const next = newProps[key]
      hostPatchProp(el, key, null, next)
    }
  }

  // diff
  const patchKeyedChildren = (c1, c2, container) => {
  }

  const patchChildren = (n1, n2, container) => {
    const c1 = n1.children
    const c2 = n2.children

    const prevShapeFlag = n1.shapeFlag
    const shapeFlag = n2.shapeFlag

    /**
     * 1. 新的是文本，旧的是数组，则直接新的替换旧的
     * 2. 新的是文本，旧的也是文本，内容不相同直接替换
     * 3. 新的是数组，旧的也是数组，进行 diff 比对
     * 4. 新的不是数组，旧的是数组，移除旧的
     * 5. 新的是空，旧的是文本，移除文本
     * 6. 新的是数组，旧的是文本，移除文本挂载新的
     */

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 新的是文本，旧的是数组，则直接新的替换旧的
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(c1)
      }

      // 新的是文本，旧的也是文本，内容不相同直接替换
      if (c1 !== c2) {
        hostSetElementText(container, c2)
      }
    } else {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 新的是数组，旧的也是数组，进行 diff 比对
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          patchKeyedChildren(c1, c2, container)
        } else {
          // 新的不是数组，旧的是数组，移除旧的
          unmountChildren(c1)
        }
      } else {
        // 新的是空，旧的是文本，移除文本
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          hostSetElementText(container, '')
        }

        // 新的是数组，旧的是文本，移除文本挂载新的
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(c2, container)
        }
      }
    }
  }

  const patchElement = (n1, n2, container) => {
    const el = n2.el = n1.el

    const oldProps = n1.props || {}
    const newProps = n2.props || {}

    patchProps(el, oldProps, newProps)

    patchChildren(n1, n2, el)
  }

  const patch = (n1, n2, container = null) => {
    if (n1 === n2) return

    if (n1 && !isSameVnodeType(n1, n2)) {
      unmount(n1)
      n1 = null
    }

    processElement(n1, n2, container)
  }

  const unmount = (vnode) => hostRemove(vnode.el)

  const unmountChildren = (children) => {
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      unmount(child)
    }
  }

  const render = (vnode, container) => {
    if (vnode === null) {
      if (container._vnode) {
        return unmount(container._vnode)
      }
    }

    patch(container._vnode || null, vnode, container)

    container._vnode = vnode
  }

  return {
    render
  }
}