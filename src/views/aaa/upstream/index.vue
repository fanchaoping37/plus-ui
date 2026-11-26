<template>
  <div class="p-2 app-container">
    <el-alert title="上游 RADIUS Server Secret、上游用户账号密码和 NAS Shared Secret 是三个独立安全域。页面只配置引用和来源，不回显已保存密钥。" type="warning" :closable="false" class="mb-3" />
    <el-card shadow="never">
      <el-tabs v-model="activeTab" @tab-change="refresh">
        <el-tab-pane label="上游 Server Secret 引用" name="secrets">
          <el-form :inline="true" :model="providerQuery" class="mb-3">
            <el-form-item label="Provider ID"><el-input v-model="providerQuery.providerId" placeholder="UPSTREAM_RADIUS Provider" /></el-form-item>
            <el-form-item label="版本"><el-input v-model="providerQuery.providerVersion" /></el-form-item>
            <el-form-item><el-button type="primary" @click="selectProvider">确认 Provider</el-button></el-form-item>
          </el-form>
          <el-divider />
          <el-form label-width="150px" class="max-w-700px">
            <el-form-item label="Secret Reference ID"><el-input v-model="secretForm.referenceId" maxlength="128" /></el-form-item>
            <el-form-item label="Shared Secret"><el-input v-model="secretForm.sharedSecret" type="password" show-password autocomplete="new-password" /></el-form-item>
            <el-form-item>
              <el-button v-hasPermi="['aaa:provider:secret:manage']" type="primary" :disabled="!providerReady" :loading="saving" @click="createSecret">创建引用</el-button>
              <el-button v-hasPermi="['aaa:provider:secret:manage']" type="warning" :disabled="!providerReady" :loading="saving" @click="rotateSecret">轮换引用</el-button>
              <el-button v-hasPermi="['aaa:provider:secret:manage']" type="danger" plain :disabled="!providerReady || !secretForm.referenceId" @click="disableSecret">停用引用</el-button>
            </el-form-item>
          </el-form>
          <el-alert v-if="secretResult" type="success" :closable="false" class="mt-3">
            <template #title>密钥操作已完成：引用 {{ secretResult.referenceId }}，凭据版本 {{ secretResult.credentialVersion }}。明文不会再次显示。</template>
          </el-alert>
        </el-tab-pane>
        <el-tab-pane label="上游动态授权来源" name="clients">
          <el-form :inline="true" :model="providerQuery" class="mb-3">
            <el-form-item label="Provider ID"><el-input v-model="providerQuery.providerId" /></el-form-item><el-form-item label="版本"><el-input v-model="providerQuery.providerVersion" /></el-form-item>
            <el-form-item><el-button type="primary" @click="loadClients">查询来源</el-button><el-button v-hasPermi="['aaa:upstream-dac:manage']" @click="openCreate">新增来源</el-button></el-form-item>
          </el-form>
          <el-table v-loading="loading" :data="clients">
            <el-table-column label="ID" prop="id" width="80" /><el-table-column label="来源地址" prop="sourceAddress" min-width="170" /><el-table-column label="端口" prop="sourcePort" width="90" /><el-table-column label="Secret 引用" prop="secretReferenceId" min-width="170" /><el-table-column label="启用" width="90"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template></el-table-column><el-table-column label="版本" prop="version" width="80" /><el-table-column label="有效期" min-width="260"><template #default="{ row }">{{ row.effectiveFrom || '立即' }} 至 {{ row.effectiveUntil || '长期' }}</template></el-table-column>
            <el-table-column label="操作" width="260"><template #default="{ row }">
              <el-button v-hasPermi="['aaa:upstream-dac:manage']" link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button v-hasPermi="['aaa:upstream-dac:manage']" link :type="row.enabled ? 'warning' : 'success'" @click="toggleClient(row)">{{ row.enabled ? '停用' : '启用' }}</el-button>
              <el-button v-hasPermi="['aaa:upstream-dac:test']" link type="primary" @click="validateClient(row)">验证</el-button>
              <el-button v-hasPermi="['aaa:upstream-dac:audit']" link @click="showAudit(row)">审计</el-button>
            </template></el-table-column>
          </el-table>
          <el-table v-if="auditRows.length" :data="auditRows" class="mt-4">
            <el-table-column label="事件时间" prop="occurredAt" min-width="180" /><el-table-column label="事件" prop="eventType" /><el-table-column label="结果" prop="resultCode" /><el-table-column label="来源地址" prop="sourceAddress" /><el-table-column label="管理员" prop="actorId" width="110" />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="clientVisible" :title="editingClient ? '修改动态授权来源' : '新增动态授权来源'" width="600px" destroy-on-close>
      <el-form label-width="135px">
        <el-form-item label="来源 IP"><el-input v-model="clientForm.sourceAddress" placeholder="明确 IPv4 / IPv6 地址，不支持 CIDR" /></el-form-item>
        <el-form-item label="来源 UDP 端口"><el-input-number v-model="clientForm.sourcePort" :min="1" :max="65535" /></el-form-item>
        <el-form-item label="Secret Reference ID"><el-input v-model="clientForm.secretReferenceId" maxlength="128" /></el-form-item>
        <el-form-item label="生效时间"><el-date-picker v-model="clientForm.effectiveFrom" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss[Z]" /></el-form-item>
        <el-form-item label="失效时间"><el-date-picker v-model="clientForm.effectiveUntil" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss[Z]" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="clientVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="saveClient">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  createUpstreamDynamicAuthorizationClient, createUpstreamServerSecretReference,
  disableUpstreamServerSecretReference, listAuthProviders, listUpstreamDynamicAuthorizationClientAudit,
  listUpstreamDynamicAuthorizationClients, publishAuthProvider, rotateUpstreamServerSecretReference,
  setUpstreamDynamicAuthorizationClientEnabled, updateUpstreamDynamicAuthorizationClient,
  validateUpstreamDynamicAuthorizationClient, type AuthProvider, type UpstreamDynamicAuthorizationClient
} from '@/api/aaa';

