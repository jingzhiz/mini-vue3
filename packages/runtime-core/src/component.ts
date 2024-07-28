import { reactive } from "@vue/reactivity"
import { hasOwn, isFunction } from "@vue/shared"

export function createComponentInstance(vnode) {
  const instance = {
    vnode,
    props: {},
    attrs: {},
    propsOptions: vnode.type.props,
    data: null,
    subTree: null,
    isMounted: false,
    update: null,
    component: null,
    proxy: null, // 代理 props/attrs/data
  }

  return instance
}

const publicProperty = {
  $attrs: (instance) => instance.attrs
}

const handler = {
  get(target, key) {
    const { data, props } = target

    if (data && hasOwn(data, key)) {
      return data[key]
    } else if (props && hasOwn(props, key)) {
      return props[key]
    }

    const getter = publicProperty[key]
    if (getter) {
      return getter(target)
    }
  },
  set(target, key, value) {
    const { data, props } = target

    if (data && hasOwn(data, key)) {
      data[key] = value
    } else if (props && hasOwn(props, key)) {
      console.warn('Props is readonly')
      return false
    }

    return true
  }
}
function initProxy(instance) {
  instance.proxy = new Proxy(instance, handler)
}

function initProps(instance, rawProps) {
  const props = {}
  const attrs = {}
  const propsOptions = instance.propsOptions || {}

  Object.keys(rawProps).forEach((key) => {
    const value = rawProps[key]

    // 根据定义的 props 区分 props 和 attrs
    if (key in propsOptions) {
      props[key] = value
    } else {
      attrs[key] = value
    }
  })

  instance.props = reactive(props)
  instance.attrs = attrs
}

function initData(instance, data = () => { }) {
  if (isFunction(data)) {
    // data 中可以拿到 props
    instance.data = reactive(data.call(instance.proxy))
  } else {
    console.warn('data must be a function')
  }
}

export function setupComponent(instance) {
  const { vnode } = instance

  initProxy(instance)

  initProps(instance, vnode.props)

  initData(instance, vnode.type.data)

  instance.render = vnode.type.render
}