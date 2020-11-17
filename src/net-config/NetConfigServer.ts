import {RPC, RPCSpi} from "jigsaw-rpc";
import Config from "./Config";
import Util from "util";
import DomainServer from "jigsaw-rpc/dist/network/domain/server/jigsaw/RegistryServer";
import Defer from "../utils/Defer";
const sleep = Util.promisify(setTimeout);

class InterfaceInfo{
    private left_life : number;
    private intf_name :string = "";
    private from_domain : string="";

    constructor(intf_name:string){
        this.intf_name = intf_name;
        this.left_life = 10;

    }
    isExpired(){
        return this.left_life <= 0;
    }
    countdown(){
        this.left_life -- ;
    }
    updateInfo(from_domain:string){
        this.from_domain = from_domain;

        this.left_life = 10;
    }
    getInfo(){
        return {intf_name:this.intf_name,from_domain:this.from_domain};
    }

}

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

    constructor(registry:string,netname:string,default_routes?: Array<Array<string>>){        
        this.jigsaw = RPC.GetJigsaw({registry,name:"jigsaw-net.config"});

        this.config.netname = netname;
        this.config.routes = default_routes || [];

        this.jigsaw.port("getConfig",async ()=>{
            return this.config;
        });

        this.jigsaw.port("report",async (data:any)=>{
            let intf = this.getInterface(data.intf_name);
            intf.updateInfo(data.from_domain);
            this.config.link_routes = this.getLinkRoutes();

            return {ok:true};
        })

        this.start_loop();
    }
    
    private getInterface(intf_name:string){
        if(!this.interfaces.has(intf_name)){
            this.interfaces.set(intf_name,new InterfaceInfo(intf_name));
        }

        return this.interfaces.get(intf_name) as InterfaceInfo;
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
