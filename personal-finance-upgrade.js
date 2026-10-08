/* BADGEIFY PERSONAL FINANCE SAFE UPGRADE — 2026-10-08
   Loaded after the existing PERSONAL FINANCE code.
   This file only extends/overrides finance behavior; it does not delete existing records.
*/
(function(){
"use strict";

const U = window;
const esc0 = v => typeof U.esc === "function" ? U.esc(v==null?"":String(v)) : String(v==null?"":v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
const money0 = v => typeof U.money === "function" ? U.money(Number(v||0)) : Number(v||0).toFixed(2);
const today0 = () => typeof U.isoDate === "function" ? U.isoDate(new Date()) : new Date().toISOString().slice(0,10);
const cur0 = () => (U.state?.settings?.currency || "EGP");
const pfAccount0 = id => (U.state?.financeAccounts||[]).find(a=>String(a.id)===String(id));
const pfLoans0 = personId => (U.state?.loans||[]).filter(l=>l.status!=="cancelled" && String(l.person_id)===String(personId));
const pfPaid0 = loanId => (U.state?.loanPayments||[]).filter(p=>String(p.loan_id)===String(loanId)).reduce((s,p)=>s+Number(p.amount||0),0);
const pfRemaining0 = loan => Math.max(0,Number(loan?.amount||0)-pfPaid0(loan?.id));
const pfDir0 = loan => String(loan?.loan_direction||"lent")==="borrowed" ? "borrowed" : "lent";
const uuid0 = () => (window.crypto?.randomUUID ? crypto.randomUUID() : "pf_"+Date.now()+"_"+Math.random().toString(36).slice(2));

/* ---------- Expense categories: persist in app_settings, with local cache fallback ---------- */
const CAT_KEY = "personal_finance_expense_categories";
function catCache(){
  try{
    const a=JSON.parse(localStorage.getItem(CAT_KEY)||"[]");
    return Array.isArray(a) ? [...new Set(a.map(x=>String(x||"").trim()).filter(Boolean))] : [];
  }catch(_){return []}
}
function setCatCache(a){localStorage.setItem(CAT_KEY,JSON.stringify([...new Set(a.map(x=>String(x||"").trim()).filter(Boolean))]));}
async function loadCats(){
  if(!U.currentUser?.id) return;
  try{
    const r=await U.db.from("app_settings").select("setting_value").eq("setting_key",CAT_KEY).maybeSingle();
    if(r.error) throw r.error;
    if(r.data?.setting_value){
      const parsed=typeof r.data.setting_value==="string" ? JSON.parse(r.data.setting_value) : r.data.setting_value;
      if(Array.isArray(parsed)) setCatCache(parsed);
    }
  }catch(e){ console.warn("PF categories load:",e.message); }
}
async function saveCats(a){
  a=[...new Set(a.map(x=>String(x||"").trim()).filter(Boolean))];
  setCatCache(a);
  if(!U.currentUser?.id) return;
  const r=await U.db.from("app_settings").upsert({
    setting_key:CAT_KEY,
    setting_value:JSON.stringify(a),
    updated_at:new Date().toISOString()
  },{onConflict:"setting_key"});
  if(r.error) throw r.error;
}
U.salehExpenseCategories = function(){ return catCache(); };

U.openSalehExpenseCategories = function(){
  const cats=catCache();
  const rows=cats.map((x,i)=>'<div class="list-item" style="margin-bottom:7px"><input id="pfCatEdit_'+i+'" value="'+esc0(x)+'" style="flex:1"><button class="mini-btn" onclick="editSalehExpenseCategory('+i+')">تعديل</button><button class="mini-btn" onclick="removeSalehExpenseCategory('+i+')">حذف</button></div>').join("")
    || '<div class="muted">لا توجد بنود بعد. أضف أول بند وسيظهر مباشرة في خانة المصروف.</div>';
  U.openModal("إدارة بنود المصاريف",
    '<div class="finance-modal-shell"><div class="finance-form-intro"><div class="finance-form-icon"><i class="fa-solid fa-list"></i></div><div><h4>بنود المصاريف</h4><p>البنود محفوظة للحساب وتظهر في نموذج المصروف بدل ظهور «شيء غير معلوم» فقط.</p></div></div><div class="field"><label>إضافة بند جديد</label><input id="newExpenseCategory" placeholder="مثال: مواصلات"></div><div style="margin-top:14px">'+rows+'</div></div>',
    '<button class="ghost-btn" onclick="closeModal()">إغلاق</button><button class="gold-btn" onclick="addSalehExpenseCategory()">إضافة البند</button>');
};
U.addSalehExpenseCategory = async function(){
  const v=(document.getElementById("newExpenseCategory")?.value||"").trim();
  if(!v) return U.showToast("اكتب اسم البند.",true);
  const cats=catCache();
  if(cats.some(x=>x.toLowerCase()===v.toLowerCase())) return U.showToast("البند موجود بالفعل.",true);
  try{ cats.push(v); await saveCats(cats); U.closeModal(); U.showToast("تمت إضافة بند المصروف."); }
  catch(e){ U.showToast(e.message||"تعذر حفظ البند.",true); }
};
U.editSalehExpenseCategory = async function(i){
  const input=document.getElementById("pfCatEdit_"+i),v=(input?.value||"").trim(),cats=catCache();
  if(!v) return U.showToast("اسم البند لا يمكن أن يكون فارغًا.",true);
  if(cats.some((x,j)=>j!==i && x.toLowerCase()===v.toLowerCase())) return U.showToast("يوجد بند بنفس الاسم.",true);
  try{cats[i]=v;await saveCats(cats);U.openSalehExpenseCategories();U.showToast("تم تعديل البند.");}
  catch(e){U.showToast(e.message||"تعذر تعديل البند.",true);}
};
U.removeSalehExpenseCategory = async function(i){
  const cats=catCache(),name=cats[i];
  if(!name || !confirm("حذف بند «"+name+"»؟ الحركات القديمة لن تُحذف.")) return;
  try{cats.splice(i,1);await saveCats(cats);U.openSalehExpenseCategories();U.showToast("تم حذف البند.");}
  catch(e){U.showToast(e.message||"تعذر حذف البند.",true);}
};

/* ---------- Optional loan repayment date ---------- */
const baseOpenLoan=U.openSalehLoan;
if(typeof baseOpenLoan==="function"){
  U.openSalehLoan=function(){
    baseOpenLoan();
    setTimeout(function(){
      const d=document.getElementById("loanDue");
      const label=d?.parentElement?.querySelector("label");
      if(d) d.value="";
      if(label) label.textContent="موعد السداد (اختياري)";
      if(d) d.placeholder="اتركه فارغًا إذا غير معروف";
    },40);
  };
}

/* ---------- Full person statement + WhatsApp ---------- */
U.salehPersonWhatsApp = function(personId){
  const p=(U.state?.loanPeople||[]).find(x=>String(x.id)===String(personId));
  if(!p?.phone) return U.showToast("أضف رقم واتساب للشخص أولاً.",true);
  const loans=pfLoans0(personId).sort((a,b)=>String(a.loan_date||"").localeCompare(String(b.loan_date||"")));
  let lent=0,borrowed=0;
  const lines=[];
  loans.forEach(l=>{
    const paid=pfPaid0(l.id),rem=pfRemaining0(l),amt=Number(l.amount||0);
    if(pfDir0(l)==="lent") lent+=rem; else borrowed+=rem;
    lines.push((pfDir0(l)==="lent"?"لي عنده":"عليّ له")+" — "+(l.loan_date||"-")+" — أصل "+money0(amt)+" — مدفوع "+money0(paid)+" — متبقي "+money0(rem)+(l.purpose?" — "+l.purpose:""));
  });
  const net=lent-borrowed;
  const netLine=net>0 ? "الصافي: لي عنده "+money0(net)+"." : net<0 ? "الصافي: عليّ له "+money0(Math.abs(net))+"." : "الصافي: الحساب متساوي.";
  const msg="كشف حساب — "+(p.person_name||"شخص")+"\n\n"+lines.join("\n")+
    "\n\nإجمالي المتبقي لي عنده: "+money0(lent)+
    "\nإجمالي المتبقي عليّ له: "+money0(borrowed)+
    "\n"+netLine+
    "\n\nهذا الكشف من PERSONAL FINANCE — لوحة تحكم صالح.";
  let phone=String(p.phone).replace(/\D/g,"");
  if(phone.startsWith("0")) phone="20"+phone.slice(1);
  if(phone.length<10) return U.showToast("رقم الواتساب غير صحيح.",true);
  window.open("https://wa.me/"+phone+"?text="+encodeURIComponent(msg),"_blank");
};
U.openSalehPersonStatement = function(personId){
  const p=(U.state?.loanPeople||[]).find(x=>String(x.id)===String(personId));
  if(!p) return;
  const loans=pfLoans0(personId),c=cur0();
  let lent=0,borrowed=0;
  const rows=loans.map(l=>{
    const paid=pfPaid0(l.id),rem=pfRemaining0(l),amt=Number(l.amount||0);
    if(pfDir0(l)==="lent") lent+=rem; else borrowed+=rem;
    return "<tr><td>"+esc0(l.loan_date||"-")+"</td><td>"+esc0(pfDir0(l)==="lent"?"لي عنده":"عليّ له")+"</td><td>"+money0(amt)+" "+esc0(c)+"</td><td>"+money0(paid)+" "+esc0(c)+"</td><td>"+money0(rem)+" "+esc0(c)+"</td><td>"+esc0(l.purpose||"-")+"</td></tr>";
  }).join("") || '<tr><td colspan="6"><div class="empty">لا توجد حركات.</div></td></tr>';
  const net=lent-borrowed;
  const body='<div class="finance-person-summary"><div><b>'+esc0(p.person_name)+'</b><small>'+esc0(p.phone||"لا يوجد واتساب")+'</small></div><div class="finance-person-net"><span>'+esc0(net>0?"لي عنده":net<0?"عليّ له":"متساوي")+'</span><strong>'+money0(Math.abs(net))+" "+esc0(c)+'</strong></div></div>'+
    '<div class="finance-person-kpis"><div><span>لي عنده</span><b>'+money0(lent)+" "+esc0(c)+'</b></div><div><span>عليّ له</span><b>'+money0(borrowed)+" "+esc0(c)+'</b></div><div><span>صافي الحساب</span><b>'+money0(Math.abs(net))+" "+esc0(c)+'</b></div></div>'+
    '<div class="actions" style="margin:12px 0"><button class="gold-btn" onclick="openSalehLoanForPerson(\''+esc0(p.id)+'\',\'lent\')">أنا اديته فلوس</button><button class="ghost-btn" onclick="openSalehLoanForPerson(\''+esc0(p.id)+'\',\'borrowed\')">أنا استلفت منه</button>'+(p.phone?'<button class="ghost-btn" onclick="salehPersonWhatsApp(\''+esc0(p.id)+'\')"><i class="fa-brands fa-whatsapp"></i> واتساب الكشف</button>':"")+'</div>'+
    '<div class="table-wrap"><table class="table"><thead><tr><th>التاريخ</th><th>الحركة</th><th>الأصل</th><th>المسدد</th><th>المتبقي</th><th>البيان</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
  U.openModal("كشف حساب "+p.person_name,body,'<button class="ghost-btn" onclick="closeModal()">إغلاق</button>');
};

/* ---------- Opening balances for every account, including platforms ---------- */
U.openSalehOpeningBalance = function(){
  const A=U.state?.financeAccounts||[];
  const rows=A.map(a=>'<div class="field"><label>'+esc0(a.account_name)+(String(a.account_name).match(/Bybit|Binance|USDT|USD/i)?" — USD / USDT":"")+'</label><input id="pfOpen_'+esc0(a.id)+'" type="number" step="0.000001" value="'+Number(a.opening_balance||0)+'"></div>').join("");
  U.openModal("الأرصدة الافتتاحية",
    '<div class="finance-modal-shell"><div class="finance-form-intro"><div class="finance-form-icon"><i class="fa-solid fa-vault"></i></div><div><h4>الرصيد الافتتاحي</h4><p>يمكن ضبط الرصيد الافتتاحي لأي حساب، بما فيه Bybit Saleh وBybit Mahmoud وBinance، مع الحفاظ على كل الحركات السابقة.</p></div></div><div class="form-grid">'+rows+'</div></div>',
    '<button class="ghost-btn" onclick="closeModal()">إلغاء</button><button class="gold-btn" onclick="saveSalehOpeningBalanceAll()">حفظ الأرصدة</button>');
};
U.saveSalehOpeningBalanceAll = async function(){
  try{
    for(const a of (U.state?.financeAccounts||[])){
      const el=document.getElementById("pfOpen_"+a.id);
      if(!el) continue;
      const value=Number(el.value||0);
      if(!Number.isFinite(value)) throw new Error("رصيد غير صحيح في "+a.account_name);
      const r=await U.db.from("personal_finance_accounts").update({opening_balance:value,updated_at:new Date().toISOString()}).eq("id",a.id).eq("user_id",U.currentUser.id);
      if(r.error) throw r.error;
    }
    U.closeModal(); await U.refresh(); U.showToast("تم حفظ الأرصدة الافتتاحية لكل الحسابات.");
  }catch(e){U.showToast(e.message||"تعذر حفظ الأرصدة.",true);}
};

/* ---------- Platform deposit directly from a saved card ---------- */
U.openSalehPlatformCardDeposit = function(){
  const platforms=(U.state?.financeAccounts||[]).filter(a=>/bybit|binance|crypto/i.test(String(a.account_name||"")));
  const cards=U.state?.visaCards||[];
  const body='<div class="finance-modal-shell"><div class="finance-form-intro"><div class="finance-form-icon"><i class="fa-solid fa-credit-card"></i></div><div><h4>إيداع للمنصة من الكارت مباشرة</h4><p>يسجل الإيداع كحركة مصدرها الكارت ووجهتها المنصة، بدون خصم وهمي من الكاش.</p></div></div><div class="form-grid"><div class="field finance-required"><label>المنصة</label><select id="pfCardDepPlatform"><option value="">اختر المنصة</option>'+platforms.map(a=>'<option value="'+a.id+'">'+esc0(a.account_name)+'</option>').join("")+'</select></div><div class="field"><label>الكارت</label><select id="pfCardDepCard"><option value="">اختر الكارت</option>'+cards.map(c=>'<option value="'+c.id+'">'+esc0(c.card_name||c.name||"كارت")+" — "+esc0(c.last4?"•••• "+c.last4:"")+'</option>').join("")+'</select></div><div class="field finance-required"><label>المبلغ USD / USDT</label><input id="pfCardDepAmount" type="number" min="0" step="0.000001"></div><div class="field"><label>التاريخ</label><input id="pfCardDepDate" type="date" value="'+today0()+'"></div><div class="field"><label>رقم العملية / المرجع</label><input id="pfCardDepRef"></div><div class="field full"><label>ملاحظات</label><textarea id="pfCardDepNotes"></textarea></div></div></div>';
  U.openModal("إيداع من الكارت إلى المنصة",body,'<button class="ghost-btn" onclick="closeModal()">إلغاء</button><button class="gold-btn" onclick="saveSalehPlatformCardDeposit()">تسجيل الإيداع</button>');
};
U.saveSalehPlatformCardDeposit = async function(){
  const a=pfAccount0(document.getElementById("pfCardDepPlatform")?.value),card=pfAccount0("__no__");
  const cardId=document.getElementById("pfCardDepCard")?.value||null,amt=Number(document.getElementById("pfCardDepAmount")?.value||0),date=document.getElementById("pfCardDepDate")?.value||today0(),ref=document.getElementById("pfCardDepRef")?.value.trim(),notes=document.getElementById("pfCardDepNotes")?.value.trim();
  if(!a || !/bybit|binance|crypto/i.test(String(a.account_name||"")) || amt<=0) return U.showToast("اختر منصة وأدخل مبلغًا صحيحًا.",true);
  const card=(U.state?.visaCards||[]).find(c=>String(c.id)===String(cardId));
  const detail=JSON.stringify({card_id:cardId,card_name:card?.card_name||"",reference:ref,notes});
  const r=await U.db.from("personal_finance_transactions").insert({
    user_id:U.currentUser.id,account_id:a.id,amount:Math.abs(amt),transaction_type:"transfer",
    category:"إيداع منصة من كارت",description:"إيداع إلى "+a.account_name+" من "+(card?.card_name||"كارت"),
    source_type:"platform_card_deposit",source_id:uuid0(),transaction_date:date,notes:detail
  });
  if(r.error) return U.showToast(r.error.message,true);
  U.closeModal();await U.refresh();U.showToast("تم تسجيل الإيداع للمنصة من الكارت.");
};

/* ---------- Subscription deduction from platform ---------- */
U.openSalehPlatformDeduction = function(editId){
  const rows=(U.state?.financeTransactions||[]).filter(x=>x.source_type==="platform_deduction");
  const old=editId?rows.find(x=>String(x.source_id)===String(editId)):null;
  let oldNote={};try{oldNote=JSON.parse(old?.notes||"{}")}catch(_){}
  const platforms=(U.state?.financeAccounts||[]).filter(a=>/bybit|binance|crypto/i.test(String(a.account_name||"")));
  const subs=U.state?.subscriptions||[];
  const body='<div class="finance-modal-shell"><div class="finance-form-intro"><div class="finance-form-icon"><i class="fa-solid fa-minus"></i></div><div><h4>'+(old?"تعديل خصم منصة":"خصم الاشتراك من المنصة")+'</h4><p>اختر الاشتراك لتسجيل سبب الخصم، ثم حدد المبلغ الفعلي بالدولار / USDT.</p></div></div><div class="form-grid"><div class="field finance-required"><label>المنصة</label><select id="pfDeductionAccount"><option value="">اختر المنصة</option>'+platforms.map(a=>'<option value="'+a.id+'" '+(String(a.id)===String(old?.account_id)?"selected":"")+'>'+esc0(a.account_name)+'</option>').join("")+'</select></div><div class="field"><label>الاشتراك</label><select id="pfDeductionSub"><option value="">بدون ربط</option>'+subs.map(s=>{const c=(U.state?.customers||[]).find(x=>String(x.id)===String(s.customer_id));const sv=(U.state?.services||[]).find(x=>String(x.id)===String(s.app_service_id));return '<option value="'+s.id+'">'+esc0(c?.client_name||"عميل")+' — '+esc0(sv?.service_name||s.page_name||"اشتراك")+'</option>';}).join("")+'</select></div><div class="field finance-required"><label>المبلغ USD / USDT</label><input id="pfDeductionAmount" type="number" min="0" step="0.000001" value="'+(old?Math.abs(Number(old.amount||0)):"")+'"></div><div class="field"><label>التاريخ</label><input id="pfDeductionDate" type="date" value="'+(old?.transaction_date||today0())+'"></div><div class="field"><label>رقم العملية / المرجع</label><input id="pfDeductionRef" value="'+esc0(oldNote.reference||"")+'"></div><div class="field full"><label>العميل / البيان</label><input id="pfDeductionCustomer" value="'+esc0(oldNote.customer||old?.description||"")+'" placeholder="مثال: كرياتين هاوس — اشتراك إنستجرام"></div><div class="field full"><label>ملاحظات</label><textarea id="pfDeductionNotes">'+esc0(oldNote.notes||"")+'</textarea></div></div></div>';
  U.openModal(old?"تعديل خصم منصة":"خصم الاشتراك من المنصة",body,'<button class="ghost-btn" onclick="closeModal()">إلغاء</button><button class="gold-btn" onclick="saveSalehPlatformDeduction(\''+(editId||"")+'\')">حفظ الخصم</button>');
};
U.saveSalehPlatformDeduction = async function(editId){
  try{
    const a=pfAccount0(document.getElementById("pfDeductionAccount")?.value),subId=document.getElementById("pfDeductionSub")?.value||null,amt=Number(document.getElementById("pfDeductionAmount")?.value||0),date=document.getElementById("pfDeductionDate")?.value||today0(),ref=document.getElementById("pfDeductionRef")?.value.trim(),customer=document.getElementById("pfDeductionCustomer")?.value.trim(),notes=document.getElementById("pfDeductionNotes")?.value.trim();
    if(!a||!/bybit|binance|crypto/i.test(String(a.account_name||""))||amt<=0) throw new Error("اختر منصة صحيحة وأدخل مبلغ الخصم.");
    if(editId) await U.db.from("personal_finance_transactions").delete().eq("user_id",U.currentUser.id).eq("source_type","platform_deduction").eq("source_id",String(editId));
    const note=JSON.stringify({subscription_id:subId,customer,reference:ref,notes});
    const r=await U.db.from("personal_finance_transactions").insert({user_id:U.currentUser.id,account_id:a.id,amount:-Math.abs(amt),transaction_type:"expense",category:"خصم اشتراك من المنصة",description:customer||"خصم من "+a.account_name,source_type:"platform_deduction",source_id:editId||uuid0(),transaction_date:date,notes:note});
    if(r.error) throw r.error;
    U.closeModal();await U.refresh();U.showToast(editId?"تم تعديل خصم المنصة.":"تم تسجيل خصم الاشتراك من المنصة.");
  }catch(e){U.showToast(e.message||"تعذر تسجيل الخصم.",true);}
};

/* ---------- Platform card + ledger buttons ---------- */
const basePlatforms=U.renderSalehPlatforms;
if(typeof basePlatforms==="function"){
  U.renderSalehPlatforms=function(){
    let html=basePlatforms();
    html=html.replace('<button class="gold-btn" onclick="openSalehPlatformTransfer()">','<button class="gold-btn" onclick="openSalehPlatformCardDeposit()"><i class="fa-solid fa-credit-card"></i> من الكارت</button><button class="gold-btn" onclick="openSalehPlatformTransfer()">');
    return html;
  };
}

/* ---------- Advanced features restored: budgets + goals ---------- */
async function getBudgets(){
  const r=await U.db.from("personal_finance_budgets").select("*").eq("user_id",U.currentUser.id).order("category");
  if(r.error) throw r.error; return r.data||[];
}
async function getGoals(){
  const r=await U.db.from("personal_finance_goals").select("*").eq("user_id",U.currentUser.id).order("created_at",{ascending:false});
  if(r.error) throw r.error; return r.data||[];
}
U.openSalehAdvancedFinance=function(){
  U.openModal("الأدوات المتقدمة",
    '<div class="grid cols"><div class="card"><div class="card-head"><h3>ميزانية الشهر</h3></div><div class="card-body"><div class="field"><label>البند</label><input id="advBudgetCat" placeholder="مثال: البيت"></div><div class="field"><label>المبلغ</label><input id="advBudgetAmount" type="number" min="0" step="0.01"></div><button class="gold-btn" onclick="saveSalehBudgetLine()">حفظ الميزانية</button><div id="advBudgetList" style="margin-top:12px">جاري التحميل...</div></div></div><div class="card"><div class="card-head"><h3>الأهداف المالية</h3></div><div class="card-body"><div class="field"><label>اسم الهدف</label><input id="advGoalName" placeholder="مثال: شراء جهاز"></div><div class="field"><label>المبلغ المستهدف</label><input id="advGoalTarget" type="number" min="0" step="0.01"></div><div class="field"><label>المبلغ الحالي</label><input id="advGoalCurrent" type="number" min="0" step="0.01" value="0"></div><div class="field"><label>تاريخ الهدف</label><input id="advGoalDate" type="date"></div><button class="gold-btn" onclick="saveSalehGoal()">حفظ الهدف</button><div id="advGoalList" style="margin-top:12px">جاري التحميل...</div></div></div></div>',
    '<button class="ghost-btn" onclick="closeModal()">إغلاق</button>');
  try{
    const [b,g]=await Promise.all([getBudgets(),getGoals()]);
    const bm=document.getElementById("advBudgetList"),gm=document.getElementById("advGoalList");
    if(bm) bm.innerHTML=b.map(x=>'<div class="list-item"><span>'+esc0(x.category)+'</span><b>'+money0(x.budget_amount)+' '+esc0(cur0())+'</b><button class="mini-btn" onclick="deleteSalehBudget('+x.id+')">حذف</button></div>').join("")||'<div class="muted">لا توجد ميزانيات.</div>';
    if(gm) gm.innerHTML=g.map(x=>'<div class="list-item"><div><b>'+esc0(x.goal_name)+'</b><small class="muted"> '+money0(x.current_amount)+' / '+money0(x.target_amount)+' '+esc0(cur0())+'</small></div><button class="mini-btn" onclick="deleteSalehGoal('+x.id+')">حذف</button></div>').join("")||'<div class="muted">لا توجد أهداف.</div>';
  }catch(e){document.getElementById("advBudgetList").textContent="شغّل جداول المرحلة الثانية أولاً.";document.getElementById("advGoalList").textContent=e.message||"تعذر التحميل.";}
};
U.saveSalehBudgetLine=async function(){
  const category=document.getElementById("advBudgetCat")?.value.trim(),amount=Number(document.getElementById("advBudgetAmount")?.value||0);
  if(!category||amount<0)return U.showToast("أدخل البند والمبلغ.",true);
  const month=(new Date()).toISOString().slice(0,7);
  const r=await U.db.from("personal_finance_budgets").upsert({user_id:U.currentUser.id,month_key:month,category,budget_amount:amount,updated_at:new Date().toISOString()},{onConflict:"user_id,month_key,category"});
  if(r.error)return U.showToast(r.error.message,true);
  U.openSalehAdvancedFinance();
};
U.deleteSalehBudget=async function(id){if(!confirm("حذف الميزانية؟"))return;const r=await U.db.from("personal_finance_budgets").delete().eq("id",id).eq("user_id",U.currentUser.id);if(r.error)return U.showToast(r.error.message,true);U.openSalehAdvancedFinance();};
U.saveSalehGoal=async function(){
  const name=document.getElementById("advGoalName")?.value.trim(),target=Number(document.getElementById("advGoalTarget")?.value||0),current=Number(document.getElementById("advGoalCurrent")?.value||0),date=document.getElementById("advGoalDate")?.value||null;
  if(!name||target<=0)return U.showToast("أدخل اسم الهدف والمبلغ المستهدف.",true);
  const r=await U.db.from("personal_finance_goals").insert({user_id:U.currentUser.id,goal_name:name,target_amount:target,current_amount:current,target_date:date});
  if(r.error)return U.showToast(r.error.message,true);
  U.openSalehAdvancedFinance();
};
U.deleteSalehGoal=async function(id){if(!confirm("حذف الهدف؟"))return;const r=await U.db.from("personal_finance_goals").delete().eq("id",id).eq("user_id",U.currentUser.id);if(r.error)return U.showToast(r.error.message,true);U.openSalehAdvancedFinance();};

/* Add advanced button to finance page after the existing render. */
const baseRender=U.renderPersonalFinance;
if(typeof baseRender==="function"){
  U.renderPersonalFinance=function(){
    baseRender();
    setTimeout(function(){
      const host=document.getElementById("content"); if(!host || U.state?.page!=="personalFinance") return;
      if(document.getElementById("pfAdvancedToolsBtn")) return;
      const head=host.querySelector(".finance-page-head .page-actions");
      if(head){
        const b=document.createElement("button");b.id="pfAdvancedToolsBtn";b.className="ghost-btn";b.innerHTML='<i class="fa-solid fa-chart-line"></i> الأدوات المتقدمة';b.onclick=U.openSalehAdvancedFinance;head.appendChild(b);
      }
    },0);
  };
}

/* Make categories load before finance is displayed, while preserving the existing refresh. */
const baseRefresh=U.refresh;
if(typeof baseRefresh==="function"){
  U.refresh=async function(){
    const r=await baseRefresh.apply(this,arguments);
    await loadCats();
    if(U.state?.page==="personalFinance" && typeof U.renderPersonalFinance==="function") U.renderPersonalFinance();
    return r;
  };
}
loadCats().catch(()=>{});
})();