import bpy,json
from pathlib import Path
from mathutils import Vector
out=Path(__file__).resolve().parents[1]/'assets/avatar/v13-sit-stand'
bpy.ops.wm.open_mainfile(filepath=str(out/'v13-sit-stand-study.blend'))
s=bpy.context.scene;s.frame_set(1);o=bpy.data.objects['V13_mesh_0.001'];r=bpy.data.objects['SitStand']
ev=o.evaluated_get(bpy.context.evaluated_depsgraph_get());m=ev.to_mesh()
data={'bones':{b.name:{'head':list(b.head),'tail':list(b.tail),'scale':list(b.scale)} for b in r.pose.bones},'samples':[]}
data['rear_sections']=[]
data['contact']={}
for name,pred in [('fore',lambda p:p.y<-.085 and p.z<.06),('hind',lambda p:.05<p.y<.2 and p.z<.06)]:
 ids=[v.index for v in o.data.vertices if pred(v.co)]
 data['contact'][name]={'rest_min':min(o.data.vertices[i].co.z for i in ids),'pose_min':min(m.vertices[i].co.z for i in ids)}
for z in [.005,.015,.025,.04,.055,.07,.09,.12,.15]:
 pts=[v.co for v in o.data.vertices if v.co.x>.01 and v.co.y>.055 and abs(v.co.z-z)<.006]
 if pts:data['rear_sections'].append({'z':z,'n':len(pts),'ymin':min(p.y for p in pts),'ymax':max(p.y for p in pts),'ymean':sum(p.y for p in pts)/len(pts)})
for p in [(0,.05,.26),(.04,.13,.20),(0,-.05,.26),(0,.19,.235)]:
 v=min(o.data.vertices,key=lambda v:(v.co-Vector(p)).length)
 data['samples'].append({'rest':list(v.co),'pose':list(m.vertices[v.index].co),'weights':{o.vertex_groups[g.group].name:g.weight for g in v.groups}})
(out/'pose-debug.json').write_text(json.dumps(data,indent=2))
ev.to_mesh_clear()
