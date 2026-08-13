# Handoff: Foodie — mobil restaurantliste med kart

## Oversikt
Foodie er en personlig webapp (én bruker, ingen innlogging) for restauranter man vil besøke og har besøkt. Brukes utelukkende i mobil nettleser, 375–430 px bredde. Designet dekker hovedskjerm (liste + kart), delt seleksjon mellom liste og kart, statusfilter, legg-til-flyt i bottom sheet, statusendring, sletting, samt laste- og tomtilstander.

Stack den skal implementeres i: React 19 + TypeScript + Vite + Tailwind CSS v4, Mapbox GL JS via react-map-gl.

## Om designfilene
Filen i denne pakken (`Foodie Mobildesign.dc.html`) er en **designreferanse laget i HTML** — en prototype som viser tilsiktet utseende og oppførsel, ikke produksjonskode som skal kopieres. Oppgaven er å **gjenskape designet i det eksisterende kodebasemiljøet** (React + TS + Tailwind v4) med kodebasens etablerte mønstre. Ignorer HTML-filens egne inline-stiler som implementasjonsform: verdiene er kilden, Tailwind-utilities og CSS-variabler er målet.

Filen inneholder flere fargeretninger som opsjoner. **Kun seksjonen merket `5a` («Krem & paprika — alle sju skjermer») er valgt og skal implementeres.** Alt under den (4a–4c, 3a–3c, 2a–2c, 1a) er forkastede alternativer og skal ignoreres.

## Fidelity
**Hi-fi.** Farger, typografi, spacing, radius og touch-mål er endelige. Gjenskap pikselnært med Tailwind. Kartflaten i prototypen er en tegnet attrapp (fargede div-er) — den erstattes av et faktisk Mapbox-kart med stilverdiene oppgitt under.

## Designtokens

Legg disse i `src/index.css` under `@theme` (Tailwind v4 bruker CSS-variabler direkte som utility-navn: `bg-bg`, `text-ink-muted`, `border-border-strong`, `rounded-2xl` osv.).

```css
@import "tailwindcss";

@theme {
  --font-sans: "Schibsted Grotesk", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  --color-bg:              #FAF7F0;
  --color-surface:         #FFFFFF;
  --color-surface-sunken:  #F2EEE3;
  --color-ink:             #2A2520;
  --color-ink-soft:        #463F37;
  --color-ink-muted:       #675E53;
  --color-ink-faint:       #9C9287;
  --color-border:          #E6DFD2;
  --color-border-strong:   #DAD2C3;

  --color-accent:          #B85C33;
  --color-accent-strong:   #A44A2A;
  --color-planned:         #C9932B;
  --color-planned-soft:    #FAF0D9;
  --color-planned-ink:     #83610F;
  --color-visited:         #6C7A3F;
  --color-visited-soft:    #EDEFE2;
  --color-visited-ink:     #4C5729;

  --color-map-land:        #E7E7DC;
  --color-map-water:       #D9E0DE;
  --color-map-road:        #F6F3E9;
  --color-map-block:       #DEDED1;

  --radius-sm: 6px;    /* kategori-chip */
  --radius-md: 8px;    /* statusbadge */
  --radius-lg: 14px;   /* input, ikonknapp, sekundærknapp */
  --radius-xl: 18px;   /* primærknapp nederst */
  --radius-2xl: 20px;  /* kort, popup */
  --radius-sheet: 28px;/* bottom sheet topphjørner */
}
```

Fonter: Schibsted Grotesk (400/500/600/700) og JetBrains Mono (400/500) fra Google Fonts. Mono brukes bare til tellere, koordinater og små majuskel-labels.

### Typeskala
| Bruk | Størrelse / vekt | Ekstra |
|---|---|---|
| Apptittel «Foodie» | 24 / 700 | letter-spacing -0.02em |
| Sheet-tittel | 20 / 700 | -0.02em |
| Restaurantnavn | 17 / 600 | -0.01em |
| Knappetekst, søkefelt, forslag | 16 / 600 (input 400) | |
| Filter, sekundærknapp, handlingsknapp | 14 / 500–600 | |
| Adresse, notater | 13 / 400 | line-height 1.45 |
| Statusbadge, mono-labels | 11 / 600 | letter-spacing 0.04–0.06em, uppercase |

