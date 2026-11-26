<template>
  <div class="p-2 app-container">
    <el-card shadow="never" class="mb-3">
      <el-form :inline="true" :model="query">
        <el-form-item label="用户账号"><el-input v-model="query.userNo" clearable placeholder="账号关键字" @keyup.enter="search" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" clearable placeholder="全部状态" style="width: 180px">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="search">查询</el-button>
          <el-button icon="Refresh" @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <div><strong>AAA 用户</strong><div class="text-xs text-gray-500 mt-1">独立于管理后台 sys_user 的 RADIUS 用户主体</div></div>
          <el-button v-hasPermi="['aaa:user:add']" type="primary" icon="Plus" @click="openCreate">新增用户</el-button>
        </div>
      </template>
      <el-table v-loading="loading" :data="rows" row-key="id">
        <el-table-column label="用户编号" prop="id" width="90" />
        <el-table-column label="用户账号" prop="userNo" min-width="170" />
        <el-table-column label="显示名称" prop="displayName" min-width="160" show-overflow-tooltip />
        <el-table-column label="用户类型" prop="userType" width="130" />
        <el-table-column label="状态" width="130">
          <template #default="{ row }"><el-tag :type="statusTag(row.status)">{{ statusLabel(row.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="有效期" min-width="250">
          <template #default="{ row }">{{ formatDate(row.validFrom) }} 至 {{ formatDate(row.validUntil) }}</template>
        </el-table-column>
        <el-table-column label="版本" prop="version" width="80" />
        <el-table-column label="操作" fixed="right" width="330">
          <template #default="{ row }">
            <el-button v-hasPermi="['aaa:user:identity:bind']" link type="primary" @click="openIdentity(row)">身份绑定</el-button>
            <el-button v-hasPermi="['aaa:user:credential:reset']" link type="primary" @click="openCredential(row, 'radius')">RADIUS 密码</el-button>
            <el-button v-hasPermi="['aaa:user:credential:reset']" link type="primary" @click="openCredential(row, 'eap')">EAP 密码</el-button>
            <el-button v-hasPermi="['aaa:user:edit']" link type="warning" @click="openStatus(row)">状态</el-button>
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="total > 0" v-model:page="query.page" v-model:limit="query.size" :total="total" @pagination="getList" />
    </el-card>

    <el-dialog v-model="createVisible" title="新增 AAA 用户" width="560px" destroy-on-close>
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="110px">
        <el-form-item label="用户账号" prop="userNo"><el-input v-model="createForm.userNo" maxlength="128" /></el-form-item>
        <el-form-item label="显示名称"><el-input v-model="createForm.displayName" maxlength="128" /></el-form-item>
        <el-form-item label="用户类型" prop="userType"><el-input v-model="createForm.userType" maxlength="32" placeholder="例如 CAMPUS / OPERATOR" /></el-form-item>
        <el-form-item label="生效时间"><el-date-picker v-model="createForm.validFrom" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss[Z]" /></el-form-item>
        <el-form-item label="失效时间"><el-date-picker v-model="createForm.validUntil" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss[Z]" /></el-form-item>
        <el-form-item label="创建原因" prop="reason"><el-input v-model="createForm.reason" type="textarea" maxlength="512" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="createVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitCreate">创建</el-button></template>
    </el-dialog>

    <el-dialog v-model="statusVisible" title="变更用户状态" width="500px" destroy-on-close>
      <el-alert title="状态变更采用乐观锁，提交时会校验用户当前版本。" type="info" :closable="false" class="mb-4" />
      <el-form label-width="100px">
        <el-form-item label="用户"><span>{{ activeUser?.userNo }}</span></el-form-item>
        <el-form-item label="目标状态"><el-select v-model="statusForm.status" style="width: 100%"><el-option v-for="item in transitionOptions" :key="item" :label="statusLabel(item)" :value="item" /></el-select></el-form-item>
        <el-form-item label="变更原因"><el-input v-model="statusForm.reason" type="textarea" maxlength="512" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="statusVisible = false">取消</el-button><el-button type="primary" @click="submitStatus">提交</el-button></template>
    </el-dialog>

    <el-dialog v-model="identityVisible" title="绑定认证身份" width="560px" destroy-on-close>
      <el-alert title="身份映射只绑定登录标识，不会自动创建或覆盖用户密码。" type="info" :closable="false" class="mb-4" />
      <el-form label-width="110px">
        <el-form-item label="AAA 用户"><span>{{ activeUser?.userNo }}</span></el-form-item>
        <el-form-item label="身份类型"><el-select v-model="identityForm.identityType" style="width: 100%"><el-option label="用户名" value="USERNAME" /><el-option label="MAC 地址" value="MAC" /></el-select></el-form-item>
        <el-form-item label="映射范围"><el-radio-group v-model="identityForm.scope"><el-radio value="GLOBAL">全局</el-radio><el-radio value="NAS">指定 NAS</el-radio></el-radio-group></el-form-item>
        <el-form-item v-if="identityForm.scope === 'NAS'" label="NAS Identity"><el-input v-model="identityForm.nasIdentity" /></el-form-item>
        <el-form-item label="认证身份"><el-input v-model="identityForm.identity" maxlength="253" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="identityVisible = false">取消</el-button><el-button type="primary" @click="submitIdentity">绑定</el-button></template>
    </el-dialog>

    <el-dialog v-model="credentialVisible" :title="credentialMode === 'eap' ? '设置 EAP-MSCHAPv2 密码' : '设置 RADIUS PAP 密码'" width="520px" destroy-on-close>
      <el-alert v-if="credentialMode === 'eap'" title="此密码专用于 PEAP 内层 EAP-MSCHAPv2，独立派生 NT-Hash；不等于管理后台密码或上游运营商密码。" type="warning" :closable="false" class="mb-4" />
      <el-alert v-else title="此密码用于本地 RADIUS PAP 凭据，与 EAP-MSCHAPv2 NT-Hash 和上游凭据分开保存。" type="info" :closable="false" class="mb-4" />
      <el-form label-width="110px">
        <el-form-item label="AAA 用户"><span>{{ activeUser?.userNo }}</span></el-form-item>
        <el-form-item label="新密码"><el-input v-model="credentialPassword" type="password" show-password autocomplete="new-password" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="credentialVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitCredential">保存凭据</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import {
  bindRadiusIdentity, changeRadiusUserStatus, createRadiusUser, listRadiusUsers,
  replaceEapMschapv2Password, replaceRadiusUserPassword,
  type RadiusUser, type RadiusUserCreate, type RadiusUserStatus
} from '@/api/aaa';

