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

self.addEventListener("notificationclick",event=>{
    event.notification.close();

    event.waitUntil(
        clients.matchAll({type:"window",includeUncontrolled:true})
        .then(list=>{
            for(const client of list){
                if("focus" in client){
                    client.focus();
                    return;
                }
            }
            if(clients.openWindow){
                return clients.openWindow(
                    event.notification.data?.url||"./index.html"
                );
            }
        })
    );
});
