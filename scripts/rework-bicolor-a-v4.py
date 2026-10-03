"""A face using welded source topology and resampled source morphs."""
import bpy,bmesh,math,json,ast
from pathlib import Path
from mathutils import Vector
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework')
assert bpy.data.filepath.replace('\\','/').endswith('bicolor-source-study.blend')
scene=bpy.context.scene;scene.frame_set(1);rig=bpy.data.objects['GLTF_created_0']
meshes=[bpy.data.objects[n] for n in ['mesh_0','mesh_0.001','Object_32']]
def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def active(o):
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
def deform(p):
    p=p.copy();x,y,z=p;head=smooth(.249,.283,z)*(1-smooth(-.246,-.192,y))
    p.x*=1+.18*head;p.z=.300+(z-.300)*(1+.08*head);p.y=-.235+(y+.235)*(1-.08*head)
    front=1-smooth(-.270,-.230,p.y)
    upper=smooth(.275,.293,p.z)*(1-smooth(.329,.354,p.z))*front
    p.z=.304+(p.z-.304)*(1+.32*upper)
    ax=abs(p.x);sign=1 if p.x>=0 else -1
    w=smooth(.003,.013,ax)*(1-smooth(.037,.064,ax))*upper
    p.x+=sign*(ax-.024)*.22*w
    # Reduce excessively tall source ear tips while retaining their roots.
    if p.z>.335:p.z=.335+(p.z-.335)*.84
    return p

# Mark the actual iris surfaces in the source diffuse mesh, not the whiskers.
body=meshes[0]
eye_ids={v.index for v in body.data.vertices if (body.matrix_world@v.co).z>.285 and (body.matrix_world@v.co).y<-.24}
assert len(eye_ids)>100
eyeMat=bpy.data.materials.new('A_source_amber_iris');eyeMat.use_nodes=True;bs=eyeMat.node_tree.nodes['Principled BSDF'];bs.inputs['Roughness'].default_value=.18
node=eyeMat.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='A_Eye';eyeMat.node_tree.links.new(node.outputs['Color'],bs.inputs['Base Color'])
body.data.materials.append(eyeMat);eye_index=len(body.data.materials)-1
for p in body.data.polygons:
    if all(i in eye_ids for i in p.vertices):p.material_index=eye_index

report={'original_iris_vertices':len(eye_ids),'objects':[]}
for o in meshes:
    inv=o.matrix_world.inverted()
    keys=o.data.shape_keys
    if keys:
        for k in keys.key_blocks:
            for v in k.data:v.co=inv@deform(o.matrix_world@v.co)
        for v,k in zip(o.data.vertices,keys.key_blocks[0].data):v.co=k.co
    else:
        for v in o.data.vertices:v.co=inv@deform(o.matrix_world@v.co)
    o.data.update()
    if o.name=='Object_32':continue
    # Weld only coincident vertices; UV coordinates remain per face corner.
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.0000005);bm.to_mesh(o.data);bm.free()
    if keys:assert all(len(k.data)==len(o.data.vertices) for k in keys.key_blocks)
    arm=[m for m in o.modifiers if m.type=='ARMATURE']
    for m in arm:m.show_viewport=False
    sub=o.modifiers.new('A_surface_refinement','SUBSURF');sub.levels=1;sub.render_levels=1
    key_names=[k.name for k in o.data.shape_keys.key_blocks] if o.data.shape_keys else ['Basis']
    values=[];base=None
    for name in key_names:
        if o.data.shape_keys:
            for k in o.data.shape_keys.key_blocks:k.value=1 if k.name==name and name!='Basis' else 0
        bpy.context.view_layer.update();graph=bpy.context.evaluated_depsgraph_get();evaluated=o.evaluated_get(graph)
        data=bpy.data.meshes.new_from_object(evaluated,preserve_all_data_layers=True,depsgraph=graph)
        values.append([v.co.copy() for v in data.vertices])
        if base is None:base=data
        else:bpy.data.meshes.remove(data)
    assert all(len(v)==len(base.vertices) for v in values)
    o.modifiers.remove(sub);o.data=base
    for name,coords in zip(key_names,values):
        key=o.shape_key_add(name=name)
        for v,co in zip(key.data,coords):v.co=co
    for m in arm:m.show_viewport=True
    for p in o.data.polygons:p.use_smooth=True
    report['objects'].append({'name':o.name,'vertices':len(o.data.vertices),'morphs':len(key_names)-1,'weighted_vertices':sum(bool(v.groups) for v in o.data.vertices)})
    assert all(v.groups for v in o.data.vertices),'Subdivision lost the source skin weights'

# Color the already integrated iris geometry with round dilated pupils.
def linear(x):return x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4
attr=body.data.color_attributes.new(name='A_Eye',type='FLOAT_COLOR',domain='POINT');body.data.color_attributes.active_color=attr
ids={i for p in body.data.polygons if p.material_index==eye_index for i in p.vertices}
for sign in [-1,1]:
    group=[i for i in ids if (body.matrix_world@body.data.vertices[i].co).x*sign>0]
    ps=[body.matrix_world@body.data.vertices[i].co for i in group]
    cx=(min(p.x for p in ps)+max(p.x for p in ps))/2;cz=(min(p.z for p in ps)+max(p.z for p in ps))/2
    rx=(max(p.x for p in ps)-min(p.x for p in ps))/2;rz=(max(p.z for p in ps)-min(p.z for p in ps))/2
    for i in group:
        p=body.matrix_world@body.data.vertices[i].co;dx=(p.x-cx)/rx;dz=(p.z-cz)/rz;r=math.hypot(dx,dz);a=math.atan2(dz,dx)
        t=smooth(.64,.75,r);outer=smooth(.86,1,r);detail=.025*math.sin(a*37)
        amber=(.72-.27*outer+detail,.49-.17*outer+detail,.13-.05*outer)
        color=tuple(.02*(1-t)+v*t for v in amber);attr.data[i].color=(*[linear(max(0,min(1,v))) for v in color],1)
scene['stage']='Bicolor A v4 face study: welded/subdivided source topology, resampled morphs and amber iris material.'
(OUT/'bicolor-a-v4-check.json').write_text(json.dumps(report,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bicolor-a-v4.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
    if o.type in ['EMPTY','ARMATURE'] or o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'bicolor-a-v4.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_skins=True,export_morph=True,export_extras=True)
print('REWORK_V4_SAVED',json.dumps(report),flush=True)
# Reuse the neutral source-review lighting and cameras.
render=Path('C:/Users/turbo08/mew_voice/scripts/rework-bicolor-a-v1.py').read_text().split('# Review in the bind pose',1)[1]
exec('# Review in the bind pose'+render.replace('bicolor-a-v1-','bicolor-a-v4-'))
