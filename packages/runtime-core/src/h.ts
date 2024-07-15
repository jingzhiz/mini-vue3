import { isObject } from "@vue/shared"
import { isVnode, createVnode } from "./create-vnode"

export function h(type, propsOrChildren?, children?) {
  const length = arguments.length

  if (length === 2) {
    if (isObject(propsOrChildren)) {
      if (isVnode(propsOrChildren)) {
        // 类型 + 子节点
        return createVnode(type, null, [propsOrChildren])
      } else {
        // 类型 + 属性
        return createVnode(type, propsOrChildren)
      }
    }

    // 类型 + 子节点
    return createVnode(type, null, propsOrChildren)
  } else {
    if (length === 3 && isVnode(children)) {
      children = [children]
    } else if (length > 3) {
      children = Array.from(arguments).slice(2)
    }

    return createVnode(type, propsOrChildren, children)
  }
}
