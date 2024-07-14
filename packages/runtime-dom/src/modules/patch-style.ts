export function patchStyle(el, prevValue, nextValue) {
  const style = el.style

  // 新值样式全部生效
  for (const key in nextValue) {
    style[key] = nextValue[key]
  }

  // 旧值中有新值中没有的要删除
  if (prevValue) {
    for (const key in prevValue) {
      if (nextValue[key] == null) {
        style[key] = ''
      }
    }
  }
}