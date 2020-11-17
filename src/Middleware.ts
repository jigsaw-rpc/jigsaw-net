import NetConfigClient from "./net-config/NetConfigClient";
import {RPC, RPCSpi} from "jigsaw-rpc";
import DomainPath from "./net-interface/DomainPath";
import RouteParser from "./RouteParser";

class RouteError extends Error{};

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
        
        try{
            let path = DomainPath.parse(ctx.pathstr);


            let config = this.config_client.getConfig();
            let routes = this.config_client.getConfigRoutes();
            let context = {handled : false,ctx,path,config,routes};

            this.handleSelfRoute(context);
            this.handleRoutes(context);

            throw new RouteError("can't find the route to this path");
        
        }catch(err){
            if(err instanceof RouteError)
                throw err;



            //console.log(err);
            return;
        }
        
        
    }
    private handlePayload(context:any){
        let data = context.ctx.data;
        if(data.payload instanceof Buffer){
            data.isBuffer = true;
            data.payload = data.payload.toString("base64");
        }else{
            data.isBuffer = false;
        }

    }
    private handleRoutes(context:any){
        for(let route of context.routes){
            let parser = new RouteParser(context.path.domain,route);
            if(parser.isMatched()){

                let regpath = parser.getRegpath();
                
                context.ctx.pathstr = `${regpath}:route`;
                context.ctx.data = {
                    dst:context.ctx.raw.pathstr,
                    from_domain:context.config.netname,
                    payload:context.ctx.raw.data
                };
                context.ctx.route = new RPCSpi.network.RegistryRoute(regpath,this.jg.getRegistryClient());
                //ctx.route.regpath = regpath;

                this.handlePayload(context);

                throw new Error("route finished");
            }

        }

    }
    private handleSelfRoute(context:any){
        let config = this.config_client.getConfig();
        if(context.path.domain == config.netname){ // self domain
            context.ctx.route = new RPCSpi.network.RegistryRoute(context.path.regpath,this.jg.getRegistryClient());
            context.ctx.pathstr = `${context.path.regpath}:${context.path.method}`;
            context.handled = true;
            throw new Error("this domain is inside");            
        }

    }
    static create(registry:string){
        let mdw = new Middleware({registry});
        return mdw;
    }

}

export default Middleware;