### Spacing (4-basis)
4, 8, 10, 12, 14, 16, 20, 24. Konkret: sidemarg 16 px for liste, 20 px for header/filter/sheet; 10 px mellom kort; 8 px mellom filterpiller; kortpadding 14 px vertikalt / 16 px horisontalt; bunnknapp-container padding 16 px topp, 30 px bunn (safe area).

### Skygger
- Valgt kort: `0 4px 14px rgba(184,92,51,0.14)`
- Bottom sheet: `0 -8px 30px rgba(42,37,32,0.24)`
- Bunnknapp: `0 8px 20px rgba(42,37,32,0.22)`
- Pin: `0 2px 6px rgba(42,37,32,0.30)`, valgt pin `0 4px 12px rgba(42,37,32,0.35)`
- Popup: `0 12px 28px rgba(42,37,32,0.24)`
- Kart-kontrollknapp: `0 2px 8px rgba(42,37,32,0.14)`

## Skjermer

Alle skjermer er 390 px brede. Vertikal struktur på hovedskjermen, ovenfra og ned: statusbar (systemets), header, kartflate 236 px, filterrad, scrollende liste, fast «+ Legg til restaurant»-knapp nederst.

### 1. Hovedskjerm — med data
- **Header:** `px-5 pb-3`, flex row, space-between. Venstre: «Foodie» 24/700. Høyre: teller i mono 11 px, `text-ink-muted`, letter-spacing 0.04em, f.eks. «12 STEDER».
- **Kartflate:** høyde 236 px, full bredde, ingen radius. Kart-kontrollknapp (lokaliser meg) øverst til høyre: 40×40, `rounded-xl`, `bg-bg`, 1 px `border-strong`. Nederste 28 px har en gradient fra transparent til `--color-bg` så pins ikke kolliderer visuelt med filterraden.
- **Filterrad:** `px-5 pt-3 pb-2.5`, `border-b border-border`, tre piller med 8 px gap. Aktiv pille: `bg-ink text-bg`, 14/600, antall med `opacity-55`. Inaktiv: `bg-surface border border-border-strong text-ink-soft` 14/500, 7 px statusprikk foran (planned/visited-farge), antall i `text-ink-faint`. Høyde 38 px, `px-4`, `rounded-full`. Containerens vertikale padding gir 44 px treffsone.
- **Liste:** `px-4 pt-3 pb-28`, `flex flex-col gap-2.5`.
- **Bunnknapp:** fixed, `px-5 pt-4 pb-[30px]`, bakgrunn er en gradient fra transparent til `--color-bg` (40 %) så listen glir under. Knapp: høyde 52, `rounded-xl`, `bg-ink text-bg`, 16/600, «+ Legg til restaurant» med «+» som 20 px tegn og 9 px gap.

### 2. Kart utvidet + popup
Kartet fyller hele skjermen. Filterpillene flyter over kartet (samme piller, men `bg-bg` og egen skygge `0 3px 10px rgba(42,37,32,0.14)`, ingen border-b). Nederst midtstilt pille «Vis liste»: høyde 48, `px-[22px]`, `rounded-xl`, `bg-bg`, 1 px `border-strong`, 15/600, med et lite listeikon (tre 2 px linjer, 5 px mellomrom).

**Popup** (egen `<Popup>`, `closeButton={false}`, `offset={22}`, ankret over pinnen):
bredde 280, `rounded-2xl`, `bg-surface`, 1.5 px `border-accent`, padding 14/16, `gap-2`. Innhold: navn 17/600, adresse 13 `text-ink-muted`, lukkekryss 28×28 `rounded-[9px] bg-surface-sunken`, statusbadge på egen rad (ingen kategori-chip — avvik, se RestaurantCard), deretter handlingsrad (primærknapp + nettside-ikonknapp). Peker: 16×16 rotert 45°, `bg-surface`, høyre+bunn kant i accent, sentrert på pinnens x, 9 px under kortets underkant.

