import bpy,json
bpy.ops.wm.open_mainfile(filepath='C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework/bicolor-a-v13.blend')
r=bpy.data.objects['GLTF_created_0'];print('LEGS',json.dumps({b.name:[list(r.matrix_world@b.head),list(r.matrix_world@b.tail)] for b in r.pose.bones if 'Leg' in b.name or 'ROOT' in b.name}))
