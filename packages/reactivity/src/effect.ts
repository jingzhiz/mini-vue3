export function effect(fn, options?) {
  const _effect = new ReactiveEffect(fn, () => {
    _effect.run()
  })

  _effect.run()
}
export let activeEffect;
class ReactiveEffect {
  _trackId = 0 // 用于记录当前 effect 执行了多少次
  _deps = [] // 用于记录收集器
  _depsLen = 0

  // 创建的 effect 默认是响应式的
  public active = true

  constructor(public fn, public scheduler?) {

  }

  run() {
    if (!this.active) {
      return this.fn()
    }

    // 嵌套使用 effect 时，记录栈顶的 effect
    const lastEffect = activeEffect
    try {
      activeEffect = this
      return this.fn()
    } finally {
      activeEffect = lastEffect
    }
  }

  stop() {
    this.active = false
  }
}

export function trackEffect(effect, dep: Map<any, any>) {
  // 收集器收集 effect
  dep.set(effect, effect._trackId)

  // effect 反向收集 收集器
  effect._deps[effect._depsLen++] = dep
}

export function triggerEffect(dep: Map<any, any>) {
  // 触发 effect 执行
  for (const effect of dep.keys()) {
    effect?.scheduler()
  }
}