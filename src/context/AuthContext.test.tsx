import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// `firebase/auth` og `../services/auth/firebaseClient` mockes helt — sistnevnte
// kaller `getAuth()` synkront ved modulinnlasting og krever ekte
// `VITE_FIREBASE_*`-miljøvariabler (se firebaseClient.ts). Testen skal verifisere
// AuthContext sin egen tilstandsmaskin, ikke et ekte Firebase-oppsett.
const { onAuthStateChangedMock, signInAnonymouslyMock } = vi.hoisted(() => ({
  onAuthStateChangedMock: vi.fn(),
  signInAnonymouslyMock: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: onAuthStateChangedMock,
  signInAnonymously: signInAnonymouslyMock,
}));

vi.mock("../services/auth/firebaseClient", () => ({
  auth: {},
}));

const { AuthProvider, useAuth } = await import("./AuthContext");

type AuthChangeCallback = (user: { uid: string } | null) => void;
type AuthErrorCallback = (error: unknown) => void;

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("AuthContext", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("er i 'loading'-tilstand med userId=null helt til onAuthStateChanged gir en bruker", () => {
    let onChange: AuthChangeCallback | undefined;
    onAuthStateChangedMock.mockImplementation((_auth, next: AuthChangeCallback) => {
      onChange = next;
      return () => {};
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.status).toBe("loading");
    expect(result.current.userId).toBeNull();

    act(() => {
      onChange?.({ uid: "user-1" });
    });

    expect(result.current.status).toBe("ready");
    expect(result.current.userId).toBe("user-1");
  });

  it("oppretter en anonym sesjon når onAuthStateChanged ikke finner noen bruker", () => {
    let onChange: AuthChangeCallback | undefined;
    onAuthStateChangedMock.mockImplementation((_auth, next: AuthChangeCallback) => {
      onChange = next;
      return () => {};
    });
    signInAnonymouslyMock.mockResolvedValue(undefined);

    renderHook(() => useAuth(), { wrapper });

    act(() => {
      onChange?.(null);
    });

    expect(signInAnonymouslyMock).toHaveBeenCalledTimes(1);
  });

  it("går til 'error'-tilstand hvis anonym innlogging feiler", async () => {
    let onChange: AuthChangeCallback | undefined;
    onAuthStateChangedMock.mockImplementation((_auth, next: AuthChangeCallback) => {
      onChange = next;
      return () => {};
    });
    signInAnonymouslyMock.mockRejectedValue(new Error("nettverksfeil"));

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      onChange?.(null);
    });

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
    expect(result.current.userId).toBeNull();
  });

  it("går til 'error'-tilstand hvis selve auth-lyttingen feiler", () => {
    let onError: AuthErrorCallback | undefined;
    onAuthStateChangedMock.mockImplementation(
      (_auth, _next: AuthChangeCallback, errorCallback: AuthErrorCallback) => {
        onError = errorCallback;
        return () => {};
      },
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      onError?.(new Error("lytte-feil"));
    });

    expect(result.current.status).toBe("error");
    expect(result.current.userId).toBeNull();
  });
});
