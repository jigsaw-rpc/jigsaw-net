import {RPC, RPCSpi} from "jigsaw-rpc";
import Config from "./Config";
import InterfaceInfo from "./InterfaceInfo";
import Defer from "../utils/Defer";

import Util from "util";

const sleep = Util.promisify(setTimeout);

class NetConfigServer{
    private jigsaw : RPCSpi.jigsaw.IJigsaw;
    private config : Config = {
        netname:"",
        routes:[],
        link_routes:[]
    };

    private interfaces = new Map<string,InterfaceInfo>();
    private closing_defer = new Defer<void>();
    private loop = false;
    private registry_url : string;

    constructor(registry:string,netname:string,default_routes?: Array<Array<string>>){        
        this.registry_url = registry;

        this.jigsaw = RPC.GetJigsaw({registry:this.registry_url,name:"jigsaw-net.config"});
        this.jigsaw.on("error",()=>{
            
        });
        
        this.config.netname = netname;
        this.config.routes = default_routes || [];

        this.jigsaw.port("getConfig",async ()=>{
            return this.config;
        });

        this.jigsaw.port("report",async (data:any)=>{
            let intf = this.getInterface(data.from_domain,data.intf_name);
            intf.updateInfo(data.from_domain);
            this.config.link_routes = this.getLinkRoutes();

            return {ok:true};
        })

        this.start_loop();
    }
    getRegistryURL(){
        return this.registry_url;
    }
    getInterfaces(){
        return this.interfaces;
    }
    private getInterface(from_domain:string,intf_name:string){
        let key = `${from_domain}-${intf_name}`
        if(!this.interfaces.has(key)){
            let info = new InterfaceInfo(intf_name);
            info.updateInfo(from_domain);
            this.interfaces.set(key,info);
        }

        return this.interfaces.get(key) as InterfaceInfo;
    }
    private getLinkRoutes(): Array<Array<string>>{
        let routes : Array<Array<string>>=[];
        this.interfaces.forEach((intf)=>{
            let info = intf.getInfo();
            routes.push([info.from_domain,info.intf_name]);
        })
        return routes;
    }

    private async start_loop(){
        if(this.loop)
            throw new Error("already start this loop");

        this.loop = true;
        while(this.loop){
            this.interfaces.forEach((intf,key)=>{
                intf.countdown();
                if(intf.isExpired())
                    this.interfaces.delete(key);      
            });

            await sleep(1000);
        }

        this.closing_defer.resolve();
    }

    async close(){
        await this.jigsaw.close();
        this.loop = false;
        await this.closing_defer.promise;
    }

}

export default NetConfigServer;
