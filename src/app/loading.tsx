import { PageLoader } from "@/components/ui";

// Root-level instant loading state (see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md).
// Next wraps every page.tsx below this in a Suspense boundary using this as
// the fallback, so clicking any nav link/icon shows this immediately —
// prefetched, shown before the next route's own data finishes loading —
// instead of the click appearing to do nothing while the page renders.
// A route can still opt into a more tailored fallback with its own
// loading.tsx, which overrides this one for that subtree.
export default function Loading() {
  return <PageLoader />;
}
