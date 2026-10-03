"""Create a separate editable source study; do not modify the downloaded GLB."""
import bpy,json
from pathlib import Path
from mathutils import Vector
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework')
OUT.mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(OUT.parent/'bicolor-cat.glb'))
bpy.context.scene.frame_set(1);bpy.context.view_layer.update()
report={'objects':[],'bones':[]}
for o in bpy.context.scene.objects:
    item={'name':o.name,'type':o.type,'location':list(o.location),'scale':list(o.scale)}
    if o.type=='MESH':
        points=[o.matrix_world@v.co for v in o.data.vertices]
        item.update(vertices=len(points),min=[min(p[i] for p in points) for i in range(3)],max=[max(p[i] for p in points) for i in range(3)],shape_keys=[k.name for k in o.data.shape_keys.key_blocks] if o.data.shape_keys else [],groups=[g.name for g in o.vertex_groups],materials=[m.name for m in o.data.materials])
    if o.type=='ARMATURE':
        report['bones']=[{'name':b.name,'head':list(o.matrix_world@b.head_local),'tail':list(o.matrix_world@b.tail_local)} for b in o.data.bones]
    report['objects'].append(item)
bpy.context.scene['source']='Bicolor Cat by kenchoo; original Fripouille by guillaume bolis; CC BY 4.0'
bpy.context.scene['stage']='Editable reuse source; original geometry and animation preserved; not the A redesign.'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bicolor-source-study.blend'))
(OUT/'source-inspection.json').write_text(json.dumps(report,indent=2));print(json.dumps(report),flush=True)
