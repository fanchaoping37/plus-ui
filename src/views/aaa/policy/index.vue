<template>
  <div class="p-2 app-container">
    <el-card shadow="never">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="用户组" name="groups">
          <div class="flex justify-end mb-3"><el-button v-hasPermi="['aaa:group:add']" type="primary" icon="Plus" @click="groupVisible = true">新增用户组</el-button></div>
          <el-table v-loading="loading" :data="groups">
            <el-table-column label="ID" prop="id" width="90" />
            <el-table-column label="组编码" prop="groupCode" />
            <el-table-column label="组名称" prop="groupName" />
            <el-table-column label="状态" prop="status" width="120"><template #default="{ row }"><el-tag :type="row.status === 'ENABLED' ? 'success' : 'info'">{{ row.status }}</el-tag></template></el-table-column>
            <el-table-column label="操作" width="250">
              <template #default="{ row }">
                <el-button v-hasPermi="['aaa:group:member']" link type="primary" @click="openMember(row)">成员关系</el-button>
                <el-button v-hasPermi="['aaa:group:edit']" link type="warning" @click="toggleGroup(row)">{{ row.status === 'ENABLED' ? '停用' : '启用' }}</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="用户标签" name="tags">
          <div class="flex justify-end mb-3"><el-button v-hasPermi="['aaa:tag:add']" type="primary" icon="Plus" @click="tagVisible = true">新增标签</el-button></div>
          <el-table v-loading="loading" :data="tags">
            <el-table-column label="ID" prop="id" width="90" /><el-table-column label="标签编码" prop="tagCode" /><el-table-column label="标签名称" prop="tagName" />
            <el-table-column label="操作" width="180"><template #default="{ row }"><el-button v-hasPermi="['aaa:tag:bind']" link type="primary" @click="openTagBinding(row)">绑定用户</el-button></template></el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="终端设备" name="devices">
          <div class="flex justify-between items-center mb-3"><el-input-number v-model="deviceUserId" :min="1" placeholder="用户 ID" /><div><el-button @click="getDevices">查询</el-button><el-button v-hasPermi="['aaa:device:add']" type="primary" icon="Plus" @click="deviceVisible = true">登记设备</el-button></div></div>
          <el-table v-loading="loading" :data="devices">
            <el-table-column label="设备 ID" prop="id" width="100" /><el-table-column label="AAA 用户 ID" prop="userId" width="120" /><el-table-column label="设备标识" prop="deviceKey" min-width="180" /><el-table-column label="MAC 地址" prop="macAddress" width="170" /><el-table-column label="设备类型" prop="deviceType" /><el-table-column label="状态" prop="status" width="120" />
            <el-table-column label="操作" width="150"><template #default="{ row }"><el-button v-hasPermi="['aaa:device:edit']" link type="warning" @click="toggleDevice(row)">{{ row.status === 'ACTIVE' ? '阻断设备' : '恢复设备' }}</el-button></template></el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="groupVisible" title="新增用户组" width="480px">
      <el-form label-width="100px"><el-form-item label="组编码"><el-input v-model="groupForm.groupCode" maxlength="64" /></el-form-item><el-form-item label="组名称"><el-input v-model="groupForm.groupName" maxlength="128" /></el-form-item></el-form>
      <template #footer><el-button @click="groupVisible = false">取消</el-button><el-button type="primary" @click="submitGroup">创建</el-button></template>
    </el-dialog>
    <el-dialog v-model="tagVisible" title="新增用户标签" width="480px">
      <el-form label-width="100px"><el-form-item label="标签编码"><el-input v-model="tagForm.tagCode" maxlength="64" /></el-form-item><el-form-item label="标签名称"><el-input v-model="tagForm.tagName" maxlength="128" /></el-form-item></el-form>
      <template #footer><el-button @click="tagVisible = false">取消</el-button><el-button type="primary" @click="submitTag">创建</el-button></template>
    </el-dialog>
    <el-dialog v-model="memberVisible" title="设置用户组成员关系" width="520px">
      <el-form label-width="110px"><el-form-item label="用户组"><span>{{ activeGroup?.groupName }}</span></el-form-item><el-form-item label="AAA 用户 ID"><el-input-number v-model="memberForm.userId" :min="1" /></el-form-item><el-form-item label="关系状态"><el-switch v-model="memberForm.enabled" active-text="加入" inactive-text="移除" /></el-form-item><el-form-item label="生效时间"><el-date-picker v-model="memberForm.effectiveAt" type="datetime" value-format="YYYY-MM-DDTHH:mm:ssZ" /></el-form-item><el-form-item label="操作原因"><el-input v-model="memberForm.reason" type="textarea" /></el-form-item></el-form>
      <template #footer><el-button @click="memberVisible = false">取消</el-button><el-button type="primary" @click="submitMember">保存</el-button></template>
    </el-dialog>
    <el-dialog v-model="tagBindingVisible" title="绑定 / 解绑用户标签" width="480px">
      <el-form label-width="100px"><el-form-item label="标签"><span>{{ activeTag?.tagName }}</span></el-form-item><el-form-item label="AAA 用户 ID"><el-input-number v-model="tagBindingForm.userId" :min="1" /></el-form-item><el-form-item label="分配标签"><el-switch v-model="tagBindingForm.assigned" active-text="绑定" inactive-text="解绑" /></el-form-item></el-form>
      <template #footer><el-button @click="tagBindingVisible = false">取消</el-button><el-button type="primary" @click="submitTagBinding">提交</el-button></template>
    </el-dialog>
    <el-dialog v-model="deviceVisible" title="登记用户终端设备" width="520px">
      <el-form label-width="100px"><el-form-item label="AAA 用户 ID"><el-input-number v-model="deviceForm.userId" :min="1" /></el-form-item><el-form-item label="设备标识"><el-input v-model="deviceForm.deviceKey" maxlength="128" /></el-form-item><el-form-item label="MAC 地址"><el-input v-model="deviceForm.macAddress" placeholder="AA:BB:CC:DD:EE:FF" /></el-form-item><el-form-item label="设备类型"><el-input v-model="deviceForm.deviceType" maxlength="64" /></el-form-item></el-form>
      <template #footer><el-button @click="deviceVisible = false">取消</el-button><el-button type="primary" @click="submitDevice">登记</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { changeGroupStatus, changeRadiusDeviceStatus, createGroup, createTag, listGroups, listRadiusDevices, listTags, registerRadiusDevice, setGroupMember, setUserTag, type RadiusDevice, type RadiusGroup, type RadiusTag } from '@/api/aaa';

