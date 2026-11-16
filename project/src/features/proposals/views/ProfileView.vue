<template>
  <div class="w-full flex flex-col space-y-6 pb-20 font-sans">

    <!-- ===================================================================== -->
    <!-- 1. THẺ GIỚI THIỆU                                                      -->
    <!-- ===================================================================== -->
    <div class="p-6 @2xl:p-8 rounded-3xl bg-white/95 border border-platinum-200/90 shadow-xs">
      <div v-if="loading" class="py-10 text-center text-xs text-slate-400">Đang tải hồ sơ…</div>
      <div v-else-if="notFound" class="py-10 text-center text-sm text-slate-500">Freelancer này chưa có hồ sơ năng lực.</div>

      <div v-else class="flex flex-col @3xl:flex-row gap-6 @3xl:items-start justify-between">
        <div class="flex items-start gap-4 min-w-0">
          <div class="shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-ice-100 to-champagne-100 border border-platinum-200 flex items-center justify-center text-3xl">
            {{ avatar }}
          </div>
          <div class="min-w-0 space-y-1">
            <h1 class="text-xl @2xl:text-3xl font-black text-slate-900 tracking-tight">{{ form.name }}</h1>
            <div class="text-sm font-semibold text-ice-700">{{ form.title || 'Chưa có chức danh' }}</div>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>★ {{ Number(form.rating || 0).toFixed(2) }}</span>
              <span v-if="form.location">📍 {{ form.location }}</span>
              <span v-if="form.hourlyRate > 0">💵 ${{ form.hourlyRate }}/giờ</span>
              <span v-if="updatedAt">Cập nhật {{ updatedAt }}</span>
            </div>
          </div>
        </div>

        <!-- Thanh thao tác (chỉ chủ hồ sơ) -->
        <div v-if="editable" class="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            @click="undo"
            :disabled="undoCount === 0"
            :class="[
              'px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border',
              undoCount > 0 ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 active:scale-95' : 'bg-platinum-100 text-slate-400 border-platinum-200 cursor-not-allowed'
            ]"
            :title="undoCount > 0 ? `Quay lại: ${undoTopLabel} (Ctrl+Z) — Ngăn xếp LIFO, pop O(1)` : 'Chưa có thay đổi nào để hoàn tác'"
          >
            ↩ Hoàn tác
            <span v-if="undoCount > 0" class="px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-950 text-[10px]">{{ undoCount }}</span>
          </button>
          <button
            @click="save"
            :disabled="saving || !dirty"
            :class="[
              'px-5 py-2.5 rounded-2xl text-xs font-bold transition-all',
              dirty && !saving ? 'bg-gradient-to-r from-champagne-400 to-champagne-300 text-slate-900 hover:brightness-105 active:scale-95 shadow-xs' : 'bg-platinum-100 text-slate-400 cursor-not-allowed'
            ]"
          >
            {{ saving ? 'Đang lưu…' : dirty ? 'Lưu hồ sơ' : 'Đã lưu' }}
          </button>
        </div>
      </div>
      <p v-if="editable && !loading && !notFound" class="text-[11px] text-slate-400 mt-4">
        Nhà tuyển dụng sẽ xem hồ sơ này khi bạn ứng tuyển. Thay đổi chỉ được công khai sau khi bấm <strong>Lưu hồ sơ</strong>.
      </p>
    </div>

    <template v-if="!loading && !notFound">
      <div class="grid grid-cols-1 @5xl:grid-cols-12 gap-6 items-start">

        <!-- ===================================================================== -->
        <!-- 2. THÔNG TIN CHUNG                                                     -->
        <!-- ===================================================================== -->
        <div class="@5xl:col-span-7 p-6 rounded-3xl bg-white/95 border border-platinum-200/90 shadow-xs space-y-5 min-w-0">
          <h2 class="text-base font-black text-slate-900">Giới thiệu</h2>

          <template v-if="editable">
            <label class="block space-y-1.5">
              <span class="text-xs font-bold text-slate-600">Chức danh *</span>
              <input
                v-model="form.title"
                maxlength="150"
                @focus="remember('title')"
                @change="commit('title', 'Sửa chức danh')"
                class="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-platinum-200 focus:border-champagne-400 focus:outline-none text-sm"
                placeholder="VD: Nhà thiết kế UI/UX, Kế toán thuế…"
              />
            </label>
            <label class="block space-y-1.5">
              <span class="text-xs font-bold text-slate-600">Giới thiệu bản thân</span>
              <textarea
                v-model="form.bio"
                maxlength="2000"
                rows="5"
                @focus="remember('bio')"
                @change="commit('bio', 'Sửa phần giới thiệu')"
                class="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-platinum-200 focus:border-champagne-400 focus:outline-none text-sm leading-relaxed"
                placeholder="Kinh nghiệm, thế mạnh, cách bạn làm việc…"
              ></textarea>
              <span class="text-[10px] text-slate-400">{{ form.bio.length }}/2000</span>
            </label>
            <div class="grid grid-cols-1 @2xl:grid-cols-2 gap-4">
              <label class="block space-y-1.5">
                <span class="text-xs font-bold text-slate-600">Địa điểm</span>
                <input
                  v-model="form.location"
                  maxlength="100"
                  @focus="remember('location')"
                  @change="commit('location', 'Sửa địa điểm')"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-platinum-200 focus:border-champagne-400 focus:outline-none text-sm"
                  placeholder="VD: TP. Hồ Chí Minh"
                />
              </label>
              <label class="block space-y-1.5">
                <span class="text-xs font-bold text-slate-600">Giá theo giờ (USD)</span>
                <input
                  v-model.number="form.hourlyRate"
                  type="number"
                  min="0"
                  max="1000"
                  @focus="remember('hourlyRate')"
                  @change="commit('hourlyRate', 'Sửa giá theo giờ')"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-platinum-200 focus:border-champagne-400 focus:outline-none text-sm"
                />
              </label>
            </div>
          </template>
          <template v-else>
            <p class="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{{ form.bio || 'Chưa có phần giới thiệu.' }}</p>
          </template>

          <!-- Kỹ năng -->
          <div class="space-y-2.5 pt-2 border-t border-platinum-100">
            <h3 class="text-sm font-black text-slate-900 pt-3">Kỹ năng</h3>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="s in form.skills"
                :key="s"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ice-50 border border-ice-200 text-xs font-semibold text-ice-800"
              >
                {{ skillLabel(s) }}
                <button v-if="editable" @click="removeSkill(s)" class="text-ice-500 hover:text-rose-600" :aria-label="`Bỏ ${skillLabel(s)}`">✕</button>
              </span>
              <span v-if="form.skills.length === 0" class="text-xs text-slate-400">Chưa thêm kỹ năng nào.</span>
            </div>
            <div v-if="editable" class="flex flex-wrap gap-2 items-center">
              <select
                v-model="skillPick"
                class="px-3 py-2 rounded-xl bg-[#FAF8F5] border border-platinum-200 text-xs focus:outline-none focus:border-champagne-400"
              >
                <option value="">+ Chọn kỹ năng…</option>
                <optgroup v-for="c in CATEGORIES" :key="c.id" :label="`${c.icon} ${c.label}`">
                  <option v-for="s in c.skills" :key="s" :value="s" :disabled="form.skills.includes(s)">{{ skillLabel(s) }}</option>
                </optgroup>
              </select>
              <button
                @click="addSkill"
                :disabled="!skillPick || form.skills.length >= 15"
                class="px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-platinum-200 hover:border-champagne-400 disabled:opacity-40"
              >Thêm</button>
              <span class="text-[10px] text-slate-400">{{ form.skills.length }}/15</span>
            </div>
          </div>
        </div>

        <!-- ===================================================================== -->
        <!-- 3. DỰ ÁN TIÊU BIỂU                                                     -->
        <!-- ===================================================================== -->
        <div class="@5xl:col-span-5 p-6 rounded-3xl bg-white/95 border border-platinum-200/90 shadow-xs space-y-4 min-w-0">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-black text-slate-900">Dự án tiêu biểu</h2>
            <span class="text-[10px] text-slate-400">{{ form.portfolio.length }}/10</span>
          </div>

          <div v-if="form.portfolio.length === 0" class="py-6 text-center text-xs text-slate-400">Chưa có dự án nào.</div>
          <div v-for="(p, i) in form.portfolio" :key="i" class="p-4 rounded-2xl bg-[#FAF8F5] border border-platinum-200 space-y-1.5">
            <div class="flex items-start justify-between gap-2">
              <div class="text-sm font-bold text-slate-900 break-words min-w-0">{{ p.title }}</div>
              <button v-if="editable" @click="removeProject(i)" class="shrink-0 text-xs text-slate-400 hover:text-rose-600" aria-label="Xóa dự án">✕</button>
            </div>
            <p v-if="p.description" class="text-xs text-slate-600 leading-relaxed break-words">{{ p.description }}</p>
            <a
              v-if="p.url"
              :href="p.url"
              target="_blank"
              rel="noopener noreferrer nofollow"
              class="text-[11px] font-semibold text-ice-700 hover:underline break-all"
            >{{ p.url }}</a>
          </div>

          <div v-if="editable && form.portfolio.length < 10" class="p-4 rounded-2xl border border-dashed border-platinum-300 space-y-2.5">
            <input v-model="draft.title" maxlength="120" placeholder="Tên dự án *" class="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-platinum-200 text-xs focus:outline-none focus:border-champagne-400" />
            <input v-model="draft.url" maxlength="300" placeholder="Liên kết (https://…)" class="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-platinum-200 text-xs focus:outline-none focus:border-champagne-400" />
            <textarea v-model="draft.description" maxlength="500" rows="2" placeholder="Mô tả ngắn" class="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-platinum-200 text-xs focus:outline-none focus:border-champagne-400"></textarea>
            <p v-if="draftError" class="text-[11px] text-rose-600">{{ draftError }}</p>
            <button @click="addProject" class="w-full py-2 rounded-xl text-xs font-bold bg-white border border-platinum-200 hover:border-champagne-400">+ Thêm dự án</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { authStore } from '../../auth/controllers/AuthStore.js';
