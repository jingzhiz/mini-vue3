const queue = [] // 当前执行的队列
const pResolve = Promise.resolve()

let isFlushing = false // 当前是否在刷新队列

export function queueJob(job) {
  if (!queue.includes(job)) {
    queue.push(job)
  }

  if (!isFlushing) {
    isFlushing = true

    pResolve.then(() => {
      isFlushing = false

      const copy = queue.slice(0)
      queue.length = 0
      copy.forEach(job => job())
    })
  }
}