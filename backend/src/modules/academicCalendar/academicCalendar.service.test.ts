import { statusFor } from "./academicCalendar.service";

describe("statusFor", () => {
  const start = new Date("2026-09-01");
  const end = new Date("2026-12-15");

  it("is upcoming before the start date", () => {
    expect(statusFor(start, end, new Date("2026-08-01"))).toBe("upcoming");
  });

  it("is active between start and end (inclusive)", () => {
    expect(statusFor(start, end, new Date("2026-09-01"))).toBe("active");
    expect(statusFor(start, end, new Date("2026-10-15"))).toBe("active");
    expect(statusFor(start, end, new Date("2026-12-15"))).toBe("active");
  });

  it("is closed after the end date", () => {
    expect(statusFor(start, end, new Date("2026-12-16"))).toBe("closed");
  });
});
