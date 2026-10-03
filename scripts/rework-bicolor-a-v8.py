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
    # Broad continuous lower-face compression, applied identically to eyes,
    # muzzle, whiskers and every source morph; keep topology and weights.
    x,y,z=p;front=1-smooth(-.255,-.207,y)
    lower=math.exp(-((z-.280)/.025)**2)*front*(1-smooth(.280,.292,z))
    p.z+=.005*lower
    cheek=math.exp(-((abs(x)-.038)/.027)**2-((z-.289)/.021)**2)*front
    p.x*=1+.025*cheek
    # Shorten forward muzzle without flattening the paired whisker pads.
    muzzle=math.exp(-(x/.029)**2-((z-.281)/.020)**2)*front
    p.y+=.004*muzzle*(1-smooth(.287,.300,z))
    pads=math.exp(-((abs(x)-.015)/.012)**2-((z-.279)/.009)**2)*front
    p.y-=.0030*pads
    # Ease downturned corners while leaving the central philtrum identifiable.
    corners=math.exp(-((abs(x)-.018)/.012)**2-((z-.268)/.007)**2)*front
    p.z+=.0018*corners
    # Shorter upper cranium; preserve the ear-root transition.
    upper=smooth(.318,.354,z)*front
    p.z-=0*upper
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
    sub=o.modifiers.new('A_surface_refinement','SUBSURF');sub.levels=3 if o==body else 1;sub.render_levels=sub.levels
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
    cx=(min(p.x for p in ps)+max(p.x for p in ps))/2;cz=(min(p.z for p in ps)+max(p.z for p in ps))/2-.0038
    rx=(max(p.x for p in ps)-min(p.x for p in ps))/2;rz=(max(p.z for p in ps)-min(p.z for p in ps))/2
    for i in group:
        p=body.matrix_world@body.data.vertices[i].co;dx=(p.x-cx)/rx;dz=(p.z-cz)/rz;r=math.hypot(dx,dz);a=math.atan2(dz,dx)
        t=smooth(.48,.56,r);outer=smooth(.86,1,r);detail=.025*math.sin(a*37)
        amber=(.72-.27*outer+detail,.49-.17*outer+detail,.13-.05*outer)
        color=tuple(.035*(1-t)+v*t for v in amber)
        shine=math.exp(-((dx+.23)/.16)**2-((dz-.23)/.16)**2)
        color=tuple(k*(1-shine)+.98*shine for k in color);attr.data[i].color=(*[linear(max(0,min(1,v))) for v in color],1)
# Pigment-aware vertex tint warms orange areas while preserving white fur.
import numpy as np
coat=meshes[1];mat=coat.data.materials[0].copy();mat.name='A_warm_source_coat';coat.data.materials[0]=mat
bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.8
link=bs.inputs['Base Color'].links[0];source_socket=link.from_socket
tex=next(n for n in mat.node_tree.nodes if n.type=='TEX_IMAGE' and n.image and 'diffuse' in n.image.name.lower()) if any(n.type=='TEX_IMAGE' and n.image and 'diffuse' in n.image.name.lower() for n in mat.node_tree.nodes) else next(n for n in mat.node_tree.nodes if n.type=='TEX_IMAGE' and n.image)
image=tex.image;pixels=np.empty(len(image.pixels),dtype=np.float32);image.pixels.foreach_get(pixels);pixels=pixels.reshape(image.size[1],image.size[0],4)
tints=[[] for v in coat.data.vertices];uv=coat.data.uv_layers.active
for loop in coat.data.loops:
    u,v=uv.data[loop.index].uv;col=pixels[int(v*image.size[1])%image.size[1],int(u*image.size[0])%image.size[0],:3]
    pigment=smooth(.045,.18,(float(col[0])-float(col[1]))/max(.1,float(col[0])))
    tints[loop.vertex_index].append(pigment)
color=coat.data.color_attributes.new(name='CoatTint',type='FLOAT_COLOR',domain='POINT');coat.data.color_attributes.active_color=color
for i,values in enumerate(tints):
    w=sum(values)/len(values) if values else 0;color.data[i].color=(1,1-.19*w,1-.40*w,1)
node=mat.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='CoatTint'
mix=mat.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1
mat.node_tree.links.new(source_socket,mix.inputs[1]);mat.node_tree.links.new(node.outputs['Color'],mix.inputs[2]);mat.node_tree.links.new(mix.outputs[0],bs.inputs['Base Color'])
scene['stage']='Bicolor A v8 proportion and muzzle study: welded/subdivided source topology, resampled morphs and amber iris material.'
(OUT/'bicolor-a-v8-check.json').write_text(json.dumps(report,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bicolor-a-v8.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
    if o.type in ['EMPTY','ARMATURE'] or o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'bicolor-a-v8.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_skins=True,export_morph=True,export_extras=True)
print('REWORK_V8_SAVED',json.dumps(report),flush=True)
# Reuse the neutral source-review lighting and cameras.
render=Path('C:/Users/turbo08/mew_voice/scripts/rework-bicolor-a-v1.py').read_text().split('# Review in the bind pose',1)[1]
exec('# Review in the bind pose'+render.replace('bicolor-a-v1-','bicolor-a-v8-').replace('samples=40','samples=24'))

clay=bpy.data.materials.new('Proportion_clay');clay.diffuse_color=(.45,.45,.45,1);scene.view_layers[0].material_override=clay
camera.location=(0,-1,.315);camera.data.ortho_scale=.17;camera.rotation_euler=(Vector((0,-.275,.312))-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/'bicolor-a-v8-clay.png');bpy.ops.render.render(write_still=True)