### 3. Legg til — steg 1, søk
Bottom sheet, høyde 660 px, `rounded-t-[28px]`, `bg-bg`, skygge oppover. Backdrop `rgba(42,37,32,0.42)`. Dra-håndtak: 40×4, `rounded-full`, `bg-border-strong`, midtstilt, 14 px under toppen.
- Tittelrad: «Legg til restaurant» 20/700 + lukkekryss 32×32 `rounded-[10px] bg-surface-sunken`.
- Søkefelt: høyde 52, `rounded-lg` (14), `bg-surface`, fokus = 1.5 px `border-accent` + `ring-3 ring-accent/12`, søkeikon 16×16 sirkel i `--color-ink-faint`, tekst 16.
- Treffteller i mono 11 px `text-ink-faint` over listen: «4 TREFF I NORGE».
- Forslagsrad: min-høyde 64 px, navn 16/600, adresse 13 `text-ink-muted`, 1 px `border` skiller. Markert/valgt rad: `bg-surface-sunken`, `rounded-[14px]`, negativ margin -8 px så bakgrunnen går forbi tekstkanten.
- Bunntekst i mono 10 px, sentrert: «SØK LEVERT AV MAPBOX».

### 4. Legg til — steg 2, bekreft
Sheet 620 px høy. Tilbakeknapp 36×36 `rounded-xl bg-surface-sunken` med chevron, ved siden av «Bekreft stedet» 20/700.
- **Oppsummeringskort:** `bg-surface rounded-2xl border border-border p-4`: navn 19/600, adresse 14 `text-ink-muted`, én mono-chip med koordinater («59.905, 10.740») — ingen kategori-chip (avvik, se RestaurantCard).
- **Felt:** label 13/600 `text-ink-soft` + «valgfritt» i `text-ink-faint` 400. Input høyde 50, textarea høyde 96, `rounded-lg bg-surface border border-border-strong`, padding 12/14, tekst 15.
- **Status-valg:** to knapper side om side, høyde 46, `rounded-lg`. Valgt: `bg-planned-soft border-1.5 border-planned text-planned-ink`. Uvalgt: `bg-surface border border-border-strong text-ink-muted` med grå prikk.
- **Bunnrad:** «Avbryt» 100 px bred, `bg-surface-sunken text-ink-soft`, og «Lagre restaurant» `flex-1 bg-accent text-white`, begge høyde 52, `rounded-xl`.

### 5. Lastetilstand
Header og filterrad vises, men filterpillene er tomme grå kapsler (`bg-surface-sunken`, bredder 74/104/92). Kartflaten er `#E9E6DA` med mono-tekst «KART LASTER» i `text-ink-faint`. Tre skjelettkort (`bg-surface rounded-2xl border` i `#EDE8DC`) med linjer i `#EDE8DC`/`--color-surface-sunken`, tredje kort `opacity-60`. Under: 14 px spinner (2 px ring, `border-t-accent`, `animate-spin`) + «Laster restauranter …» 14 px `text-ink-muted`.

### 6. Tom tilstand — ingen restauranter
Kartet vises dempet (hvitt slør `rgba(250,247,240,0.55)` over kartflaten, ingen pins). Midtstilt i listeområdet: 64×64 `rounded-[22px] bg-surface-sunken` med 1 px stiplet `#D2C9B8` og en grå pin-form inni; «Ingen steder ennå» 20/600; hjelpetekst 15 px `text-ink-muted`, line-height 1.5, maks 300 px bredde, sentrert: «Legg til den første restauranten du har lyst til å prøve — den havner i listen og på kartet.» Bunnknappen er her **accent-fylt** (`bg-accent text-white`) istedenfor `bg-ink`, siden det er skjermens eneste handling.

### 7. Tom tilstand — filter uten treff
Header-teller viser «0 AV 8». Kartet dempet med en mono-pille nederst: «INGEN PINS I DETTE FILTERET» (høyde 30, `rounded-full bg-bg border border-border-strong`, 10 px mono). Aktivt filter er «Besøkt» (ink-fylt, prikken lysnes til `#A8B47E` for kontrast mot mørk pille). Midtstilt: «Ingen besøkte restauranter ennå.» 17/600, hjelpetekst 14 `text-ink-muted`, og en knapp «Vis alle 8» høyde 44 `rounded-lg bg-surface border border-border-strong` 14/600 som nullstiller filteret.

## Komponent: RestaurantCard

To visuelle tilstander, styrt av om kortet er valgt.

