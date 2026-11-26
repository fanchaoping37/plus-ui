<template>
  <div class="p-2 app-container">
    <el-alert title="租户创建和管理员授权仅由系统超级管理员执行；实际权限由后端校验，本页面不接受调用方自行指定当前租户作为授权依据。" type="warning" :closable="false" class="mb-3" />
    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between"><strong>租户管理</strong><el-button v-hasRole="['superadmin']" type="primary" icon="Plus" @click="createVisible = true">创建租户</el-button></div>
      </template>
      <el-table v-loading="loading" :data="tenants">
        <el-table-column label="租户编码" prop="tenantCode" width="200" />
        <el-table-column label="租户名称" prop="tenantName" min-width="200" />
        <el-table-column label="Tenant UUID" prop="tenantUuid" min-width="280" />
        <el-table-column label="操作" width="150"><template #default="{ row }"><el-button v-hasRole="['superadmin']" link type="primary" @click="openGrant(row)">授权管理员</el-button></template></el-table-column>
      </el-table>
    </el-card>
    <el-dialog v-model="createVisible" title="创建租户" width="520px" destroy-on-close>
      <el-form label-width="110px">
        <el-form-item label="租户编码"><el-input v-model="createForm.tenantCode" maxlength="64" placeholder="大写字母、数字、下划线或连字符" /></el-form-item>
        <el-form-item label="租户名称"><el-input v-model="createForm.tenantName" maxlength="128" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="createVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitCreate">创建</el-button></template>
    </el-dialog>
    <el-dialog v-model="grantVisible" title="授予租户管理员权限" width="520px" destroy-on-close>
      <el-alert title="只提交系统管理员用户 ID。后端会再次校验当前操作者为系统超级管理员。" type="info" :closable="false" class="mb-3" />
      <el-form label-width="110px"><el-form-item label="租户"><span>{{ activeTenant?.tenantCode }} · {{ activeTenant?.tenantName }}</span></el-form-item><el-form-item label="管理员用户 ID"><el-input-number v-model="adminUserId" :min="1" /></el-form-item></el-form>
      <template #footer><el-button @click="grantVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitGrant">授权</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { createTenant, grantTenantAdministrator, listTenants, type TenantSummary } from '@/api/aaa';

const loading = ref(false), saving = ref(false);
const tenants = ref<TenantSummary[]>([]);
const createVisible = ref(false), grantVisible = ref(false);
const createForm = reactive({ tenantCode: '', tenantName: '' });
const activeTenant = ref<TenantSummary>();
const adminUserId = ref(0);
async function getList() {
  loading.value = true;
  try { const res = await listTenants(); tenants.value = res.data ?? []; }
  finally { loading.value = false; }
}
async function submitCreate() {
  if (!/^[A-Z0-9][A-Z0-9_-]{1,63}$/.test(createForm.tenantCode) || !createForm.tenantName.trim()) return ElMessage.warning('请填写符合规则的租户编码和名称');
  saving.value = true;
  try { await createTenant({ ...createForm }); ElMessage.success('租户已创建'); createVisible.value = false; Object.assign(createForm, { tenantCode: '', tenantName: '' }); await getList(); }
  finally { saving.value = false; }
}
function openGrant(row: TenantSummary) { activeTenant.value = row; adminUserId.value = 0; grantVisible.value = true; }
async function submitGrant() {
  if (!activeTenant.value || adminUserId.value < 1) return ElMessage.warning('请输入有效的管理员用户 ID');
  saving.value = true;
  try { await grantTenantAdministrator(activeTenant.value.tenantUuid, adminUserId.value); ElMessage.success('租户管理员授权已完成'); grantVisible.value = false; }
  finally { saving.value = false; }
}
onMounted(getList);
</script>
