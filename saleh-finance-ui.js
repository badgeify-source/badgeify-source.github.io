/* PERSONAL FINANCE — visible feature hub only; preserves the existing dashboard layout */
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