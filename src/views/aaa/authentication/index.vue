<template>
  <div class="p-2 app-container">
    <el-alert title="Provider / Policy 采用版本化草稿与发布机制。配置中只允许填写凭据引用，不允许内嵌 NAS Secret、上游 Server Secret 或用户密码。" type="warning" :closable="false" class="mb-3" />
    <el-card shadow="never">
      <el-tabs v-model="activeTab" @tab-change="refresh">
        <el-tab-pane label="认证 Provider" name="providers">
          <div class="flex justify-end mb-3"><el-button v-hasPermi="['aaa:auth-provider:add']" type="primary" icon="Plus" @click="openProvider">创建 Provider 草稿</el-button></div>
          <el-table v-loading="loading" :data="providers">
            <el-table-column label="Provider ID" prop="providerId" min-width="150" /><el-table-column label="版本" prop="providerVersion" width="100" /><el-table-column label="名称" prop="displayName" min-width="160" /><el-table-column label="类型" prop="providerType" width="170" /><el-table-column label="配置 SHA-256" prop="contentSha256" min-width="230" /><el-table-column label="生命周期" prop="lifecycleStatus" width="120" />
            <el-table-column label="操作" width="210"><template #default="{ row }"><el-button v-if="row.lifecycleStatus === 'DRAFT'" v-hasPermi="['aaa:auth-provider:publish']" link type="success" @click="publishProviderRow(row)">发布</el-button><el-button v-if="row.lifecycleStatus === 'DRAFT'" v-hasPermi="['aaa:auth-provider:add']" link type="danger" @click="discardProviderRow(row)">废弃草稿</el-button></template></el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="认证策略" name="policies">
          <div class="flex justify-end mb-3"><el-button v-hasPermi="['aaa:auth-policy:add']" type="primary" icon="Plus" @click="openPolicy">创建策略草稿</el-button></div>
          <el-table v-loading="loading" :data="policies">
            <el-table-column label="策略 ID" prop="policyId" min-width="130" /><el-table-column label="版本" prop="policyVersion" width="90" /><el-table-column label="名称" prop="policyName" min-width="150" /><el-table-column label="优先级" prop="priority" width="90" /><el-table-column label="Provider" min-width="160"><template #default="{ row }">{{ row.providerId }}@{{ row.providerVersion }}</template></el-table-column><el-table-column label="决策" prop="decision" width="120" /><el-table-column label="启用" width="80"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '是' : '否' }}</el-tag></template></el-table-column><el-table-column label="生命周期" prop="lifecycleStatus" width="110" />
            <el-table-column label="操作" width="230"><template #default="{ row }"><el-button v-if="row.lifecycleStatus === 'DRAFT'" v-hasPermi="['aaa:auth-policy:publish']" link type="success" @click="publishPolicyRow(row)">发布</el-button><el-button v-if="row.lifecycleStatus === 'DRAFT'" v-hasPermi="['aaa:auth-policy:add']" link type="danger" @click="discardPolicyRow(row)">废弃</el-button><el-button v-if="row.lifecycleStatus === 'PUBLISHED'" v-hasPermi="['aaa:auth-policy:add']" link type="primary" @click="rollbackPolicyRow(row)">回滚为新草稿</el-button></template></el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="providerVisible" title="创建认证 Provider 草稿" width="760px" destroy-on-close>
      <el-form label-width="135px">
        <el-form-item label="Provider ID"><el-input v-model="providerForm.providerId" maxlength="64" /></el-form-item><el-form-item label="版本"><el-input v-model="providerForm.providerVersion" maxlength="64" placeholder="例如 1.0.0" /></el-form-item>
        <el-form-item label="显示名称"><el-input v-model="providerForm.displayName" maxlength="128" /></el-form-item>
        <el-form-item label="Provider 类型"><el-select v-model="providerForm.providerType" style="width: 100%" @change="applyProviderTemplate"><el-option v-for="item in providerTypes" :key="item" :label="item" :value="item" /></el-select></el-form-item>
        <el-form-item label="JSON 配置"><el-input v-model="providerConfigText" type="textarea" :rows="12" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="providerVisible = false">取消</el-button><el-button type="primary" @click="submitProvider">创建草稿</el-button></template>
    </el-dialog>

    <el-dialog v-model="policyVisible" title="创建认证策略草稿" width="820px" destroy-on-close>
      <el-form label-width="135px">
        <el-form-item label="策略 ID"><el-input v-model="policyForm.policyId" maxlength="64" /></el-form-item><el-form-item label="版本"><el-input v-model="policyForm.policyVersion" maxlength="64" /></el-form-item><el-form-item label="策略名称"><el-input v-model="policyForm.policyName" maxlength="128" /></el-form-item>
        <el-form-item label="优先级"><el-input-number v-model="policyForm.priority" :min="0" /></el-form-item>
        <el-form-item label="Provider 版本"><el-select v-model="selectedProvider" style="width: 100%" placeholder="选择已创建的 Provider"><el-option v-for="item in providers" :key="item.providerId + item.providerVersion" :label="`${item.providerId}@${item.providerVersion} · ${item.providerType}`" :value="item.providerId + '|' + item.providerVersion + '|' + item.providerType" /></el-select></el-form-item>
        <el-form-item label="决策"><el-radio-group v-model="policyForm.decision"><el-radio value="AUTHENTICATE">认证</el-radio><el-radio value="REJECT">拒绝</el-radio></el-radio-group></el-form-item>
        <el-form-item label="启用"><el-switch v-model="policyForm.enabled" /></el-form-item>
        <el-form-item label="条件 JSON"><el-input v-model="conditionsText" type="textarea" :rows="10" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="policyVisible = false">取消</el-button><el-button type="primary" @click="submitPolicy">创建草稿</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { createAuthPolicy, createAuthProvider, discardAuthPolicy, discardAuthProvider, listAuthPolicies, listAuthProviders, publishAuthPolicy, publishAuthProvider, rollbackAuthPolicy, type AuthPolicy, type AuthProvider, type ProviderType } from '@/api/aaa';

