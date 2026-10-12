// Avance Schools' "living colour": the accent follows the real time of day in
// IST — morning light through the classroom windows, a warm afternoon, then
// dusk. It only changes between bands (on the next page load or navigation),
// never while someone is reading.
export type SchoolBand = "morning" | "afternoon" | "evening";

export function istBand(now = new Date()): SchoolBand {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "numeric", hourCycle: "h23" }).format(now)
  );
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
}
