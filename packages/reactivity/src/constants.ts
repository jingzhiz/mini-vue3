/** 响应式标识符枚举 */
export enum ReactivityFlags {
  IS_REACTIVE = '__v_isReactive'
}

/** 计算属性值是否已脏枚举 */
export enum DirtyLevels {
  Dirty = 4,
  NoDirty = 0
}