const activeTab = ref('providers');
const loading = ref(false);
const providers = ref<AuthProvider[]>([]);
const policies = ref<AuthPolicy[]>([]);
const providerVisible = ref(false);
const policyVisible = ref(false);
const providerTypes: ProviderType[] = ['LOCAL_CREDENTIAL', 'LDAP', 'ACTIVE_DIRECTORY', 'UPSTREAM_RADIUS', 'EAP'];
const providerForm = reactive({ providerId: '', providerVersion: '1.0.0', displayName: '', providerType: 'LOCAL_CREDENTIAL' as ProviderType });
const providerConfigText = ref('{}');
const policyForm = reactive({ policyId: '', policyVersion: '1.0.0', policyName: '', priority: 100, providerId: '', providerVersion: '', providerType: 'LOCAL_CREDENTIAL' as ProviderType, decision: 'AUTHENTICATE' as 'AUTHENTICATE' | 'REJECT', enabled: true });
const selectedProvider = ref('');
const conditionsText = ref('[\n  { "conditionGroup": 1, "type": "NAS_IDENTITY", "operator": "EQ", "value": "nas-01" }\n]');
async function refresh() {
  loading.value = true;
  try {
    if (activeTab.value === 'providers') { const res = await listAuthProviders(); providers.value = res.data ?? []; }
    else { const [p, a] = await Promise.all([listAuthPolicies(), listAuthProviders()]); policies.value = p.data ?? []; providers.value = a.data ?? []; }
  } finally { loading.value = false; }
}
function applyProviderTemplate(type: ProviderType) {
  if (type === 'UPSTREAM_RADIUS') {
    providerConfigText.value = JSON.stringify({
      serverHost: '192.0.2.10',
      serverPort: 1812,
      serverSecretRef: 'upstream-radius-default',
      userCredentialAlias: 'default',
      timeoutMillis: 3000,
      messageAuthenticator: true,
      nasIdentifier: 'radius-aaa',
      authenticationMode: 'UPSTREAM_ONLY',
      upstreamUsernameTemplate: '{username}',
      allowCampusUsernameCampusPassword: false,
      allowCampusUsernameOperatorPassword: false,
      allowOperatorUsernameOperatorPassword: true,
      allowOperatorUsernameCampusPassword: false,
      allowUnboundLocalAuthentication: false
    }, null, 2);
  } else if (type === 'LOCAL_CREDENTIAL') {
    providerConfigText.value = '{}';
  } else {
    providerConfigText.value = '{}';
  }
}
function openProvider() { Object.assign(providerForm, { providerId: '', providerVersion: '1.0.0', displayName: '', providerType: 'LOCAL_CREDENTIAL' }); providerConfigText.value = '{}'; providerVisible.value = true; }
async function submitProvider() {
  try {
    const configuration = JSON.parse(providerConfigText.value);
    if (!providerForm.providerId.trim() || !providerForm.providerVersion.trim() || !providerForm.displayName.trim() || !configuration || Array.isArray(configuration) || typeof configuration !== 'object') throw new Error('请填写完整信息和 JSON 对象');
    await createAuthProvider({ ...providerForm, configuration });
    ElMessage.success('Provider 草稿已创建'); providerVisible.value = false; await refresh();
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : 'Provider 配置无效'); }
}
async function publishProviderRow(row: AuthProvider) { await ElMessageBox.confirm(`确认发布 Provider ${row.providerId}@${row.providerVersion}？`); await publishAuthProvider(row.providerId, row.providerVersion); await refresh(); }
async function discardProviderRow(row: AuthProvider) { await ElMessageBox.confirm(`确认废弃草稿 ${row.providerId}@${row.providerVersion}？`); await discardAuthProvider(row.providerId, row.providerVersion); await refresh(); }
function openPolicy() { Object.assign(policyForm, { policyId: '', policyVersion: '1.0.0', policyName: '', priority: 100, providerId: '', providerVersion: '', providerType: 'LOCAL_CREDENTIAL', decision: 'AUTHENTICATE', enabled: true }); selectedProvider.value = ''; conditionsText.value = '[]'; policyVisible.value = true; }
async function submitPolicy() {
  try {
    const selected = providers.value.find(item => selectedProvider.value === item.providerId + '|' + item.providerVersion + '|' + item.providerType);
    if (!selected) throw new Error('请选择 Provider 版本');
    const conditions = JSON.parse(conditionsText.value);
    if (!Array.isArray(conditions)) throw new Error('条件必须是 JSON 数组');
    await createAuthPolicy({ ...policyForm, providerId: selected.providerId, providerVersion: selected.providerVersion, providerType: selected.providerType, conditions });
    ElMessage.success('认证策略草稿已创建'); policyVisible.value = false; await refresh();
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '策略配置无效'); }
}
async function publishPolicyRow(row: AuthPolicy) { await ElMessageBox.confirm(`确认发布策略 ${row.policyId}@${row.policyVersion}？`); await publishAuthPolicy(row.policyId, row.policyVersion); await refresh(); }
async function discardPolicyRow(row: AuthPolicy) { await ElMessageBox.confirm(`确认废弃策略 ${row.policyId}@${row.policyVersion}？`); await discardAuthPolicy(row.policyId, row.policyVersion); await refresh(); }
async function rollbackPolicyRow(row: AuthPolicy) { const targetVersion = await ElMessageBox.prompt('请输入新草稿版本号', '策略版本回滚', { inputValue: 'rollback-' + Date.now() }); await rollbackAuthPolicy(row.policyId, row.policyVersion, targetVersion.value); await refresh(); }
onMounted(refresh);
</script>
