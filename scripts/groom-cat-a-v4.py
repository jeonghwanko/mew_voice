"""Portable sculpt-following tapered fur ribbons for the A4 authored anatomy."""
import bpy,math,random,array
from mathutils import Vector
OUT='C:/Users/turbo08/mew_voice/assets/avatar/blender'
assert bpy.data.filepath.replace('\\','/').endswith('/cat-a-refined-v4.blend')
scene=bpy.context.scene;scene.frame_set(1);cat=bpy.data.collections['CatA_Sculpt'];rig=bpy.data.objects['A_Cat_Rig']
rng=random.Random(404)
for name,count in [('A4_Head',33000),('A4_Body',48000),('A4_Tail',8000),('A4_Ear_-1',1600),('A4_Ear_1',1600),('A4_Lid_-1',1800),('A4_Lid_1',1800)]:
    obj=bpy.data.objects[name];data=obj.data;data.calc_loop_triangles();triangles=list(data.loop_triangles)
    image=next(n.image for n in data.materials[0].node_tree.nodes if n.type=='TEX_IMAGE')
    pixels=array.array('f',[0])*(image.size[0]*image.size[1]*4);image.pixels.foreach_get(pixels);w,h=image.size
    uv=data.uv_layers.active;vs=[];fs=[];colors=[];deltas=[];ishead=name=='A4_Head';isear=name.startswith('A4_Ear');islid=name.startswith('A4_Lid')
    for tri in rng.choices(triangles,weights=[max(.0000001,t.area) for t in triangles],k=count):
        a=math.sqrt(rng.random());b=rng.random();weights=(1-a,a*(1-b),a*b)
        root=sum((data.vertices[i].co*s for i,s in zip(tri.vertices,weights)),Vector())
        normal=sum((data.vertices[i].normal*s for i,s in zip(tri.vertices,weights)),Vector()).normalized()
        if islid and min(i//128 for i in tri.vertices)<2:continue
        delta=Vector()
        if islid:delta=sum((data.shape_keys.key_blocks['Blink'].data[i].co*s for i,s in zip(tri.vertices,weights)),Vector())-root
        if ishead:
            eye=min(((root.x-side*.300)/.235)**2+((root.z-2.733)/.220)**2 for side in [-1,1])
            if root.y<-.25 and eye<1.07:continue
            if root.y<-.40 and abs(root.x)<.27 and 2.26<root.z<2.48:continue
        if isear and normal.y<-.40 and rng.random()<.85:continue
        # Coherent direction fields: upward forehead, outward cheeks, downward
        # chest and legs. Neighboring hairs follow a shared low-frequency guide.
        if ishead:
            direction=Vector((root.x*.8,.10,1 if root.z>2.98 else -.60))
            length=rng.uniform(.020,.050) if root.z>2.98 else rng.uniform(.030,.072)
            if abs(root.x)>.62:length*=1.30
        elif islid:
            direction=Vector((root.x*.10,0,-1));length=rng.uniform(.006,.012)
        elif name=='A4_Tail':
            direction=Vector((.8,-.25,-.3));length=rng.uniform(.035,.08)
        else:
            direction=Vector((root.x*.18,.08,-1));length=rng.uniform(.035,.085)
            if root.z<.30:length*=.35
        tangent=direction-normal*direction.dot(normal)
        if tangent.length<.001:tangent=normal.cross(Vector((1,0,0)))
        tangent.normalize();side=tangent.cross(normal).normalized()
        guide=.22*math.sin(root.x*28+root.z*17+root.y*11)
        tangent=(tangent+side*guide).normalized()
        lift=rng.uniform(.22,.42);thickness=rng.uniform(.0007,.0015)
        # A small population of broader guard hairs supports the silhouette.
        if rng.random()<.10:thickness*=1.7;length*=1.1
        tex=sum((uv.data[i].uv*s for i,s in zip(tri.loops,weights)),Vector((0,0)))
        px=min(w-1,max(0,int(tex.x*w)));py=min(h-1,max(0,int(tex.y*h)));offset=(py*w+px)*4
        color=[c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in pixels[offset:offset+3]]
        if islid:color=[sum(data.color_attributes['LidPaint'].data[i].color[ch]*s for i,s in zip(tri.vertices,weights)) for ch in range(3)]
        shade=rng.uniform(.91,1.07);color=[min(1,c*shade) for c in color]
        idx=len(vs);deltas.extend([delta]*9)
        for j in range(4):
            t=j/4;center=root+normal*(.0008+length*lift*math.sin(t*math.pi*.78))+tangent*length*t
            half=side*thickness*(1-t)**.8
            vs.extend([center-half,center+half]);colors.extend([(*color,1),(*color,1)])
        vs.append(root+normal*(length*lift*.48)+tangent*length);colors.append((*color,1))
        for j in range(3):k=idx+j*2;fs.append((k,k+1,k+3,k+2))
        fs.append((idx+6,idx+7,idx+8))
    mesh=bpy.data.meshes.new(name+'_Fur');mesh.from_pydata(vs,[],fs);mesh.update()
    fur=bpy.data.objects.new(name+'_Fur',mesh);cat.objects.link(fur);fur.matrix_world=obj.matrix_world.copy()
    attr=mesh.color_attributes.new(name='CoatColor',type='FLOAT_COLOR',domain='POINT')
    flat=array.array('f',(c for color in colors for c in color));attr.data.foreach_set('color',flat)
    material=bpy.data.materials.new(name+'_FurMaterial');material.use_nodes=True
    bs=material.node_tree.nodes['Principled BSDF'];bs.inputs['Roughness'].default_value=.87;bs.inputs['Specular IOR Level'].default_value=.03
    bs.inputs['Sheen Weight'].default_value=.13
    vc=material.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='CoatColor';material.node_tree.links.new(vc.outputs[0],bs.inputs['Base Color']);mesh.materials.append(material)
    for face in mesh.polygons:face.use_smooth=True
    if islid:
        fur.shape_key_add(name='Basis');key=fur.shape_key_add(name='Blink')
        for i,vert in enumerate(key.data):vert.co+=deltas[i]
        for frame,value in [(1,0),(55,0),(61,1),(66,1),(74,0),(150,0)]:key.value=value;key.keyframe_insert(data_path='value',frame=frame)
        fur.data.shape_keys.animation_data.action.name='Listen'
    bone='Head' if ishead or islid else 'Tail' if name=='A4_Tail' else 'EarL' if name=='A4_Ear_-1' else 'EarR' if name=='A4_Ear_1' else 'Body'
    fur.parent=rig;group=fur.vertex_groups.new(name=bone);group.add(list(range(len(vs))),1,'REPLACE');mod=fur.modifiers.new('A_Rig','ARMATURE');mod.object=rig
    print('GROOMED',name,len(vs)//9,flush=True)

scene['production_stage']='A v4: authored 3D eyes and blink lids, multiview UV coat, directional mesh groom; art study'
rig['stage']='6 bone listening rig plus real eyelid Blink; no speech lip sync'
scene.frame_set(1);scene.camera=bpy.data.objects['A_Camera_Face']
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/cat-a-study-v4.blend')
bpy.ops.object.select_all(action='DESELECT')
for obj in cat.objects:obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT+'/cat-a-study-v4.glb',export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_morph=True,export_skins=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=16)
print('A4_GROOM_EXPORTED',flush=True)
