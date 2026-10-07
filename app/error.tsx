"use client";
import { ErrorState } from "@/components/ui";

// Shown if a screen crashes, instead of a blank page.
export default function RouteError({ reset }: { error: Error; reset: () => void }) {
  return <main className="narrow"><ErrorState message="This screen hit a problem. Your data is safe." onRetry={reset} /></main>;
}
