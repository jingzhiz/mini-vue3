import { isFunction } from '@vue/shared'
import { ReactiveEffect } from './effect'
import { trackRefValue, triggerRefValue } from './ref'

export function computed(getterOrOption) {
  let getter
  let setter

  if (isFunction(getterOrOption)) {
    getter = getterOrOption
    setter = () => { }
  } else {
    getter = getterOrOption.get
    setter = getterOrOption.set
  }

  return new ComputedRefImpl(getter, setter)
}

class ComputedRefImpl {
  public _deps
  public _value
  public _effect

  constructor(public getter, public setter) {

    this._effect = new ReactiveEffect(
      () => getter(this._value),
      () => {
        triggerRefValue(this)
      }
    )
  }

  get value() {
    if (this._effect.dirty) {
      // 值有变化，重新计算
      this._value = this._effect.run()
      // 收集 effect
      trackRefValue(this)
    }
    return this._value
  }

  set value(value) {
    this.setter(value)
  }
}