import { apiGet, apiPost } from '../../../shared/api.js';
import { CATEGORIES, skillLabel } from '../../job-catalog/models/JobCatalog.js';
import { createProfileUndoStack } from '../../undo-history/controllers/ProfileUndoHelper.js';
import { DSAActionBridge } from '../../dsa-inspector/controllers/DSAActionBridge.js';

const props = defineProps({
  userId: { type: String, required: true },
  editable: { type: Boolean, default: false }
});
const emit = defineEmits(['notify']);

const loading = ref(true);
const notFound = ref(false);
const saving = ref(false);
const updatedAt = ref('');
const skillPick = ref('');
const draft = reactive({ title: '', url: '', description: '' });
const draftError = ref('');

const form = reactive({ name: '', title: '', bio: '', location: '', hourlyRate: 0, rating: 0, skills: [], portfolio: [] });
let savedJson = '';
const version = ref(0); // tăng mỗi lần form đổi → tính lại "dirty"
const dirty = computed(() => { version.value; return serialize() !== savedJson; });

const avatar = computed(() => {
  const u = Object.values(authStore.state.users).find(x => x.id === props.userId);
  return u?.avatar || '🧑‍💼';
});

function serialize() {
  return JSON.stringify({ t: form.title, b: form.bio, l: form.location, h: form.hourlyRate, s: form.skills, p: form.portfolio });
}

