import patchProp from './patch-prop'
import { nodeOps } from './node-ops'
import { createRenderer } from '@vue/runtime-core'

const rendererOptions = Object.assign({}, nodeOps, { patchProp })

export const render = (vnode, container) => {
  return createRenderer(rendererOptions).render(vnode, container)
}

export * from '@vue/runtime-core'