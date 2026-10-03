// In-shell loading for Avance Schools: the top bar stays put and a bit of
// chalk wobbles where the page will appear.
export default function SchoolsLoading() {
  return (
    <div className="flex flex-1 items-center justify-center py-24" role="status" aria-label="Loading">
      <span className="text-4xl animate-loader-pulse" aria-hidden>
        ✏️
      </span>
    </div>
  );
}
