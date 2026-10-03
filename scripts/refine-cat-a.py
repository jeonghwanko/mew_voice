"""Refine the painted volume and author short, portable mesh fur (no particles)."""
import bpy
import math
import random
from mathutils import Vector

OUT='C:/Users/turbo08/mew_voice/assets/avatar/blender'
assert bpy.data.filepath.replace('\\','/').endswith('/cat-a-painted-v2.blend')
scene=bpy.context.scene;scene.frame_set(1)
cat=bpy.data.collections['CatA_Sculpt'];rig=bpy.data.objects['A_Cat_Rig']

for obj in cat.objects:
    if obj.type!='MESH':continue
    blocks=obj.data.shape_keys.key_blocks if obj.data.shape_keys else None
    arrays=[key.data for key in blocks] if blocks else [obj.data.vertices]
    for array in arrays:
        for vert in array:
            co=vert.co
            if obj.name=='A_Body_Unified':
                co.x*=1.32;co.y*=1.18
            if obj.name.startswith('A_Ear_'):
                t=max(0,min(1,(co.z-3.04)/.67))
                co.z-=.19*t;co.x+=(-1 if co.x<0 else 1)*.065*t
            if obj.name=='A_Head_ContinuousSurface' and co.y<0:
                # Shallow orbital relief remains part of the continuous face.
                for x in [-.346,.351]:
                    co.y-=.070*math.exp(-((co.x-x)/.21)**2-((co.z-2.75)/.20)**2)*min(1,-co.y*4)
    obj.data.update()

# Sample existing UV textures only to color new 3D fibers. Reference PNGs stay intact.
rng=random.Random(42)
for name,count in [('A_Head_ContinuousSurface',7000),('A_Body_Unified',8500),('A_Tail',1400),('A_Ear_-1',700),('A_Ear_1',700)]:
    obj=bpy.data.objects[name];mesh=obj.data;mesh.calc_loop_triangles()
    verts=[];faces=[];colors=[]
    tris=list(mesh.loop_triangles)
    areas=[max(.000001,t.area) for t in tris]
    image=None;uv=mesh.uv_layers.active
    if uv:
        for node in mesh.materials[0].node_tree.nodes:
            if node.type=='TEX_IMAGE':image=node.image;break
    pixels=list(image.pixels[:]) if image else None
    width,height=image.size if image else (0,0)
    for tri in rng.choices(tris,weights=areas,k=count):
        r=math.sqrt(rng.random());s=rng.random();ws=(1-r,r*(1-s),r*s)
        root=sum((mesh.vertices[i].co*w for i,w in zip(tri.vertices,ws)),Vector())
        normal=sum((mesh.vertices[i].normal*w for i,w in zip(tri.vertices,ws)),Vector()).normalized()
        # Preserve the eye/muzzle painting; groom only cheeks, brow and outline.
        if name=='A_Head_ContinuousSurface' and root.y<-.22 and abs(root.x)<.55 and root.z<3.00:continue
        if name.startswith('A_Ear_') and normal.y<-.5:continue
        tangent=Vector((root.x*.7,.15,-1))
        tangent=(tangent-normal*tangent.dot(normal)).normalized()
        direction=(normal*.20+tangent*.90).normalized()
        length=rng.uniform(.013,.039) if name!='A_Body_Unified' else rng.uniform(.019,.051)
        if name.startswith('A_Ear_'):length*=.6
        side=direction.cross(normal).normalized()*rng.uniform(.0007,.0013)
        root+=normal*.0015;mid=root+direction*length*.55+normal*length*.08;tip=root+direction*length
        i=len(verts);verts.extend([root-side,root+side,mid+side*.6,mid-side*.6,tip]);faces.extend([(i,i+1,i+2,i+3),(i+3,i+2,i+4)])
        if image:
            tex=sum((uv.data[li].uv*w for li,w in zip(tri.loops,ws)),Vector((0,0)))
            px=min(width-1,max(0,int(tex.x*width)));py=min(height-1,max(0,int(tex.y*height)))
            offset=(py*width+px)*4;col=pixels[offset:offset+3]
            # Packed sRGB base-color pixels need linear vertex colors.
            col=[c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in col]
        else:
            attr=mesh.color_attributes.get('CoatColor')
            col=list(attr.data[tri.vertices[0]].color[:3]) if attr else [.5,.15,.025]
        shade=rng.uniform(.86,1.08);colors.extend([(*[min(1,c*shade) for c in col],1)]*5)
    data=bpy.data.meshes.new(name+'_Fur');data.from_pydata(verts,[],faces);data.update()
    fur=bpy.data.objects.new(name+'_Fur',data);cat.objects.link(fur);fur.matrix_world=obj.matrix_world.copy()
    attr=data.color_attributes.new(name='CoatColor',type='FLOAT_COLOR',domain='POINT')
    for i,color in enumerate(colors):attr.data[i].color=color
    material=bpy.data.materials.new(name+'_FurColor');material.use_nodes=True
    bs=material.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.95;bs.inputs['Specular IOR Level'].default_value=.04
    vc=material.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='CoatColor';material.node_tree.links.new(vc.outputs['Color'],bs.inputs['Base Color']);data.materials.append(material)
    bone='Head' if name=='A_Head_ContinuousSurface' else 'Tail' if name=='A_Tail' else 'EarL' if name=='A_Ear_-1' else 'EarR' if name=='A_Ear_1' else 'Body'
    group=fur.vertex_groups.new(name=bone);group.add(list(range(len(verts))),1,'REPLACE')
    # matrix_parent_inverse keeps the authored surface coordinate frame intact.
    fur.parent=rig;arm=fur.modifiers.new('A_Rig','ARMATURE');arm.object=rig
    print('FUR',name,len(verts),flush=True)

scene['production_stage']='A painted 3D study v3: real mesh fur, continuous face; painted eyes, no blink or eye tracking'
rig['stage']='Head/ear/tail listening study; not a production facial rig'
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/cat-a-study-v3.blend')
bpy.ops.object.select_all(action='DESELECT')
for obj in cat.objects:obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT+'/cat-a-study-v3.glb',export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_morph=True,export_skins=True)
print('REFINED_A_EXPORTED',flush=True)
