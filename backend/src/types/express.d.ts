import type { UserRole } from "@school-mis/shared";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
      };
      device?: {
        id: string;
        classId: string | null;
        purpose: string;
      };
    }
  }
}

export {};
