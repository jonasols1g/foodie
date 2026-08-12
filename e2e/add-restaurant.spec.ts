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
  await registerFirestoreStub(page);
  await registerMapboxStyleStub(page);
  await registerMapboxSearchStub(page, MAAEMO);
});

test("legge til en restaurant via søk viser den i listen med riktig status", async ({
  page,
}) => {
  await page.goto("./");

  await page.getByRole("button", { name: "+ Legg til restaurant" }).click();
  await page.getByLabel("Søk etter restaurant").fill("Maaemo");

  const suggestion = page.getByRole("option", { name: /Maaemo/ });
  await expect(suggestion).toBeVisible();
  await suggestion.click();

  // Steg 2: bekreftelsesskjema med forhåndsutfylt nettside fra Mapbox-metadata.
  await expect(page.getByText("Maaemo")).toBeVisible();
  await expect(page.getByLabel("Nettside (valgfritt)")).toHaveValue(
    MAAEMO.websiteUrl,
  );

  await page.getByRole("button", { name: "Legg til", exact: true }).click();

  // Modalen lukkes, og restauranten dukker opp i listen med "Planlagt"-status.
  const listItem = page.locator("li", { hasText: "Maaemo" });
  await expect(listItem.getByRole("heading", { name: "Maaemo" })).toBeVisible();
  await expect(listItem.getByText("Planlagt", { exact: true })).toBeVisible();
});

test("filter viser kun restauranter med valgt status, og statusendring flytter dem", async ({
  page,
}) => {
  await page.goto("./");

  await page.getByRole("button", { name: "+ Legg til restaurant" }).click();
  await page.getByLabel("Søk etter restaurant").fill("Maaemo");
  await page.getByRole("option", { name: /Maaemo/ }).click();
  await page.getByRole("button", { name: "Legg til", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Maaemo" })).toBeVisible();

  const filterBar = page.getByRole("group", {
    name: "Filtrer restauranter etter status",
  });

  // Filtrer på "Besøkt" — restauranten er fortsatt "Planlagt", skal forsvinne.
  await filterBar.getByRole("button", { name: "Besøkt", exact: true }).click();
  await expect(page.getByText("Ingen besøkte restauranter ennå.")).toBeVisible();

  // Tilbake til "Alle", marker som besøkt.
  await filterBar.getByRole("button", { name: "Alle", exact: true }).click();
  await page.getByRole("button", { name: "Marker som besøkt" }).click();

  await filterBar.getByRole("button", { name: "Besøkt", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Maaemo" })).toBeVisible();
});

test("restauranten består over en reload (persisterer i Firestore)", async ({
  page,
}) => {
  await page.goto("./");

  await page.getByRole("button", { name: "+ Legg til restaurant" }).click();
  await page.getByLabel("Søk etter restaurant").fill("Maaemo");
  await page.getByRole("option", { name: /Maaemo/ }).click();
  await page.getByRole("button", { name: "Legg til", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Maaemo" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Maaemo" })).toBeVisible();
});

test("fjerne en restaurant tømmer listen igjen", async ({ page }) => {
  await page.goto("./");

  await page.getByRole("button", { name: "+ Legg til restaurant" }).click();
  await page.getByLabel("Søk etter restaurant").fill("Maaemo");
  await page.getByRole("option", { name: /Maaemo/ }).click();
  await page.getByRole("button", { name: "Legg til", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Maaemo" })).toBeVisible();

  await page.getByRole("button", { name: "Fjern" }).click();
  await expect(page.getByText("Ingen restauranter lagt til ennå.")).toBeVisible();
});
