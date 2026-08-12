import type { Page, Route } from "@playwright/test";

/**
 * Stubbing av Firestore-trafikk for E2E.
 *
 * `FirestoreRestaurantStorage` bruker `firebase/firestore/lite` (ikke den
 * fulle `firebase/firestore`), som bruker Firestores vanlige REST-API
 * direkte — ett diskret HTTP-kall per operasjon. De eneste endepunktene som
 * trengs er derfor:
 *
 * - `POST .../documents/users/{uid}:runQuery` — `getDocs(collection(...))`
 *   (brukt av `FirestoreRestaurantStorage.load`).
 * - `POST .../documents:commit` — `addDoc`/`updateDoc`/`deleteDoc` (brukt av
 *   `add`/`updateStatus`/`update`/`remove`), som Firestores REST-API alltid
 *   ruter via den generiske «commit»-operasjonen.
 *
 * Stubben er **stateful** (en enkel in-memory «database» i modulens
 * lukking, per `registerFirestoreStub`-kall/test): skrivinger (`:commit`)
 * oppdaterer det lagrede dokumentsettet, og en påfølgende `:runQuery` (f.eks.
 * etter `page.reload()`) svarer med det faktisk lagrede resultatet.
 *
 * Feltverdiene i skrive-forespørslene ankommer allerede i Firestores strengt
 * typede tråd-format (`{"stringValue": "..."}`, `{"integerValue": "..."}`,
 * `{"arrayValue": {...}}` osv., generert av selve SDK-en) — de lagres derfor
 * akkurat som mottatt og gjenbrukes uendret i `runQuery`-svaret.
 *
 * `addDoc` (brukt av `FirestoreRestaurantStorage.add`) sender IKKE et
 * dokument-ID i URL-en — Firestore genererer den server-side og returnerer
 * den i `commit`-responsen (`writeResults[].name` er ikke faktisk satt av
 * ekte Firestore for `commit`, men SDK-en løser ID-en fra en forhåndsallokert
 * `documents:commit`-URL som allerede inkluderer en klientgenerert ID — se
 * `generateDocId`/`newAutoId` i SDK-en). Stubben genererer en enkel
 * sekvensiell ID selv når `write.update.name` mangler et siste segment
 * (tomt, siden `addDoc` alltid sender en fullstendig bane inkludert en
 * klientgenerert auto-ID via `doc(collectionRef)` internt i SDK-en).
 */

interface FirestoreValue {
  [key: string]: unknown;
}

interface CommitWrite {
  update?: { name: string; fields: Record<string, FirestoreValue> };
  delete?: string;
  updateMask?: { fieldPaths: string[] };
}

interface CommitRequestBody {
  writes: CommitWrite[];
}

/** Siste segment av en Firestore-ressursbane (`.../restaurants/{id}` → `id`). */
function lastPathSegment(name: string): string {
  const segments = name.split("/");
  return segments[segments.length - 1] ?? name;
}

/**
 * Henter ressursbanen til foreldre-dokumentet direkte fra `runQuery`-URL-en,
 * i stedet for å anta et fast prosjekt-ID.
 */
function parentPathFromRunQueryUrl(url: string): string {
  const withoutQuery = url.split("?")[0] ?? url;
  const [path] = withoutQuery.split(":runQuery");
  const marker = "/v1/";
  const markerIndex = (path ?? "").indexOf(marker);
  return markerIndex === -1
    ? (path ?? "")
    : (path ?? "").slice(markerIndex + marker.length);
}

async function fulfillRunQuery(
  route: Route,
  documents: Map<string, Record<string, FirestoreValue>>,
): Promise<void> {
  const now = new Date().toISOString();
  const entries = [...documents.entries()];

  if (entries.length === 0) {
    await route.fulfill({ json: [{ readTime: now }] });
    return;
  }

  const parentPath = parentPathFromRunQueryUrl(route.request().url());
  const results = entries.map(([id, fields]) => ({
    document: {
      name: `${parentPath}/restaurants/${id}`,
      fields,
      createTime: now,
      updateTime: now,
    },
    readTime: now,
  }));
  await route.fulfill({ json: results });
}

async function fulfillCommit(
  route: Route,
  documents: Map<string, Record<string, FirestoreValue>>,
): Promise<void> {
  const body = route.request().postDataJSON() as CommitRequestBody;
  const now = new Date().toISOString();
  const writeResults: { updateTime: string }[] = [];

  for (const write of body.writes) {
    if (write.update) {
      let id = lastPathSegment(write.update.name);
      if (id === "" || id === "?") {
        id = `e2e-generated-${(documents.size + 1).toString()}`;
      }
      if (write.updateMask) {
        // Delvis oppdatering (`updateDoc`) — behold eksisterende felter,
        // overskriv/fjern kun det `updateMask.fieldPaths` peker på.
        const existing = documents.get(id) ?? {};
        const next = { ...existing };
        const updatedFields = write.update.fields;
        for (const fieldPath of write.updateMask.fieldPaths) {
          const value = updatedFields[fieldPath];
          if (value !== undefined) {
            next[fieldPath] = value;
          } else {
            delete next[fieldPath];
          }
        }
        documents.set(id, next);
      } else {
        // Full opprettelse (`addDoc`).
        documents.set(id, write.update.fields);
      }
    } else if (write.delete !== undefined) {
      documents.delete(lastPathSegment(write.delete));
    }
    writeResults.push({ updateTime: now });
  }

  await route.fulfill({ json: { commitTime: now, writeResults } });
}

/**
 * Fanger opp Firestore Lite-SDK-ens `runQuery`/`commit`-REST-kall og svarer
 * mot en enkel in-memory «database» — uten noe ekte nettverkskall mot
 * Firestore.
 */
export async function registerFirestoreStub(
  page: Page,
  documents: Map<string, Record<string, FirestoreValue>> = new Map(),
): Promise<Map<string, Record<string, FirestoreValue>>> {
  await page.route(
    "**/firestore.googleapis.com/v1/projects/*/databases/*/documents/users/*:runQuery**",
    (route) => fulfillRunQuery(route, documents),
  );

  await page.route(
    "**/firestore.googleapis.com/v1/projects/*/databases/*/documents:commit**",
    (route) => fulfillCommit(route, documents),
  );

  return documents;
}
