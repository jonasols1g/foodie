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
            <header className="mb-4">
              <h1 className="text-2xl font-semibold">Foodlist</h1>
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
