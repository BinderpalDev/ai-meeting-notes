import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useApp } from "@/context/AppContext";

export function useRequireAuth() {
  const { user, hydrated } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (hydrated && !user) navigate({ to: "/" });
  }, [hydrated, user, navigate]);

  return { user, ready: hydrated && !!user };
}
