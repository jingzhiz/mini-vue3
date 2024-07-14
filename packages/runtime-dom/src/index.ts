export * from '@vue/reactivity'
import patchProp from './patch-prop'
import { nodeOps } from './node-ops'

export const rendererOptions = Object.assign({}, nodeOps, { patchProp })

function createRenderer(options) {

}

createRenderer(rendererOptions)