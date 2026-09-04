// Prisma models use camelCase JS property names; the PRD's REST API and the
// frontend both use snake_case (matching the DB column names). Endpoints
// like staff/students/dashboard convert by hand (serializeStaff etc.), but
// that's easy to forget on a new endpoint — so responses are converted here,
// once, globally (see app.ts's res.json patch) rather than per-controller.
// Applying this to an already-snake_case object is a harmless no-op.

// Only recurse into genuine object literals — Prisma's own non-POJO field
// types (Decimal, Date, Buffer) must pass through untouched so their own
// toJSON()/serialization runs, not this function's key-walking.
const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && v.constructor === Object;

function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function toSnakeCase(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(toSnakeCase);
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[camelToSnake(key)] = toSnakeCase(val);
    }
    return result;
  }
  return value;
}
