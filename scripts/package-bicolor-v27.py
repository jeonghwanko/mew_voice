import json,struct
from pathlib import Path
p=Path('assets/avatar/realistic/rework/bicolor-a-v27.glb');d=p.read_bytes();n=struct.unpack_from('<I',d,12)[0];g=json.loads(d[20:20+n]);binary=bytearray(d[28+n:]);g['animations'][0]['name']='JawOpen'
def floats(values,kind='SCALAR',bounds=False):
 while len(binary)%4:binary.append(0)
 start=len(binary);binary.extend(struct.pack('<'+'f'*len(values),*values));g['bufferViews'].append({'buffer':0,'byteOffset':start,'byteLength':len(values)*4});a={'bufferView':len(g['bufferViews'])-1,'componentType':5126,'count':len(values),'type':kind}
 if bounds:a.update(min=[min(values)],max=[max(values)])
 g['accessors'].append(a);return len(g['accessors'])-1
for name,times,keys in [('SlowBlink',[0,.5,.9,1.1,1.4,2,2.4,3],{'target_0':[0,0,.7,1,1,.2,0,0]}),('LookAround',[0,.5,1.2,1.8,2.5,3.2,3.8],{'LookRight':[0,0,.6,0,0,0,0],'LookLeft':[0,0,0,0,.6,0,0]})]:
 anim={'name':name,'samplers':[],'channels':[]};time=floats(times,bounds=True)
 for index,node in enumerate(g['nodes']):
  if 'mesh' not in node:continue
  mesh=g['meshes'][node['mesh']];names=mesh.get('extras',{}).get('targetNames',[])
  if not any(k in names for k in keys):continue
  weights=[keys.get(k,[0]*len(times))[f] for f in range(len(times)) for k in names]
  values=floats(weights);anim['samplers'].append({'input':time,'output':values,'interpolation':'LINEAR'});anim['channels'].append({'sampler':len(anim['samplers'])-1,'target':{'node':index,'path':'weights'}})
 assert anim['channels'];g['animations'].append(anim)
g['buffers'][0]['byteLength']=len(binary)
while len(binary)%4:binary.append(0)
j=json.dumps(g,separators=(',',':')).encode();j+=b' '*((-len(j))%4)
p.write_bytes(struct.pack('<III',0x46546c67,2,28+len(j)+len(binary))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(binary),0x004e4942)+binary)
print([(a['name'],len(a['channels'])) for a in g['animations']])

