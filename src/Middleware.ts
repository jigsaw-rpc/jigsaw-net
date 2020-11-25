import NetConfigClient from "./net-config/NetConfigClient";
import {RPC, RPCSpi} from "jigsaw-rpc";
import DomainPath from "./net-interface/DomainPath";
import RouteParser from "./RouteParser";
import RoutingPacket from "./packet/RoutingPacket";

class RouteError extends Error{};

class Middleware{
    private config_client;
    private jg : RPCSpi.jigsaw.IJigsaw;
    constructor(jgoption:any){
        this.jg = RPC.GetJigsaw(jgoption);
        this.jg.on("error",()=>{

        });
        
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

    private handleRoutes(context:any){

        for(let route of context.routes){
            let parser = new RouteParser(context.path.domain,route);
            if(parser.isMatched()){

                let regpath = parser.getRegpath();
                let payload = context.ctx.raw.data;
                let isJSON = !(payload instanceof Buffer);
                if(isJSON)
                    payload = Buffer.from(JSON.stringify(context.ctx.raw.data));
                

                let routing_packet = new RoutingPacket();
                
                routing_packet.dst_pathstr = context.ctx.raw.pathstr;
                routing_packet.from_domain = context.config.netname;
                routing_packet.payload = payload;
                routing_packet.isJSON = isJSON;

                routing_packet.encode();

                
                context.ctx.pathstr = `${regpath}:route`;
                context.ctx.data = routing_packet.getBuffer();
                context.ctx.route = new RPCSpi.network.RegistryRoute(regpath,this.jg.getRegistryClient());
                //ctx.route.regpath = regpath;

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
