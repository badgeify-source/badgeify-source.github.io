<style id="saleh-finance-ui-css">
.saleh-feature-hub{margin-top:16px;overflow:hidden}
.saleh-feature-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
.saleh-feature-item{min-width:0;text-align:right;border:1px solid var(--border);border-radius:14px;background:var(--panel2);color:var(--text);padding:12px;display:flex;align-items:center;gap:10px;cursor:pointer;font-family:inherit;transition:.18s}
.saleh-feature-item:hover{transform:translateY(-2px);border-color:rgba(47,140,255,.5);background:rgba(47,140,255,.07)}
.saleh-feature-icon{width:38px;height:38px;flex:0 0 38px;border-radius:11px;display:grid;place-items:center;background:rgba(47,140,255,.12);color:var(--gold2)}
.saleh-feature-copy{min-width:0;display:flex;flex-direction:column;gap:3px;flex:1}
.saleh-feature-copy b{font-size:11px}
.saleh-feature-copy small{font-size:8px;color:var(--muted);line-height:1.5}
.saleh-feature-arrow{font-size:9px;color:var(--muted)}
@media(max-width:1200px){.saleh-feature-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:700px){.saleh-feature-grid{grid-template-columns:1fr 1fr}.saleh-feature-item{padding:10px}.saleh-feature-copy small{font-size:7px}}
@media(max-width:430px){.saleh-feature-grid{grid-template-columns:1fr}}
</style>\n/* PERSONAL FINANCE — visible feature hub only; preserves the existing dashboard layout */
(function(){
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn(); }
  function addHub(){
    if(typeof state==='undefined' || state.page!=='personalFinance') return;
    const content=document.getElementById('content');
    if(!content || document.getElementById('salehFinanceFeatureHub')) return;
    const hub=document.createElement('div');
    hub.id='salehFinanceFeatureHub';
    hub.className='card saleh-feature-hub';
    hub.innerHTML=
      '<div class="card-head"><div><h3>إدارة لوحة صالح</h3><span class="muted">كل الإضافات موجودة هنا بشكل واضح بدل ما تكون مخفية داخل أزرار متفرقة.</span></div></div>'+
      '<div class="card-body"><div class="saleh-feature-grid">'+
        item('fa-wallet','الحسابات والأرصدة','الكاش • Vodafone Cash • InstaPay','openSalehOpeningBalance()')+
        item('fa-hand-holding-dollar','السلف','فلوس مسلفها • فلوس مستلفها • السداد والتحصيل','openSalehLoan()')+
        item('fa-users','الأشخاص والحسابات','حساب مستقل لكل شخص + كشف حساب + واتساب','openSalehPeopleList()')+
        item('fa-coins','المنصات','Bybit Saleh • Bybit Mahmoud • Binance • USD/USDT','scrollToSalehPlatforms()')+
        item('fa-heart','التبرعات','تسجيل التبرع وإظهاره كـ شيء غير معلوم في التقارير','openSalehDonation()')+
        item('fa-list','بنود المصاريف','إضافة وتعديل بنود المصروفات المستخدمة في التسجيل','openSalehExpenseCategories()')+
        item('fa-scale-balanced','مطابقة الأرصدة','تسوية الرصيد الفعلي بدون حذف الحركات القديمة','scrollToSalehAccounts()')+
        item('fa-chart-line','ميزانية الشهر','تحديد ميزانية ومراجعة صافي الشهر','openSalehBudget()')+
        item('fa-file-export','تصدير الحركات','تصدير كل حركات PERSONAL FINANCE إلى CSV','exportSalehFinanceCSV()')+
        item('fa-clock-rotate-left','كشف الحركات','بحث وتصفية المقبوضات والمصروفات والتحويلات','scrollToSalehTransactions()')+
      '</div></div>';
    const hero=content.querySelector('.finance-hero');
    if(hero) hero.insertAdjacentElement('afterend',hub); else content.prepend(hub);
  }
  function item(icon,title,sub,action){
    return '<button type="button" class="saleh-feature-item" onclick="'+action+'">'+
      '<span class="saleh-feature-icon"><i class="fa-solid '+icon+'"></i></span>'+
      '<span class="saleh-feature-copy"><b>'+title+'</b><small>'+sub+'</small></span>'+
      '<i class="fa-solid fa-chevron-left saleh-feature-arrow"></i></button>';
  }
  window.scrollToSalehPlatforms=function(){
    setTimeout(function(){
      const el=document.getElementById('salehPlatformFinanceSection');
      if(el){el.scrollIntoView({behavior:'smooth',block:'start'});return;}
      if(typeof openSalehPlatformAccount==='function') openSalehPlatformAccount();
    },80);
  };
  window.scrollToSalehAccounts=function(){
    const el=document.querySelector('.finance-account-section');
    if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
  };
  window.scrollToSalehTransactions=function(){
    const el=document.querySelector('.finance-toolbar');
    if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
  };
  const old=window.renderPersonalFinance;
  if(typeof old==='function'){
    window.renderPersonalFinance=function(){
      old.apply(this,arguments);
      setTimeout(addHub,20);
    };
  }
  ready(function(){ setTimeout(addHub,300); });
})();