/**
 * Turn a flag name into a valid key: "New Checkout Flow!" -> "new-checkout-flow".
 * Keys are 2-64 lowercase letters, digits, "-" or "_", starting with a letter.
 */
export function suggestKey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents: "é" -> "e"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^[^a-z]+/, "") // must start with a letter
    .slice(0, 64)
    .replace(/-+$/, "");
}
