export function effect(fn, options?) {
  const _effect = new ReactiveEffect(fn, () => {
    _effect.run()
  })

  if (options) {
    Object.assign(_effect, options)
  }

  _effect.run()

  const runner = _effect.run.bind(_effect)

  runner.effect = _effect

  return runner
}

export let activeEffect;

function preCleanEffect(effect) {
  effect._trackId++ // 每次执行自增id，如果当前同一个 effect，id就是相同的
  effect._depsLen = 0
}

function postCleanEffect(effect) {
  // ['a', 'b', 'c'] => ['a']
  if (effect._deps.length !== effect._depsLen) {
    for (let i = effect._depsLen; i < effect._deps.length; i++) {
      cleanDepEffect(effect._deps[i], effect) // 删除映射表中 effect
    }
  }
  effect._deps.length = effect._depsLen // 更新依赖项长度
}

function cleanDepEffect(dep, effect) {
  dep.delete(effect)

  if (dep.size === 0) {
    dep.cleanup()
  }
}

class ReactiveEffect {
  _trackId = 0 // 用于记录当前 effect 执行次数（防止一个依赖在同一个 effect 中多次被收集）
  _deps = [] // 用于记录收集器
  _depsLen = 0

  // 创建的 effect 默认是响应式的
  public active = true

  constructor(public fn, public scheduler?) { }

  run() {
    if (!this.active) {
      return this.fn()
    }

    // 嵌套使用 effect 时，记录栈顶的 effect
    const lastEffect = activeEffect
    try {
      activeEffect = this

      // 每次执行前将上一次依赖清空
      preCleanEffect(this)

      return this.fn()
    } finally {
      postCleanEffect(this)
      activeEffect = lastEffect
    }
  }

  stop() {
    this.active = false
  }
}

export function trackEffect(effect, dep: Map<any, any>) {
  // 收集依赖时还需将用不到的移除和避免重复收集 effect
  if (dep.get(effect) !== effect._trackId) {
    dep.set(effect, effect._trackId)

    const oldDep = effect._deps[effect._depsLen]

    // effect 反向收集 收集器，相同的跳过，不相同则移除新值中没有的依赖
    if (oldDep !== dep) {
      if (oldDep) {
        cleanDepEffect(oldDep, effect)
      }

      effect._deps[effect._depsLen++] = dep
    } else {
      effect._depsLen++
    }
  }
}

export function triggerEffect(dep: Map<any, any>) {
  // 触发 effect 执行
  for (const effect of dep.keys()) {
    effect?.scheduler()
  }
}