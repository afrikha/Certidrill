/**
 * A text field of a submitted form. A file input (or a missing field) gives "",
 * never "[object File]".
 */
export function formString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
