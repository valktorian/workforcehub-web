export const Roles = {
  Employee: 'Employee',
  Manager: 'Manager',
  HrManager: 'HRManager',
  HrAdmin: 'HRAdmin',
  HrViewer: 'HRViewer',
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];

export const ASSIGNABLE_ROLES: readonly Role[] = [
  Roles.Employee,
  Roles.Manager,
  Roles.HrManager,
  Roles.HrAdmin,
  Roles.HrViewer,
];

export const ACCOUNT_ADMINS: readonly Role[] = [Roles.HrAdmin];
export const HR_STAFF: readonly Role[] = [Roles.HrAdmin, Roles.HrViewer, Roles.HrManager];
export const TIME_ADMINS: readonly Role[] = [Roles.HrAdmin, Roles.HrViewer];
export const TIME_REVIEWERS: readonly Role[] = [Roles.Manager, ...TIME_ADMINS];
export const DASHBOARD_ROLES: readonly Role[] = [...HR_STAFF, Roles.Manager];
