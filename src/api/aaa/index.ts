import type { AxiosPromise } from '@/utils/api-types';
import request from '@/utils/request';

export type PageResult<T> = { rows: T[]; total: number };
export type RadiusUserStatus = 'ACTIVE' | 'DISABLED' | 'LOCKED' | 'EXPIRED' | 'PENDING_DELETE' | 'DELETED' | 'ANONYMIZED';
export type NasStatus = 'ENABLED' | 'DISABLED';
export type IdentityType = 'USERNAME' | 'MAC';
export type IdentityScope = 'GLOBAL' | 'NAS';
export type ProviderType = 'LOCAL_CREDENTIAL' | 'LDAP' | 'ACTIVE_DIRECTORY' | 'UPSTREAM_RADIUS' | 'EAP';
export type LifecycleStatus = 'DRAFT' | 'PUBLISHED' | 'RETIRED';

export interface RadiusUser {
  id: number;
  userUuid: string;
  tenantUuid: string;
  userNo: string;
  displayName?: string;
  userType: string;
  status: RadiusUserStatus;
  validFrom?: string;
  validUntil?: string;
  deletedAt?: string;
  version: number;
}

export interface RadiusUserCreate {
  userNo: string;
  displayName?: string;
  userType: string;
  validFrom?: string;
  validUntil?: string;
  reason: string;
}

export interface RadiusUserIdentityBind {
  identityType: IdentityType;
  scope: IdentityScope;
  identity: string;
  nasIdentity?: string;
}

export interface NasAddress {
  endpointName: string;
  ipAddress: string;
  enabled: boolean;
}

export interface NasDevice {
  id?: number;
  businessId: string;
  tenantUuid: string;
  identity: string;
  displayName: string;
  vendorId: string;
  modelId?: string;
  status: NasStatus;
  accountingInterimIntervalMinutes?: number;
  configVersion: number;
  addresses: Array<{ endpointName: string; address: number[] | string; enabled: boolean }>;
  secrets?: Array<{ protocol: string; version: number; lifecycleStatus: string }>;
  requireAccessMessageAuthenticator: boolean;
}

export interface NasDeviceCreate {
  identity: string;
  displayName: string;
  vendorId: string;
  modelId?: string;
  accountingInterimIntervalMinutes?: number;
  addresses: NasAddress[];
  requireAccessMessageAuthenticator: boolean;
}

export interface RadiusGroup {
  id: number;
  groupCode: string;
  groupName: string;
  status: string;
  [key: string]: unknown;
}
export interface RadiusTag {
  id: number;
  tagCode: string;
  tagName: string;
  [key: string]: unknown;
}
export interface RadiusDevice {
  id: number;
  userId: number;
  deviceKey: string;
  macAddress?: string;
  deviceType?: string;
  status: string;
  [key: string]: unknown;
}
export interface AuthProvider {
  tenantUuid: string;
  providerId: string;
  providerVersion: string;
  providerType: ProviderType;
  displayName: string;
  contentSha256: string;
  lifecycleStatus: LifecycleStatus;
}
export interface AuthPolicyCondition {
  conditionGroup: number;
  type: string;
  operator: string;
  value: string;
}
export interface AuthPolicy {
  tenantUuid: string;
  policyId: string;
  policyVersion: string;
  policyName: string;
  priority: number;
  providerId: string;
  providerVersion: string;
  providerType: ProviderType;
  decision: 'AUTHENTICATE' | 'REJECT';
  lifecycleStatus: LifecycleStatus;
  enabled: boolean;
  contentSha256: string;
  conditions: AuthPolicyCondition[];
}
export interface TenantSummary {
  tenantUuid: string;
  tenantCode: string;
  tenantName: string;
}

const aaa = '/aaa';

export const listRadiusUsers = (params: { userNo?: string; status?: RadiusUserStatus; page?: number; size?: number }): AxiosPromise<PageResult<RadiusUser>> =>
  request({ url: `${aaa}/users`, method: 'get', params });
export const getRadiusUser = (userId: number): AxiosPromise<RadiusUser> =>
  request({ url: `${aaa}/users/${userId}`, method: 'get' });
export const createRadiusUser = (data: RadiusUserCreate): AxiosPromise<RadiusUser> =>
  request({ url: `${aaa}/users`, method: 'post', data });
export const changeRadiusUserStatus = (userId: number, data: { expectedVersion: number; status: RadiusUserStatus; reason: string }) =>
  request({ url: `${aaa}/users/${userId}/status`, method: 'put', data });
