/**
 * JobIndexMethods.js
 * AVL tree lookup by job ID
 */

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const fmt = (ms) => {
  if (typeof ms !== 'number' || !isFinite(ms)) return '0ms';
  return ms < 1 ? `${(ms * 1000).toFixed(0)}μs` : `${ms.toFixed(2)}ms`;
};

function jobKey(id) {
  if (typeof id === 'number') return id;
  const k = parseInt(String(id || '').trim().toUpperCase().replace(/^JOB-?/, ''), 10);
  return Number.isNaN(k) ? null : k;
}

export const JobIndexMethods = {
  // =======================================================================
  // 2. TRA CỨU THEO MÃ VIỆC — AVL TREE O(log n)
  // =======================================================================
  lookupById(input) {
    const key = jobKey(input);
    const label = key === null ? String(input) : `JOB-${String(key).padStart(6, '0')}`;
    const path = [];
    if (key !== null) {
      let node = this.avl.root;
      while (node) {
        const hl = node.left ? node.left.height : 0;
        const hr = node.right ? node.right.height : 0;
        const entry = {
          key: node.key,
          h: node.height,
          bf: hl - hr,
          leftKey: node.left ? node.left.key : null,
          rightKey: node.right ? node.right.key : null
        };
        if (key === node.key) { entry.dir = 'HIT'; path.push(entry); break; }
        entry.dir = key < node.key ? 'L' : 'R';
        path.push(entry);
        node = key < node.key ? node.left : node.right;
      }
    }
    const t0 = now();
    const res = key !== null ? this.avl.search(key) : { found: false, steps: 0, node: null };
    const durMs = now() - t0;
    const job = res.found ? res.node.jobRef : null;
    return {
      job,
      trace: {
        target: label,
        key,
        path,
        found: !!res.found,
        steps: res.steps,
        treeHeight: this.avl.height,
        size: this.avl.size,
        title: job ? job.title : null,
        latency: fmt(durMs)
      }
    };
  }
};
