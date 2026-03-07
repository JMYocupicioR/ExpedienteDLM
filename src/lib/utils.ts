/**
 * Lightweight class name merge utility.
 * Concatenates truthy class name values separated by spaces.
 */
export function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(" ");
}
