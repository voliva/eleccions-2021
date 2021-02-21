const iParent = (i: number) => Math.floor((i - 1) / 2)
const iLeftChild = (i: number) => 2 * i + 1

function siftDow(a: Array<{ party: string; votes: number }>, start: number) {
  let root = start
  let child = iLeftChild(root)

  while (child < a.length) {
    let swap = root

    if (a[swap].votes < a[child].votes) {
      swap = child
    }
    if (child + 1 < a.length && a[swap].votes < a[child + 1].votes) {
      swap = child + 1
    }
    if (swap === root) return

    const rootVal = a[root]
    a[root] = a[swap]
    a[swap] = rootVal

    root = swap
    child = iLeftChild(root)
  }
}

function heapify(a: Array<{ party: string; votes: number }>) {
  for (let start = iParent(a.length - 1); start > -1; start--) siftDow(a, start)
}

export function dhondt(
  votes: Record<string, number>,
  nSits: number,
  threshold: number,
) {
  const inner = Object.entries(votes).map(([party, votes]) => ({
    party,
    votes: votes >= threshold ? votes : 0,
    split: 1,
    totalVotes: votes,
  }))

  heapify(inner)
  const result = new Array<[string, number]>(nSits)
  for (let i = 0; i < nSits; i++) {
    const top = inner[0]
    result[i] = [top.party, top.votes]
    top.votes = top.totalVotes / ++top.split
    siftDow(inner, 0)
  }
  return result
}
