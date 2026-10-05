import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const out=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(out,'../..');
const clean=s=>s.replace(/`|\*\*/g,'').trim();
const headers=['S','Function','Level','Person in charge','Sprint','Note','BR','JOB'];
// BP identifiers retain the task identifiers from the agreed allocation documents.
const groups={
 Quang:[
 ['Q01','Tài khoản, profile và phân quyền',8,1,[1,7],
 'Đăng ký Student → đăng nhập JWT → quản lý hồ sơ. Admin tạo Tutor và cấu hình đơn giá.',
 'FR-AUTH-01/02/03. Public register chỉ tạo ROLE_STUDENT. Chỉ Admin sửa lương. JWT và ownership kiểm tra tại backend.',
 'Rà soát login/register đã có; map hai profile; hoàn thiện PageResponse, lỗi và SecurityConfig; migration và test email trùng đồng thời.',
 'Không nâng quyền qua body; sai role bị chặn; DTO không lộ password.',
 'Bàn giao UserQuery và user IDs/roles cho Hữu.'],
 ['Q02','Danh mục, giá và vòng đời lớp',13,1,[8,21],
 'Tạo môn/khóa/lớp → công bố → sinh lịch → mở đăng ký → chốt sĩ số → vận hành lớp.',
 'FR-CRS-01/02/03; FR-SCH-01/04. 1-1 tối đa 1; nhóm 2–8. Chỉ ENROLLING nhận tiền. FULL là cờ suy ra. Giá chốt không thay đổi hồi tố.',
 'CRUD và migration catalog; PricingService; ClassLifecycle; job hạn đăng ký; mở lại/chuyển 1-1 có đồng ý; phối hợp ensureGenerated của Hữu.',
 'Chặn transition sai; nhóm 0 người hủy, 1 người FAILED_TO_OPEN; công bố lại không nhân lịch.',
 'Course trong repo chưa có trong model mới: cần chốt schema. Giá người đầu tiên của GROUP cần chốt.'],
 ['Q03','Thanh toán, ghi danh và hoàn tiền',21,2,[22,29],
 'Chọn lớp → tạo yêu cầu trả tiền → mock thành công → Enrollment ACTIVE. Hủy hợp lệ → hoàn tiền một lần.',
 'BR-02.01–33; FR-SCH-02/FIN-01. Chỉ ghi danh sau trả tiền. Hủy trước hạn và chưa ASSIGNED hoàn 100%. Ngoại lệ cần Admin.',
 'Payment intent; khóa lớp/học viên; kiểm tra lại chỗ và lịch khi thanh toán; unique nguồn ghi danh; refund audit; EnrollmentQuery cho Hữu.',
 'Hai request tranh chỗ cuối chỉ một thành công; pay/refund lặp không tăng/giảm sĩ số hai lần; thất bại không ghi danh.',
 'Nhận ConflictService từ Hữu. Hai API payment-intent thay API cũ tạo ACTIVE trước payment; cần đồng bộ FE.'],
 ['Q04','Bảng lương gia sư',8,3,[30,32],
 'Nhận buổi thực dạy → đối soát COMPLETED/CANCELLED/dạy thay → preview → Admin chốt → Tutor xem.',
 'BR-02.40–46. Lương = lương cứng + COMPLETED hợp lệ × đơn giá. CANCELLED để đối soát, không trừ lần hai. Dạy thay trả người thực dạy.',
 'Payroll schema; snapshot đơn giá và session IDs; GET preview chỉ đọc; finalize idempotent; PayrollGuard bảo vệ kỳ chốt.',
 '10 dự kiến, 8 COMPLETED, 2 CANCELLED; đơn giá 200.000đ/buổi: tiền buổi 1.600.000đ. Không tính (8−2)×đơn giá.',
 'Nhận TeachingQuery.periodSummary từ Hữu. Phạt nghỉ/trừ lương cứng chưa được quy định.'],
 ['Q05','Tích hợp, seed và kiểm thử',5,3,null,
 'Tích hợp các service thật → chạy hành trình học viên và tài chính → bàn giao FE.',
 'API /api/v1; ApiResponse chung; role + ownership. Migration chạy mới/nâng cấp. Không đánh dấu hoàn thành chỉ vì có source.',
 'Seed A/T/S; test PostgreSQL đồng thời; OpenAPI/HTTP examples; demo mua, hoàn, lương; review contract với Hữu.',
 'Trả tiền → thấy lịch; hủy → hoàn đúng; chốt lương retry không lặp. Ghi rõ test đã chạy/chưa chạy.',
 'Không có API mới riêng. Test của từng module đã nằm trong SP tương ứng.'],
 ['Q06','Giỏ hàng, đơn hàng và checkout',13,4,[33,42],
 'Theo model mới: thêm môn vào giỏ → chọn lớp thuộc môn → tạo đơn giá chốt → thanh toán → ghi danh từng item.',
 'CartItem.subject_id; OrderItem.class_id. Backend tính tổng từ unit_price đã chốt. Một item một lớp. Không tạo Enrollment trước thanh toán.',
 'Map Cart/Orders/OrderItem; chọn lớp tại checkout; lưu giá giao dịch; dùng lại payment service; lịch sử đơn; hủy đơn chưa trả.',
 'Hai lớp hợp lệ tạo 2 enrollment; một lớp hết chỗ thì không ghi danh lớp nào; giá lớp đổi không sửa đơn cũ.',
 'Giữ model mới làm baseline. Đổi CartItem sang class_id là đề xuất chưa chốt. currency/expiry/key là bổ sung.'],
 ['Q07','Retry, đồng thời và đối soát đơn',8,4,null,
 'Kiểm tra lại toàn đơn → ghi nhận một lần → đối soát OrderItem, Payment và Enrollment.',
 'Không thu/hoàn trùng; hoàn một item không hủy item khác. Mock payment MVP. Payment.order_id UNIQUE cần chốt cách lưu các lần thử.',
 'Idempotency-Key; khóa tài nguyên theo thứ tự; test hai checkout/pay đồng thời; truy vết giao dịch và refund theo item.',
 'Retry cùng key/payload trả cùng kết quả; khác payload trả 409; tổng hoàn không vượt tiền thu.',
 'Gia cố API Q06, không tạo thêm route. Cổng tiền thật ngoài phạm vi hiện tại.']
 ],
 'Hữu':[
 ['H01','Sinh buổi và lịch học cá nhân',13,1,[1,4],
 'Nhận cấu hình lớp → sinh N Session → hiện lịch theo ghi danh/phân công → cập nhật bù/thay.',
 'BR-03.01–03; BR-04.10. Pattern 2-4-6/3-5-7/7-CN. Sinh lặp không trùng. Chỉ enrollment ACTIVE xem lịch học riêng.',
 'SessionGenerator; ScheduleQuery; vòng đời buổi; meeting URL. Model mới LearningSchedule theo student/class: chốt quan hệ để Session lớp nhóm không nhân bản.',
 'Đúng N buổi qua tháng/năm; Tutor dạy thay thấy buổi; không tính nhiều buổi lương chỉ vì lớp có nhiều học viên.',
 'Nhận ClassSchedulingSpec/EnrollmentQuery từ Quang. actualTutorId/originalSessionId là phần cần bổ sung.'],
 ['H02','Lịch rảnh và phân công gia sư',13,2,[5,9],
 'Tutor khai lịch rảnh → Admin xem gợi ý → kiểm tra lịch thực tế → assign/reassign.',
 'BR-03.20/21/30–32. Lịch rảnh chỉ gợi ý. 1-1 có một ghi danh trả tiền; nhóm hết hạn và đủ 2–8 người. Mỗi lớp một gia sư chính.',
 'Availability theo available_date của model mới; TimeOverlap và ConflictService dùng chung; khóa gia sư khi assign; bảo toàn lịch sử khi reassign.',
 '18–20 trùng 19:30–21:30; 18–20 không trùng 20–22. Hai assign đồng thời không tạo xung đột.',
 'Bàn giao engine conflict ngay Sprint 1 để Quang tích hợp Sprint 2; module hoàn tất Sprint 2.'],
 ['H03','Xin nghỉ, buổi bù và dạy thay',13,2,[10,16],
 'T/S gửi đơn → phân loại trước/sau 24h → Admin duyệt bù/thay/từ chối → cập nhật lịch.',
 'BR-03.40–42. Một Student nhóm nghỉ không dừng cả buổi. Buổi bù kiểm tra mọi Student ACTIVE và Tutor. Chỉ Admin xếp bù/thay.',
 'LeaveRequest; resolve nguyên tử; originalSessionId; actualTutorId và lịch sử; cancel reason; chống hai Admin xử lý lặp.',
 'Đúng biên 24h; bù trùng một học viên bị chặn; không tạo hai buổi bù; thay Tutor không đổi toàn lớp.',
 'Gọi PayrollGuard của Quang trước sửa dữ liệu ảnh hưởng kỳ lương đã chốt.'],
 ['H04','Điểm danh và chốt buổi',8,3,[17,20],
 'Tutor thực dạy nhập điểm danh → sửa trong thời hạn → job khóa → COMPLETED nếu đủ chứng cứ dạy.',
 'BR-04.20/30–34/40. Unique(session,student). Sau end+24h Tutor không sửa. Online MVP nhập tay. Student chỉ xem bản ghi mình.',
 'Attendance service; scheduler; audit Admin sửa; TeachingQuery.periodSummary gồm completed/cancelled/substitutedOut/unfinalized.',
 'CANCELLED không tự thành COMPLETED; job chạy lại an toàn; trả đúng người thực dạy và lý do hủy cho Quang.',
 'Phối hợp Q04. Không tự xem CANCELLED là lỗi gia sư, không trừ buổi hủy lần hai.'],
 ['H05','Tích hợp lịch, job và kiểm thử',8,3,null,
 'Tích hợp service thật → thử lịch cạnh tranh và đồng hồ → demo chuỗi dạy/lương.',
 'Một engine conflict dùng chung. Dùng Clock để test mốc giờ. DB constraint và transaction phải kiểm tra trên PostgreSQL.',
 'Fixture ca tối trùng, Tutor thay, buổi bù qua tháng; kiểm thử quyền và scheduler sau downtime; OpenAPI; review cùng Quang.',
 'Ghi danh đồng thời/dời lịch không tạo trùng; dữ liệu teaching khớp lương; báo cáo test thực chạy.',
 'Không có API mới. Bàn giao Contract/ScheduleQuery/TeachingQuery; nhận EnrollmentQuery từ Quang.'],
 ['H06','Chủ đề và nội dung buổi học',5,4,[21,24],
 'Admin tạo Topic theo Subject → gắn vào Session → đọc nội dung đúng quyền.',
 'ERD: Topic.subject_id,topic_name,sequence_number. Topic gắn Session phải cùng môn. Không xóa lịch sử đã được dùng.',
 'Map Topic và DTO; query theo môn; gắn topic vào buổi; archive thay xóa. active/description là bổ sung nếu dùng.',
 'Sai môn bị chặn; danh mục chỉ lộ metadata; archive không phá buổi đã dạy.',
 'Nhận Subject từ Quang. API dùng title/sortOrder phải map sang topic_name/sequence_number.'],
 ['H07','Bài tập, nộp bài và chấm điểm',16,4,[25,34],
 'Tutor/Admin tạo bài → publish → Student nộp → Tutor chấm → Student xem điểm/feedback.',
 'Đề xuất: một submission hiện hành/học viên/bài; sửa trước hạn và trước chấm. Điểm 0..maxScore. Chỉ học viên đúng lớp được nộp.',
 'Homework/Submission; role/ownership; version chống ghi đè; lưu lịch sử chấm; dùng link nội dung/file, chưa xây upload riêng.',
 'Không xem/nộp hộ; draft không lộ; quá hạn/đã chấm chặn sửa; điểm vượt max bị từ chối; Student chỉ xem điểm mình.',
 'Model có file_url/score/feedback; status/maxScore/version/audit là đề xuất bổ sung, quy tắc cần nhóm chốt.']
 ]
};
const names={Quang:['Đăng nhập','Đăng ký học viên','Xem hồ sơ cá nhân','Sửa hồ sơ cá nhân','Danh sách người dùng','Tạo tài khoản gia sư','Cập nhật hợp đồng gia sư','Tạo khóa học','Danh sách khóa học','Sửa khóa học','Ẩn/hiện khóa học','Tạo lớp','Chuyển trạng thái lớp','Danh sách lớp Admin','Tra cứu lớp mở','Chi tiết lớp và lịch','Tạo môn học','Sửa môn học','Danh sách môn học','Mở lại lớp','Chuyển lớp sang 1-1','Tạo yêu cầu thanh toán','Xác nhận mock và ghi danh','Lớp đã đăng ký','Hủy ghi danh','Admin hoàn tiền','Danh sách giao dịch','Chi tiết thanh toán','Học viên trong lớp','Xem bảng lương','Chốt bảng lương','Gia sư xem lương','Xem giỏ','Thêm môn vào giỏ','Xóa mục giỏ','Xóa toàn bộ giỏ','Checkout chọn lớp','Đơn của học viên','Chi tiết đơn','Thanh toán đơn mock','Hủy đơn chưa trả','Danh sách đơn Admin'],
 'Hữu':['Lịch cá nhân','Lịch Admin','Chi tiết buổi học','Cập nhật link học','Phân công gia sư','Đổi gia sư chính','Gợi ý gia sư','Cập nhật lịch rảnh','Xem lịch rảnh','Gửi đơn xin nghỉ','Danh sách đơn nghỉ','Xếp buổi bù','Phân công dạy thay','Từ chối đơn nghỉ','Đơn nghỉ cá nhân','Hủy buổi học','Nhập điểm danh','Xem điểm danh','Khóa/mở điểm danh','Sửa điểm danh sau khóa','Tạo chủ đề','Sửa chủ đề','Chủ đề theo môn','Gắn chủ đề buổi học','Tạo bài tập','Sửa bài tập','Công bố/đóng bài tập','Bài tập của buổi','Chi tiết bài tập','Nộp/cập nhật bài','Xem bài nộp của mình','Danh sách bài nộp','Chấm bài','Bài tập của học viên']};
const w=Workbook.create();
const meta=[];
for(const [person,gs] of Object.entries(groups)){
 const prefix=person==='Quang'?'Q':'H';
 const text=await fs.readFile(path.join(root,'Documentation/03-Backend-Task-Allocation',person==='Quang'?'01-Quang.md':'02-Huu.md'),'utf8');
 const apis=new Map(text.split(/\r?\n/).filter(l=>/^\| [QH]-A\d+ \|/.test(l)).map(l=>{const c=l.split('|').slice(1,-1).map(clean);return [Number(c[0].slice(3)),c];}));
 const rows=[headers], sectionRows=[], apiRows=[];
 for(const g of gs){
  const [id,title,sp,sprint,interval,flow,br,job,accept,dependency]=g;
  sectionRows.push(rows.length+1);
  rows.push([`${id} — ${title}\nBusiness Process`,flow,'',`BE: ${person}`,`Sprint ${sprint}`,`${sp} SP ước lượng (bao gồm các API bên dưới).\n${dependency}`,br,`${job}\nNghiệm thu: ${accept}`]);
  if(!interval)continue;
  for(let n=interval[0];n<=interval[1];n++){
   let [aid,route,role,io,source]=apis.get(n);
   if(aid==='Q-A34'){io='subjectId → mục giỏ của học viên';source+='; theo logical model bổ sung';}
   if(aid==='Q-A37'){io='items[{cartItemId,classId}] + Idempotency-Key → order,items,total';source+='; lớp phải thuộc môn đã chọn';}
   if(aid==='H-A08')io='slots[{availableDate,startTime,endTime}] → lịch rảnh của mình';
   const mutation=!route.startsWith('GET');
   const complex=mutation&&/(pay|checkout|refund|assign|makeup|substitute|finalize|leave|attendance|cancel|convert|reopen|status|enrollments)/.test(route);
   const level=complex?'complex':mutation?'medium':'simple';
   const task=mutation?'DTO validation; service/transaction; repository; cập nhật OpenAPI.':'Query/DTO; filter và phân trang khi là danh sách; cập nhật OpenAPI.';
   let extra='';
   if(id==='Q06')extra='\nCart lưu môn theo model mới; chọn classId tại checkout.';
   if(id==='Q02'&&n<=11)extra='\nCần chốt giữ Course trước triển khai.';
   apiRows.push(rows.length+1);
   rows.push([`${aid} — ${names[person][n-1]}\nThuộc ${id}`,`${route}\nInput/Output: ${io}`,level,`BE: ${person}`,`Sprint ${sprint}`,`${source}\n${source.startsWith('Có code')?'Có source; cần rà soát/test, chưa xác nhận hoàn thành.':'Task kế hoạch; chưa xác nhận đã triển khai.'}${extra}`,`Quyền: ${role}.\nÁp dụng BR của ${id} ở dòng Business Process.\n${role==='Public'?'Không yêu cầu JWT; không cho client tự nâng quyền.':'Kiểm tra quyền đối tượng tại service.'}`,`${task}\nTest: luồng đúng, input sai, ${role==='Public'?'credentials/email trùng theo chức năng':'thiếu token/sai quyền'} và điều kiện nghiệp vụ của ${id}.`]);
  }
 }
 const endTasks=rows.length;
 rows.push(['Note — Tổng phân công',`${gs.reduce((s,g)=>s+g[2],0)} SP/người: 55 cốt lõi + 21 mở rộng ERD. Số API không phải thước đo effort.`,'',`BE: ${person}`,'','SP là ước lượng tương đối, không phải số ngày. Không cộng SP lần nữa theo từng API.','Số API được tính từ mã dòng, không tính dòng Business Process.','Mỗi người chịu migration, service, API và test của module mình.']);
 const countRow=rows.length;
 rows.push(['Note — Quy ước','Base URL /api/v1. A=Admin; T=Tutor; S=Student; U=đã đăng nhập. Public=không cần JWT.','',null,null,'Sprint 1–4 là đề xuất thứ tự, chưa gán ngày.','Level ước lượng BE: simple=đọc đơn giản; medium=CRUD/quyền; complex=transaction, trạng thái, đồng thời.','Level không sao chép máy móc từ mẫu dự án khác.']);
 rows.push(['Note — Nguồn','Tài liệu phân công 00-Tong-quan-phan-cong.md, 01-Quang.md, 02-Huu.md; BR-02/03/04 và Backend Architecture & API Specification.','',null,null,'Cập nhật kế hoạch: 01/10/2026. Format: Tạm thời gọi là slot 4.xlsx, Sheet1, cột A:H.','Logical model bổ sung của nhóm; các trường/route mới vẫn là đề xuất khi chưa chốt.','Giữ nguyên phân công 76 SP/người. Không đưa nội dung dự án xe/Jira của file mẫu vào project này.']);
 const s=w.worksheets.add(person);s.showGridLines=false;
 s.getRange(`A1:H${rows.length}`).values=rows;
 const all=s.getRange(`A1:H${rows.length}`);all.format.font={name:'Arial',size:10,color:'#172033'};all.format.wrapText=true;all.format.verticalAlignment='top';
 const widths=[38,66,12,18,13,49,60,62];
 widths.forEach((width,i)=>s.getRange(`${String.fromCharCode(65+i)}1:${String.fromCharCode(65+i)}${rows.length}`).format.columnWidth=width);
 s.getRange('A1:H1').format={fill:'#FFFFFF',font:{name:'Arial',size:10,bold:true,color:'#111827'},horizontalAlignment:'center',verticalAlignment:'center',wrapText:true,borders:{preset:'all',style:'thin',color:'#9CA3AF'}};
 s.getRange('A1:H1').format.rowHeight=32;
 for(let r=2;r<=rows.length;r++){
  const rr=s.getRange(`A${r}:H${r}`);
  const lineCount=Math.max(...rows[r-1].map((v,i)=>String(v??'').split('\n').reduce((a,line)=>a+Math.max(1,Math.ceil(line.length/(widths[i]*0.88))),0)));
  rr.format.rowHeight=Math.max(72,lineCount*14+18);
  rr.format.borders={bottom:{style:'thin',color:'#D1D5DB'}};
  if(sectionRows.includes(r)){
   s.getRange(`A${r}:D${r}`).format.fill=person==='Quang'?'#60A5FA':'#FF75CC';
   s.getRange(`A${r}:A${r}`).format.font.bold=true;
   s.getRange(`E${r}:H${r}`).format.fill='#F1F5F9';
  }else if(r<=endTasks){s.getRange(`A${r}:D${r}`).format.fill=person==='Quang'?'#EAF3FF':'#FFF0F9';}
  else rr.format.fill='#FFF8E6';
 }
 const apiBlocks=[];
 for(const r of apiRows){const last=apiBlocks.at(-1);if(last&&last[1]===r-1)last[1]=r;else apiBlocks.push([r,r]);}
 s.getRange(`C${countRow}`).formulas=[[`=COUNTA(${apiBlocks.map(([a,b])=>`A${a}:A${b}`).join(',')})`]];
 s.getRange(`C${countRow}`).setNumberFormat('0" API"');
 s.freezePanes.freezeRows(1);s.freezePanes.freezeColumns(1);
 s.tabColor=person==='Quang'?'#60A5FA':'#FF75CC';
 if(apiRows.length!==apis.size)throw new Error('Missing API coverage '+person);
 if(gs.reduce((sum,g)=>sum+g[2],0)!==76)throw new Error('Unequal workload');
 meta.push({person,rows:rows.length,apiCount:apis.size,sectionRows,apiRows,countRow,endTasks});
}
w.recalculate();
for(const m of meta){
 const s=w.worksheets.getItem(m.person);
 const got=s.getRange(`C${m.countRow}`).values[0][0];
 if(got!==m.apiCount)throw new Error(`Count formula ${m.person}: ${got}`);
 console.log((await w.inspect({kind:'table',range:`'${m.person}'!A${m.countRow}:H${m.countRow}`,include:'values,formulas',tableMaxRows:1,tableMaxCols:8,maxChars:1700})).ndjson);
 // Verify formula reacts to an editable ID, then restore before exporting.
 const cell=s.getRange(`A${m.apiRows[0]}`),saved=cell.values;
 cell.values=[[null]];
 if(s.getRange(`C${m.countRow}`).values[0][0]!==m.apiCount-1)throw new Error('Count not reactive');
 cell.values=saved;
}
w.recalculate();
console.log((await w.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!',options:{useRegex:true,maxResults:20},maxChars:1500})).ndjson);
await (await SpreadsheetFile.exportXlsx(w)).save(path.join(out,'Phan_cong_BE_Quang_Huu.xlsx'));
for(const m of meta){
 for(const [label,range] of [['top','A1:H5'],['business',`A${m.sectionRows[3]}:H${m.sectionRows[3]+3}`],['end',`A${m.endTasks}:H${m.rows}`]]){
  const p=await w.render({sheetName:m.person,range,scale:1,format:'png'});
  await fs.writeFile(path.join(out,`${m.person}-${label}.png`),new Uint8Array(await p.arrayBuffer()));
 }
}
await fs.writeFile(path.join(out,'verification.json'),JSON.stringify(meta,null,2));
console.log('EXPORTED',meta.map(m=>({sheet:m.person,rows:m.rows,apis:m.apiCount,sp:76})));
