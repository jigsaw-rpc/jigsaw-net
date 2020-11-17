import NetConfigClient from "./net-config/NetConfigClient";
import {RPC, RPCSpi} from "jigsaw-rpc";
import DomainPath from "./net-interface/DomainPath";
import RouteParser from "./RouteParser";

class Middleware{
    private config_client;
    private jg : RPCSpi.jigsaw.IJigsaw;
    constructor(jgoption:any){
        this.jg = RPC.GetJigsaw(jgoption);
        this.config_client = new NetConfigClient(this.jg);
    }
    getConfigClient(){
        return this.config_client;
    }
    getJigsaw(){
        return this.jg;
    }
    getLifeCycle(){
        return this.config_client.getLifeCycle();
    }
    handle(){
        return this.process.bind(this);
    }
    async close(){
        await this.config_client.close();
        await this.jg.close();
    }
    private async process(ctx:any,next:any){
        await next();

        if(this.getLifeCycle().getState() != "ready")
            return;
        
        let handled = false;
        try{
            let path = DomainPath.parse(ctx.pathstr);
            let config = this.config_client.getConfig();
            let routes = this.config_client.getConfigRoutes();
            
            console.log(routes);            
            for(let route of routes){
                let parser = new RouteParser(path.domain,route);
                if(parser.isMatched()){

                    let regpath = parser.getRegpath();
                    
                    ctx.pathstr = `${regpath}:data`;
                    ctx.data = {
                        dst:ctx.raw.pathstr,
                        from_domain:config.netname
                    };
                    ctx.route = new RPCSpi.network.RegistryRoute(regpath,this.jg.getRegistryClient());
                    //ctx.route.regpath = regpath;

                    handled = true;
                    break;
                }

            }            
        }catch(err){
            //console.log(err);
            return;
        }
        
        if(!handled)
            throw new Error("can't find the route to this path");
    }
    static create(registry:string){
        let mdw = new Middleware({registry});
        return mdw;
    }

}

export default Middleware;
