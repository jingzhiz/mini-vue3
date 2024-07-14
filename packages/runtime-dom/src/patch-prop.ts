import {
  patchClass,
  patchStyle,
  patchEvent,
  patchAttr
} from "./modules"

/** 节点的属性操作 */
export default function patchProp(el, key, prevValue, nextValue) {
  if (key === 'class') {
    return patchClass(el, nextValue)
  } else if (key === 'style') {
    return patchStyle(el, prevValue, nextValue)
  } else if (/^on[^a-z]/.test(key)) {
    return patchEvent(el, key, nextValue)
  } else { // 普通属性
    return patchAttr(el, key, nextValue)
  }
}