const loading = ref(false);
const saving = ref(false);
const rows = ref<RadiusUser[]>([]);
const total = ref(0);
const query = reactive<{ page: number; size: number; userNo: string; status?: RadiusUserStatus }>({ page: 1, size: 20, userNo: '' });
const statusOptions = [
  { value: 'ACTIVE', label: '正常' }, { value: 'DISABLED', label: '停用' }, { value: 'LOCKED', label: '锁定' },
  { value: 'EXPIRED', label: '已过期' }, { value: 'PENDING_DELETE', label: '待删除' }
] as const;
const createVisible = ref(false);
const statusVisible = ref(false);
const identityVisible = ref(false);
const credentialVisible = ref(false);
const activeUser = ref<RadiusUser>();
const createFormRef = ref();
const createForm = reactive<RadiusUserCreate>({ userNo: '', displayName: '', userType: 'CAMPUS', reason: '' });
const createRules = {
  userNo: [{ required: true, message: '请输入用户账号', trigger: 'blur' }],
  userType: [{ required: true, message: '请输入用户类型', trigger: 'blur' }],
  reason: [{ required: true, message: '请填写创建原因', trigger: 'blur' }]
};
const statusForm = reactive<{ status: RadiusUserStatus; reason: string }>({ status: 'ACTIVE', reason: '' });
const identityForm = reactive({ identityType: 'USERNAME' as 'USERNAME' | 'MAC', scope: 'GLOBAL' as 'GLOBAL' | 'NAS', identity: '', nasIdentity: '' });
const credentialMode = ref<'radius' | 'eap'>('radius');
const credentialPassword = ref('');
const transitionOptions = computed(() => statusOptions.map(item => item.value).filter(value => value !== activeUser.value?.status && !['DELETED', 'ANONYMIZED'].includes(value)));

function statusLabel(status: string) { return statusOptions.find(item => item.value === status)?.label ?? status; }
function statusTag(status: string) { return status === 'ACTIVE' ? 'success' : status === 'LOCKED' ? 'danger' : status === 'DISABLED' ? 'info' : 'warning'; }
function formatDate(value?: string) { return value ? new Date(value).toLocaleString() : '不限'; }
async function getList() {
  loading.value = true;
  try { const res = await listRadiusUsers({ ...query }); rows.value = res.data?.rows ?? []; total.value = res.data?.total ?? 0; }
  finally { loading.value = false; }
}
function search() { query.page = 1; getList(); }
function resetSearch() { query.userNo = ''; query.status = undefined; search(); }
function openCreate() { Object.assign(createForm, { userNo: '', displayName: '', userType: 'CAMPUS', validFrom: undefined, validUntil: undefined, reason: '' }); createVisible.value = true; }
async function submitCreate() {
  const valid = await createFormRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try { await createRadiusUser({ ...createForm }); ElMessage.success('AAA 用户已创建'); createVisible.value = false; await getList(); }
  finally { saving.value = false; }
}
function openStatus(row: RadiusUser) { activeUser.value = row; statusForm.status = row.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'; statusForm.reason = ''; statusVisible.value = true; }
async function submitStatus() {
  if (!activeUser.value || !statusForm.reason.trim()) { ElMessage.warning('请填写变更原因'); return; }
  await changeRadiusUserStatus(activeUser.value.id, { expectedVersion: activeUser.value.version, ...statusForm });
  ElMessage.success('用户状态已更新'); statusVisible.value = false; await getList();
}
function openIdentity(row: RadiusUser) { activeUser.value = row; Object.assign(identityForm, { identityType: 'USERNAME', scope: 'GLOBAL', identity: row.userNo, nasIdentity: '' }); identityVisible.value = true; }
async function submitIdentity() {
  if (!activeUser.value || !identityForm.identity.trim() || (identityForm.scope === 'NAS' && !identityForm.nasIdentity.trim())) { ElMessage.warning('请完整填写身份映射'); return; }
  await bindRadiusIdentity(activeUser.value.id, { ...identityForm });
  ElMessage.success('身份绑定已提交'); identityVisible.value = false;
}
function openCredential(row: RadiusUser, mode: 'radius' | 'eap') { activeUser.value = row; credentialMode.value = mode; credentialPassword.value = ''; credentialVisible.value = true; }
async function submitCredential() {
  if (!activeUser.value || !credentialPassword.value) { ElMessage.warning('请输入新密码'); return; }
  saving.value = true;
  try {
    const password = credentialPassword.value;
    credentialPassword.value = '';
    if (credentialMode.value === 'eap') await replaceEapMschapv2Password(activeUser.value.id, password);
    else await replaceRadiusUserPassword(activeUser.value.id, password);
    ElMessage.success('凭据更新请求已提交'); credentialVisible.value = false;
  } finally { credentialPassword.value = ''; saving.value = false; }
}
onMounted(getList);
</script>
