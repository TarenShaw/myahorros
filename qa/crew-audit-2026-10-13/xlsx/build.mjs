import fs from 'node:fs/promises';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const wb=Workbook.create(), sheet=wb.worksheets.add('Bank transactions');
sheet.getRange('A1:E7').format.columnWidth=18;
sheet.getRange('C1:C7').format.columnWidth=44;
sheet.getRange('A1:E7').values=[
 ['Date','Amount','Description','Category','Currency'],
 ['2026-09-01',2000,'Synthetic salary','Salary','EUR'],
 ['2026-09-02',-500,'Deposit Alpha Broker','Funds','EUR'],
 ['2026-09-03',-40,'Synthetic shop','Groceries','EUR'],
 ['2026-09-04',40,'Synthetic shop refund','Groceries','EUR'],
 ['2026-09-05',25,'Alpha Broker dividend paid out','Dividends','EUR'],
 ['2026-09-06',-15,'Synthetic USD fee','Fees','USD']
];
console.log((await wb.inspect({kind:'table',range:'Bank transactions!A1:E7',include:'values',tableMaxRows:7,tableMaxCols:5})).ndjson);
await (await SpreadsheetFile.exportXlsx(wb)).save(new URL('complex-transactions.xlsx',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'));
await fs.writeFile(new URL('preview.png',import.meta.url),new Uint8Array(await (await wb.render({sheetName:'Bank transactions',range:'A1:E7',scale:2})).arrayBuffer()));
