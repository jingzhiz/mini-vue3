import { isObject } from "@vue/shared"
import { ReactiveEffect } from './effect'

export function watch(source, cb, options = {} as any) {

  return doWatch(source, cb, options)
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

function doWatch(source, cb, { deep }) {
  const reactiveGetter = (source) =>
    traverse(source, deep === false ? 1 : undefined)

  const getter = () => reactiveGetter(source)

  let oldValue
  const job = () => {
    const newValue = effect.run()
    cb(newValue, oldValue)
    oldValue = newValue
  }

  const effect = new ReactiveEffect(getter, job)

  oldValue = effect.run()
}
