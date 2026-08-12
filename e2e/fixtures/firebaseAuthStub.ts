import type { Page } from "@playwright/test";

/**
 * Stubbing av Firebase Anonymous Auth for E2E. `AuthContext`/
 * `firebaseClient.ts` kaller ubetinget `signInAnonymously` ved appens mount
 * — uten denne stubben ville *alle* E2E-tester gjort et ekte nettverkskall
 * mot `identitytoolkit.googleapis.com` og opprettet en reell anonym bruker i
 * det ekte Firebase-prosjektet på hver testkjøring.
 *
 * Stubber de to kallene Firebase JS SDK faktisk gjør ved en vellykket anonym
 * innlogging (`accounts:signUp` for selve innloggingen, `accounts:lookup`
 * for å hente brukerinfo til `onAuthStateChanged`-callbacken), inkludert et
 * gyldig strukturert (men innholdsløst signert) JWT i `idToken`, som SDK-en
 * dekoder client-side for å lese `exp`/`sub`-claims.
 */

const FAKE_UID = "e2e-anonymous-uid";

function base64UrlEncode(value: object): string {
  return Buffer.from(JSON.stringify(value))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function createFakeIdToken(): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT", kid: "e2e-fake-kid" };
  const payload = {
    provider_id: "anonymous",
    iss: "https://securetoken.google.com/foodie-e2e",
    aud: "foodie-e2e",
    auth_time: nowSeconds,
    user_id: FAKE_UID,
    sub: FAKE_UID,
    iat: nowSeconds,
    exp: nowSeconds + 3600,
    firebase: { identities: {}, sign_in_provider: "anonymous" },
  };
  // Signaturen verifiseres aldri client-side av Firebase JS SDK (kun
  // dekodet for claims) — en vilkårlig, men base64url-gyldig, streng holder.
  const signature = "e2e-fake-signature";
  return `${base64UrlEncode(header)}.${base64UrlEncode(payload)}.${signature}`;
}

/**
 * Fanger opp Firebase Anonymous Auth-håndtrykket (`accounts:signUp` og
 * `accounts:lookup` mot `identitytoolkit.googleapis.com`) og svarer med en
 * konsistent, stabil anonym testbruker (`e2e-anonymous-uid`) — uten noe ekte
 * nettverkskall mot Firebase.
 */
export async function registerFirebaseAuthStub(page: Page): Promise<void> {
  const idToken = createFakeIdToken();

  await page.route(
    "**/identitytoolkit.googleapis.com/v1/accounts:signUp**",
    async (route) => {
      await route.fulfill({
        json: {
          kind: "identitytoolkit#SignupNewUserResponse",
          idToken,
          refreshToken: "e2e-fake-refresh-token",
          expiresIn: "3600",
          localId: FAKE_UID,
        },
      });
    },
  );

  await page.route(
    "**/identitytoolkit.googleapis.com/v1/accounts:lookup**",
    async (route) => {
      const now = Date.now().toString();
      await route.fulfill({
        json: {
          kind: "identitytoolkit#GetAccountInfoResponse",
          users: [
            {
              localId: FAKE_UID,
              lastLoginAt: now,
              createdAt: now,
              lastRefreshAt: new Date().toISOString(),
            },
          ],
        },
      });
    },
  );
}
