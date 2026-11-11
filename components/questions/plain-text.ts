/**
 * Plain text of sanitized inline HTML, for places that cannot hold markup
 * (<option> labels, drag handles). Same result as removing every `<…>` tag
 * (/<[^>]+>/g) then decoding the entities the sanitizer emits, but in linear
 * time: a long run of "<" without ">" cannot make it backtrack.
 */
export function htmlToText(html: string): string {
  let text = "";
  let i = 0;
  while (i < html.length) {
    const open = html.indexOf("<", i);
    if (open === -1) break;
    const close = html.indexOf(">", open + 1);
    if (close === -1) break; // no tag can end anymore: the rest is text
    text += html.slice(i, open);
    // "<>" is not a tag (the pattern needs one character inside): keep the "<".
    if (close === open + 1) {
      text += "<";
      i = open + 1;
    } else {
      i = close + 1;
    }
  }
  text += html.slice(i);
  return text
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");
}