export const bindRadiusIdentity = (userId: number, data: RadiusUserIdentityBind) =>
  request({ url: `${aaa}/users/${userId}/identities`, method: 'post', data });
export const disableRadiusIdentity = (identityId: number) =>
  request({ url: `${aaa}/users/identities/${identityId}`, method: 'delete' });
export const replaceRadiusUserPassword = (userId: number, password: string) =>
  request({ url: `${aaa}/users/${userId}/credential`, method: 'put', data: { password }, headers: { repeatSubmit: false } });
export const replaceEapMschapv2Password = (userId: number, password: string) =>
  request({ url: `${aaa}/users/${userId}/eap-mschapv2-credential`, method: 'put', data: { password }, headers: { repeatSubmit: false } });
export const replaceUpstreamCredential = (userId: number, data: { credentialAlias: string; operatorUsername: string; password: string }) =>
  request({ url: `${aaa}/users/${userId}/upstream-credential`, method: 'put', data, headers: { repeatSubmit: false } });
export const revokeUpstreamCredential = (userId: number, credentialAlias = 'default') =>
  request({ url: `${aaa}/users/${userId}/upstream-credential`, method: 'delete', params: { credentialAlias } });

export const listNasDevices = (): AxiosPromise<NasDevice[]> =>
  request({ url: `${aaa}/nas`, method: 'get' });
export const getNasDevice = (nasDeviceId: number): AxiosPromise<NasDevice> =>
  request({ url: `${aaa}/nas/${nasDeviceId}`, method: 'get' });
export const createNasDevice = (data: NasDeviceCreate): AxiosPromise<NasDevice> =>
  request({ url: `${aaa}/nas`, method: 'post', data });
export const changeNasStatus = (id: number, expectedConfigVersion: number, status: NasStatus) =>
  request({ url: `${aaa}/nas/${id}/status`, method: 'put', data: { expectedConfigVersion, status } });
export const replaceNasAddresses = (id: number, expectedConfigVersion: number, addresses: NasAddress[]) =>
  request({ url: `${aaa}/nas/${id}/addresses`, method: 'put', data: { expectedConfigVersion, addresses } });
export const changeNasMessageAuthenticator = (id: number, expectedConfigVersion: number, required: boolean) =>
  request({ url: `${aaa}/nas/${id}/security/message-authenticator`, method: 'put', data: { expectedConfigVersion, required } });
export const generateNasRadiusSecret = (id: number) =>
  request({ url: `${aaa}/nas/${id}/secrets/radius/generate`, method: 'post' });
export const rotateNasRadiusSecret = (id: number, secret: string) =>
  request({ url: `${aaa}/nas/${id}/secrets/radius`, method: 'put', data: { secret }, headers: { repeatSubmit: false } });

export const listGroups = (): AxiosPromise<RadiusGroup[]> => request({ url: `${aaa}/groups`, method: 'get' });
export const createGroup = (data: { groupCode: string; groupName: string }) => request({ url: `${aaa}/groups`, method: 'post', data });
export const changeGroupStatus = (id: number, status: string) => request({ url: `${aaa}/groups/${id}/status`, method: 'put', data: { status } });
export const setGroupMember = (groupId: number, userId: number, data: { enabled: boolean; effectiveAt?: string; reason: string }) =>
  request({ url: `${aaa}/groups/${groupId}/members/${userId}`, method: 'put', data });
export const listTags = (): AxiosPromise<RadiusTag[]> => request({ url: `${aaa}/tags`, method: 'get' });
export const createTag = (data: { tagCode: string; tagName: string }) => request({ url: `${aaa}/tags`, method: 'post', data });
export const setUserTag = (userId: number, tagId: number, assigned = true) =>
  request({ url: `${aaa}/users/${userId}/tags/${tagId}`, method: 'put', params: { assigned } });
export const listRadiusDevices = (userId?: number): AxiosPromise<RadiusDevice[]> =>
  request({ url: `${aaa}/devices`, method: 'get', params: { userId } });
export const registerRadiusDevice = (data: { userId: number; deviceKey: string; macAddress?: string; deviceType?: string }) =>
  request({ url: `${aaa}/devices`, method: 'post', data });
export const changeRadiusDeviceStatus = (id: number, status: string) =>
  request({ url: `${aaa}/devices/${id}/status`, method: 'put', data: { status } });