// ---------------------------------------------------------------------------
// HOÀN TÁC CHỈNH SỬA: Ngăn xếp LIFO (LinkedStack - Lab 3)
// Mỗi thay đổi push ảnh chụp giá trị CŨ của đúng trường bị sửa; Hoàn tác = pop O(1).
// Hồ sơ chỉ vài KB nên chụp giá trị trường là hợp lý (không đụng tới mảng 10.000 việc).
// ---------------------------------------------------------------------------
const stack = createProfileUndoStack();
const undoCount = ref(0);
const undoTopLabel = ref('');
const pending = {}; // giá trị trường lúc bắt đầu gõ

const copyOf = (v) => (Array.isArray(v) ? v.map(x => (typeof x === 'object' ? { ...x } : x)) : v);
const stackView = () => stack.toArray().map(n => ({ label: n.label }));

function pushChange(field, label, prev) {
  const t0 = performance.now();
  const before = stackView();
  stack.push({ field, label, prev });
  undoCount.value = stack.size;
  undoTopLabel.value = label;
  version.value++;
  DSAActionBridge.dispatchProfileUndo({
    op: 'push', field, entry: { label }, stackBefore: before,
    stackAfterSize: undoCount.value, latency: performance.now() - t0
  });
}

function remember(field) {
  pending[field] = copyOf(form[field]);
}

function commit(field, label) {
  if (field === 'hourlyRate') form.hourlyRate = Math.min(1000, Math.max(0, Math.round(Number(form.hourlyRate) || 0)));
  if (!(field in pending) || JSON.stringify(pending[field]) === JSON.stringify(form[field])) return;
  pushChange(field, label, pending[field]);
  pending[field] = copyOf(form[field]);
}

function undo() {
  if (stack.isEmpty()) return;
  const t0 = performance.now();
  const before = stackView();
  const node = stack.pop();
  form[node.field] = copyOf(node.prev);
  pending[node.field] = copyOf(node.prev);
  undoCount.value = stack.size;
  undoTopLabel.value = stack.peek()?.label || '';
  version.value++;
  DSAActionBridge.dispatchProfileUndo({
    op: 'pop', field: node.field, entry: { label: node.label }, stackBefore: before,
    stackAfterSize: undoCount.value, latency: performance.now() - t0
  });
}

