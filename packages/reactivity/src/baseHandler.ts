import { isObject } from "@vue/shared"
import { reactive } from "./reactivity"
import { tracker, trigger } from "./reactivityEffect"

export enum ReactivityFlags {
  IS_REACTIVE = '__v_isReactive',
  IS_REF = '__v_isRef'
}

export const mutableHandlers: ProxyHandler<any> = {
  get(target, key, receiver) {
    if (key === ReactivityFlags.IS_REACTIVE) return true
    const res = Reflect.get(target, key, receiver)
    tracker(target, key)

    if (isObject(res)) { // 递归代理
      return reactive(res)
    }

    return res
  },
  set(target, key, value, receiver) {
    const oldValue = target[key]

    if (oldValue === value) return

    const res = Reflect.set(target, key, value, receiver)

    trigger(target, key, value, oldValue)

    return res
  }
}