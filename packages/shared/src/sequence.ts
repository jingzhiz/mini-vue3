export function getSequence(arr: number[]) {
  const result = [0]
  const p = result.slice(0) // 用来记录结果集中每项对应的前一个项的索引
  let start, end, middle
  const length = arr.length

  for (let i = 0; i < length; i++) {
    const arrI = arr[i]
    if (arrI !== 0) {
      // 只要结果比当前这一项大，就放入结果集
      if (arr[result.at(-1)] < arrI) {
        p[i] = result.at(-1) // 普通递增则取最后一项索引，然后在插入项
        result.push(i)
        continue
      }
    }

    // 进行二分查找
    start = 0
    end = result.length - 1
    while (start < end) {
      middle = ((start + end) / 2) | 0
      if (arr[result[middle]] < arrI) {
        start = middle + 1
      } else {
        end = middle
      }
    }

    if (arrI < arr[result[start]]) {
      p[i] = result[start - 1] // 找到前一个节点的索引
      result[start] = i
    }
  }

  // p 为前驱节点的列表，需要根据结果中最后的节点进行倒序追溯
  let l = result.length
  let last = result.at(-1)
  while (l-- > 0) {
    result[l] = last
    last = p[last]
  }

  return result
}