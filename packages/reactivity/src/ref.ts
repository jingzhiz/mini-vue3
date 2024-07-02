import { toReactive } from "./reactivity"
import { activeEffect, trackEffect, triggerEffect } from "./effect"
import { createDep } from "./reactivityEffect"

export function ref(target) {
  return createRef(target)
}

export function toRef(target, key) {
  return new ObjectRefImpl(target, key)
}

export function toRefs(target) {
  return Object.keys(target).reduce((result, key) => {
    result[key] = toRef(target, key)
    return result
  }, {})
}

export function isRef(target) {
  return !!target?.__v_isRef
}

export function proxyRefs(objectWithRef) {
  return new Proxy(objectWithRef, {
    get(target, key, receiver) {
      const r = Reflect.get(target, key, receiver)
      return isRef(r) ? r.value : r // 自动脱 ref
    },
    set(target, key, value, receiver) {
      const oldValue = target[key]
      if (isRef(oldValue)) {
        oldValue.value = value
        return true
      } else {
        return Reflect.set(target, key, value, receiver)
      }
    }
  })
}

function createRef(target) {
  return new RefImpl(target)
}

class RefImpl {
  __v_isRef = true
  _value
  _deps

  constructor(public rawValue) {
    this._value = toReactive(rawValue)
  }

  get value() {
    trackRefValue(this)
    return this._value
  }

  set value(newVal) {
    if (newVal !== this.rawValue) {
      this._value = newVal
      this.rawValue = newVal
      triggerRefValue(this)
    }
  }
}

class ObjectRefImpl {
  __v_isRef = true
  _value
  _deps

  constructor(public _target, public _key) { }

  get value() {
    trackRefValue(this)
    return this._target[this._key]
  }

  set value(newVal) {
    if (newVal !== this._target[this._key]) {
      this._target[this._key] = newVal
      triggerRefValue(this)
    }
  }
}

function trackRefValue(ref) {
  if (activeEffect) {
    trackEffect(
      activeEffect,
      ref._deps = createDep('value', () => ref.dep = undefined)
    )
  }
}

function triggerRefValue(ref) {
  let dep = ref._deps

  if (dep) {
    triggerEffect(dep)
  }
}