import json, struct, copy
from pathlib import Path
root=Path('assets/avatar/realistic/rework')
def read(path):
 d=path.read_bytes();n=struct.unpack_from('<I',d,12)[0];return json.loads(d[20:20+n]),bytearray(d[28+n:])
g,b=read(root/'bicolor-v13-motion.glb');old,ob=read(root/'bicolor-a-v13.glb')
g['animations']=g['animations'][:1];g['animations'][0]['name']='SitStandTurnSit'
nodes={n.get('name'):i for i,n in enumerate(g['nodes'])}
def accessor(i):
 a=copy.deepcopy(old['accessors'][i]);v=old['bufferViews'][a['bufferView']]
 while len(b)%4:b.append(0)
 start=len(b);b.extend(ob[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]);nv=copy.deepcopy(v);nv['byteOffset']=start
 g['bufferViews'].append(nv);a['bufferView']=len(g['bufferViews'])-1;g['accessors'].append(a);return len(g['accessors'])-1
for source in old['animations']:
 a=copy.deepcopy(source)
 for sampler in a['samplers']:
  for k in ['input','output']:sampler[k]=accessor(sampler[k])
 for c in a['channels']:
  oldnode=old['nodes'][c['target']['node']];newindex=nodes[oldnode['name']];c['target']['node']=newindex
  if c['target']['path']!='weights':continue
  oldnames=old['meshes'][oldnode['mesh']].get('extras',{}).get('targetNames',[])
  newnames=g['meshes'][g['nodes'][newindex]['mesh']].get('extras',{}).get('targetNames',[])
  if oldnames==newnames:continue
  samp=a['samplers'][c['sampler']];acc=g['accessors'][samp['output']];view=g['bufferViews'][acc['bufferView']]
  vals=struct.unpack_from('<'+'f'*acc['count'],b,view.get('byteOffset',0)+acc.get('byteOffset',0))
  expanded=[]
  for frame in range(len(vals)//len(oldnames)):
   row=dict(zip(oldnames,vals[frame*len(oldnames):(frame+1)*len(oldnames)]))
   expanded.extend(1 if n=='SitFoldCorrective' else row.get(n,0) for n in newnames)
  while len(b)%4:b.append(0)
  offset=len(b);b.extend(struct.pack('<'+'f'*len(expanded),*expanded));g['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(expanded)*4})
  g['accessors'].append({'bufferView':len(g['bufferViews'])-1,'componentType':5126,'count':len(expanded),'type':'SCALAR'});samp['output']=len(g['accessors'])-1
 g['animations'].append(a)
g['buffers'][0]['byteLength']=len(b)
while len(b)%4:b.append(0)
j=json.dumps(g,separators=(',',':')).encode();j+=b' '*((-len(j))%4)
(root/'bicolor-v13-motion-preview.glb').write_bytes(struct.pack('<III',0x46546c67,2,28+len(j)+len(b))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(b),0x004e4942)+b)
print([(a['name'],len(a['channels'])) for a in g['animations']])
