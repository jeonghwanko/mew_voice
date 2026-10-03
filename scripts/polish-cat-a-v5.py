"""Author the unseen coat and eyelid pigment on the 3D asset, then bake UVs."""
import bpy,math
OUT='C:/Users/turbo08/mew_voice/assets/avatar/blender'
assert bpy.data.filepath.replace('\\','/').endswith('/cat-a-anatomy-v5.blend')
scene=bpy.context.scene;scene.frame_set(1)
rig=bpy.data.objects['A_Cat_Rig'];bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT');rig.data.edit_bones['Tail'].head=(-.38,.43,.68);rig.data.edit_bones['Tail'].tail=(-.67,.45,.48);bpy.ops.object.mode_set(mode='OBJECT')
for sign in [-1,1]:
    obj=bpy.data.objects['A4_Lid_'+str(sign)];attr=obj.data.color_attributes['LidPaint']
    for vert in obj.data.vertices:
        j=vert.index//128;t=j/12;a=(vert.index%128)*math.tau/128
        if j==0:continue
        target=(.47,.21,.059) if math.sin(a)>0 else (.78,.53,.26)
        weight=.72*(1-t)**.7;old=attr.data[vert.index].color
        attr.data[vert.index].color=(*(old[c]*(1-weight)+target[c]*weight for c in range(3)),1)

scene.render.engine='CYCLES';scene.cycles.samples=8
scene.render.bake.use_pass_direct=False;scene.render.bake.use_pass_indirect=False;scene.render.bake.use_pass_color=True;scene.render.bake.margin=12
for name in ['A4_Head','A4_Ear_-1','A4_Ear_1','A4_Body','A4_Tail']:
    obj=bpy.data.objects[name];data=obj.data;ishead=name=='A4_Head'
    attr=data.color_attributes.new(name='AuthoredCoat',type='FLOAT_COLOR',domain='POINT')
    for vert in data.vertices:
        x,y,z=vert.co
        if ishead:
            weight=max(0,min(1,(y+.30)/.38));weight=weight*weight*(3-2*weight)
            azimuth=math.atan2(x,y)
            high=(.5+.5*math.cos(azimuth*8+z*.3))**9
            low=(.5+.5*math.sin(z*22+y*3))**9
            blend=max(0,min(1,(z-2.75)/.27));stripe=(high*blend+low*(1-blend))*.46
            color=[a+(b-a)*stripe for a,b in zip((.50,.185,.043),(.20,.050,.012))]
        elif name=='A4_Body':
            paw=(y<-.35 and abs(abs(x)-.25)<.245) or (abs(x)>.44 and y<.13)
            weight=max(0,min(1,(.32-z)/.10)) if paw else 0
            weight=weight*weight*(3-2*weight);color=(.80,.66,.45)
        elif name=='A4_Tail':
            t=data.attributes['TailT'].data[vert.index].value
            stripe=(.5+.5*math.sin(t*38))**8*.62
            color=[a+(b-a)*stripe for a,b in zip((.50,.185,.043),(.19,.054,.014))]
            tip=max(0,min(1,(t-.80)/.15));tip=tip*tip*(3-2*tip)
            color=[a+(b-a)*tip for a,b in zip(color,(.80,.66,.45))];weight=1
        else:
            weight=max(0,min(1,(vert.normal.y+.10)/.50));color=(.48,.165,.035)
        attr.data[vert.index].color=(*color,weight)
    mat=data.materials[0];nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes['Principled BSDF'];original=bs.inputs['Base Color'].links[0].from_socket
    vc=nodes.new('ShaderNodeVertexColor');vc.layer_name='AuthoredCoat';mix=nodes.new('ShaderNodeMixRGB')
    links.new(vc.outputs['Alpha'],mix.inputs[0]);links.new(original,mix.inputs[1]);links.new(vc.outputs['Color'],mix.inputs[2]);links.new(mix.outputs[0],bs.inputs['Base Color'])
    size=2048 if ishead or name=='A4_Body' else 1024 if name=='A4_Tail' else 512
    image=bpy.data.images.new(name+'_RefinedColor',width=size,height=size,alpha=False);image.colorspace_settings.name='sRGB'
    target=nodes.new('ShaderNodeTexImage');target.image=image
    for node in nodes:node.select=False
    target.select=True;nodes.active=target;bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    bpy.ops.object.bake(type='DIFFUSE')
    for node in list(nodes):
        if node not in [bs,nodes['Material Output'],target]:nodes.remove(node)
    uv=nodes.new('ShaderNodeUVMap');uv.uv_map='SurfaceUV';links.new(uv.outputs[0],target.inputs[0]);links.new(target.outputs[0],bs.inputs['Base Color'])
    data.color_attributes.remove(data.color_attributes['AuthoredCoat']);image.pack()
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/cat-a-refined-v5.blend')
print('A5_COAT_REFINED',flush=True)
