import { useState, useEffect } from "react";

interface User {
  id: number;
  openId: string;
  name?: string | null;
  email?: string | null;
  role: "user" | "admin";
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    loading,
  };
}
