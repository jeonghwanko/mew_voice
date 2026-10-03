import bpy,json
bpy.ops.wm.open_mainfile(filepath='C:/Users/turbo08/mew_voice/assets/avatar/references/paw-stand-junction/paw-stand-finished.blend')
o=bpy.data.objects['Seated_Haunch_With_V13_Toes']
print('INSPECT',json.dumps({'custom_normals':o.data.has_custom_normals,'flat_faces':sum(not p.use_smooth for p in o.data.polygons),'modifiers':[(m.name,m.type) for m in o.modifiers]}))
