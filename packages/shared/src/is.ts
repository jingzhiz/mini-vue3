export function is(value: any, type: string) {
  return Object.prototype.toString.call(value) === `[object ${type}]`
}

export function isObject(value: any): value is object {
  return is(value, 'Object')
}

export function isFunction(value: any): value is Function {
  return is(value, 'Function')
}

export function isArray(value: any): value is Array<any> {
  return Array.isArray(value)
}

export function isString(value: any): value is string {
  return is(value, 'String')
}