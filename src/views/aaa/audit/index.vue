<template>
  <div class="p-2 app-container">
    <el-card shadow="never">
      <el-tabs v-model="activeTab" @tab-change="refresh">
        <el-tab-pane label="NAS 安全审计" name="nas"><div class="flex justify-end mb-3"><el-button @click="refresh">刷新</el-button></div><el-table v-loading="loading" :data="nasAudits"><el-table-column label="时间" prop="occurredAt" min-width="180" /><el-table-column label="NAS ID" prop="nasDeviceId" width="100" /><el-table-column label="事件" prop="eventType" /><el-table-column label="协议" prop="protocol" width="110" /><el-table-column label="Secret 引用" prop="secretReference" min-width="160" /><el-table-column label="版本" prop="secretVersion" width="90" /><el-table-column label="管理员" prop="actorAdminUserId" width="110" /><el-table-column label="地址数" prop="addressCount" width="90" /></el-table></el-tab-pane>
        <el-tab-pane label="用户凭据审计" name="credentials"><el-table v-loading="loading" :data="credentialAudits"><el-table-column label="时间" prop="occurredAt" min-width="180" /><el-table-column label="AAA 用户 ID" prop="userId" width="120" /><el-table-column label="凭据类型" prop="credentialType" min-width="170" /><el-table-column label="版本" prop="credentialVersion" width="100" /><el-table-column label="管理员" prop="actorAdminUserId" width="120" /></el-table></el-tab-pane>
        <el-tab-pane label="认证配置审计" name="auth"><el-table v-loading="loading" :data="authAudits"><el-table-column label="时间" prop="occurredAt" min-width="180" /><el-table-column label="对象类型" prop="entityType" /><el-table-column label="对象 ID" prop="entityId" /><el-table-column label="版本" prop="entityVersion" /><el-table-column label="事件" prop="eventType" /><el-table-column label="管理员" prop="actorAdminUserId" width="120" /><el-table-column label="配置摘要" prop="contentSha256" min-width="220" /></el-table></el-tab-pane>
        <el-tab-pane label="CoA 任务复核" name="coa"><div class="flex justify-end mb-3"><el-button @click="refresh">刷新任务</el-button></div><el-table v-loading="loading" :data="coaTasks"><el-table-column label="任务 ID" prop="id" width="100" /><el-table-column label="NAS ID" prop="nasDeviceId" /><el-table-column label="会话 UUID" prop="sessionUuid" min-width="240" /><el-table-column label="操作" prop="requestType" /><el-table-column label="状态" prop="taskStatus" /><el-table-column label="创建时间" prop="createdAt" min-width="180" /><el-table-column label="复核" width="110"><template #default="{ row }"><el-button v-hasPermi="['aaa:coa-task-review:list']" link @click="showCoaHistory(row)">历史</el-button><el-button v-hasPermi="['aaa:coa-task-review:record']" link type="primary" @click="reviewCoa(row)">记录复核</el-button></template></el-table-column></el-table></el-tab-pane>
        <el-tab-pane label="动态授权复核" name="dynamic"><div class="flex justify-end mb-3"><el-button @click="refresh">刷新操作</el-button></div><el-table v-loading="loading" :data="dynamicOperations"><el-table-column label="操作 ID" prop="id" width="110" /><el-table-column label="Provider" prop="providerId" /><el-table-column label="NAS ID" prop="nasDeviceId" /><el-table-column label="会话 UUID" prop="sessionUuid" min-width="240" /><el-table-column label="操作状态" prop="operationState" /><el-table-column label="复核" width="110"><template #default="{ row }"><el-button v-hasPermi="['aaa:dynamic-auth-review:list']" link @click="showDynamicHistory(row)">历史</el-button><el-button v-hasPermi="['aaa:dynamic-auth-review:record']" link type="primary" @click="reviewDynamic(row)">记录复核</el-button></template></el-table-column></el-table></el-tab-pane>
      </el-tabs>
    </el-card>
    <el-dialog v-model="historyVisible" title="人工复核历史" width="760px">
      <el-table :data="reviewHistory">
        <el-table-column label="复核时间" prop="reviewedAt" min-width="180" />
        <el-table-column label="复核结论" prop="disposition" width="170" />
        <el-table-column label="管理员" prop="actorId" width="100" />
        <el-table-column label="说明" prop="note" min-width="180" show-overflow-tooltip />
        <el-table-column label="证据引用" prop="evidenceReference" min-width="160" show-overflow-tooltip />
      </el-table>
    </el-dialog>
    <el-dialog v-model="reviewVisible" title="记录人工复核" width="560px">
      <el-alert title="复核仅记录审查结论与证据，不会重试 CoA、改变 NAS 状态或改写 RADIUS 会话。" type="info" :closable="false" class="mb-3" />
      <el-form label-width="110px"><el-form-item label="复核结论"><el-select v-model="reviewForm.disposition" style="width: 100%"><el-option label="已确认 ACK" value="ACKNOWLEDGED" /><el-option label="升级处理" value="ESCALATED" /><el-option label="已记录证据" value="EVIDENCE_RECORDED" /></el-select></el-form-item><el-form-item label="复核说明"><el-input v-model="reviewForm.note" type="textarea" maxlength="2000" /></el-form-item><el-form-item label="证据引用"><el-input v-model="reviewForm.evidenceReference" maxlength="512" /></el-form-item></el-form>
      <template #footer><el-button @click="reviewVisible = false">取消</el-button><el-button type="primary" @click="submitReview">保存复核</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { listAuthConfigurationAudit, listDynamicAuthorizationOperations, listNasSecurityAudit, listUserCredentialAudit, listCoaTasks, recordCoaTaskReview, recordDynamicAuthorizationReview, getCoaTaskReviewHistory, getDynamicAuthorizationReviewHistory } from '@/api/aaa';

