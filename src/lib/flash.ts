/** Scroll a contract highlight into view and pulse it. */
export function flashMark(clauseId: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(`doc-${clauseId}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.remove("mark-flash");
  void el.offsetWidth; // restart animation
  el.classList.add("mark-flash");
  window.setTimeout(() => el.classList.remove("mark-flash"), 2600);
}