const activeTab = ref('groups');
const loading = ref(false);
const groups = ref<RadiusGroup[]>([]);
const tags = ref<RadiusTag[]>([]);
const devices = ref<RadiusDevice[]>([]);
const groupVisible = ref(false), tagVisible = ref(false), memberVisible = ref(false), tagBindingVisible = ref(false), deviceVisible = ref(false);
const groupForm = reactive({ groupCode: '', groupName: '' });
const tagForm = reactive({ tagCode: '', tagName: '' });
const activeGroup = ref<RadiusGroup>();
const activeTag = ref<RadiusTag>();
const memberForm = reactive({ userId: 0, enabled: true, effectiveAt: '', reason: '' });
const tagBindingForm = reactive({ userId: 0, assigned: true });
const deviceUserId = ref<number>();
const deviceForm = reactive({ userId: 0, deviceKey: '', macAddress: '', deviceType: '' });

async function getGroups() { const res = await listGroups(); groups.value = res.data ?? []; }
async function getTags() { const res = await listTags(); tags.value = res.data ?? []; }
async function getDevices() { const res = await listRadiusDevices(deviceUserId.value); devices.value = res.data ?? []; }
async function refresh() {
  loading.value = true;
  try { await Promise.all([getGroups(), getTags(), getDevices()]); }
  finally { loading.value = false; }
}
async function submitGroup() { if (!groupForm.groupCode.trim() || !groupForm.groupName.trim()) return ElMessage.warning('请填写组编码和名称'); await createGroup({ ...groupForm }); groupVisible.value = false; Object.assign(groupForm, { groupCode: '', groupName: '' }); await getGroups(); }
async function submitTag() { if (!tagForm.tagCode.trim() || !tagForm.tagName.trim()) return ElMessage.warning('请填写标签编码和名称'); await createTag({ ...tagForm }); tagVisible.value = false; Object.assign(tagForm, { tagCode: '', tagName: '' }); await getTags(); }
async function toggleGroup(row: RadiusGroup) { const status = row.status === 'ENABLED' ? 'DISABLED' : 'ENABLED'; await ElMessageBox.confirm(`确认将用户组 ${row.groupCode} 设置为 ${status}？`); await changeGroupStatus(row.id, status); await getGroups(); }
function openMember(row: RadiusGroup) { activeGroup.value = row; Object.assign(memberForm, { userId: 0, enabled: true, effectiveAt: '', reason: '' }); memberVisible.value = true; }
async function submitMember() { if (!activeGroup.value || memberForm.userId < 1 || !memberForm.reason.trim()) return ElMessage.warning('请填写用户 ID 和操作原因'); await setGroupMember(activeGroup.value.id, memberForm.userId, { ...memberForm, effectiveAt: memberForm.effectiveAt || undefined }); memberVisible.value = false; ElMessage.success('成员关系已更新'); }
function openTagBinding(row: RadiusTag) { activeTag.value = row; Object.assign(tagBindingForm, { userId: 0, assigned: true }); tagBindingVisible.value = true; }
async function submitTagBinding() { if (!activeTag.value || tagBindingForm.userId < 1) return ElMessage.warning('请输入 AAA 用户 ID'); await setUserTag(tagBindingForm.userId, activeTag.value.id, tagBindingForm.assigned); tagBindingVisible.value = false; ElMessage.success('标签关系已更新'); }
async function submitDevice() { if (deviceForm.userId < 1 || !deviceForm.deviceKey.trim()) return ElMessage.warning('请填写用户 ID 和设备标识'); await registerRadiusDevice({ ...deviceForm }); deviceVisible.value = false; await getDevices(); }
async function toggleDevice(row: RadiusDevice) { const status = row.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE'; await ElMessageBox.confirm(`确认将设备状态改为 ${status}？`); await changeRadiusDeviceStatus(row.id, status); await getDevices(); }
onMounted(refresh);
</script>
