import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { onIdTokenChanged, signOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { queryClient } from "@/lib/queryClient";
const AuthContext = createContext<{
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  logout: () => Promise<void>;
}>({ user: null, isAdmin: false, loading: true, logout: async () => {} });
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const previousUid = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    let generation = 0;
    const unsubscribe = onIdTokenChanged(auth, async (next) => {
      const currentGeneration = ++generation;
      setLoading(true);
      const uid = next?.uid ?? null;
      if (previousUid.current !== undefined && previousUid.current !== uid) {
        queryClient.removeQueries({
          predicate: (query) => {
            const key = String(query.queryKey[0]);
            return (
              key.startsWith("/api/orders") ||
              key.startsWith("/api/admin") ||
              key.startsWith("/api/messages")
            );
          },
        });
      }
      previousUid.current = uid;
      setUser(next);
      setAdmin(false);
      try {
        const token = await next?.getIdTokenResult();
        if (currentGeneration !== generation) return;
        setAdmin(
          token?.claims.admin === true || token?.claims.role === "admin",
        );
      } catch {
        if (currentGeneration === generation) setAdmin(false);
      } finally {
        if (currentGeneration === generation) setLoading(false);
      }
    });
    return () => {
      generation++;
      unsubscribe();
    };
  }, []);
  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        loading,
        logout: async () => {
          if (auth) await signOut(auth);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
