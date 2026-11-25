import os,re,math,json
certs="ai-103 ai-200 ai-300 ai-901 az-120 az-140 az-305 az-400 az-700 az-802 az-900 dp-300 dp-420 dp-600 dp-700 dp-750 dp-800 dp-900 sc-100 sc-200 sc-500 sc-900".split()
queue=[]
for c in certs:
    chs=sorted(f[:-5] for f in os.listdir(f"content/{c}/quizzes") if f.endswith(".yaml"))
    k=math.ceil(len(chs)/6); size=math.ceil(len(chs)/k)
    groups=[chs[i:i+size] for i in range(0,len(chs),size)]
    for n,g in enumerate(groups,1):
        lines=[]
        for ch in g:
            txt=open(f"content/{c}/course/chapters/{ch}.en.md").read()
            objs=[]
            for m in re.finditer(r"objectives:\s*([^>]*?)\s*-->",txt):
                for o in m.group(1).split(","):
                    o=o.strip()
                    if o and o not in objs: objs.append(o)
            lines.append(f"- `{ch}`: objectives {', '.join(objs)}; findings in `factory/reports/QZ-{c}-{ch}.md`")
        name=f"FIX-{c}-{n}"
        body=f"""# Task {name} — course and bank corrections, {c.upper()}, chapters {', '.join(g)}

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/{c}.md`.

Your chapters (and the only bank objectives you may touch):
{chr(10).join(lines)}

Report: `factory/reports/{name}.md`.

Checks: `npx tsx factory/check-cert.ts {c} {' '.join(g)}`; `npm run -s content:validate -- --cert {c}`; `npx tsx factory/check-quiz.ts {c} {' '.join(g)}`.
"""
        open(f"factory/tasks/{name}.md","w").write(body); queue.append(name)
json.dump(queue,open("factory/fixqueue.json","w"))
print(len(queue))