export const listAuthProviders = (): AxiosPromise<AuthProvider[]> => request({ url: `${aaa}/auth-providers`, method: 'get' });
export const createAuthProvider = (data: { providerId: string; providerVersion: string; providerType: ProviderType; displayName: string; configuration: Record<string, unknown> }) =>
  request({ url: `${aaa}/auth-providers`, method: 'post', data });
export const updateAuthProvider = (providerId: string, version: string, data: { expectedContentSha256: string; displayName: string; configuration: Record<string, unknown> }) =>
  request({ url: `${aaa}/auth-providers/${providerId}/versions/${version}`, method: 'put', data });
export const discardAuthProvider = (providerId: string, version: string) =>
  request({ url: `${aaa}/auth-providers/${providerId}/versions/${version}`, method: 'delete' });
export const publishAuthProvider = (providerId: string, version: string) =>
  request({ url: `${aaa}/auth-providers/${providerId}/versions/${version}/publish`, method: 'put' });
export const listAuthPolicies = (): AxiosPromise<AuthPolicy[]> => request({ url: `${aaa}/auth-policies`, method: 'get' });
export const createAuthPolicy = (data: Omit<AuthPolicy, 'tenantUuid' | 'lifecycleStatus' | 'contentSha256'>) =>
  request({ url: `${aaa}/auth-policies`, method: 'post', data });
export const updateAuthPolicy = (policyId: string, version: string, data: Omit<AuthPolicy, 'tenantUuid' | 'policyId' | 'policyVersion' | 'lifecycleStatus' | 'contentSha256'> & { expectedContentSha256: string }) =>
  request({ url: `${aaa}/auth-policies/${policyId}/versions/${version}`, method: 'put', data });
export const discardAuthPolicy = (policyId: string, version: string) =>
  request({ url: `${aaa}/auth-policies/${policyId}/versions/${version}`, method: 'delete' });
export const publishAuthPolicy = (policyId: string, version: string) =>
  request({ url: `${aaa}/auth-policies/${policyId}/versions/${version}/publish`, method: 'put' });
export const rollbackAuthPolicy = (policyId: string, sourceVersion: string, targetVersion: string) =>
  request({ url: `${aaa}/auth-policies/${policyId}/versions/${sourceVersion}/rollback`, method: 'post', params: { targetVersion } });

export const listAuthConfigurationAudit = (limit = 100) => request({ url: `${aaa}/audit/auth-configuration`, method: 'get', params: { limit } });
export const listNasSecurityAudit = (limit = 100) => request({ url: `${aaa}/audit/nas-security`, method: 'get', params: { limit } });
export const listUserCredentialAudit = (limit = 100) => request({ url: `${aaa}/audit/user-credentials`, method: 'get', params: { limit } });
export const listCoaTasks = (afterId = 0, limit = 50) => request({ url: `${aaa}/coa-task/reviews`, method: 'get', params: { afterId, limit } });
export const getCoaTaskReviewHistory = (taskId: number, limit = 100) => request({ url: `${aaa}/coa-task/reviews/${taskId}/history`, method: 'get', params: { limit } });
export const recordCoaTaskReview = (taskId: number, data: { reviewUuid: string; disposition: string; note?: string; evidenceReference?: string }) =>
  request({ url: `${aaa}/coa-task/reviews/${taskId}`, method: 'post', data });
export const listDynamicAuthorizationOperations = (afterId = 0, limit = 50) =>
  request({ url: `${aaa}/dynamic-authorization/reviews`, method: 'get', params: { afterId, limit } });
export const getDynamicAuthorizationReviewHistory = (id: number, limit = 100) =>
  request({ url: `${aaa}/dynamic-authorization/reviews/${id}/history`, method: 'get', params: { limit } });
export const recordDynamicAuthorizationReview = (id: number, data: { reviewUuid: string; disposition: string; note?: string; evidenceReference?: string }) =>
  request({ url: `${aaa}/dynamic-authorization/reviews/${id}`, method: 'post', data });

export const listTenants = (): AxiosPromise<TenantSummary[]> => request({ url: '/system/tenant/list', method: 'get' });
export const getTenantContext = (): AxiosPromise<TenantSummary> => request({ url: '/system/tenant/context', method: 'get' });
export const switchTenantContext = (tenantUuid: string): AxiosPromise<TenantSummary> =>
  request({ url: `/system/tenant/context/${tenantUuid}`, method: 'put' });

