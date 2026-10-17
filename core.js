/* SchoolDesk domain logic. No network, libraries or build step required. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SchoolDesk = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 1;
  const STORAGE_KEY = 'schooldesk.v1';
  const STATUSES = ['Present', 'Absent', 'Late', 'Excused'];
  const CATEGORIES = ['Positive recognition', 'Learning support', 'Wellbeing', 'Behaviour'];
  const clone = value => JSON.parse(JSON.stringify(value));
  const uid = prefix => `${prefix}_${globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2)}`;
  const isoDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const shiftDate = (date, days) => { const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + days); return isoDate(d); };
  const weekStart = date => { const day = new Date(date + 'T12:00:00').getDay(); return shiftDate(date, -(day === 0 ? 6 : day - 1)); };
  const nextSchoolDay = date => { let d = date; while ([0, 6].includes(new Date(d + 'T12:00:00').getDay())) d = shiftDate(d, 1); return d; };
  const grade = (score, max) => score === null || score === undefined || score === '' ? '—' : (Number(score) / max >= .8 ? 'A' : Number(score) / max >= .65 ? 'B' : Number(score) / max >= .5 ? 'C' : Number(score) / max >= .35 ? 'D' : 'E');
  const csv = rows => '\uFEFF' + rows.map(row => row.map(value => {
    let s = String(value ?? '');
    if (/^[\s]*[=+\-@]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }).join(',')).join('\r\n');
  const attendanceKey = (date, classId, session) => `${date}|${classId}|${session}`;
  function attendanceSummary(state, studentId = null) {
    const count = {Present: 0, Absent: 0, Late: 0, Excused: 0, total: 0};
    for (const roll of state.attendance) for (const [id, row] of Object.entries(roll.rows)) {
      if (studentId && id !== studentId) continue;
      count[row.status]++; count.total++;
    }
    count.rate = count.total ? Math.round((count.Present + count.Late) / count.total * 100) : null;
    return count;
  }
  function seed(today = isoDate()) {
    const names = [['Amelia','Bennett'],['Noah','Clarke'],['Isla','Davies'],['Oliver','Evans'],['Mia','Foster'],['Leo','Harris'],['Ava','Ibrahim'],['Ethan','Jones'],['Grace','Kim'],['Lucas','Martin'],['Chloe','Nguyen'],['Jack','Patel'],['Sophie','Reid'],['Henry','Taylor'],['Zara','Walker'],['Oscar','Wilson']];
    const students = names.map(([firstName,lastName], i) => ({id:`s${i+1}`,code:`2026${String(i+1).padStart(3,'0')}`,firstName,lastName,year:i<12?'9':'10',homegroup:i<12?'9 Banksia':'10 Jarrah',guardian:`${firstName}'s caregiver`,email:`caregiver${i+1}@example.com`,phone:'',support:i===2?'Check understanding with written instructions.':i===6?'Prefers extra time to prepare before group presentations.':'',active:true}));
    const all = students.slice(0,12).map(s=>s.id), seniors=students.slice(12).map(s=>s.id);
    const classes = [
      {id:'c1',name:'Humanities & Social Sciences',code:'9HASS.1',year:'9',room:'H2',colour:'sage',studentIds:all},
      {id:'c2',name:'English',code:'9ENG.1',year:'9',room:'E4',colour:'peach',studentIds:all},
      {id:'c3',name:'History',code:'10HIST.1',year:'10',room:'H2',colour:'lavender',studentIds:seniors},
      {id:'c4',name:'Pastoral care',code:'9PC.1',year:'9',room:'H2',colour:'blue',studentIds:all}
    ];
    const monday = nextSchoolDay(today);
    const assessments = [
      {id:'a1',classId:'c1',title:'World War II: source analysis',due:shiftDate(monday,7),max:30,description:'Analyse two primary sources. Explain their origin, purpose and historical context.',marks:{s1:26,s2:22,s3:20,s4:24,s5:28,s6:19,s7:23,s8:18,s9:27,s10:21,s11:25,s12:22}},
      {id:'a2',classId:'c2',title:'Persuasive writing portfolio',due:shiftDate(monday,10),max:40,description:'Develop a persuasive text for a defined audience using evidence and language techniques.',marks:{}},
      {id:'a3',classId:'c3',title:'Changing rights and freedoms',due:shiftDate(monday,4),max:25,description:'Research an Australian civil rights milestone and present its significance.',marks:{s13:21,s14:18}}
    ];
    let lastDay=shiftDate(today,-1); while([0,6].includes(new Date(lastDay+'T12:00:00').getDay()))lastDay=shiftDate(lastDay,-1);
    const rows = Object.fromEntries(all.map((id,i)=>[id,{status:i===2?'Absent':i===5?'Late':'Present',comment:i===5?'Arrived 10 minutes late.':''}]));
    return {version:VERSION,settings:{school:'Banksia Secondary College',teacher:'Luke McGuiness',role:'Teacher'},students,classes,
      lessons:[{id:'l1',classId:'c4',day:1,start:'08:40',end:'09:00',room:'H2'},{id:'l2',classId:'c1',day:1,start:'09:00',end:'10:00',room:'H2'},{id:'l3',classId:'c2',day:1,start:'10:20',end:'11:20',room:'E4'},{id:'l4',classId:'c3',day:1,start:'12:00',end:'13:00',room:'H2'},{id:'l5',classId:'c1',day:2,start:'09:00',end:'10:00',room:'H2'},{id:'l6',classId:'c3',day:2,start:'10:20',end:'11:20',room:'H2'},{id:'l7',classId:'c2',day:3,start:'09:00',end:'10:00',room:'E4'},{id:'l8',classId:'c1',day:3,start:'12:00',end:'13:00',room:'H2'},{id:'l9',classId:'c3',day:4,start:'09:00',end:'10:00',room:'H2'},{id:'l10',classId:'c2',day:4,start:'12:00',end:'13:00',room:'E4'},{id:'l11',classId:'c4',day:5,start:'08:40',end:'09:00',room:'H2'},{id:'l12',classId:'c1',day:5,start:'09:00',end:'10:00',room:'H2'}],
      assessments,attendance:[{id:attendanceKey(lastDay,'c1','Morning'),date:lastDay,classId:'c1',session:'Morning',rows,savedAt:new Date().toISOString()}],
      notes:[{id:'n1',studentId:'s3',category:'Learning support',text:'Check in before the next source analysis task and offer a planning scaffold.',date:today,author:'Luke McGuiness',status:'Open'},{id:'n2',studentId:'s7',category:'Positive recognition',text:'Showed excellent collaboration and encouraged peers during group research.',date:today,author:'Luke McGuiness',status:'Closed'}],
      plans:[{id:'p1',classId:'c1',date:monday,title:'Interpreting wartime sources',objective:'Evaluate the origin and purpose of a primary source.',activities:'Starter (10 min): What can a photograph tell us?\nInvestigate (30 min): Compare two wartime sources in pairs.\nReflect (20 min): Write an evidence-based interpretation.',resources:'Bring two contrasting source extracts and the analysis scaffold.'}],
      notices:[{id:'b1',title:'Welcome to your teaching workspace',body:'Start with your classes, take a roll, or plan your next lesson. All students and records in this workspace are fictional.',date:today,category:'Staff notice'},{id:'b2',title:'A small moment of recognition',body:'Use pastoral care to celebrate positive contributions as well as record concerns and follow-ups.',date:today,category:'Teaching & learning'}]};
  }
  function validateState(s) {
    const fail = message => { throw new Error('Invalid backup: '+message); };
    const obj = x => x && typeof x==='object' && !Array.isArray(x);
    const str = (x, max=10000) => typeof x==='string' && x.length<=max;
    const required = x => str(x,200) && x.trim().length>0;
    const date = x => str(x,10) && /^\d{4}-\d{2}-\d{2}$/.test(x) && !Number.isNaN(Date.parse(x+'T12:00:00')) && isoDate(new Date(x+'T12:00:00'))===x;
    const time = x => typeof x==='string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(x);
    if (!obj(s)||s.version!==VERSION) fail('unsupported file version.');
    if (!obj(s.settings)||!required(s.settings.school)||!required(s.settings.teacher)||!required(s.settings.role))fail('workspace settings are missing.');
    for(const key of ['students','classes','lessons','assessments','attendance','notes','plans','notices']){
      if(!Array.isArray(s[key])||s[key].length>10000)fail(key+' must be a supported list.');
      if(s[key].some(x=>!obj(x)||!required(x.id))||new Set(s[key].map(x=>x.id)).size!==s[key].length)fail(key+' contains invalid or duplicate IDs.');
    }
    const studentIds=new Set(s.students.map(x=>x.id)),classIds=new Set(s.classes.map(x=>x.id));
    if(new Set(s.students.map(x=>x.code)).size!==s.students.length)fail('student numbers must be unique.');
    for(const x of s.students)if(!required(x.firstName)||!required(x.lastName)||!required(x.code)||!required(x.year)||!str(x.homegroup,200)||!str(x.guardian,200)||!str(x.email,200)||!str(x.phone,100)||!str(x.support)||typeof x.active!=='boolean')fail('invalid student record.');
    for(const x of s.classes)if(!required(x.name)||!required(x.code)||!required(x.year)||!str(x.room,200)||!['sage','peach','lavender','blue'].includes(x.colour)||!Array.isArray(x.studentIds)||x.studentIds.some(id=>!studentIds.has(id))||new Set(x.studentIds).size!==x.studentIds.length)fail('invalid class roster.');
    if(new Set(s.classes.map(x=>x.code)).size!==s.classes.length)fail('class codes must be unique.');
    for(const x of s.lessons)if(!classIds.has(x.classId)||!Number.isInteger(x.day)||x.day<1||x.day>5||!time(x.start)||!time(x.end)||x.end<=x.start||!str(x.room,200))fail('invalid timetable lesson.');
    for(let i=0;i<s.lessons.length;i++)for(let j=i+1;j<s.lessons.length;j++){const a=s.lessons[i],b=s.lessons[j];if(a.day===b.day&&a.start<b.end&&b.start<a.end)fail('timetable lessons overlap.');}
    for(const x of s.assessments){
      if(!classIds.has(x.classId)||!required(x.title)||!date(x.due)||!Number.isFinite(x.max)||x.max<=0||x.max>100000||!str(x.description)||!obj(x.marks))fail('invalid assessment.');
      for(const [id,mark]of Object.entries(x.marks))if(!studentIds.has(id)||typeof mark!=='number'||!Number.isFinite(mark)||mark<0||mark>x.max)fail('marks must be within the assessment maximum.');
    }
    for(const x of s.attendance){
      if(!classIds.has(x.classId)||!date(x.date)||!['Morning','Afternoon'].includes(x.session)||x.id!==attendanceKey(x.date,x.classId,x.session)||!obj(x.rows)||!str(x.savedAt,100))fail('invalid attendance roll.');
      for(const[id,row]of Object.entries(x.rows))if(!studentIds.has(id)||!obj(row)||!STATUSES.includes(row.status)||!str(row.comment))fail('invalid attendance status.');
    }
    for(const x of s.notes)if(!studentIds.has(x.studentId)||!CATEGORIES.includes(x.category)||!str(x.text)||!x.text.trim()||!date(x.date)||!required(x.author)||!['Open','Closed'].includes(x.status))fail('invalid pastoral record.');
    for(const x of s.plans)if(!classIds.has(x.classId)||!date(x.date)||!required(x.title)||!str(x.objective)||!str(x.activities)||!str(x.resources))fail('invalid lesson plan.');
    for(const x of s.notices)if(!required(x.title)||!str(x.body)||!date(x.date)||!['Staff notice','Teaching & learning','School event'].includes(x.category))fail('invalid notice.');
    return s;
  }
  function parseBackup(text) {
    if(text.length>10*1024*1024)throw new Error('Backup is too large (maximum 10 MB).');
    let parsed;try{parsed=JSON.parse(text);}catch{throw new Error('This is not a valid JSON backup.');}
    return validateState(parsed);
  }
  class Store {
    constructor(storage) {
      this.storage=storage; this.warning=''; this.blocked=false;
      let raw;
      try{raw=storage?.getItem(STORAGE_KEY);}catch{this.warning='Browser storage is unavailable. Changes are temporary; export a backup before closing.';this.storage=null;}
      if(raw){try{this.data=validateState(JSON.parse(raw));}catch{this.data=seed();this.blocked=true;this.warning='Saved data could not be read. A demo is shown. Restore a backup or reset demo data in Settings to enable saving.';}}
      else this.data=seed();
    }
    commit(change,replace=false){
      if(this.blocked&&!replace)throw new Error('Restore a valid backup or reset demo data in Settings before saving.');
      const next=replace?clone(change):clone(this.data);
      if(!replace)change(next);
      validateState(next);
      if(this.storage){try{this.storage.setItem(STORAGE_KEY,JSON.stringify(next));}catch{throw new Error('Could not save. Browser storage may be full. Export a backup and free some space.');}}
      this.data=next;this.blocked=false;
      if(this.storage)this.warning='';
      return next;
    }
  }
  return {VERSION,STORAGE_KEY,STATUSES,CATEGORIES,clone,uid,isoDate,shiftDate,weekStart,nextSchoolDay,grade,csv,attendanceKey,attendanceSummary,seed,validateState,parseBackup,Store};
});
