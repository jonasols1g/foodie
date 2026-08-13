import type { ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { RestaurantProvider } from "./context/RestaurantContext";
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

export function App() {
  return (
    <AuthProvider>
      <AuthenticatedRestaurantProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          {/* Appen brukes kun på mobiltelefon (bevisst valg, ikke et
              foreløpig steg) — `max-w-md mx-auto` matcher en typisk
              telefonbredde selv om noen skulle åpne den i en bredere
              nettleser. Fixed-posisjonerte elementer lenger nede (bunnknapp,
              kart utvidet, legg-til-sheet) bruker samme `mx-auto max-w-md`-
              triks på sine egne `fixed inset-x-0`-containere for å holde seg
              innenfor denne kolonnen istedenfor å strekke seg over hele
              viewporten. Ingen `md:`/`lg:`-varianter skal legges til her;
              fremtidige endringer skal fortsatt designes mobil-først. */}
          <div className="bg-bg relative mx-auto min-h-screen max-w-md">
            <Routes>
              <Route path="/" element={<RestaurantsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
        </BrowserRouter>
      </AuthenticatedRestaurantProvider>
    </AuthProvider>
  );
}
