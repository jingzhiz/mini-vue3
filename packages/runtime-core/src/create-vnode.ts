import { isString, isArray, ShapeFlags } from "@vue/shared"

export function isVnode(value) {
  return !!value?.__v_isVnode
}

export function createVnode(type, props, children?) {
  const shapeFlag = isString(type) ? ShapeFlags.ELEMENT : 0

  const vnode = {
    __v_isVnode: true,
    type,
    props,
    children,
    key: props?.key,
    shapeFlag,
    el: null
  }


  if (children) {
    if (isArray(children)) {
      vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
    } else {
      children = String(children)
      vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
    }
  }

  return vnode
}