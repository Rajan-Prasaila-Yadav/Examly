import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {Workbook, SpreadsheetFile} from '@oai/artifact-tool';

const root = 'C:/Users/rajan/Desktop/Examly/cee-set-26';
const work = path.join(root, 'work');
const output = path.join(root, 'outputs');
const source = JSON.parse(await fs.readFile(path.join(work, 'rows.json'), 'utf8'));
const issues = JSON.parse(await fs.readFile(path.join(work, 'issues.json'), 'utf8'));
const fields = ['section','type','question','option_a','option_b','option_c','option_d','answer','hint','solution','video_solution','positive','negative'];
const questionImages = [94,107,149,159,163,183,196,197,198,199,200];

function clean(value) {
  return String(value ?? '')
    .replace(/\n(?:CHEMISTRY|PHYSICS|MENTAL AGILITY) \(Questions \d+–\d+\)/g, '')
    .replace(/\[Image to attach: Q(\d+)-question\.png\]/g, '[Attach image after import: Q$1-question.png]')
    .replace(/\[Image to attach: Q094-option-([A-D])\.png\]/g, 'See option $1 in the question image')
    .trim();
}
const rows = source.map(row => {
  const value = Object.fromEntries(fields.map(field => [field, clean(row[field])]));
  if (row.question_no === 94) {
    value.question = `${value.question}\n\n[Attach image after import: Q094-question.png]`;
  }
  return {...value, question_no: row.question_no, review_notes: clean(row.review_notes)};
});
function csvCell(value) { return `"${String(value ?? '').replaceAll('"','""')}"`; }
await fs.writeFile(path.join(output, 'CEE-Set-26-Import.csv'), [fields.join(','), ...rows.map(row => fields.map(field => csvCell(row[field])).join(','))].join('\r\n'), 'utf8');

const wb = Workbook.create();
const q = wb.worksheets.add('Questions');
q.showGridLines = false;
q.getRangeByIndexes(0,0,1,fields.length).values = [fields];
q.getRangeByIndexes(1,0,rows.length,fields.length).values = rows.map(row => fields.map(field => row[field]));
q.getRangeByIndexes(0,0,1,fields.length).format = {fill:'#1F4E78',font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},horizontalAlignment:'center',verticalAlignment:'center',wrapText:true};
q.getRangeByIndexes(1,0,rows.length,fields.length).format = {font:{name:'Arial',size:10},verticalAlignment:'top',wrapText:true};
q.getRange('A1:M201').format.borders = {preset:'outside',style:'thin',color:'#D9E2F3'};
q.getRange('A:M').format.columnWidth = 17;
q.getRange('C:C').format.columnWidth = 55;
q.getRange('D:G').format.columnWidth = 28;
q.getRange('I:J').format.columnWidth = 42;
q.getRange('K:K').format.columnWidth = 28;
q.getRange('L:M').format.columnWidth = 12;
q.getRange('A2:A201').format.numberFormat = '0';
q.freezePanes.freezeRows(1);
q.tables.add('A1:M201', true, 'CEEImportQuestions').style = 'TableStyleMedium2';

const guide = wb.worksheets.add('Image guide');
guide.showGridLines = false;
const guideRows = [
  ['Question','Image file','Where to insert','Notes'],
  ...questionImages.map(n => [n,`Q${String(n).padStart(3,'0')}-question.png`,'Question editor','Upload after CSV import using the Question image button.']),
  ['Reference','Q007-solution.png, Q093-solution.png, Q099-solution.png, Q149-solution.png, Q155-solution.png, Q159-solution.png, Q197-solution.png','Solution editor if desired','These are solution diagrams, not required while students take the test.']
];
guide.getRangeByIndexes(0,0,guideRows.length,4).values = guideRows;
guide.getRange('A1:D1').format = {fill:'#1F4E78',font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},horizontalAlignment:'center'};
guide.getRange('A2:D13').format = {font:{name:'Arial',size:10},verticalAlignment:'top',wrapText:true};
guide.getRange('A:D').format.columnWidth = 30;
guide.getRange('D:D').format.columnWidth = 55;
guide.getRange('A1:D13').format.borders = {preset:'all',style:'thin',color:'#D9E2F3'};
guide.freezePanes.freezeRows(1);

const review = wb.worksheets.add('Review notes');
review.showGridLines = false;
const reviewRows = [['Question','Original answer key','Source review note'], ...issues.map(i=>[i.question,i.source_answer,i.notes])];
review.getRangeByIndexes(0,0,reviewRows.length,3).values = reviewRows;
review.getRange('A1:C1').format = {fill:'#7F6000',font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},horizontalAlignment:'center'};
review.getRangeByIndexes(1,0,issues.length,3).format = {font:{name:'Arial',size:10},verticalAlignment:'top',wrapText:true};
review.getRange('A:A').format.columnWidth = 12;
review.getRange('B:B').format.columnWidth = 18;
review.getRange('C:C').format.columnWidth = 95;
review.getRangeByIndexes(0,0,reviewRows.length,3).format.borders = {preset:'all',style:'thin',color:'#E6D8B3'};
review.freezePanes.freezeRows(1);

wb.recalculate();
const inspect = await wb.inspect({kind:'table',range:'Questions!A1:M5',include:'values',tableMaxRows:5,tableMaxCols:13});
if (!inspect.ndjson.includes('Ampulla of Vater')) throw new Error('Workbook verification failed');
const preview = await wb.render({sheetName:'Questions',range:'A1:M8',scale:1,format:'png'});
await fs.writeFile(path.join(output,'CEE-Set-26-Questions-preview.png'),new Uint8Array(await preview.arrayBuffer()));
const xlsx = await SpreadsheetFile.exportXlsx(wb);
await xlsx.save(path.join(output,'CEE-Set-26-Import-Workbook.xlsx'));

const imageStage = path.join(root,'image-pack');
await fs.rm(imageStage,{recursive:true,force:true});
await fs.mkdir(imageStage,{recursive:true});
for (const file of await fs.readdir(work)) if (/^Q\d{3}-(question|solution)\.png$/.test(file)) await fs.copyFile(path.join(work,file),path.join(imageStage,file));
await fs.copyFile(path.join(work,'images-contact.png'),path.join(imageStage,'Image-contact-sheet.png'));
await fs.writeFile(path.join(imageStage,'README.txt'), 'Question images: Q094, Q107, Q149, Q159, Q163, Q183, Q196, Q197, Q198, Q199, Q200. Upload each in its question editor after importing the CSV. Q094 is one composite image containing all four visual options. The solution images are optional reference material.\n');
execFileSync('tar',['-a','-c','-f',path.join(output,'CEE-Set-26-Images.zip'),'-C',root,'image-pack'],{stdio:'inherit'});
console.log(JSON.stringify({questions:rows.length,issues:issues.length,questionImages}));
