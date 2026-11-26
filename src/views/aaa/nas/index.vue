<template>
  <div class="p-2 app-container">
    <el-alert title="NAS 是 RADIUS 报文来源的可信配置对象。Shared Secret 仅在生成或轮换成功时一次性显示，普通列表不会返回明文。" type="info" :closable="false" class="mb-3" />
    <el-alert title="集成契约待后端补齐：当前 NAS 列表只返回 businessId(UUID)，而状态/地址/密钥接口要求数值型 nasDeviceId；相关操作在列表响应补齐 id 前保持禁用，不会使用 UUID 冒充数值 ID。" type="warning" :closable="false" class="mb-3" />
    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between"><div><strong>NAS 设备</strong><div class="text-xs text-gray-500 mt-1">按租户管理 NAS Identity、IPv4/IPv6 来源地址、认证安全策略</div></div>
          <el-button v-hasPermi="['aaa:nas:add']" type="primary" icon="Plus" @click="openCreate">新增 NAS</el-button>
        </div>
      </template>
      <el-table v-loading="loading" :data="rows" row-key="businessId">
        <el-table-column label="NAS Identity" prop="identity" min-width="180" />
        <el-table-column label="名称" prop="displayName" min-width="160" />
        <el-table-column label="Vendor ID (PEN)" prop="vendorId" width="150" />
        <el-table-column label="型号" prop="modelId" width="130" />
        <el-table-column label="来源地址" min-width="220">
          <template #default="{ row }">
            <el-tag v-for="addr in row.addresses" :key="addr.endpointName + addr.address.join('.')" class="mr-1 mb-1" size="small">{{ addr.endpointName }} · {{ formatAddress(addr.address) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="row.status === 'ENABLED' ? 'success' : 'info'">{{ row.status }}</el-tag></template></el-table-column>
        <el-table-column label="Message-Authenticator" width="170"><template #default="{ row }"><el-tag :type="row.requireAccessMessageAuthenticator ? 'success' : 'warning'">{{ row.requireAccessMessageAuthenticator ? '强制校验' : '未强制' }}</el-tag></template></el-table-column>
        <el-table-column label="配置版本" prop="configVersion" width="100" />
        <el-table-column label="操作" fixed="right" width="300">
          <template #default="{ row }">
            <el-button v-hasPermi="['aaa:nas:secret:rotate']" link type="primary"  :disabled="!canManageNas(row)" @click="generateSecret(row)">生成 Secret</el-button>
            <el-button v-hasPermi="['aaa:nas:secret:rotate']" link type="primary"  :disabled="!canManageNas(row)" @click="openRotate(row)">轮换 Secret</el-button>
            <el-button v-hasPermi="['aaa:nas:edit']" link type="warning"  :disabled="!canManageNas(row)" @click="toggleStatus(row)">{{ row.status === 'ENABLED' ? '停用' : '启用' }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="createVisible" title="新增 NAS 设备" width="680px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="145px">
        <el-form-item label="NAS Identity" prop="identity"><el-input v-model="form.identity" maxlength="128" /></el-form-item>
        <el-form-item label="显示名称" prop="displayName"><el-input v-model="form.displayName" maxlength="128" /></el-form-item>
        <el-form-item label="Vendor ID (PEN)" prop="vendorId"><el-input v-model="form.vendorId" placeholder="IANA Private Enterprise Number" /></el-form-item>
        <el-form-item label="型号"><el-input v-model="form.modelId" maxlength="64" /></el-form-item>
        <el-form-item label="Accounting 间隔(分钟)"><el-input-number v-model="form.accountingInterimIntervalMinutes" :min="1" :max="71582788" /></el-form-item>
        <el-form-item label="强制 Message-Authenticator"><el-switch v-model="form.requireAccessMessageAuthenticator" /></el-form-item>
        <el-divider content-position="left">RADIUS 来源地址</el-divider>
        <div v-for="(addr, index) in form.addresses" :key="index" class="flex gap-2 w-full mb-2">
          <el-input v-model="addr.endpointName" placeholder="Endpoint，例如 access" />
          <el-input v-model="addr.ipAddress" placeholder="NAS IPv4 / IPv6 地址" />
          <el-switch v-model="addr.enabled" />
          <el-button link type="danger" icon="Delete" @click="removeAddress(index)" />
        </div>
        <el-button plain type="primary" icon="Plus" @click="addAddress">添加地址</el-button>
      </el-form>
      <template #footer><el-button @click="createVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitCreate">创建 NAS</el-button></template>
    </el-dialog>

    <el-dialog v-model="secretVisible" title="RADIUS Shared Secret（仅显示一次）" width="600px" :close-on-click-modal="false">
      <el-alert title="请立即复制并安全配置到 NAS。关闭此窗口后，系统不会再次展示该明文。" type="warning" :closable="false" class="mb-3" />
      <el-input v-model="oneTimeSecret" readonly type="textarea" :rows="3" />
      <template #footer><el-button type="primary" @click="copySecret">复制 Secret</el-button><el-button @click="closeSecret">我已安全保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="rotateVisible" title="轮换 RADIUS Shared Secret" width="520px" destroy-on-close>
      <el-alert title="轮换会立即改变 NAS 当前生效的 Shared Secret。请确保已准备好同步更新 NAS 侧配置。" type="warning" :closable="false" class="mb-3" />
      <el-input v-model="rotateSecret" type="password" show-password autocomplete="new-password" placeholder="输入新的 Shared Secret" />
      <template #footer><el-button @click="rotateVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitRotate">确认轮换</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { changeNasStatus, createNasDevice, generateNasRadiusSecret, listNasDevices, rotateNasRadiusSecret, type NasDevice, type NasDeviceCreate } from '@/api/aaa';

const loading = ref(false);
const saving = ref(false);
const rows = ref<NasDevice[]>([]);
function numericNasId(row?: NasDevice) { return Number(row?.id ?? 0); }
function canManageNas(row: NasDevice) { return numericNasId(row) > 0; }
const createVisible = ref(false);
const secretVisible = ref(false);
const rotateVisible = ref(false);
const activeNas = ref<NasDevice>();
const oneTimeSecret = ref('');
const rotateSecret = ref('');
const formRef = ref();
const initialForm = (): NasDeviceCreate => ({ identity: '', displayName: '', vendorId: '', modelId: '', accountingInterimIntervalMinutes: 5, requireAccessMessageAuthenticator: true, addresses: [{ endpointName: 'access', ipAddress: '', enabled: true }] });
const form = reactive<NasDeviceCreate>(initialForm());
const rules = { identity: [{ required: true, message: '请输入 NAS Identity', trigger: 'blur' }], displayName: [{ required: true, message: '请输入名称', trigger: 'blur' }], vendorId: [{ required: true, message: '请输入 IANA Vendor ID', trigger: 'blur' }] };
function formatAddress(bytes: number[]) {
  if (bytes.length === 4) return bytes.join('.');
  if (bytes.length !== 16) return bytes.join('.');
  const parts: string[] = [];
  for (let i = 0; i < 16; i += 2) parts.push(((bytes[i] << 8) | bytes[i + 1]).toString(16));
  return parts.join(':');
}
async function getList() {
  loading.value = true;
  try { const res = await listNasDevices(); rows.value = res.data ?? []; }
  finally { loading.value = false; }
}
function openCreate() { Object.assign(form, initialForm()); createVisible.value = true; }
function addAddress() { form.addresses.push({ endpointName: 'access', ipAddress: '', enabled: true }); }
function removeAddress(index: number) { if (form.addresses.length > 1) form.addresses.splice(index, 1); }
async function submitCreate() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid || form.addresses.some(item => !item.endpointName.trim() || !item.ipAddress.trim())) { ElMessage.warning('请完整填写至少一个 NAS 来源地址'); return; }
  saving.value = true;
  try { await createNasDevice({ ...form, addresses: form.addresses.map(item => ({ ...item })) }); ElMessage.success('NAS 已创建'); createVisible.value = false; await getList(); }
  finally { saving.value = false; }
}
async function toggleStatus(row: NasDevice) {
  const next = row.status === 'ENABLED' ? 'DISABLED' : 'ENABLED';
  await ElMessageBox.confirm(`确认将 NAS ${row.identity} 状态改为 ${next}？`, '状态变更');
  const id = numericNasId(row);
  if (!id) { ElMessage.warning('当前后端 NAS 列表响应未提供数值型 nasDeviceId，暂不能变更状态'); return; }
  await changeNasStatus(id, row.configVersion, next);
  await getList();
}
async function generateSecret(row: NasDevice) {
  await ElMessageBox.confirm(`将为 NAS ${row.identity} 生成并立即启用新的 Shared Secret，是否继续？`, '生成密钥');
  const id = numericNasId(row);
  if (!id) { ElMessage.warning('当前后端 NAS 列表响应未提供数值型 nasDeviceId，暂不能生成密钥'); return; }
  const res = await generateNasRadiusSecret(id);
  oneTimeSecret.value = res.data?.secret ?? '';
  secretVisible.value = true;
  await getList();
}
function openRotate(row: NasDevice) { activeNas.value = row; rotateSecret.value = ''; rotateVisible.value = true; }
async function submitRotate() {
  if (!activeNas.value || !rotateSecret.value) { ElMessage.warning('请输入新的 Shared Secret'); return; }
  saving.value = true;
  try { const secret = rotateSecret.value; rotateSecret.value = '';
    const id = numericNasId(activeNas.value);
    if (!id) { ElMessage.warning('当前后端 NAS 列表响应未提供数值型 nasDeviceId，暂不能轮换密钥'); return; }
    await rotateNasRadiusSecret(id, secret); ElMessage.success('Shared Secret 已轮换'); rotateVisible.value = false; await getList(); }
  finally { rotateSecret.value = ''; saving.value = false; }
}
async function copySecret() { if (oneTimeSecret.value) await navigator.clipboard.writeText(oneTimeSecret.value); ElMessage.success('已复制，请安全保存'); }
function closeSecret() { oneTimeSecret.value = ''; secretVisible.value = false; }
onMounted(getList);
</script>
