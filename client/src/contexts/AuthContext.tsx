import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as endSession,
  type User,
} from "firebase/auth";
import { doc, onSnapshot, runTransaction } from "firebase/firestore";
import {
  profileDetails,
  type ProfileDetails,
  type UserProfile,
} from "@shared/schema";
import { auth, db } from "@/lib/firebase";

type Session = {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: boolean;
};
const initial: Session = {
  currentUser: null,
  userProfile: null,
  loading: true,
  error: false,
};
async function completeProfile(user: User, fields: ProfileDetails) {
  const details = profileDetails.parse(fields);
  const ref = doc(db, "users", user.uid);
  await runTransaction(db, async (transaction) => {
    if (!(await transaction.get(ref)).exists()) {
      transaction.set(ref, {
        ...details,
        uid: user.uid,
        email: user.email,
        role: "user",
        createdAt: Date.now(),
      });
    }
  });
}
async function signUp(email: string, password: string, fields: ProfileDetails) {
  const details = profileDetails.parse(fields);
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await completeProfile(user, details);
}
const actions = {
  signUp,
  completeProfile,
  signIn: (email: string, password: string) =>
    signInWithEmailAndPassword(auth, email, password),
  signOut: () => endSession(auth),
};
const AuthContext = createContext<Session & typeof actions>({
  ...initial,
  ...actions,
});
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(initial);
  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribeProfile?.();
        setSession({
          currentUser: user,
          userProfile: null,
          loading: !!user,
          error: false,
        });
        if (!user) return;
        unsubscribeProfile = onSnapshot(
          doc(db, "users", user.uid),
          (snapshot) => {
            if (auth.currentUser?.uid === user.uid)
              setSession({
                currentUser: user,
                userProfile: snapshot.exists()
                  ? (snapshot.data() as UserProfile)
                  : null,
                loading: false,
                error: false,
              });
          },
          () => {
            if (auth.currentUser?.uid === user.uid)
              setSession({
                currentUser: user,
                userProfile: null,
                loading: false,
                error: true,
              });
          },
        );
      },
      () => setSession({ ...initial, loading: false, error: true }),
    );
    return () => {
      unsubscribe();
      unsubscribeProfile?.();
    };
  }, []);
  return (
    <AuthContext.Provider value={{ ...session, ...actions }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
