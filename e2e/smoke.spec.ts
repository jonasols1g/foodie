import { expect, test } from "@playwright/test";
import { registerFirebaseAuthStub } from "./fixtures/firebaseAuthStub.ts";
import { registerFirestoreStub } from "./fixtures/firestoreStub.ts";
import { registerMapboxStyleStub } from "./fixtures/mapboxStub.ts";

// Triviell røyktest: verifiserer at produksjonsbygget serveres under
// /foodie/-understien og at appen faktisk rendrer. `AuthContext` og
// `RestaurantContext` gjør nettverkskall ved mount på enhver side, uansett
// spec — derfor stubbes Firebase/Firestore/Mapbox-style her, uavhengig av
// om testen selv bruker dem.
test.beforeEach(async ({ page }) => {
  await registerFirebaseAuthStub(page);
  await registerFirestoreStub(page);
  await registerMapboxStyleStub(page);
});

test("appen laster under /foodie/-understien og viser tom liste", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "Foodie" })).toBeVisible();
  await expect(page.getByText("Ingen steder ennå")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "+ Legg til restaurant" }),
  ).toBeVisible();
});

test("filterknappene er tilgjengelige og 'Alle' er valgt som standard", async ({
  page,
}) => {
  await page.goto("./");
  const allButton = page.getByRole("button", { name: "Alle" });
  await expect(allButton).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Planlagt" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Besøkt" })).toBeVisible();
});
