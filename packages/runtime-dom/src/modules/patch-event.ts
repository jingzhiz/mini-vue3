function createInvoker(value) {
  const invoker = (e) => invoker.value(e)
  invoker.value = value

  return invoker
}

export function patchEvent(el, key, nextValue) {
  // vue_event_invoker
  const invokers = el._evi || (el._evi = {})

  const eventName = key.slice(2).toLowerCase()

  const existingInvoker = invokers[key]

  if (existingInvoker && nextValue) { // 更新
    return existingInvoker.value = nextValue
  }

  if (nextValue) { // 新增
    const invoker = invokers[key] = createInvoker(nextValue)

    return el.addEventListener(eventName, invoker)
  }

  if (existingInvoker) { // 删除
    el.removeEventListener(eventName, existingInvoker)
    invokers[key] = undefined
  }
}