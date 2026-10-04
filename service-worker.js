const CACHE_NAME="badgeify-shell-v1";

self.addEventListener("install",event=>{
    self.skipWaiting();
});

self.addEventListener("activate",event=>{
    event.waitUntil(self.clients.claim());
});

self.addEventListener("message",event=>{
    const data=event.data||{};
    if(data.type!=="SHOW_NOTIFICATION") return;

    event.waitUntil(
        self.registration.showNotification(
            data.title||"BADGEIFY",
            {
                body:data.body||"",
                tag:data.tag||"badgeify-notification",
                icon:"./favicon.ico",
                badge:"./favicon.ico",
                vibrate:[200,100,200],
                data:{url:"./index.html"}
            }
        )
    );
});

self.addEventListener("push",event=>{
    let data={};
    try{
        data=event.data ? event.data.json() : {};
    }catch(e){
        data={
            title:"BADGEIFY",
            body:event.data ? event.data.text() : "لديك تنبيه جديد"
        };
    }

    event.waitUntil(
        self.registration.showNotification(
            data.title||"BADGEIFY",
            {
                body:data.body||"لديك تنبيه جديد",
                tag:data.tag||"badgeify-push",
                icon:"./favicon.ico",
                badge:"./favicon.ico",
                vibrate:[200,100,200],
                data:{url:data.url||"./index.html"}
            }
        )
    );
});

async function getStoredPortalToken(){
    if(!("indexedDB" in self)) return null;
    try{
        return await new Promise(function(resolve){
            const req=indexedDB.open("badgeify_notifications",1);
            req.onupgradeneeded=function(){
                const db=req.result;
                if(!db.objectStoreNames.contains("settings")) db.createObjectStore("settings");
            };
            req.onsuccess=function(){
                const db=req.result;
                try{
                    const tx=db.transaction("settings","readonly");
                    const getReq=tx.objectStore("settings").get("portal_token");
                    getReq.onsuccess=function(){ const value=getReq.result||null; db.close(); resolve(value); };
                    getReq.onerror=function(){ db.close(); resolve(null); };
                }catch(e){ db.close(); resolve(null); }
            };
            req.onerror=function(){ resolve(null); };
        });
    }catch(e){ return null; }
}

self.addEventListener("notificationclick",event=>{
    event.notification.close();
    event.waitUntil((async function(){
        const explicitUrl=event.notification.data?.url;
        let targetUrl=explicitUrl;
        if(!targetUrl || targetUrl==="./index.html"){
            const token=await getStoredPortalToken();
            targetUrl=token ? "./client.html?token="+encodeURIComponent(token) : "./index.html";
        }
        const absoluteUrl=new URL(targetUrl,self.location.href).href;
        const list=await clients.matchAll({type:"window",includeUncontrolled:true});
        for(const client of list){
            if("focus" in client){
                try{
                    if("navigate" in client && client.url!==absoluteUrl) await client.navigate(absoluteUrl);
                }catch(e){}
                await client.focus();
                return;
            }
        }
        if(clients.openWindow) return clients.openWindow(absoluteUrl);
    })());
});
