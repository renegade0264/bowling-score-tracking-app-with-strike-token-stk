import { createActor } from "@/backend";
import type { backendInterface } from "@/types/backendExtended";
// Re-export useActor from core-infrastructure, pre-bound to the app's backend createActor
import { useActor as _useActor } from "@caffeineai/core-infrastructure";

export function useActor() {
  const result = _useActor(createActor);
  return {
    actor: result.actor as backendInterface | null,
    isFetching: result.isFetching,
  };
}
