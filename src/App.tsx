import type { ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { SaveErrorBanner } from "./components/common/SaveErrorBanner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { RestaurantProvider } from "./context/RestaurantContext";
import { useRestaurants } from "./context/RestaurantContext";
import { NotFoundPage } from "./routes/NotFoundPage";
import { RestaurantsPage } from "./routes/RestaurantsPage";
import { restaurantStorage } from "./services/storage";

/**
 * Kobler `userId` fra `AuthContext` (den anonyme Firebase-sesjonen) inn i
 * `RestaurantProvider`. En liten mellomkomponent er nødvendig siden
 * `useAuth()` bare kan brukes innenfor `AuthProvider`, som må ligge utenfor
 * `RestaurantProvider` i treet.
 */
function AuthenticatedRestaurantProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  return (
    <RestaurantProvider storage={restaurantStorage} userId={userId}>
      {children}
    </RestaurantProvider>
  );
}

function SaveErrorBannerContainer() {
  const { saveError, dismissSaveError } = useRestaurants();
  if (!saveError) {
    return null;
  }
  return <SaveErrorBanner onDismiss={dismissSaveError} />;
}

// Se design/README.md — header-teller: mono 11px, text-ink-muted,
// letter-spacing 0.04em, f.eks. «12 STEDER».
function HeaderCounter() {
  const { isLoading, restaurants } = useRestaurants();
  if (isLoading) {
    return null;
  }
  const label = restaurants.length === 1 ? "STED" : "STEDER";
  return (
    <span className="text-ink-muted font-mono text-[11px] tracking-[0.04em] uppercase">
      {restaurants.length} {label}
    </span>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AuthenticatedRestaurantProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          {/* Appen brukes kun på mobiltelefon (bevisst valg, ikke et
              foreløpig steg) — `max-w-md mx-auto` matcher en typisk
              telefonbredde selv om noen skulle åpne den i en bredere
              nettleser. Ingen `md:`/`lg:`-varianter skal legges til her;
              fremtidige endringer skal fortsatt designes mobil-først. */}
          <main className="mx-auto min-h-screen max-w-md p-4">
            <header className="mb-4 flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-[-0.02em]">Foodie</h1>
              <HeaderCounter />
            </header>
            <SaveErrorBannerContainer />
            <Routes>
              <Route path="/" element={<RestaurantsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </BrowserRouter>
      </AuthenticatedRestaurantProvider>
    </AuthProvider>
  );
}