**Kollapset (ikke valgt):**
`bg-surface rounded-2xl border border-border p-[14px_16px] flex flex-col gap-[7px]`
- Rad 1: kolonne med navn 17/600 og adresse 13 `text-ink-muted`; til høyre statusbadge (`flex-none`).
- Ingen kategori-chip(s) i listen (avvik fra opprinnelig forslag — tok for mye plass med flere kategorier per sted), ingen handlinger, ingen notater.

**Valgt** — samme, men `border-1.5 border-accent` + skygge, og i tillegg:
- Notatlinje 13 px `text-ink-soft`, line-height 1.45 (utelates hvis notater mangler).
- Handlingsrad, `pt-1.5 border-t border-border`, `flex items-center gap-2`:
  - Statusknapp `flex-1`, høyde 44, `rounded-lg`. Planlagt → «Marker som besøkt», `bg-accent text-white` 14/600. Besøkt → «Sett som planlagt», `bg-surface border border-border-strong text-ink`.
  - Nettside: ikonknapp 44×44, `rounded-lg border border-border-strong`, lenkeikon. **Skjules helt når URL mangler** — ingen deaktivert tilstand.
  - Slett: ikonknapp 44×44, samme ramme, søppelbøtte i `--color-accent-strong`.

**Statusbadge:** høyde 24, `px-[9px] rounded-md`, 11/600, letter-spacing 0.04em, uppercase. Planlagt: `bg-planned-soft text-planned-ink`. Besøkt: `bg-visited-soft text-visited-ink`.

**Kategori-chip:** høyde 22, `px-2 rounded-sm bg-surface-sunken text-ink-muted`, mono 11 px, små bokstaver som de kommer fra Mapbox.

**Slett-bekreftelse:** erstatter kortets innhold in-line (ingen dialog): «Fjerne «{navn}» fra listen?» 15/600, «Handlingen kan ikke angres.» 13 `text-ink-muted`, og to knapper på rad, høyde 44, `rounded-lg`: «Avbryt» (`bg-surface border border-border-strong`) og «Fjern» (`bg-accent-strong text-white`).

## Kart og pins

**Mapbox-stil:** Mapbox sin standard fargerike stil (`streets-v12`) — avvik fra opprinnelig dempet forslag, valgt av produkteier for et mer levende kart.

