import { tracker, trigger } from "./reactivityEffect"
export enum ReactivityFlags {
  IS_REACTIVE = '__v_isReactive',
}

export const mutableHandlers: ProxyHandler<any> = {
  get(target, key, receiver) {
    if (key === ReactivityFlags.IS_REACTIVE) return true
    const res = Reflect.get(target, key, receiver)
    tracker(target, key)
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