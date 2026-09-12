import { generateKeyPair, SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { enforceOrigin, verifyIdentity } from "../../worker/auth";

const issuer = "https://test.cloudflareaccess.com";
const config = { ACCESS_TEAM_DOMAIN: issuer, ACCESS_AUD: "snail-test-aud" };

describe("Access identity trust boundary", () => {
  it("rejects missing identity; email headers cannot impersonate a user", async () => {
    await expect(
      verifyIdentity(
        new Request("https://snail.test/api/me", {
          headers: { "cf-access-authenticated-user-email": "fake@example.test" },
        }),
        config,
      ),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("accepts only signed, unexpired JWTs for this issuer and audience", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const token = await new SignJWT({ email: "owner@example.test" })
      .setProtectedHeader({ alg: "RS256" })
      .setSubject("user-a")
      .setIssuer(issuer)
      .setAudience(config.ACCESS_AUD)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
    const request = new Request("https://snail.test/api/me", {
      headers: { "cf-access-jwt-assertion": token },
    });
    const identity = await verifyIdentity(request, config, publicKey);
    expect(identity.subject).toBe("user-a");
    expect(identity.libraryId).toMatch(/^[a-f0-9]{64}$/);
    await expect(
      verifyIdentity(request, { ...config, ACCESS_AUD: "other" }, publicKey),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("rejects expired sessions and distinguishes libraries", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const sign = (sub: string, exp: string) =>
      new SignJWT({ email: "owner@example.test" })
        .setProtectedHeader({ alg: "RS256" })
        .setSubject(sub)
        .setIssuer(issuer)
        .setAudience(config.ACCESS_AUD)
        .setIssuedAt()
        .setExpirationTime(exp)
        .sign(privateKey);
    const req = (token: string) =>
      new Request("https://snail.test", { headers: { "cf-access-jwt-assertion": token } });
    await expect(
      verifyIdentity(req(await sign("a", "-1m")), config, publicKey),
    ).rejects.toMatchObject({ status: 401 });
    const a = await verifyIdentity(req(await sign("a", "5m")), config, publicKey);
    const b = await verifyIdentity(req(await sign("b", "5m")), config, publicKey);
    expect(a.libraryId).not.toBe(b.libraryId);
  });

  it("requires same-origin + custom CSRF header for browser mutations", () => {
    const good = new Request("https://snail.test/api/assets", {
      method: "POST",
      headers: { Origin: "https://snail.test", "X-Snail-Request": "1" },
    });
    expect(() => enforceOrigin(good)).not.toThrow();
    expect(() =>
      enforceOrigin(new Request("https://snail.test/api/assets", { method: "POST" })),
    ).toThrow();
    expect(() =>
      enforceOrigin(
        new Request("https://snail.test/api/assets", {
          method: "POST",
          headers: { Origin: "https://evil.test", "X-Snail-Request": "1" },
        }),
      ),
    ).toThrow();
  });
});
