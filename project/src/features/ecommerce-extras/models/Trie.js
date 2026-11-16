/**
 * Trie (Cây tiền tố) — Gợi ý tự động khi gõ (Autocomplete)
 *
 * Ý tưởng giống ô tìm kiếm của Shopee / Amazon: mỗi ký tự là một cạnh, các từ có chung tiền tố
 * dùng chung một nhánh. Gõ "re" chỉ cần đi 2 bước từ gốc rồi gom các từ nằm dưới nút đó,
 * không phải quét lại toàn bộ 10.000 bài đăng.
 *
 * Độ phức tạp:
 *  - insert(word): O(L), L = độ dài từ.
 *  - suggest(prefix): O(P + S), P = độ dài tiền tố, S = số nút trong nhánh con được gom.
 * Bộ nhớ: mỗi nút chỉ lưu Map ký tự → nút con và một bộ đếm số việc. Trie KHÔNG giữ bản sao
 * JobPost nào (Single Source of Truth): chỉ đếm số việc chứa từ đó.
 */
class TrieNode {
  constructor(ch = '') {
    this.ch = ch;
    this.children = new Map();
    this.isEnd = false;
    this.count = 0;     // số bài đăng có chứa từ kết thúc tại nút này
    this.word = null;
  }
}

// Tách từ: chữ cái (kể cả tiếng Việt), chữ số và các ký tự hay gặp trong tên công nghệ (-, +, #, .)
const TOKEN_RE = /[\p{L}\p{N}][\p{L}\p{N}+#.-]*/gu;

export class Trie {
  constructor() {
    this.root = new TrieNode();
    this.wordCount = 0;   // số từ phân biệt
    this.nodeCount = 1;
    this.insertSteps = 0; // tổng số bước đi khi chèn (để chứng minh O(L))
  }

  static tokenize(text) {
    const out = new Set();
    const s = String(text || '').toLowerCase();
    const m = s.match(TOKEN_RE);
    if (m) {
      for (const raw of m) {
        const t = raw.replace(/[.-]+$/, '');
        // Bỏ token chỉ gồm số (vd "#1234" trong tiêu đề) — không ai gõ để tìm, lại làm phình Trie
        if (t.length >= 2 && !/^[\d.#+-]+$/.test(t)) out.add(t);
      }
    }
    return out;
  }

  /** Chèn một từ, tăng bộ đếm thêm `inc`. O(L). */
  insert(word, inc = 1) {
    const w = String(word || '').toLowerCase().trim();
    if (!w) return null;
    let node = this.root;
    for (const ch of w) {
      this.insertSteps++;
      let next = node.children.get(ch);
      if (!next) {
        next = new TrieNode(ch);
        node.children.set(ch, next);
        this.nodeCount++;
      }
      node = next;
    }
    if (!node.isEnd) {
      node.isEnd = true;
      node.word = w;
      this.wordCount++;
    }
    node.count += inc;
    return node;
  }

  /** Nạp một bài đăng: mỗi từ phân biệt trong (kỹ năng + tiêu đề) được đếm 1 lần cho bài đó. */
  indexJob(job) {
    const words = Trie.tokenize(`${job.skillTag || ''} ${job.title || ''}`);
    for (const w of words) this.insert(w, 1);
    return words.size;
  }

  /**
   * Gợi ý các từ bắt đầu bằng `prefix`, xếp theo số việc giảm dần.
   * @returns {{ prefix, found, path, suggestions:{word,count}[], visited, totalUnder }}
   */
  suggest(prefix, limit = 8) {
    const p = String(prefix || '').toLowerCase().trim();
    const path = [];
    let node = this.root;
    if (!p) return { prefix: p, found: false, path, suggestions: [], visited: 0, totalUnder: 0 };

    let depth = 0;
    for (const ch of p) {
      const siblings = [...node.children.keys()].slice(0, 8);
      const next = node.children.get(ch);
      path.push({ ch, depth, found: !!next, siblings, branching: node.children.size });
      if (!next) {
        return { prefix: p, found: false, path, suggestions: [], visited: depth, totalUnder: 0, failedAt: depth };
      }
      node = next;
      depth++;
    }

    // Gom toàn bộ từ trong nhánh con (DFS bằng ngăn xếp tường minh)
    const words = [];
    let visited = 0;
    const stack = [node];
    while (stack.length) {
      const cur = stack.pop();
      visited++;
      if (cur.isEnd) words.push({ word: cur.word, count: cur.count });
      for (const child of cur.children.values()) stack.push(child);
    }
    words.sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
    return {
      prefix: p,
      found: true,
      path,
      suggestions: words.slice(0, limit),
      visited,
      totalUnder: words.length
    };
  }

  /** Cách làm ngây thơ để so sánh: duyệt TẤT CẢ các từ trong từ điển và kiểm tra startsWith. */
  static naiveSuggest(vocabulary, prefix, limit = 8) {
    const p = String(prefix || '').toLowerCase();
    const out = [];
    let comparisons = 0;
    for (const [word, count] of vocabulary) {
      comparisons++;
      if (word.startsWith(p)) out.push({ word, count });
    }
    out.sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
    return { suggestions: out.slice(0, limit), comparisons };
  }

  /** Liệt kê toàn bộ từ [word, count] — dùng cho benchmark. */
  entries() {
    const out = [];
    const stack = [this.root];
    while (stack.length) {
      const cur = stack.pop();
      if (cur.isEnd) out.push([cur.word, cur.count]);
      for (const c of cur.children.values()) stack.push(c);
    }
    return out;
  }
}
