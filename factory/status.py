import os, glob, yaml, json
R = "/home/claude/afrikha/certidrill"
rows = []
for d in sorted(glob.glob(f"{R}/content/*")):
    c = os.path.basename(d)
    if c.startswith("_") or c == "az-104": continue
    if os.path.exists(f"{d}/NOT-AVAILABLE.md"): rows.append(f"{c:8} NOT AVAILABLE"); continue
    ref = os.path.exists(f"{d}/blueprint.yaml") and os.path.exists(f"{d}/objectives.yaml")
    nobj = nch = 0
    try:
        o = yaml.safe_load(open(f"{d}/objectives.yaml", encoding="utf8")); nobj = sum(len(g["objectives"]) for v in o.values() for g in v)
        nch = len(yaml.safe_load(open(f"{d}/course/course.yaml", encoding="utf8"))["chapters"])
    except Exception: pass
    plan = os.path.exists(f"{R}/factory/plans/{c}.json"); prof = os.path.exists(f"{R}/factory/profiles/{c}.md")
    en = len(glob.glob(f"{d}/course/chapters/*.en.md")); fr = len(glob.glob(f"{d}/course/chapters/*.fr.md"))
    q = len(glob.glob(f"{d}/questions/*/*.yaml")); cs = len(glob.glob(f"{d}/case-studies/*.yaml")); sr = len(glob.glob(f"{d}/series/*.yaml"))
    rows.append(f"{c:8} ref={'Y' if ref else '-'} obj={nobj:3} plan={'Y' if plan else '-'} prof={'Y' if prof else '-'} chapters={en}/{fr}/{nch:2} questions={q:4} cs={cs:2} sr={sr:2}")
print("\n".join(rows))