export interface UpstreamDynamicAuthorizationClient {
  id: number;
  providerId: string;
  providerVersion: string;
  secretReferenceId: string;
  sourceAddress: string;
  sourcePort: number;
  enabled: boolean;
  effectiveFrom?: string;
  effectiveUntil?: string;
  version: number;
  createdAt?: string;
  updatedAt?: string;
}
export const createUpstreamServerSecretReference = (providerId: string, providerVersion: string, data: { referenceId: string; sharedSecret: string }) =>
  request({ url: `${aaa}/providers/${providerId}/versions/${providerVersion}/server-secret-references`, method: 'post', data, headers: { repeatSubmit: false } });
export const rotateUpstreamServerSecretReference = (providerId: string, providerVersion: string, referenceId: string, sharedSecret: string) =>
  request({ url: `${aaa}/providers/${providerId}/versions/${providerVersion}/server-secret-references/${referenceId}`, method: 'put', data: { sharedSecret }, headers: { repeatSubmit: false } });
export const disableUpstreamServerSecretReference = (providerId: string, providerVersion: string, referenceId: string) =>
  request({ url: `${aaa}/providers/${providerId}/versions/${providerVersion}/server-secret-references/${referenceId}`, method: 'delete' });
export const listUpstreamDynamicAuthorizationClients = (providerId: string, providerVersion: string): AxiosPromise<UpstreamDynamicAuthorizationClient[]> =>
  request({ url: `${aaa}/providers/${providerId}/versions/${providerVersion}/dynamic-authorization-clients`, method: 'get' });
export const createUpstreamDynamicAuthorizationClient = (providerId: string, providerVersion: string, data: Omit<UpstreamDynamicAuthorizationClient, 'id' | 'providerId' | 'providerVersion' | 'enabled' | 'version' | 'createdAt' | 'updatedAt'>) =>
  request({ url: `${aaa}/providers/${providerId}/versions/${providerVersion}/dynamic-authorization-clients`, method: 'post', data });
export const updateUpstreamDynamicAuthorizationClient = (providerId: string, providerVersion: string, clientId: number, data: Omit<UpstreamDynamicAuthorizationClient, 'id' | 'providerId' | 'providerVersion' | 'enabled' | 'version' | 'createdAt' | 'updatedAt'> & { expectedVersion: number }) =>
  request({ url: `${aaa}/providers/${providerId}/versions/${providerVersion}/dynamic-authorization-clients/${clientId}`, method: 'put', data });
export const setUpstreamDynamicAuthorizationClientEnabled = (providerId: string, providerVersion: string, clientId: number, expectedVersion: number, enabled: boolean) =>
  request({ url: `${aaa}/providers/${providerId}/versions/${providerVersion}/dynamic-authorization-clients/${clientId}/${enabled ? 'enable' : 'disable'}`, method: 'post', params: { expectedVersion } });
export const validateUpstreamDynamicAuthorizationClient = (providerId: string, providerVersion: string, clientId: number) =>
  request({ url: `${aaa}/providers/${providerId}/versions/${providerVersion}/dynamic-authorization-clients/${clientId}/validate`, method: 'post' });
export const listUpstreamDynamicAuthorizationClientAudit = (clientId: number, limit = 100) =>
  request({ url: `${aaa}/audit/upstream-dynamic-authorization-clients/${clientId}`, method: 'get', params: { limit } });

export interface RadiusUserPersonalDataPresence {
  userId: number;
  phonePresent: boolean;
  emailPresent: boolean;
  idNumberPresent: boolean;
  fullNamePresent: boolean;
  addressPresent: boolean;
}
export interface RadiusUserPersonalDataSensitive {
  userId: number;
  phone?: string;
  email?: string;
  idNumber?: string;
  fullName?: string;
  address?: string;
}
export const getRadiusUserPersonalData = (userId: number): AxiosPromise<RadiusUserPersonalDataPresence> =>
  request({ url: `${aaa}/users/${userId}/personal-data`, method: 'get' });
export const replaceRadiusUserPersonalData = (userId: number, data: { phone?: string; email?: string; idNumber?: string; fullName?: string; address?: string; reason: string }) =>
  request({ url: `${aaa}/users/${userId}/personal-data`, method: 'put', data, headers: { repeatSubmit: false } });
export const decryptRadiusUserPersonalData = (userId: number, data: { phone: boolean; email: boolean; idNumber: boolean; fullName: boolean; address: boolean; reason: string }): AxiosPromise<RadiusUserPersonalDataSensitive> =>
  request({ url: `${aaa}/users/${userId}/personal-data/decrypt`, method: 'post', data, headers: { repeatSubmit: false } });
