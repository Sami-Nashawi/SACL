import Link from "next/link";
import { EmptyState } from "@/components/ui";

export default function NotFound() {
  return <main className="narrow"><EmptyState title="Page not found" text="That page does not exist or was moved." action={<Link className="btn primary" href="/">Back to layouts</Link>} /></main>;
}
