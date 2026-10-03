import bpy,collections,json
from mathutils import Vector
m=bpy.data.objects['mesh_0.001'];p=[m.matrix_world@v.co for v in m.data.vertices]
keys=[tuple(round(x,5) for x in v) for v in p]
removed=set()
for f in m.data.polygons:
 c=sum((p[i] for i in f.vertices),Vector())/len(f.vertices)
 if .035<c.y<.235 and c.z<.19:removed.add(f.index)
edges=collections.Counter()
for f in m.data.polygons:
 if f.index in removed:continue
 vs=list(f.vertices)
 for a,b in zip(vs,vs[1:]+vs[:1]):edges[tuple(sorted((keys[a],keys[b])))]+=1
adj=collections.defaultdict(set)
for (a,b),n in edges.items():
 if n==1 and max(a[1],b[1])>.025 and min(a[2],b[2])<.23:adj[a].add(b);adj[b].add(a)
seen=set();loops=[]
for a in adj:
 if a in seen:continue
 stack=[a];arr=[]
 while stack:
  n=stack.pop()
  if n in seen:continue
  seen.add(n);arr.append(n);stack.extend(adj[n]-seen)
 loops.append({'count':len(arr),'min':[min(p[i] for p in arr) for i in range(3)],'max':[max(p[i] for p in arr) for i in range(3)],'degrees':dict(collections.Counter(len(adj[n]) for n in arr))})
print(json.dumps({'removedFaces':len(removed),'boundaries':loops}))