function addSkill() {
  const s = skillPick.value;
  if (!s || form.skills.includes(s) || form.skills.length >= 15) return;
  pushChange('skills', `Thêm kỹ năng ${skillLabel(s)}`, copyOf(form.skills));
  form.skills.push(s);
  skillPick.value = '';
}

function removeSkill(s) {
  pushChange('skills', `Bỏ kỹ năng ${skillLabel(s)}`, copyOf(form.skills));
  form.skills = form.skills.filter(x => x !== s);
}

function addProject() {
  draftError.value = '';
  const title = draft.title.trim();
  const url = draft.url.trim();
  if (!title) return (draftError.value = 'Cần nhập tên dự án.');
  if (url && !/^https?:\/\/[^\s]+$/i.test(url)) return (draftError.value = 'Liên kết phải bắt đầu bằng http:// hoặc https://');
  pushChange('portfolio', `Thêm dự án "${title.slice(0, 24)}"`, copyOf(form.portfolio));
  form.portfolio.push({ title, url, description: draft.description.trim() });
  draft.title = draft.url = draft.description = '';
}

function removeProject(i) {
  pushChange('portfolio', `Xóa dự án "${form.portfolio[i].title.slice(0, 24)}"`, copyOf(form.portfolio));
  form.portfolio = form.portfolio.filter((_, k) => k !== i);
}

function onKey(e) {
  if (!props.editable) return;
  const tag = e.target?.tagName;
  // Ctrl+Z trong ô nhập để trình duyệt tự xử lý; ngoài ô nhập thì hoàn tác hồ sơ
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
    e.preventDefault();
    undo();
  }
}

// ---------------------------------------------------------------------------
// TẢI / LƯU
// ---------------------------------------------------------------------------
function fill(d) {
  form.name = d.full_name || d.name || '';
  form.title = d.title || '';
  form.bio = d.bio || '';
  form.location = d.location || '';
  form.hourlyRate = Number(d.hourly_rate) || 0;
  form.rating = Number(d.rating) || 0;
  form.skills = Array.isArray(d.skills) ? [...d.skills] : [];
  form.portfolio = Array.isArray(d.portfolio) ? d.portfolio.map(p => ({ title: p.title || '', url: p.url || '', description: p.description || '' })) : [];
  updatedAt.value = d.updated_at ? new Date(d.updated_at).toLocaleDateString('vi-VN') : '';
}

async function load() {
  loading.value = true;
  notFound.value = false;
  const r = await apiGet(`/api/profile?userId=${encodeURIComponent(props.userId)}`);
  if (r.ok && r.data) {
    fill(r.data);
  } else if (r.offline) {
    // Không có MySQL: dùng thông tin tài khoản mẫu trong trình duyệt
    const u = Object.values(authStore.state.users).find(x => x.id === props.userId);
    if (u) fill({ name: u.name, title: u.title, bio: u.bio, rating: u.rating });
    else notFound.value = true;
  } else {
    notFound.value = true;
  }
  savedJson = serialize();
  stack.clear();
  undoCount.value = 0;
  version.value++;
  loading.value = false;
}

async function save() {
  if (!form.title.trim()) return emit('notify', 'Cần nhập chức danh trước khi lưu.', 'error');
  saving.value = true;
  const r = await apiPost('/api/profile', {
    title: form.title.trim(),
    bio: form.bio.trim(),
    location: form.location.trim(),
    hourlyRate: form.hourlyRate,
    skills: form.skills,
    portfolio: form.portfolio
  }, 'freelancer');
  saving.value = false;
  if (r.ok) {
    savedJson = serialize();
    version.value++;
    const fl = authStore.state.users.freelancer;
    fl.title = form.title.trim();
    fl.bio = form.bio.trim();
    updatedAt.value = new Date().toLocaleDateString('vi-VN');
    emit('notify', 'Đã lưu hồ sơ. Nhà tuyển dụng sẽ thấy bản mới khi bạn ứng tuyển.', 'ok');
  } else if (r.offline) {
    emit('notify', 'Không kết nối được máy chủ, hồ sơ chưa được lưu.', 'error');
  } else {
    emit('notify', `Chưa lưu được: ${r.error}`, 'error');
  }
}

watch(() => props.userId, load);
onMounted(() => {
  load();
  window.addEventListener('keydown', onKey);
});
onUnmounted(() => window.removeEventListener('keydown', onKey));
</script>
