import os, re, glob, collections
root = "content"
rows = []
for c in sorted(os.listdir(root)):
    d = os.path.join(root, c)
    if not os.path.isdir(d) or c == "az-104": continue
    ch = glob.glob(f"{d}/course/chapters/*.en.md")
    words = sum(len(open(f, encoding="utf-8").read().split()) for f in ch)
    q = glob.glob(f"{d}/questions/**/*.yaml", recursive=True)
    cs = glob.glob(f"{d}/case-studies/**/*.yaml", recursive=True)
    sr = glob.glob(f"{d}/series/**/*.yaml", recursive=True)
    rows.append((c, len(ch), words, len(q), len(cs), len(sr)))
print("| Cert | Chapitres | Mots EN | Questions | Fichiers études de cas | Fichiers séries |")
print("|---|---|---|---|---|---|")
for r in rows: print("| %s | %d | %d | %d | %d | %d |" % r)
print("TOTAL", sum(r[1] for r in rows), sum(r[2] for r in rows), sum(r[3] for r in rows))