**Pin** (egen DOM-marker, ikke Mapbox' standard):
- 22×22 px, `rounded-full rounded-br-[2px] rotate-45` (spissen peker ned), 2 px kant i `--color-bg`, skygge.
- Planlagt: `bg-planned` (#C9932B). Besøkt: `bg-visited` (#6C7A3F).
- Valgt: 34×34, 3 px kant, `bg-accent`, høyere z-index, transition 160 ms.
- Usynlig treffsone 44×44 sentrert på pinnen.

**Fokus ved filterbytte:** `fitBounds` på synlige pins, 48 px padding, maks zoom 14.

## Interaksjon og oppførsel

**Delt seleksjon.** Én `selectedId: string | null` i toppnivå-state.
- Trykk på listekort → kortet ekspanderer (bare ett om gangen), pinnen vokser 22→34 px, kartet `easeTo` 400 ms til punktet med ~60 px offset nedover så popup får plass.
- Trykk på pin → popup åpnes, listen scroller det tilsvarende kortet til toppen (`scrollTop`-beregning, ikke `scrollIntoView`) og kortet ekspanderer.
- Trykk på kartbakgrunn, på lukkekrysset, eller på det valgte kortet igjen → `selectedId = null`.

**Statusendring.** Optimistisk: badge, pinfarge og knappetekst bytter umiddelbart, ingen bekreftelse. Filteret revurderes etterpå — hvis stedet faller ut av gjeldende filter, animeres kortet ut (fade + høydekollaps 200 ms) og pinnen skifter farge før den skjules.

**Sletting.** Ikonknapp → inline bekreftelse i kortet → «Fjern» sletter. Ingen full-skjerm-dialog, ingen undo.

**Filter.** Piller med antall; styrer liste og pins i samme render. Antallene beregnes fra hele datasettet, ikke det filtrerte.

**Bottom sheet.** Åpner 240 ms `cubic-bezier(.2,.8,.2,1)` fra bunnen, backdrop fader inn samtidig. Lukkes ved kryss, backdrop-trykk, sveip ned over dra-håndtaket, eller Escape. Steg 2 har tilbakeknapp til steg 1 med bevart søketekst.

**Autocomplete.** Debounce 250 ms, `country=no`, `language=nb`, `limit=5`, `types=poi,address`. Teller i mono over listen. Valgt forslag går direkte til steg 2. Ingen treff → «Ingen steder matchet søket.» i `text-ink-muted`.

**Touch-mål.** Alle trykkbare elementer ≥44 px høye eller 44×44: knapper, ikonknapper, forslagsrader, pin-treffsoner. Filterpillene er 38 px høye men har 8 px vertikal padding i containeren.

**Overganger.** Kortets valgt-tilstand: border og skygge 160 ms ease-out. Pin-størrelse 160 ms. Sheet 240 ms. Ingen andre animasjoner.

## State

```ts
type Status = "planned" | "visited";

interface Restaurant {
  id: string;
  name: string;
  address: string;
  category: string;        // fra Mapbox, f.eks. "street food"
  lat: number;
  lng: number;
  status: Status;
  website?: string;
  notes?: string;
  createdAt: string;
}
```

Toppnivå-state: `restaurants`, `isLoading`, `filter: "all" | "planned" | "visited"`, `selectedId`, `mapExpanded`, `sheet: { open: boolean; step: 1 | 2; query: string; suggestions: Suggestion[]; draft?: Partial<Restaurant> }`, `pendingDeleteId`.

Persistens er ikke spesifisert i designet — behold eksisterende lagringsløsning.

## Komponenttre

```
App
├─ AppHeader            «Foodie» + teller
├─ MapPanel             h-[236px] | h-full
│  ├─ RestaurantMarker  status, selected
│  ├─ RestaurantPopup   valgt sted
│  └─ MapToggleButton   «Vis liste» / kartikon
├─ StatusFilterBar
│  └─ FilterPill        label, count, active
├─ RestaurantList
│  ├─ RestaurantCard    collapsed | selected | confirmingDelete
│  │  ├─ StatusBadge
│  │  ├─ CategoryChip
│  │  └─ CardActions    toggle · link · delete
│  ├─ ListSkeleton      3 kort + spinner
│  └─ EmptyState        variant: none | filter
├─ AddPlaceButton       fixed bottom
└─ AddPlaceSheet
   ├─ SearchStep        input + SuggestionRow[]
   └─ ConfirmStep       PlaceSummary + felt + status
```

## Assets
Ingen bilder eller ikonfiler. Alle ikoner i prototypen er enkle geometriske former (sirkel, avrundet rektangel, roterte linjer) — bytt dem mot kodebasens eksisterende ikonsett (f.eks. Lucide: `MapPin`, `Check`, `ExternalLink`, `Trash2`, `Search`, `ChevronLeft`, `X`, `List`, `Locate`) i 16–18 px, `stroke-width` 1.6–2.

## Filer
- `Foodie Mobildesign.dc.html` — designreferansen. Åpne i nettleser og se **kun seksjon 5a** øverst: sju skjermrammer (01–07), kortkomponentens tilstander (08) og spesifikasjonspaneler (09). Resten av filen er forkastede fargeretninger.

## Copy brukt i designet (bokmål, verbatim)
- «Foodie», «12 STEDER», «0 AV 8»
- Filtre: «Alle», «Planlagt», «Besøkt»
- «+ Legg til restaurant», «Legg til restaurant», «Bekreft stedet», «Lagre restaurant», «Avbryt»
- «Marker som besøkt», «Sett som planlagt», «Fjern», «Fjerne «Katla» fra listen?», «Handlingen kan ikke angres.»
- «Nettside», «Notater», «valgfritt», «Status»
- «4 TREFF I NORGE», «SØK LEVERT AV MAPBOX»
- «Laster restauranter …», «KART LASTER»
- «Ingen steder ennå», «Legg til den første restauranten du har lyst til å prøve — den havner i listen og på kartet.»
- «Ingen besøkte restauranter ennå.», «Marker et sted som besøkt når du har vært der.», «Vis alle 8», «INGEN PINS I DETTE FILTERET», «Vis liste»
