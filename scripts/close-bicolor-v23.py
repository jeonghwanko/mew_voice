import bpy,bmesh,math
from pathlib import Path
from mathutils import Vector
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework');scene=bpy.context.scene;scene.frame_set(1);head=bpy.data.objects['mesh_0.001'];rig=bpy.data.objects['GLTF_created_0'];tail=bpy.data.objects['A_Tail']
# Close the reconstruction cut on the back of the head/neck, never the oral aperture.
bm=bmesh.new();bm.from_mesh(head.data)
def back(v):
 p=head.matrix_world@v.co;return p.y>-.205 or p.z<.213
edges=[e for e in bm.edges if e.is_boundary and all(back(v) for v in e.verts)]
result=bmesh.ops.holes_fill(bm,edges=edges,sides=0);faces=result.get('faces',[])
# Keep cap material consistent with the head UV; boundary coordinates remain intact.
for f in faces:f.material_index=0;f.smooth=True
bm.to_mesh(head.data);bm.free();head.data.update()
# Insert the tail root into the rump; the visible capped cylinder was the root, not the tip.
inv=tail.matrix_world.inverted()
for v in tail.data.vertices:
 t=(v.index//14)/63;w=max(0,1-t/.24)**2;p=tail.matrix_world@v.co;p.y-=.045*w;p.z-=.012*w;v.co=inv@p
scene['stage']='V23 reconstruction review: head/neck cut capped, tail root embedded in rump, facial bake and jaw/cavity retained.'
meshes=[bpy.data.objects[n] for n in ['mesh_0.001','mesh_0','Object_32','A_SeatedBody','A_Tail','A_OralCavity','A_Tongue','A_LipRim']]
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bicolor-a-v23.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
 if o.type in ['EMPTY','ARMATURE'] or o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'bicolor-a-v23.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_skins=True,export_morph=True)
s=Path('C:/Users/turbo08/mew_voice/scripts/rebuild-bicolor-v18.py').read_text(encoding='utf-8').split('# Neutral rendering with actual open/closed jaw and side profile.',1)[1];exec(s.replace('v18-','v23-').replace('(0,-.27,.295)','(0,-.27,.256)'))
