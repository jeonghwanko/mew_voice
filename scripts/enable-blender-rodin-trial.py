import bpy
scene=bpy.context.scene
# Explicit public trial credential from the installed upstream addon; never use
# a private paid credential for this comparison.
scene.blendermcp_hyper3d_mode='MAIN_SITE'
scene.blendermcp_hyper3d_api_key='vibecoding'
scene.blendermcp_use_hyper3d=True
print('RODIN_PUBLIC_TRIAL_ENABLED')
