"""Local seam fairing on the static toe graft; preserves anterior toe surfaces."""
import bpy,bmesh,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path('C:/Users/turbo08/mew_voice/assets/avatar/references')
OUT=ROOT/'seated-haunch-toes-finished';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'seated-haunch-toes/seated-haunch-v13-toes.blend'))
body=bpy.data.objects['Seated_Haunch_With_V13_Toes']
before=[v.co.copy() for v in body.data.vertices]
group=body.vertex_groups.new(name='Seam_fairing_preserve_toes_and_sole')
def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
for v in body.data.vertices:
 p=v.co
 w=smooth(-.355,-.315,p.y)*(1-smooth(-.245,-.19,p.y))*smooth(.020,.036,p.z)*(1-smooth(.13,.18,p.z))
 if w>0:group.add([v.index],w,'REPLACE')
mod=body.modifiers.new('Fair dorsal and lateral junction','SMOOTH');mod.vertex_group=group.name;mod.factor=1;mod.iterations=260
bpy.context.view_layer.objects.active=body;bpy.ops.object.modifier_apply(modifier=mod.name)
bm=bmesh.new();bm.from_mesh(body.data)
audit={'nonmanifold_edges':sum(not e.is_manifold for e in bm.edges),'max_anterior_toe_displacement':max((v.co-before[v.index]).length for v in body.data.vertices if before[v.index].y<-.355),'max_sole_displacement':max((v.co-before[v.index]).length for v in body.data.vertices if before[v.index].z<.02),'max_displacement':max((v.co-before[v.index]).length for v in body.data.vertices),'scope':'static surface finishing only; no rig or UV transfer'}
bm.free();(OUT/'audit.json').write_text(json.dumps(audit,indent=2))
s=bpy.context.scene;cam=s.camera
for name,loc in [('side',(2,0,.45)),('back',(0,2,.45)),('quarter',(1.5,-2,.8)),('low-quarter',(1.5,-2,.20)),('toe-close',(1,-2,.55))]:
 target=Vector((0,-.04,.30)) if name!='toe-close' else Vector((0,-.30,.065));cam.data.ortho_scale=1.05 if name!='toe-close' else .65
 cam.location=loc;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();s.render.filepath=str(OUT/f'{name}.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'seated-haunch-v13-toes-finished.blend'))
print('TOE_FINISH_COMPLETE',audit)
