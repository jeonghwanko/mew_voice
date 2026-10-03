"""Project selected concept colors onto editable 3D forms and bake real UV maps.

This is a Blender material/UV operation, not a flat billboard replacement.
"""
import bpy
import math
from mathutils import Matrix,Vector

OUT='C:/Users/turbo08/mew_voice/assets/avatar/blender'
scene=bpy.context.scene
assert bpy.data.filepath.replace('\\','/').endswith('/cat-a-sculpt-v1.blend')
scene.frame_set(1)
source=bpy.data.images.load('C:/Users/turbo08/mew_voice/assets/avatar/concepts/v1/a-model-input.png',check_existing=True)
source.pack()
cat=bpy.data.collections['CatA_Sculpt']
rig=bpy.data.objects['A_Cat_Rig']
for obj in list(cat.objects):
    if obj.name.startswith(('A_CheekLock','A_Glint','A_Mouth','A_Philtrum','A_Eye_','A_Eyelids_','A_Whisker')):
        bpy.data.objects.remove(obj,do_unlink=True)

transform=Matrix.Translation((0,0,.60)) @ Matrix.Scale(.85,4)
for obj in cat.objects:
    if obj.type!='MESH' or obj.name in ['A_Body_Unified','A_Tail']:continue
    local=Matrix.Identity(4)
    if obj.name.startswith(('A_Eye_','A_Eyelids_')):
        side=-1 if obj.name in ['A_Eye_L','A_Eyelids_-1'] else 1
        pivot=Vector((side*.35,-.51,2.51))
        local=Matrix.Translation(pivot)@Matrix.Diagonal((.75,.80,.75,1))@Matrix.Translation(-pivot)
    obj.matrix_world=transform@local@obj.matrix_world

# The face uses painted eye shapes on the continuous surface for this stylized
# look-development comparison. Do not advertise the removed eyelid morphs.
body=bpy.data.objects['A_Body_Unified']
for vert in body.data.vertices:
    if vert.co.z>1.45:vert.co.z+=.22*min(1,(vert.co.z-1.45)/.42)
tail=bpy.data.objects['A_Tail']
colors=tail.data.color_attributes.get('CoatColor')
if colors:
    for vert in tail.data.vertices:
        t=.5+.5*math.sin((vert.co.x+vert.co.y*.45)*26)
        colors.data[vert.index].color=(.51-.20*t**8,.175-.10*t**8,.035-.02*t**8,1)

bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
for name in ['Head','EarL','EarR']:
    bone=rig.data.edit_bones[name];bone.head=transform@bone.head;bone.tail=transform@bone.tail
bpy.ops.object.mode_set(mode='OBJECT')

