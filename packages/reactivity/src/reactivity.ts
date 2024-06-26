import { isObject } from "@vue/shared"
import { ReactivityFlags, mutableHandlers } from './baseHandler'

const reactiveMap = new WeakMap() // 缓存

function createReactiveObject(target: unknown) {
  if (!isObject(target)) return target

  // 如果已经是代理对象则直接返回
  if (target[ReactivityFlags.IS_REACTIVE]) return target

  // 如果已经被代理过则返回缓存
  if (reactiveMap.has(target)) return reactiveMap.get(target)

  const proxy = new Proxy(target, mutableHandlers)
  reactiveMap.set(target, proxy)
  return proxy
}

export function reactive(target: unknown) {
  return createReactiveObject(target)
}