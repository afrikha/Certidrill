import sys, re, os, math
for c in sys.argv[1:]:
    p = f"content/{c}/course/course.yaml"; s = open(p, encoding="utf-8").read()
    out, cur, n = [], None, 0
    for line in s.split("\n"):
        m = re.match(r"\s*-\s*id:\s*['\"]?([\w-]+)", line)
        if m: cur = m.group(1)
        m2 = re.match(r"(\s*)minutes:\s*\d+\s*$", line)
        if m2 and cur:
            f = f"content/{c}/course/chapters/{cur}.en.md"
            if os.path.exists(f):
                w = len(open(f, encoding="utf-8").read().split())
                line = f"{m2.group(1)}minutes: {max(5, int(5 * math.ceil(w / 180 / 5)))}"; n += 1
        out.append(line)
    open(p, "w", encoding="utf-8").write("\n".join(out)); print(c, n, "chapters updated")
