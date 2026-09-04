process.env.JWT_ACCESS_SECRET ??= "test-access-secret";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.REDIS_URL ??= "redis://localhost:6379";

import { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } from "./tokens";

describe("access/refresh tokens", () => {
  it("round-trips an access token", () => {
    const token = signAccessToken({ sub: "user-1", role: "admin" });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe("user-1");
    expect(payload.role).toBe("admin");
  });

  it("round-trips a refresh token", () => {
    const token = signRefreshToken({ sub: "user-1" });
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe("user-1");
  });

  it("rejects a token signed with the wrong secret", () => {
    const token = signAccessToken({ sub: "user-1", role: "admin" });
    const tampered = token.slice(0, -2) + "xx";
    expect(() => verifyAccessToken(tampered)).toThrow();
  });
});
