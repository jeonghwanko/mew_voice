import bpy,json
from pathlib import Path
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework');scene=bpy.context.scene;rig=bpy.data.objects['GLTF_created_0'];meshes=[bpy.data.objects[n] for n in ['mesh_0','mesh_0.001','Object_32']]
for a in bpy.data.actions:a.use_fake_user=True
for o in scene.objects:
 if o.animation_data:o.animation_data_clear()
 if o.type=='MESH' and o.data.shape_keys:
  o.data.shape_keys.animation_data_clear()
  for k in o.data.shape_keys.key_blocks:k.value=0
for b in rig.pose.bones:b.matrix_basis.identity()
scene.render.fps=30;scene.frame_start=1;scene.frame_end=91
for o in meshes:
 if not o.data.shape_keys:continue
 key=o.data.shape_keys.key_blocks['target_0']
 for frame,value in [(1,0),(16,0),(22,.22),(28,.72),(34,1),(43,1),(51,.72),(62,.22),(73,0),(91,0)]:
  key.value=value;key.keyframe_insert('value',frame=frame)
 o.data.shape_keys.animation_data.action.name='SlowBlink_'+o.name
scene.frame_set(1);scene['stage']='V9: V8 geometry, verified source target_0 driven by a new 3-second SlowBlink clip. Source actions retained as unused data.'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bicolor-a-v9.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
 if o.type in ['EMPTY','ARMATURE'] or o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'bicolor-a-v9.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_skins=True,export_morph=True,export_extras=True)

# Name the exported combined clip without touching its binary buffers.
import struct
p=OUT/'bicolor-a-v9.glb';d=p.read_bytes();n=struct.unpack_from('<I',d,12)[0];g=json.loads(d[20:20+n]);g['animations'][0]['name']='SlowBlink';j=json.dumps(g,separators=(',',':')).encode();j+=b' '*((-len(j))%4);tail=d[20+n:];p.write_bytes(struct.pack('<III',0x46546c67,2,20+len(j)+len(tail))+struct.pack('<II',len(j),0x4e4f534a)+j+tail)
