"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Person } from "@/lib/types/database";

interface UsePersonReturn {
  person: Person | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePerson(personId: string): UsePersonReturn {
  const supabase = createClient();
  const [person, setPerson] = useState<Person | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    async function fetch() {
      setIsLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from("people")
        .select("*")
        .eq("id", personId)
        .single();

      if (err) {
        setError(err.message);
      } else {
        setPerson(data);
      }
      setIsLoading(false);
    }
    fetch();
  }, [personId, tick, supabase]);

  return { person, isLoading, error, refetch: () => setTick((t) => t + 1) };
}
