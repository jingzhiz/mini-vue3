import { isObject } from "@vue/shared"
import { mutableHandlers } from './base-handler'
import { ReactivityFlags } from './constants'

const reactiveMap = new WeakMap() // 缓存

function createReactiveObject(target) {
  if (!isObject(target)) return target

  // 如果已经是代理对象则直接返回
  if (isReactive(target)) return target

  // 如果已经被代理过则返回缓存
  if (reactiveMap.has(target)) return reactiveMap.get(target)

  const proxy = new Proxy(target, mutableHandlers)
  reactiveMap.set(target, proxy)
  return proxy
}

export function reactive(target) {
  return createReactiveObject(target)
}

export function toReactive(value) {
  return isObject(value) ? reactive(value) : value
}

export function isReactive(value) {
  return !!(value && value[ReactivityFlags.IS_REACTIVE])
}