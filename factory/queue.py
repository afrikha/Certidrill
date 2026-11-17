import sys, os, re
T = "/home/claude/afrikha/certidrill/factory/tasks"; L = "/home/claude/afrikha/certidrill/factory/launched.txt"
names = sorted(f[:-3] for f in os.listdir(T))
def of(kind, certs): return [n for c in certs for n in names if re.match(rf"^{kind}-{c}-", n)]
def QK(certs): return [n for c in certs for n in names if re.match(rf"^[QK]-{c}-", n)]
prio = ["ai-901","dp-900","sc-900","az-305","az-700","az-400","sc-500","ai-103","ai-200","az-140","dp-300","ai-300","dp-420","az-120","dp-750","az-802","sc-200","sc-100","dp-600","dp-700","dp-800"]
order = [n for c in prio for n in of("C",[c]) + QK([c])]
done = set(open(L).read().split()) if os.path.exists(L) else set()
todo = [n for n in order if n not in done]
if sys.argv[1] == "next":
    pick = todo[: int(sys.argv[2])]
    open(L, "a").write("".join(n + "\n" for n in pick)); print(" ".join(pick)); print("remaining after this:", len(todo) - len(pick), file=sys.stderr)
else:
    print(len(order), "tasks in queue,", len(todo), "not launched")
