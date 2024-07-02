import { toReactive } from "./reactivity"
import { activeEffect, trackEffect, triggerEffect } from "./effect"
import { createDep } from "./reactivityEffect"

export function ref(target) {
  return createRef(target)
}

function createRef(target) {
  return new RefImpl(target)
}

class RefImpl {
  __v_isRef = true
  _value = undefined
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