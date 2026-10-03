import bpy,json
from pathlib import Path
out=[]
for name in ['Object_32','mesh_0','mesh_0.001']:
 o=bpy.data.objects[name];adj=[set() for v in o.data.vertices]
 for e in o.data.edges:a,b=e.vertices;adj[a].add(b);adj[b].add(a)
 seen=set();parts=[]
 for i in range(len(adj)):
  if i in seen:continue
  todo=[i];seen.add(i);ids=[]
  while todo:
   k=todo.pop();ids.append(k)
   for j in adj[k]:
    if j not in seen:seen.add(j);todo.append(j)
  ps=[o.matrix_world@o.data.vertices[k].co for k in ids]
  if len(ids)>10:parts.append({'count':len(ids),'center':[sum(p[k] for p in ps)/len(ps) for k in range(3)],'min':[min(p[k] for p in ps) for k in range(3)],'max':[max(p[k] for p in ps) for k in range(3)]})
 out.append({'object':name,'parent':o.parent.name if o.parent else None,'parent_bone':o.parent_bone,'parts':parts})
Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework/components.json').write_text(json.dumps(out,indent=2))
