import { activeEffect, trackEffect, triggerEffect } from "./effect";

const effectBuckets = new WeakMap()

export function createDep(key, cleanup?: () => void) {
  const dep = new Map() as any;

  dep.name = key
  dep.cleanup = cleanup

  return dep
}

export function tracker(target, key) {
  // 如果有activeEffect则表示在 effect 函数中访问的
  if (activeEffect) {
    let depsMap = effectBuckets.get(target)

    if (!depsMap) {
      effectBuckets.set(target, (depsMap = new Map))
    }

    let dep = depsMap.get(key)

    if (!dep) {
      depsMap.set(
        key,
        dep = createDep(key, () => depsMap.delete(key))
      )
    }

    trackEffect(activeEffect, dep) // 将当前 effect 放入 dep 中
  }

}

export function trigger(target, key, newValue, oldValue) {
  const depsMap = effectBuckets.get(target)

  if (!depsMap) return

  const deps = depsMap.get(key)

  if (deps) {
    triggerEffect(deps)
  }
}