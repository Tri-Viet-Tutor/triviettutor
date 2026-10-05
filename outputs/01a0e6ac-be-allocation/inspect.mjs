import fs from 'node:fs/promises';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';
const w=await SpreadsheetFile.importXlsx(await FileBlob.load('D:/WorkSpace/Project/Tạm thời gọi là slot 4.xlsx'));
console.log((await w.inspect({kind:'sheet',include:'id,name',maxChars:1500})).ndjson);
const p=await w.render({sheetName:'Sheet1',range:'A1:F4',scale:1,format:'png'});
await fs.writeFile(new URL('./template.png',import.meta.url),new Uint8Array(await p.arrayBuffer()));
