import json,sys,os
Q='/home/claude/afrikha/certidrill/factory/quizqueue.json'; L='/home/claude/afrikha/certidrill/factory/quizlaunched.txt'
pairs=json.load(open(Q)); done=set(open(L).read().split()) if os.path.exists(L) else set()
todo=[p for p in pairs if '|'.join(p) not in done]
n=int(sys.argv[1]) if len(sys.argv)>1 else 1
pick=todo[:n]
open(L,'a').write(''.join('|'.join(p)+'\n' for p in pick))
for p in pick: print('|'.join(p))
print('remaining', len(todo)-len(pick), file=sys.stderr)