const activeTab = ref('secrets');
const loading = ref(false), saving = ref(false), providerReady = ref(false);
const providers = ref<AuthProvider[]>([]);
const clients = ref<UpstreamDynamicAuthorizationClient[]>([]);
const auditRows = ref<any[]>([]);
const providerQuery = reactive({ providerId: '', providerVersion: '' });
const secretForm = reactive({ referenceId: '', sharedSecret: '' });
const secretResult = ref<{ referenceId: string; credentialVersion: number }>();
const clientVisible = ref(false);
const editingClient = ref<UpstreamDynamicAuthorizationClient>();
const clientForm = reactive({ sourceAddress: '', sourcePort: 3799, secretReferenceId: '', effectiveFrom: '', effectiveUntil: '' });
async function selectProvider() {
  const res = await listAuthProviders();
  providers.value = res.data ?? [];
  const found = providers.value.find(p => p.providerId === providerQuery.providerId && p.providerVersion === providerQuery.providerVersion && p.providerType === 'UPSTREAM_RADIUS');
  providerReady.value = Boolean(found);
  if (!found) ElMessage.warning('未找到对应的 UPSTREAM_RADIUS Provider 版本');
  else ElMessage.success('Provider 版本已确认');
}
async function refresh() { if (activeTab.value === 'clients') await loadClients(); }
async function loadClients() {
  if (!providerQuery.providerId || !providerQuery.providerVersion) { ElMessage.warning('请填写 Provider ID 和版本'); return; }
  loading.value = true;
  try { const res = await listUpstreamDynamicAuthorizationClients(providerQuery.providerId, providerQuery.providerVersion); clients.value = res.data ?? []; }
  finally { loading.value = false; }
}
async function createSecret() {
  if (!providerReady.value || !secretForm.referenceId.trim() || !secretForm.sharedSecret) return ElMessage.warning('请确认 Provider 并填写引用 ID 与 Secret');
  saving.value = true;
  try {
    const sharedSecret = secretForm.sharedSecret; secretForm.sharedSecret = '';
    const res = await createUpstreamServerSecretReference(providerQuery.providerId, providerQuery.providerVersion, { referenceId: secretForm.referenceId, sharedSecret });
    secretResult.value = res.data;
    ElMessage.success('上游 Server Secret 引用已创建');
  } finally { secretForm.sharedSecret = ''; saving.value = false; }
}
async function rotateSecret() {
  if (!providerReady.value || !secretForm.referenceId.trim() || !secretForm.sharedSecret) return ElMessage.warning('请确认 Provider 并填写引用 ID 与新 Secret');
  await ElMessageBox.confirm('轮换会替换此 Provider 版本引用的当前 Server Secret。确认继续？');
  saving.value = true;
  try {
    const sharedSecret = secretForm.sharedSecret; secretForm.sharedSecret = '';
    const res = await rotateUpstreamServerSecretReference(providerQuery.providerId, providerQuery.providerVersion, secretForm.referenceId, sharedSecret);
    secretResult.value = res.data;
    ElMessage.success('上游 Server Secret 已轮换');
  } finally { secretForm.sharedSecret = ''; saving.value = false; }
}
async function disableSecret() {
  await ElMessageBox.confirm('确认停用该 Server Secret 引用？使用此引用的上游认证/动态授权可能失败。');
  await disableUpstreamServerSecretReference(providerQuery.providerId, providerQuery.providerVersion, secretForm.referenceId);
  ElMessage.success('引用已停用');
}
function openCreate() { editingClient.value = undefined; Object.assign(clientForm, { sourceAddress: '', sourcePort: 3799, secretReferenceId: '', effectiveFrom: '', effectiveUntil: '' }); clientVisible.value = true; }
function openEdit(row: UpstreamDynamicAuthorizationClient) { editingClient.value = row; Object.assign(clientForm, row); clientVisible.value = true; }
async function saveClient() {
  if (!clientForm.sourceAddress.trim() || !clientForm.secretReferenceId.trim()) return ElMessage.warning('请填写来源 IP 和 Secret 引用');
  saving.value = true;
  try {
    const payload = { ...clientForm, effectiveFrom: clientForm.effectiveFrom || undefined, effectiveUntil: clientForm.effectiveUntil || undefined };
    if (editingClient.value) await updateUpstreamDynamicAuthorizationClient(providerQuery.providerId, providerQuery.providerVersion, editingClient.value.id, { ...payload, expectedVersion: editingClient.value.version });
    else await createUpstreamDynamicAuthorizationClient(providerQuery.providerId, providerQuery.providerVersion, payload);
    clientVisible.value = false; await loadClients(); ElMessage.success('动态授权来源已保存');
  } finally { saving.value = false; }
}
async function toggleClient(row: UpstreamDynamicAuthorizationClient) { await setUpstreamDynamicAuthorizationClientEnabled(providerQuery.providerId, providerQuery.providerVersion, row.id, row.version, !row.enabled); await loadClients(); }
async function validateClient(row: UpstreamDynamicAuthorizationClient) { await validateUpstreamDynamicAuthorizationClient(providerQuery.providerId, providerQuery.providerVersion, row.id); ElMessage.success('验证请求已执行'); }
async function showAudit(row: UpstreamDynamicAuthorizationClient) { const res = await listUpstreamDynamicAuthorizationClientAudit(row.id); auditRows.value = res.data ?? []; }
</script>
