import { ShapeFlags, getSequence } from "@vue/shared"
import { Text, isSameVnodeType } from './create-vnode'

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

  const mountElement = (vnode, container, anchor = null) => {
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

    hostInsert(el, container, anchor)
  }

  const processText = (n1, n2, container) => {
    if (n1 === null) {
      n2.el = hostCreateText(n2.children)
      hostInsert(n2.el, container)
    } else {
      const el = (n2.el = n1.el)
      if (n1.children !== n2.children) {
        hostSetText(el, n2.children)
      }
    }
  }

  const processElement = (n1, n2, container, anchor = null) => {
    if (n1 === null) {
      mountElement(n2, container, anchor)
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
    let index = 0
    let e1 = c1.length - 1
    let e2 = c2.length - 1

    // 头部正序
    while (index <= e1 && index <= e2) {
      const prevChild = c1[index]
      const nextChild = c2[index]

      if (isSameVnodeType(prevChild, nextChild)) {
        patch(prevChild, nextChild, container)
      } else {
        break
      }
      index++
    }

    // 尾部倒序
    while (index <= e1 && index <= e2) {
      const prevChild = c1[e1]
      const nextChild = c2[e2]

      if (isSameVnodeType(prevChild, nextChild)) {
        patch(prevChild, nextChild, container)
      } else {
        break
      }
      e1--
      e2--
    }

    if (index > e1) {
      // 新节点数量大于旧节点
      if (index <= e2) {
        let nextPos = e2 + 1
        const anchor = c2[nextPos]?.el

        while (index <= e2) {
          patch(null, c2[index], container, anchor)
          index++
        }
      }
    } else if (index > e2) {
      // 旧节点数量大于新节点
      if (index <= e1) {
        while (index <= e1) {
          unmount(c1[index])
          index++
        }
      }
    } else {
      let s1 = index
      let s2 = index
      // 创建一个映射表用于快速查找，判断旧节点是否在新节点里，有则更新，无则删除
      const keyToNewIndexMap = new Map()
      // 要倒序插入的个数
      let toBePatched = e2 - s2 + 1
      // 新旧节点索引映射，0 代表没有被 patch
      const newIndexToOldMapIndex = new Array(toBePatched).fill(0)

      // 遍历新节点存入key与index的映射
      for (let i = s2; i <= e2; i++) {
        const nextChild = c2[i]
        keyToNewIndexMap.set(nextChild.key, i)
      }

      // 遍历旧节点，新节点中不存在则删除，存在则更新
      for (let i = s1; i <= e1; i++) {
        const prevChild = c1[i]
        if (keyToNewIndexMap.has(prevChild.key)) {
          const nextIndex = keyToNewIndexMap.get(prevChild.key)
          patch(prevChild, c2[nextIndex], container)
          newIndexToOldMapIndex[nextIndex - s2] = i + 1 // 避免 0 出现的歧义，进行 +1 处理
        } else {
          unmount(prevChild)
        }
      }

      // 获取连续的元素索引数组
      const sequence = getSequence(newIndexToOldMapIndex)
      let lastIndex = sequence.length - 1

      // 比对每一个元素，做倒序插入操作
      for (let i = toBePatched - 1; i >= 0; i--) {
        const nextIndex = i + s2
        const anchor = c2[nextIndex + 1]?.el
        const vnode = c2[nextIndex]

        // 插入的过程中，新的节点可能更多，新加入的节点则创建
        if (!vnode.el) {
          patch(null, vnode, container, anchor)
        } else {
          if (i === sequence[lastIndex]) {
            // diff 优化，如果新旧节点索引相同，则无需移动
            lastIndex--
          } else {
            // 将元素插入
            hostInsert(vnode.el, container, anchor)
          }
        }
      }
    }
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

  const patch = (n1, n2, container, anchor = null) => {
    if (n1 === n2) return

    if (n1 && !isSameVnodeType(n1, n2)) {
      unmount(n1)
      n1 = null
    }

    const { type } = n2

    switch (type) {
      case Text:
        processText(n1, n2, container)
        break
      default:
        processElement(n1, n2, container, anchor)
    }
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
        unmount(container._vnode)
      }
    } else {
      patch(container._vnode || null, vnode, container)

      container._vnode = vnode
    }
  }

  return {
    render
  }
}