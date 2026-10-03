"""V14: reshape existing continuous ear surfaces without changing face topology."""
import bpy,bmesh,json,ast
from pathlib import Path
from mathutils import Vector
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/blender')
assert bpy.data.filepath.replace('\\','/').endswith('cat-a-foundation-v13.blend')
scene=bpy.context.scene;scene.frame_set(1);cat=bpy.data.collections['CatA_Sculpt'];body=bpy.data.objects['A13_Continuous_Sculpt']
source=ast.parse(Path('C:/Users/turbo08/mew_voice/scripts/resize-cat-v12.py').read_text())
for node in source.body:
    if isinstance(node,ast.FunctionDef) and node.name in ['active','export','fur_guide']:
        exec(compile(ast.Module(body=[node],type_ignores=[]),'<shared>','exec'))
def smooth(a,b,v):
    t=max(0,min(1,(v-a)/(b-a)));return t*t*(3-2*t)
changed=0;lower_delta=0
for v in body.data.vertices:
    p=v.co.copy();x=abs(p.x);sign=1 if p.x>=0 else -1
    w=smooth(2.76,2.96,p.z)*smooth(.24,.39,x)
    if not w:continue
    # Shorter broad triangular pinna; thickened bowl and rotated outer rim.
    target=Vector((sign*(.40+(x-.40)*1.26),-.075+(p.y+.075)*1.7-sign*(p.x-sign*.40)*.36,2.76+(p.z-2.76)*.76))
    v.co=p.lerp(target,w);changed+=1
body.data.update()
# Round the tips locally, preserving the head and its existing skin weights.
g=body.vertex_groups.new(name='V14_Ear_tip_round')
for v in body.data.vertices:
    w=smooth(2.97,3.035,v.co.z)*smooth(.28,.4,abs(v.co.x))
    if w:g.add([v.index],w,'REPLACE')
active(body);m=body.modifiers.new('Round_pinna_tip','SMOOTH');m.vertex_group=g.name;m.factor=.55;m.iterations=8;bpy.ops.object.modifier_apply(modifier=m.name)
for o in cat.objects:o.name=o.name.replace('A13','A14')
bm=bmesh.new();bm.from_mesh(body.data)
report={'changed_ear_region_vertices':changed,'nonmanifold':sum(not e.is_manifold for e in bm.edges),'volume':bm.calc_volume(signed=True),'head_scale_from_v12':.92,'ear_height_target_scale':.76,'ear_width_target_scale':1.26,'ear_depth_target_scale':1.7}
bm.free();assert report['nonmanifold']==0 and report['volume']>0
fur_guide('14')
scene['production_stage']='V14 ear shape review: shorter, broader, deeper bowls; V13 head size preserved.'
active(body);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'cat-a-foundation-v14.blend'));export(OUT/'cat-a-foundation-v14.glb',list(cat.objects),True)
(OUT/'v14-ear-check.json').write_text(json.dumps(report,indent=2));print('V14_SAVED',json.dumps(report),flush=True)
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=900;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;camera=scene.camera
for name,loc,frame,scale,target in [('front',(0,-9,2.6),1,3.8,(0,0,1.67)),('quarter',(4,-8,3.1),1,3.8,(0,0,1.67)),('side',(9,0,2.6),1,3.8,(0,0,1.67)),('blink',(0,-9,2.6),50,1.85,(0,-.1,2.55))]:
    scene.frame_set(frame);camera.data.ortho_scale=scale;camera.location=loc;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/('v14-'+name+'.png'));bpy.ops.render.render(write_still=True);print('V14_RENDER',name,flush=True)

