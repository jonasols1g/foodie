import { expect, test } from "@playwright/test";
import { registerFirebaseAuthStub } from "./fixtures/firebaseAuthStub.ts";
import { registerFirestoreStub } from "./fixtures/firestoreStub.ts";
import { registerMapboxSearchStub, registerMapboxStyleStub } from "./fixtures/mapboxStub.ts";

const MAAEMO = {
  mapboxId: "poi-maaemo",
  name: "Maaemo",
  address: "Dronning Eufemias gate 23, Oslo",
  lat: 59.9075,
  lng: 10.7532,
  categories: ["restaurant"],
  websiteUrl: "https://maaemo.no",
};

test.beforeEach(async ({ page }) => {
  await registerFirebaseAuthStub(page);
  // Henting (`:runQuery`) fungerer normalt via den vanlige stubben — kun
  // skriving (`:commit`) overstyres til å feile, under, for å simulere en
  // reell nettverks-/Firestore-feil ved lagring.
  await registerFirestoreStub(page);
  await registerMapboxStyleStub(page);
  await registerMapboxSearchStub(page, MAAEMO);

  await page.route(
    "**/firestore.googleapis.com/v1/projects/*/databases/*/documents:commit**",
    async (route) => {
      await route.fulfill({
        status: 500,
        json: { error: { code: 500, message: "simulert Firestore-feil (e2e)" } },
      });
    },
  );
});

test("viser feilbanner og ruller tilbake den optimistiske oppdateringen når lagring feiler", async ({
  page,
}) => {
  await page.goto("./");

  await page.getByRole("button", { name: "+ Legg til restaurant" }).click();
  await page.getByLabel("Søk etter restaurant").fill("Maaemo");
  await page.getByRole("option", { name: /Maaemo/ }).click();
  await page.getByRole("button", { name: "Lagre restaurant" }).click();

  // Optimistisk: restauranten dukker opp umiddelbart, før Firestore-svaret.
  await expect(page.getByRole("heading", { name: "Maaemo" })).toBeVisible();

  // Skrivingen feiler — feilbanneret vises, og restauranten forsvinner igjen
  // (rullet tilbake til tilstanden før handlingen).
  await expect(page.getByRole("alert")).toContainText("Kunne ikke lagre endringen");
  await expect(page.getByRole("heading", { name: "Maaemo" })).not.toBeVisible();

  await page.getByRole("button", { name: "Lukk feilmelding" }).click();
  await expect(page.getByRole("alert")).not.toBeVisible();
});
