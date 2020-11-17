import { RPC, RPCSpi } from "jigsaw-rpc";
import Connection from "./Connection";
import DomainPath from "./DomainPath";
import Config from "../net-config/Config";
import Accessor from "./Accessor"
import AddrRoute from "./AddrRoute";
import assert from "assert";
import NetConfigClient from "../net-config/NetConfigClient";
import LifeCycle from "../utils/LifeCycle";
import Middleware from "../Middleware";
import Defer from "../utils/Defer";

import Util from "util";
const sleep = Util.promisify(setTimeout);

class NetInterface{
    private conn? : Connection;
    private accessor = new Accessor();


    private domain : string = "";
    private name : string;
    private ref = 0;
    
    private middle_ware : Middleware;
    private loop : boolean = false;
    private closing_defer = new Defer<void>();
    
    private config_client : NetConfigClient;
    private lifeCycle = new LifeCycle();
    private jigsaw : RPCSpi.jigsaw.IJigsaw;

    constructor(jgoption:any,default_connect_to?:any){
        
        this.middle_ware = new Middleware(jgoption);
        this.middle_ware.getLifeCycle().when("ready").then(async ()=>{
            this.setRef(+1);
            this.start_loop();
        });

        this.middle_ware.getLifeCycle().on("closed",async ()=>{
            this.setRef(-1);
        });


        this.jigsaw = this.middle_ware.getJigsaw();
        
        this.config_client = this.middle_ware.getConfigClient();

        this.name = this.jigsaw.getName();

        this.jigsaw.pre(this.middle_ware.handle());
        this.jigsaw.port("data",this.onRouteRequest.bind(this));
        this.jigsaw.port("connect",this.onConnect.bind(this));
        this.jigsaw.port("ping",async()=>(this.config_client.getConfig()));

        this.lifeCycle.on("ready",()=>{
            if(default_connect_to)
                this.connect(default_connect_to.registry,default_connect_to.domain,default_connect_to.name);
        })
        this.lifeCycle.setState("starting");

    }
    getLifeCycle(){
        return this.lifeCycle;
    }
    private connect(to_regserver:string,to_domain:string,to_name:string){
        assert.strictEqual(this.getLifeCycle().getState() , "ready");

        if(this.conn)
            throw new Error(`already connect to ${to_domain}/${to_name}`);

        this.conn = new Connection(this.jigsaw,to_domain,to_regserver,to_name);
        this.conn.setDomainName(this.config_client.getConfig().netname);
    }
    async start_loop(){
        if(this.loop)
            throw new Error("this loop has already started");

        this.setRef(+1);
        this.loop = true;
        while(this.loop){
            try{

                await this.config_client.reportInterfaceInfo({
                    intf_name:this.name,
                    from_domain:this.accessor.getCanReply() ? this.accessor.getFromDomain() : ""
                });
                if(this.conn)
                    await this.config_client.reportInterfaceInfo({
                        intf_name:this.name,
                        from_domain:this.conn.getTargetDomainName()
                    });
                
            }catch(err){

            }
            await sleep(1000);
        }

        this.setRef(-1);

    }
    private setRef(offset:number){
        this.ref += offset;
        if(this.ref == 2 && this.lifeCycle.getState() == "starting"){
            this.lifeCycle.setState("ready");
        }

        //console.log(this.ref,this.lifeCycle.getState())
        if(this.ref == 0 && this.lifeCycle.getState() == "closing"){
            this.closing_defer.resolve();
        };

    }
    async close(){
        assert(this.lifeCycle.getState()=="ready");

        this.lifeCycle.setState("closing");
        if(this.conn)
            await this.conn.close();

        await this.middle_ware.close();
        await this.jigsaw.close();

        this.loop = false;
        await this.closing_defer.promise;
        this.lifeCycle.setState("closed");

    }
    
    private getConfig(){
        return this.config_client.getConfig();
    }
    private async onRouteRequest(data:any){
        let path = DomainPath.parse(data.dst);
        let config = this.getConfig();
        if(path.domain == config.netname){
            let ret = await this.processOutside2Inside(path,data);
            return ret;
        }
        if(this.conn && this.conn.getTargetDomainName() == path.domain){
            return await this.conn.getInvoker().send(`${path.regpath}:${path.method}`,{});
        }

        if(data.from_domain == config.netname){

            return await this.processInside2Outside(data);
        }


        /* CAN NOT RECOGNIZE THIS PACKET, SEND TO OTHERS */

        return await this.jigsaw.send(data.dst,{});

    }
    private async processInside2Outside(data:any){

        let result = await this.jigsaw.call(new RPCSpi.network.Path("path","data"),new AddrRoute(
            this.accessor.getReplyInfo()
        ),data);
        return result;

    }
    private async processOutside2Inside(path:DomainPath,data:any){
        let result = await this.jigsaw.send(`${path.regpath}:${path.method}`,data);   
        return result;
    }

    private async onConnect(data:any,ctx:any){
        this.accessor.update(data.jgname,data.from_domain,ctx.reply_info);

        return {ok:true};
    }

    
}


export default NetInterface;