export const USER_ROLES = [
  "admin",
  "registrar",
  "accountant",
  "teacher",
  "librarian",
  "it_staff",
  "student",
  "parent",
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const STAFF_ROLES: UserRole[] = [
  "admin",
  "registrar",
  "accountant",
  "teacher",
  "librarian",
  "it_staff",
];

export const USER_STATUSES = ["active", "inactive", "pending"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const CALENDAR_STATUSES = ["upcoming", "active", "closed"] as const;
export type CalendarStatus = (typeof CALENDAR_STATUSES)[number];

export const ATTENDANCE_STATUSES = ["present", "late", "absent"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const ATTENDANCE_METHODS = ["rfid", "manual"] as const;
export type AttendanceMethod = (typeof ATTENDANCE_METHODS)[number];

export const ATTENDANCE_SESSIONS = ["morning", "end_of_day"] as const;
export type AttendanceSession = (typeof ATTENDANCE_SESSIONS)[number];

export const DEVICE_PURPOSES = ["attendance", "library"] as const;
export type DevicePurpose = (typeof DEVICE_PURPOSES)[number];

export const DEVICE_STATUSES = ["online", "offline"] as const;
export type DeviceStatus = (typeof DEVICE_STATUSES)[number];

export const DAYS_OF_WEEK = [1, 2, 3, 4, 5] as const; // 1=Mon .. 5=Fri
