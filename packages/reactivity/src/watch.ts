import { isFunction, isObject } from "@vue/shared"
import { ReactiveEffect } from './effect'
import { isReactive } from "./reactivity"
import { isRef } from "vue"

export function watch(source, cb, options = {} as any) {
  return doWatch(source, cb, options)
}

export function watchEffect(source, options = {} as any) {
  return doWatch(source, null, options)
}

function traverse(source, depth, currentDepth = 0, seen = new Set()) {
  if (!isObject(source)) return source
  if (depth) {
    currentDepth++
    if (currentDepth >= depth) return source
  }
  if (seen.has(source)) return source

  for (let key in source) {
    traverse(source[key], depth, currentDepth, seen)
  }

  return source
}

function doWatch(source, cb, { deep, immediate }): () => void {
  const reactiveGetter = (source) =>
    traverse(source, deep === false ? 1 : undefined)

  let getter
  if (isReactive(source)) {
    getter = () => reactiveGetter(source)
  } else if (isRef(source)) {
    getter = () => source.value
  } else if (isFunction(source)) {
    getter = source
  }

  let clean
  let oldValue
  const onCleanup = (fn) => {
    clean = () => {
      fn()
      clean = undefined
    }
  }
  const job = () => {
    if (cb) {
      const newValue = effect.run()

      if (clean) clean()

      cb(newValue, oldValue, onCleanup)
      oldValue = newValue
    } else {
      effect.run()
    }
  }

  const effect = new ReactiveEffect(getter, job)

  if (cb) {
    if (immediate) {
      job()
    } else {
      oldValue = effect.run()
    }
  } else {
    effect.run()
  }

  const unwatch = () => {
    effect.stop()
  }

  return unwatch
}
