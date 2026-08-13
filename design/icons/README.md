# Foodie-ikon — bruk

Motivet er bollen med damp (variant 6e). To fargevarianter er valgt:

| Variant | Strek | Fil |
|---|---|---|
| Oliven (7c) | `#6C7A3F` | `foodie-bowl-olive.svg` |
| Kolgrå (7h) | `#2E2620` | `foodie-bowl-charcoal.svg` |

Alle filer er `viewBox="0 0 100 100"`, uten bakgrunn (unntatt favicon-filene), og skalerer fritt.

## Filer

- `foodie-bowl-olive.svg` / `foodie-bowl-charcoal.svg` — hovedversjon, strek 7. Bruk fra 32 px og opp.
- `foodie-bowl-olive-compact.svg` / `foodie-bowl-charcoal-compact.svg` — uten damp, strek 9. Bruk under 32 px, der dampkrøllene ellers går i grøten.
- `favicon-olive.svg` / `favicon-charcoal.svg` — samme motiv med kremflate (`#FBF4E9`) og 22 px hjørneradius, strek 8.5. Til nettleserfanen.
- `foodie-bowl.svg` — `stroke="currentColor"`, arver tekstfargen. Bruk denne når ikonet skal følge en farge som endrer seg (mørk modus, aktiv/inaktiv tilstand).

## I nettleserfanen

```html
<link rel="icon" type="image/svg+xml" href="/icons/favicon-olive.svg">
```

Faner rendres i 16–32 px. Kremflaten er viktig her: uten den forsvinner streken mot fanens egen bakgrunn i lys modus. Trenger du PNG-fallback for eldre nettlesere, eksporter `favicon-olive.svg` til 32×32 og 180×180 (`apple-touch-icon`).

## Etter «Foodie» i toppen av appen

Ikonet står til høyre for ordmerket, optisk midtstilt mot x-høyden — ikke mot linjeboksen. Med tittel i 20 px settes ikonet i 22 px, med 8 px mellomrom:

```html
<div class="flex items-center gap-2">
  <h1 class="text-[20px] font-bold tracking-[-0.01em] text-[#2E2620]">Foodie</h1>
  <img src="/icons/foodie-bowl-olive.svg" alt="" width="22" height="22" class="translate-y-[1px]">
</div>
```

`alt=""` fordi ordmerket allerede sier navnet — ikonet er dekor, ikke informasjon.

Skal ikonet skifte farge med tilstand, bruk `foodie-bowl.svg` inline og styr med `color`.

## Fargevalg

Oliven er samme grønn som «besøkt»-statusen i appen, så ikonet knytter seg til systemet og gir topplinjen litt varme. Kolgrå er nøytral og roligere, og lar paprikaaksenten stå alene som appens eneste farge. Begge har nok kontrast mot krem (`#FBF4E9`) til AA for grafiske elementer.

Velg én og bruk den overalt — ikke bland de to i samme flate.

## Regler

- Minste bruksstørrelse: 20 px (kompakt variant).
- Klaring rundt ikonet: minst 25 % av ikonets høyde.
- Ikke roter, strekk, legg til skygge eller fyll bollen.
- Endre farge bare til systemfargene: oliven `#6C7A3F`, kolgrå `#2E2620`, paprika `#B85C33`, krem `#FBF4E9`.