const activeTab = ref('nas');
const loading = ref(false);
const nasAudits = ref<any[]>([]), credentialAudits = ref<any[]>([]), authAudits = ref<any[]>([]), coaTasks = ref<any[]>([]), dynamicOperations = ref<any[]>([]);
const reviewVisible = ref(false);
const historyVisible = ref(false);
const reviewHistory = ref<any[]>([]);
const reviewTarget = ref<{ kind: 'coa' | 'dynamic'; id: number }>();
const reviewForm = reactive({ reviewUuid: '', disposition: 'ACKNOWLEDGED', note: '', evidenceReference: '' });
async function refresh() {
  loading.value = true;
  try {
    const res = activeTab.value === 'nas' ? await listNasSecurityAudit() :
      activeTab.value === 'credentials' ? await listUserCredentialAudit() :
      activeTab.value === 'auth' ? await listAuthConfigurationAudit() :
      activeTab.value === 'coa' ? await listCoaTasks() : await listDynamicAuthorizationOperations();
    if (activeTab.value === 'nas') nasAudits.value = res.data ?? [];
    if (activeTab.value === 'credentials') credentialAudits.value = res.data ?? [];
    if (activeTab.value === 'auth') authAudits.value = res.data ?? [];
    if (activeTab.value === 'coa') coaTasks.value = res.data ?? [];
    if (activeTab.value === 'dynamic') dynamicOperations.value = res.data ?? [];
  } finally { loading.value = false; }
}
async function showCoaHistory(row: any) { const res = await getCoaTaskReviewHistory(row.id); reviewHistory.value = res.data ?? []; historyVisible.value = true; }
async function showDynamicHistory(row: any) { const res = await getDynamicAuthorizationReviewHistory(row.id); reviewHistory.value = res.data ?? []; historyVisible.value = true; }
function openReview(kind: 'coa' | 'dynamic', id: number) { reviewTarget.value = { kind, id }; Object.assign(reviewForm, { reviewUuid: crypto.randomUUID(), disposition: 'ACKNOWLEDGED', note: '', evidenceReference: '' }); reviewVisible.value = true; }
function reviewCoa(row: any) { openReview('coa', row.id); }
function reviewDynamic(row: any) { openReview('dynamic', row.id); }
async function submitReview() {
  if (!reviewTarget.value) return;
  const payload = { ...reviewForm };
  if (reviewTarget.value.kind === 'coa') await recordCoaTaskReview(reviewTarget.value.id, payload);
  else await recordDynamicAuthorizationReview(reviewTarget.value.id, payload);
  ElMessage.success('人工复核记录已保存'); reviewVisible.value = false; await refresh();
}
onMounted(refresh);
</script>
