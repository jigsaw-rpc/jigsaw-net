import Config from "./Config";
import Util from "util";
import { RPCSpi } from "jigsaw-rpc";
import { TypedEmitter } from "tiny-typed-emitter";
import LifeCycle from "../utils/LifeCycle";

import assert from "assert";
import Defer from "../utils/Defer";

const sleep = Util.promisify(setTimeout);

type InterfaceInfoReport = {
    intf_name:string,
    from_domain:string
}

class NetConfigClient{
    private loop = false;
    private lifeCycle = new LifeCycle();
    private closing_defer = new Defer<void>();

    private config : Config = {
        netname:"",
        routes:[],
        link_routes:[]
    };

    private ref = 0;
    private jigsaw:RPCSpi.jigsaw.IJigsaw;
    constructor(jigsaw:RPCSpi.jigsaw.IJigsaw){
        this.jigsaw=jigsaw;
        this.start();
    }
    getLifeCycle(){
        return this.lifeCycle;
    }
    getConfig(){
        assert(this.lifeCycle.getState() == "ready");
        return this.config;
    }
    private async start(){
        if(this.loop)
            throw new Error("already started");
        
        this.lifeCycle.setState("starting");

        this.loop = true;
        this.setRef(+1);
        while(this.loop){
            try{
                await this.syncConfig();
            }catch(err){
                //console.log(err);
            }

            await sleep(1000);
        }
        this.setRef(-1);
    }
    private setRef(offset:number){
        if(this.ref == 0 && this.lifeCycle.getState() == "closing"){
            this.closing_defer.resolve();
        }
    }
    reportInterfaceInfo(intf_info:InterfaceInfoReport){
        return this.jigsaw.send("jigsaw-net.config:report",intf_info);
    }
    async close(){
        this.loop = false;
        this.lifeCycle.setState("closing");
        await this.closing_defer.promise;
        this.lifeCycle.setState("closed");
    }
    getConfigRoutes(){
        return this.config.link_routes.concat(this.config.routes);
    }
    private async syncConfig(){
        let ret = await this.jigsaw.send("jigsaw-net.config:getConfig",{name:this.jigsaw.getName()});
        this.config = ret;

        if(this.lifeCycle.getState()=="starting")
            this.lifeCycle.setState("ready");
    }

}

export default NetConfigClient;
