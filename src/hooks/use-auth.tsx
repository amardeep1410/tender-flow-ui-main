import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { UserProfile, UserRole } from "@/types/tender";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: "TENDER_USER" | "SUPER_ADMIN";
  isLoading: boolean;
  signIn: (
    email: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeRole(roleString?: string | null): "TENDER_USER" | "SUPER_ADMIN" {
  if (!roleString) return "TENDER_USER";
  const upper = roleString.toUpperCase();
  if (upper === "SUPER_ADMIN" || upper === "ADMIN") return "SUPER_ADMIN";
  return "TENDER_USER";
}

function normalizeStatus(statusString?: string | null): "ACTIVE" | "INACTIVE" {
  if (!statusString) return "ACTIVE";
  const upper = statusString.toUpperCase();
  if (upper === "INACTIVE" || upper === "SUSPENDED" || upper === "DISABLED") return "INACTIVE";
  return "ACTIVE";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfileForUser = useCallback(
    async (currentUser: User): Promise<UserProfile | null> => {
      if (!isSupabaseConfigured) {
        // Offline / fallback profile when Supabase key is not yet set
        const role = (currentUser.user_metadata?.role as string) || "TENDER_USER";
        return {
          id: currentUser.id,
          name: currentUser.user_metadata?.name || currentUser.email?.split("@")[0] || "User",
          email: currentUser.email || "",
          role: normalizeRole(role),
          accountStatus: "ACTIVE",
          createdAt: currentUser.created_at || new Date().toISOString(),
        };
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, name, email, role, status, created_at, updated_at")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (error) {
          console.error("Could not fetch user profile from Supabase:", error);
        } else {
          console.log("Fetched user profile successfully:", data);
        }

        if (data) {
          const accountStatus = normalizeStatus(data.status);
          if (accountStatus === "INACTIVE") {
            toast.error("Account Inactive", {
              description: "Your account is inactive. Please contact your administrator.",
            });
            await supabase.auth.signOut();
            return null;
          }

          return {
            id: data.id,
            name:
              data.name || currentUser.user_metadata?.name || data.email?.split("@")[0] || "User",
            email: data.email || currentUser.email || "",
            role: normalizeRole(data.role),
            accountStatus,
            createdAt: data.created_at || currentUser.created_at,
            updatedAt: data.updated_at,
          };
        }

        // Profile record does not exist yet (e.g., trigger pending); build fallback from metadata
        return {
          id: currentUser.id,
          name: currentUser.user_metadata?.name || currentUser.email?.split("@")[0] || "User",
          email: currentUser.email || "",
          role: normalizeRole(currentUser.user_metadata?.role as string),
          accountStatus: "ACTIVE",
          createdAt: currentUser.created_at || new Date().toISOString(),
        };
      } catch (err) {
        console.error("Error in fetchProfileForUser:", err);
        return null;
      }
    },
    [],
  );

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await fetchProfileForUser(user);
    if (p) {
      setProfile(p);
    }
  }, [user, fetchProfileForUser]);

  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);
          const userProf = await fetchProfileForUser(initialSession.user);
          if (isMounted) {
            setProfile(userProf);
          }
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error("Error initializing auth:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      if (event === "SIGNED_OUT" || !newSession) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      setSession(newSession);
      setUser(newSession.user);

      if (newSession.user) {
        const userProf = await fetchProfileForUser(newSession.user);
        if (isMounted) {
          setProfile(userProf);
        }
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfileForUser]);

  const signIn = useCallback(
    async (email: string, password: string, _rememberMe?: boolean) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          let userMessage = "Unable to sign in. Please try again.";
          const msg = error.message.toLowerCase();
          if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
            userMessage = "Invalid email or password.";
          } else if (msg.includes("email not confirmed")) {
            userMessage = "Please verify your email before signing in.";
          } else if (msg.includes("user not found") || msg.includes("no user")) {
            userMessage = "Invalid email or password.";
          }
          return { success: false, error: userMessage };
        }

        if (data.user) {
          const userProf = await fetchProfileForUser(data.user);
          if (!userProf || userProf.accountStatus === "INACTIVE") {
            return {
              success: false,
              error: "Your account is inactive. Please contact your administrator.",
            };
          }
          setProfile(userProf);
          setUser(data.user);
          setSession(data.session);
        }

        return { success: true };
      } catch (err) {
        console.error("signIn error:", err);
        return { success: false, error: "Unable to sign in. Please try again." };
      }
    },
    [fetchProfileForUser],
  );

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("signOut error:", err);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return {
          success: false,
          error: error.message || "Failed to update password.",
        };
      }

      return { success: true };
    } catch (err) {
      console.error("updatePassword error:", err);
      return { success: false, error: "Failed to update password. Please try again." };
    }
  }, []);

  const role: "TENDER_USER" | "SUPER_ADMIN" = useMemo(() => {
    return profile?.role ?? "TENDER_USER";
  }, [profile]);

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      role,
      isLoading,
      signIn,
      signOut,
      updatePassword,
      refreshProfile,
    }),
    [user, session, profile, role, isLoading, signIn, signOut, updatePassword, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
