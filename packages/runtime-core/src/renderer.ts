import { ShapeFlags } from "@vue/shared"

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

  const patch = (n1, n2, container = null, anchor = null) => {
    if (n1 === n2) {
      return
    }

    if (n1 === null) {
      mountElement(n2, container)
    }
  }

  const render = (vnode, container) => {
    patch(container._vnode || null, vnode, container)

    container._vnode = vnode
  }

  return {
    render
  }
}