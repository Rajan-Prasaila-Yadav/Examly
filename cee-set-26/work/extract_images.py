from pathlib import Path
from zipfile import ZipFile
from lxml import etree as E
from PIL import Image,ImageOps,ImageDraw
import json,io
src=Path(r'C:/Users/rajan/Downloads/CEE/CEE/CEE SET  26- October  03');out=Path('cee-set-26/work');ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
imgs=[]
for i,f in enumerate(src.glob('*.docx')):
 if i not in [1,3]:continue
 with ZipFile(f) as z:
  rel={r.get('Id'):r.get('Target') for r in E.fromstring(z.read('word/_rels/document.xml.rels'))};root=E.fromstring(z.read('word/document.xml'));n=0
  for p in root.xpath('//w:body//w:p',namespaces=ns):
   if p.find('w:pPr/w:numPr',ns) is not None:n+=1
   for rid in p.xpath('.//a:blip/@r:embed',namespaces=ns):
    raw=z.read('word/'+rel[rid]);im=Image.open(io.BytesIO(raw));label=f'Q{n:03d}-'+('question' if i==3 else 'solution');im.convert('RGB').save(out/(label+'.png'));imgs.append((label,im.copy()))
canvas=Image.new('RGB',(1200,((len(imgs)+1)//2)*230),'#dddddd');d=ImageDraw.Draw(canvas)
for j,(label,im) in enumerate(imgs):
 x=(j%2)*600;y=(j//2)*230;d.text((x+10,y+5),label,fill='black');im.thumbnail((580,200));canvas.paste(im,(x+10,y+25))
canvas.save(out/'images-contact.png')
print([(s,im.size) for s,im in imgs])
