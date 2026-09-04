// Reusable Prisma `select` shapes for embedding a User in another entity's
// response (e.g. a class's teacher) — never spread a full User/StaffProfile
// row into a response; password hashes and other internal fields must stay
// server-side. Use these instead of `include: { teacher: true }`.
export const publicTeacherSelect = {
  id: true,
  role: true,
  email: true,
  staffProfile: {
    select: { firstName: true, lastName: true },
  },
} as const;
