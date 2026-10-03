import bpy,bmesh,json
from pathlib import Path
root=Path('C:/Users/turbo08/mew_voice/assets/avatar/references/paw-stand-weights')
bpy.ops.wm.open_mainfile(filepath=str(root/'paw-stand-rig.blend'))
o=bpy.data.objects['Seated_Haunch_With_V13_Toes'];bm=bmesh.new();bm.from_mesh(o.data)
audit={'vertices':len(bm.verts),'faces':len(bm.faces),'boundary_edges':sum(e.is_boundary for e in bm.edges),'nonmanifold_edges':sum(not e.is_manifold for e in bm.edges),'components':0}
unseen=set(bm.verts)
while unseen:
 stack=[unseen.pop()];audit['components']+=1
 while stack:
  v=stack.pop()
  for e in v.link_edges:
   other=e.other_vert(v)
   if other in unseen:unseen.remove(other);stack.append(other)
audit['interpretation']='Connectivity audit only, not joint-loop retopology or collision validation.'
(root/'topology-audit.json').write_text(json.dumps(audit,indent=2));print(json.dumps(audit));bm.free()
