/** 响应式标识符枚举 */
export enum ReactivityFlags {
  RAW = '__v_raw',
  IS_REF = '__v_isRef',
  IS_SHALLOW = '__v_isShallow',
  IS_READONLY = '__v_isReadonly',
  IS_REACTIVE = '__v_isReactive',
}

/** 计算属性值是否已脏枚举 */
export enum DirtyLevels {
  Dirty = 4,
  NoDirty = 0
}