scene.render.engine='CYCLES';scene.cycles.samples=8
scene.render.bake.use_pass_direct=False;scene.render.bake.use_pass_indirect=False;scene.render.bake.use_pass_color=True
scene.render.bake.margin=8
for obj in list(cat.objects):
    if obj.type!='MESH' or obj.name=='A_Tail':continue
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    uv=obj.data.uv_layers.new(name='ConceptProjection')
    weights=obj.data.color_attributes.new(name='ProjectionWeight',type='FLOAT_COLOR',domain='POINT')
    is_body=obj.name in ['A_Body_Unified','A_Tail']
    for vert in obj.data.vertices:
        normal=obj.matrix_world.to_3x3()@vert.normal
        weight=max(0,min(1,(-normal.y-.04)/.60))
        if obj.name.startswith(('A_Eye_','A_Eyelids_','A_Nose')):weight=1
        weights.data[vert.index].color=(weight,weight,weight,1)
    for loop in obj.data.loops:
        co=obj.matrix_world@obj.data.vertices[loop.vertex_index].co
        if is_body:u=.537+co.x*.30;v=.055+co.z*.27
        else:u=.5192+co.x*.2849;v=.0993+co.z*.2496
        if obj.name.startswith('A_Ear_'):
            s=-1 if obj.name=='A_Ear_-1' else 1
            positions=[(s*.34*.85,.85*(3.07-.24)+.6),(s*.75*.85,.85*(3.72-.24)+.6),(s*.82*.85,.85*(3.01-.24)+.6)]
            matrix=Matrix([(x,z,1) for x,z in positions])
            source_uv=[(480,180),(355,34),(350,235)] if s<0 else [(705,180),(820,34),(820,235)]
            cu=matrix.inverted()@Vector([p[0]/1145 for p in source_uv]);cv=matrix.inverted()@Vector([1-p[1]/1374 for p in source_uv])
            u=cu.dot(Vector((co.x,co.z,1)));v=cv.dot(Vector((co.x,co.z,1)))
        uv.data[loop.index].uv=(u,v)
    surf=obj.data.uv_layers.new(name='SurfaceUV');obj.data.uv_layers.active=surf
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.15192,island_margin=.035);bpy.ops.object.mode_set(mode='OBJECT')
    material=bpy.data.materials.new(obj.name+'_Painted');material.use_nodes=True
    nodes=material.node_tree.nodes;links=material.node_tree.links;bs=nodes.get('Principled BSDF')
    bs.inputs['Roughness'].default_value=.78 if not obj.name.startswith('A_Eye_') else .32
    bs.inputs['Specular IOR Level'].default_value=.10
    coord=nodes.new('ShaderNodeUVMap');coord.uv_map='ConceptProjection'
    tex=nodes.new('ShaderNodeTexImage');tex.image=source;tex.extension='EXTEND';links.new(coord.outputs['UV'],tex.inputs['Vector'])
    color=nodes.new('ShaderNodeVertexColor');color.layer_name='CoatColor'
    weight=nodes.new('ShaderNodeVertexColor');weight.layer_name='ProjectionWeight'
    gray=nodes.new('ShaderNodeRGBToBW');links.new(tex.outputs['Color'],gray.inputs[0])
    cutoff=nodes.new('ShaderNodeMath');cutoff.operation='LESS_THAN';cutoff.inputs[1].default_value=.57 if obj.name.startswith('A_Ear_') else .90;links.new(gray.outputs[0],cutoff.inputs[0])
    mul=nodes.new('ShaderNodeMath');mul.operation='MULTIPLY';links.new(weight.outputs['Color'],mul.inputs[0]);links.new(cutoff.outputs[0],mul.inputs[1])
    mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MIX';links.new(mul.outputs[0],mix.inputs[0]);links.new(color.outputs['Color'],mix.inputs[1]);links.new(tex.outputs['Color'],mix.inputs[2]);links.new(mix.outputs[0],bs.inputs['Base Color'])
    if not obj.data.color_attributes.get('CoatColor'):mix.inputs[1].default_value=(.55,.18,.05,1)
    obj.data.materials.clear();obj.data.materials.append(material)
    size=1024 if obj.name in ['A_Head_ContinuousSurface','A_Body_Unified'] else 512
    baked=bpy.data.images.new(obj.name+'_BaseColor',width=size,height=size,alpha=False)
    baked.colorspace_settings.name='sRGB'
    target=nodes.new('ShaderNodeTexImage');target.image=baked
    for node in nodes:node.select=False
    target.select=True;nodes.active=target
    bpy.ops.object.bake(type='DIFFUSE')
    # Switch to the portable baked PBR material; remove temporary projection data.
    for node in list(nodes):
        if node not in [bs,nodes.get('Material Output'),target]:nodes.remove(node)
    uvnode=nodes.new('ShaderNodeUVMap');uvnode.uv_map='SurfaceUV';links.new(uvnode.outputs['UV'],target.inputs['Vector']);links.new(target.outputs['Color'],bs.inputs['Base Color'])
    obj.data.uv_layers.remove(obj.data.uv_layers['ConceptProjection'])
    obj.data.color_attributes.remove(obj.data.color_attributes['ProjectionWeight'])
    # Bake already contains coat color. Avoid glTF multiplying it a second time.
    for attr in list(obj.data.color_attributes):obj.data.color_attributes.remove(attr)
    baked.pack()
    print('BAKED',obj.name,size,flush=True)

scene.camera=bpy.data.objects['A_Camera_Front']
bpy.data.objects['A_Camera_Face'].location=(0,-9,2.84)
target=Vector((0,-.1,2.70));scene.camera= bpy.data.objects['A_Camera_Face']
scene.camera.rotation_euler=(target-scene.camera.location).to_track_quat('-Z','Y').to_euler()
scene.camera.data.ortho_scale=2.10
scene['production_stage']='A painted 3D study v2; painted eyes on continuous surface, head/ear rig; no eyelid animation'
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/cat-a-painted-v2.blend')
bpy.ops.object.select_all(action='DESELECT')
for obj in cat.objects:obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT+'/cat-a-painted-v2.glb',export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_morph=True,export_skins=True)
print('PAINTED_A_EXPORTED')
