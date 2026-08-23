export type AccountType = "admin" | "management" | "employee" | "seller" | "call_center" | "user";
export type AccountStatus = "active" | "suspended" | "disabled";

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  admin: "مشرف",
  management: "إدارة",
  employee: "موظف",
  seller: "بائع",
  call_center: "كول سنتر",
  user: "مستخدم",
};

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  active: "نشط",
  suspended: "محظور",
  disabled: "معطل",
};

export const ACCOUNT_STATUS_TONE: Record<AccountStatus, string> = {
  active: "bg-success/10 text-success border-success/20",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
  disabled: "bg-warning/10 text-warning border-warning/20",
};

/** بوابة واحدة للإدارة (مشرف/إدارة/موظف) + بوابتان منفصلتان للبائع والكول سنتر. */
export type Portal = "seller" | "callcenter" | "staff";

export const PORTAL_LABELS: Record<Portal, string> = {
  seller: "بوابة البائعين",
  callcenter: "بوابة الكول سنتر",
  staff: "بوابة الإدارة",
};

export const PORTAL_ACCOUNT_TYPE: Record<Portal, AccountType> = {
  seller: "seller",
  callcenter: "call_center",
  staff: "management",
};

/** التسجيل العام مسموح للبائعين والكول سنتر فقط. حسابات الإدارة تُنشأ من الداخل. */
export const PORTAL_SIGNUP_ENABLED: Record<Portal, boolean> = {
  seller: true,
  callcenter: true,
  staff: false,
};

/** أنواع الحسابات المسموح لها بالدخول من كل بوابة. */
export const PORTAL_ALLOWED_TYPES: Record<Portal, AccountType[]> = {
  seller: ["seller"],
  callcenter: ["call_center"],
  staff: ["admin", "management", "employee"],
};

const ROLE_RANK: AccountType[] = ["admin", "management", "employee", "seller", "call_center", "user"];

export function primaryAccountType(roles: string[]): AccountType {
  for (const role of ROLE_RANK) {
    if (roles.includes(role)) return role;
  }
  return "user";
}

export function dashboardPathFor(type: AccountType): string {
  switch (type) {
    case "admin":
      return "/admin";
    case "management":
    case "employee":
      return "/management/dashboard";
    case "seller":
      return "/seller/dashboard";
    case "call_center":
      return "/callcenter/dashboard";
    default:
      return "/";
  }
}

/** صفحة الدخول لكل بوابة: /admin/login للإدارة، وبوابة مستقلة للبائع والكول سنتر. */
export function loginPathFor(portal: Portal): string {
  return portal === "staff" ? "/admin/login" : `/${portal}/login`;
}

/** بوابة الإدارة لها مدخلان حسب المسار: /admin/login للمشرفين و/management/login للموظفين. */
export function staffLoginPathFor(pathname: string): string {
  return pathname.startsWith("/management") ? "/management/login" : "/admin/login";
}

export function signupPathFor(portal: Portal): string {
  return portal === "staff" ? "/admin/login" : `/${portal}/signup`;
}

export function portalFromPath(pathname: string): Portal {
  if (pathname.startsWith("/seller")) return "seller";
  if (pathname.startsWith("/callcenter")) return "callcenter";
  return "staff";
}
